import { defineBackground } from 'wxt/utils/define-background';
import type {
  BackgroundRequest,
  CancelDistributionRequest,
  CheckPlatformReadinessRequest,
  DistributeRequest,
  DistributeResponse,
  DistributionErrorCode,
  DistributionResult,
  DistributionTask,
  FillPromptResponse,
  InspectPageResponse,
  PlatformReadinessMap,
  Product,
  ProductId,
} from '../types';
import {
  defaultProducts,
  getProduct,
  isLoginUrl,
  isReusableProductUrl,
} from '../utils/platforms';

const TASK_KEY = 'activeDistributionTask';
const MANAGED_TABS_KEY = 'managedProductTabs';
let taskWriteQueue: Promise<void> = Promise.resolve();

export default defineBackground(() => {
  let activeTask: DistributionTask | null = null;
  let startLock = false;

  void recoverInterruptedTask();

  chrome.runtime.onMessage.addListener(
    (
      request: BackgroundRequest,
      _sender: unknown,
      sendResponse: (response: unknown) => void
    ) => {
      if (request.action === 'distribute') {
        if (startLock) {
          sendResponse(busyResponse());
          return;
        }

        startLock = true;
        startDistribution(request as DistributeRequest)
          .then(sendResponse)
          .catch((error: unknown) => sendResponse(errorResponse(error)))
          .finally(() => {
            startLock = false;
          });
        return true;
      }

      if (request.action === 'cancelDistribution') {
        cancelDistribution(request as CancelDistributionRequest)
          .then(() => sendResponse({ success: true }))
          .catch((error: unknown) => sendResponse(errorResponse(error)));
        return true;
      }

      if (request.action === 'getDistributionTask') {
        getStoredTask()
          .then((task) => sendResponse({ success: true, task }))
          .catch((error: unknown) => sendResponse(errorResponse(error)));
        return true;
      }

      if (request.action === 'checkPlatformReadiness') {
        checkPlatformReadiness(request as CheckPlatformReadinessRequest)
          .then((readiness) => sendResponse({ success: true, readiness }))
          .catch((error: unknown) => sendResponse(errorResponse(error)));
        return true;
      }
    }
  );

  async function startDistribution(request: DistributeRequest): Promise<DistributeResponse> {
    const existing = activeTask ?? (await getStoredTask());
    if (existing?.status === 'running') return busyResponse(existing);

    const productIds = [...new Set(request.productIds)].filter((id) => Boolean(getProduct(id)));
    if (!request.prompt.trim() || productIds.length === 0) {
      return {
        success: false,
        errorCode: 'UNKNOWN',
        error: 'A prompt and at least one supported product are required',
      };
    }

    const now = new Date().toISOString();
    const task: DistributionTask = {
      id: crypto.randomUUID(),
      status: 'running',
      prompt: request.prompt.trim(),
      productIds,
      completed: 0,
      total: productIds.length,
      results: [],
      createdTabIds: [],
      startedAt: now,
      updatedAt: now,
    };

    activeTask = task;
    await saveTask(task);
    void runDistribution(task).catch((error: unknown) => failTask(task.id, error));

    return { success: true, taskId: task.id, task: snapshotTask(task) };
  }

  async function runDistribution(task: DistributionTask): Promise<void> {
    const indexedResults = await Promise.all(
      task.productIds.map(async (productId, index) => {
        await sleep(index * 220);
        if (!isTaskRunning(task.id)) return null;

        const product = getProduct(productId);
        if (!product) return null;
        let result: DistributionResult;
        try {
          result = await sendToProduct(task, product, task.prompt);
        } catch (error: unknown) {
          result = toResult(
            product,
            undefined,
            false,
            failure('UNKNOWN', error instanceof Error ? error.message : 'Unknown error')
          );
        }
        if (!isTaskRunning(task.id)) return null;

        task.completed += 1;
        task.results = [...task.results, result];
        await saveAndNotify(task);
        return { index, result };
      })
    );

    if (!isTaskRunning(task.id)) return;
    await groupCreatedTabs(task);

    task.results = indexedResults
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.index - b.index)
      .map((item) => item.result);
    task.completed = task.results.length;
    task.status = 'completed';
    await saveAndNotify(task);
    activeTask = null;
  }

  async function sendToProduct(
    task: DistributionTask,
    product: Product,
    prompt: string
  ): Promise<DistributionResult> {
    const existingTab = await findReusableTab(product);
    if (existingTab?.id) {
      const inspection = await inspectTab(existingTab.id, product);
      if (inspection.authRequired) {
        return toResult(product, existingTab.id, true, failure('AUTH_REQUIRED', 'Sign in required'));
      }
      if (inspection.ready && inspection.inputEmpty && inspection.conversationEmpty) {
        return toResult(product, existingTab.id, true, await tryFill(existingTab.id, product, prompt));
      }
    }

    if (!isTaskRunning(task.id)) {
      return toResult(product, undefined, false, failure('TASK_INTERRUPTED', 'Task stopped'));
    }

    const newTab = await chrome.tabs.create({ url: product.url, active: false });
    if (!newTab.id) {
      return toResult(product, undefined, false, failure('UNKNOWN', 'Tab was not created'));
    }

    task.createdTabIds.push(newTab.id);
    await rememberManagedTab(product.id, newTab.id);
    await saveAndNotify(task);

    try {
      await waitForTabLoad(task.id, newTab.id);
      if (!(await tabMatchesProduct(newTab.id, product))) {
        return toResult(product, newTab.id, false, failure('AUTH_REQUIRED', 'Sign in required'));
      }
      const refreshedTab = await chrome.tabs.get(newTab.id);
      if (isLoginUrl(refreshedTab.url, product)) {
        return toResult(product, newTab.id, false, failure('AUTH_REQUIRED', 'Sign in required'));
      }

      const inspection = await inspectTab(newTab.id, product);
      if (inspection.authRequired) {
        return toResult(product, newTab.id, false, failure('AUTH_REQUIRED', 'Sign in required'));
      }
      return toResult(product, newTab.id, false, await tryFill(newTab.id, product, prompt));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errorCode: DistributionErrorCode =
        message === 'TAB_CLOSED'
          ? 'TAB_CLOSED'
          : message === 'TASK_INTERRUPTED'
            ? 'TASK_INTERRUPTED'
            : 'PAGE_LOAD_TIMEOUT';
      return toResult(product, newTab.id, false, failure(errorCode, message));
    }
  }

  async function findReusableTab(product: Product): Promise<chrome.tabs.Tab | undefined> {
    const tabs = await chrome.tabs.query({ url: product.matches });
    const managedTabs = await getManagedTabs();
    const managedTabId = managedTabs[product.id];

    return tabs.find((tab) => {
      if (!tab.id || isLoginUrl(tab.url, product)) return false;
      return tab.id === managedTabId || isReusableProductUrl(tab.url, product);
    });
  }

  async function tabMatchesProduct(tabId: number, product: Product): Promise<boolean> {
    const matchingTabs = await chrome.tabs.query({ url: product.matches });
    return matchingTabs.some((tab) => tab.id === tabId);
  }

  async function inspectTab(tabId: number, product: Product): Promise<InspectPageResponse> {
    try {
      return await sendInspectMessage(tabId, product);
    } catch {
      try {
        await injectContentScript(tabId);
        return await sendInspectMessage(tabId, product);
      } catch {
        return {
          ready: false,
          inputEmpty: false,
          conversationEmpty: false,
          authRequired: false,
        };
      }
    }
  }

  async function tryFill(
    tabId: number,
    product: Product,
    prompt: string
  ): Promise<FillPromptResponse> {
    try {
      return await sendFillMessage(tabId, product, prompt);
    } catch {
      try {
        await injectContentScript(tabId);
        return await sendFillMessage(tabId, product, prompt);
      } catch {
        return failure('CONTENT_SCRIPT_UNAVAILABLE', 'Page is not ready');
      }
    }
  }

  async function injectContentScript(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js'],
    });
    await sleep(150);
  }

  async function sendInspectMessage(tabId: number, product: Product): Promise<InspectPageResponse> {
    return chrome.tabs.sendMessage(tabId, {
      action: 'inspectPage',
      productId: product.id,
    });
  }

  async function sendFillMessage(
    tabId: number,
    product: Product,
    prompt: string
  ): Promise<FillPromptResponse> {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'fillPrompt',
      productId: product.id,
      prompt,
    });
    return response ?? failure('CONTENT_SCRIPT_UNAVAILABLE', 'Page is not ready');
  }

  async function waitForTabLoad(taskId: string, tabId: number, timeout = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (!isTaskRunning(taskId)) throw new Error('TASK_INTERRUPTED');
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          await sleep(900);
          return;
        }
      } catch {
        throw new Error('TAB_CLOSED');
      }
      await sleep(350);
    }
    throw new Error('PAGE_LOAD_TIMEOUT');
  }

  async function groupCreatedTabs(task: DistributionTask): Promise<void> {
    const tabIds = task.createdTabIds.filter(Boolean);
    if (tabIds.length < 2) return;
    try {
      const groupId = await chrome.tabs.group({ tabIds: [tabIds[0], ...tabIds.slice(1)] });
      await chrome.tabGroups.update(groupId, {
        title: 'Chorus',
        color: 'grey',
        collapsed: false,
      });
    } catch {
      // Grouping is helpful but does not change delivery success.
    }
  }

  async function cancelDistribution(request: CancelDistributionRequest): Promise<void> {
    const task = activeTask ?? (await getStoredTask());
    if (!task || task.id !== request.taskId || task.status !== 'running') return;

    task.status = 'cancelled';
    task.updatedAt = new Date().toISOString();
    await saveAndNotify(task);
    activeTask = null;

    if (task.createdTabIds.length > 0) {
      await chrome.tabs.remove(task.createdTabIds).catch(() => undefined);
    }
  }

  async function checkPlatformReadiness(
    _request: CheckPlatformReadinessRequest
  ): Promise<PlatformReadinessMap> {
    const readiness: PlatformReadinessMap = {};
    await Promise.all(
      defaultProducts.map(async (product) => {
        const tab = await findReusableTab(product);
        if (!tab?.id) {
          readiness[product.id] = 'willOpen';
          return;
        }
        if (isLoginUrl(tab.url, product)) {
          readiness[product.id] = 'signIn';
          return;
        }
        const inspection = await inspectTab(tab.id, product);
        readiness[product.id] = inspection.authRequired
          ? 'signIn'
          : inspection.ready && inspection.inputEmpty && inspection.conversationEmpty
            ? 'ready'
            : 'unavailable';
      })
    );
    return readiness;
  }

  async function failTask(taskId: string, error: unknown): Promise<void> {
    if (!activeTask || activeTask.id !== taskId || activeTask.status !== 'running') return;
    activeTask.status = 'failed';
    activeTask.errorCode = 'UNKNOWN';
    activeTask.error = error instanceof Error ? error.message : 'Unknown error';
    await saveAndNotify(activeTask);
    activeTask = null;
  }

  async function recoverInterruptedTask(): Promise<void> {
    const task = await getStoredTask();
    if (!task || task.status !== 'running') return;
    task.status = 'failed';
    task.errorCode = 'TASK_INTERRUPTED';
    task.error = 'The browser stopped the previous task';
    await saveAndNotify(task);
  }

  function isTaskRunning(taskId: string): boolean {
    return activeTask?.id === taskId && activeTask.status === 'running';
  }
});

async function getStoredTask(): Promise<DistributionTask | null> {
  const stored = await chrome.storage.session.get(TASK_KEY);
  return (stored[TASK_KEY] as DistributionTask | undefined) ?? null;
}

async function saveTask(task: DistributionTask): Promise<void> {
  task.updatedAt = new Date().toISOString();
  const snapshot = snapshotTask(task);
  taskWriteQueue = taskWriteQueue.then(() =>
    chrome.storage.session.set({ [TASK_KEY]: snapshot })
  );
  await taskWriteQueue;
}

async function saveAndNotify(task: DistributionTask): Promise<void> {
  task.updatedAt = new Date().toISOString();
  const snapshot = snapshotTask(task);
  taskWriteQueue = taskWriteQueue.then(async () => {
    await chrome.storage.session.set({ [TASK_KEY]: snapshot });
    await chrome.runtime
      .sendMessage({ action: 'distributionTaskUpdated', task: snapshot })
      .catch(() => undefined);
  });
  await taskWriteQueue;
}

function snapshotTask(task: DistributionTask): DistributionTask {
  return {
    ...task,
    productIds: [...task.productIds],
    results: task.results.map((result) => ({ ...result })),
    createdTabIds: [...task.createdTabIds],
  };
}

async function getManagedTabs(): Promise<Partial<Record<ProductId, number>>> {
  const stored = await chrome.storage.session.get(MANAGED_TABS_KEY);
  return (stored[MANAGED_TABS_KEY] as Partial<Record<ProductId, number>> | undefined) ?? {};
}

async function rememberManagedTab(productId: ProductId, tabId: number): Promise<void> {
  const managedTabs = await getManagedTabs();
  await chrome.storage.session.set({
    [MANAGED_TABS_KEY]: { ...managedTabs, [productId]: tabId },
  });
}

function busyResponse(task?: DistributionTask): DistributeResponse {
  return {
    success: false,
    taskId: task?.id,
    task: task ? snapshotTask(task) : undefined,
    errorCode: 'TASK_IN_PROGRESS',
    error: 'Another task is already running',
  };
}

function errorResponse(error: unknown): DistributeResponse {
  return {
    success: false,
    errorCode: 'UNKNOWN',
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}

function failure(errorCode: DistributionErrorCode, error: string): FillPromptResponse {
  return { success: false, errorCode, error };
}

function toResult(
  product: Product,
  tabId: number | undefined,
  reusedTab: boolean,
  response: FillPromptResponse
): DistributionResult {
  return {
    productId: product.id,
    productName: product.name,
    success: response.success,
    reusedTab,
    tabId,
    errorCode: response.errorCode,
    error: response.error,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
