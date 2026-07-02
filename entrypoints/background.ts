import type {
  Product,
  DistributionResult,
  DistributionTask,
  DistributeRequest,
  CancelDistributionRequest,
  DistributeResponse,
  DistributionProgressMessage,
  DistributionCompleteMessage,
  DistributionCancelledMessage,
} from '../types';
import { Mutex } from '../utils/mutex';

const DISTRIBUTION_TASK_KEY = 'distributionTask';

export default defineBackground(() => {
  const distributionMutex = new Mutex();

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'distribute') {
      const { prompt, products } = request as DistributeRequest;
      distributionMutex
        .runExclusive(async () => {
          const active = await getActiveDistribution();
          if (active) {
            return { success: false, error: 'Another distribution is in progress' };
          }
          const taskId = generateId();
          await setActiveDistribution({
            id: taskId,
            tabIds: [],
            total: products.length,
            completed: 0,
            cancelled: false,
            inProgress: true,
          });
          // Run distribution in the background without holding the mutex
          handleDistribute(taskId, prompt, products).catch((error) => {
            console.error('Chorus: Distribution error:', error);
          });
          return { success: true, taskId };
        })
        .then((response) => sendResponse(response as DistributeResponse))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true; // Keep message channel open for async response
    } else if (request.action === 'cancelDistribution') {
      const { taskId } = request as CancelDistributionRequest;
      distributionMutex
        .runExclusive(async () => {
          const task = await getTask(taskId);
          if (!task || task.cancelled) {
            return { success: true };
          }
          await updateTask(taskId, { cancelled: true, inProgress: false });
          // Notify popup immediately
          const message: DistributionCancelledMessage = {
            action: 'distributionCancelled',
            taskId,
          };
          chrome.runtime.sendMessage(message).catch(() => {});
          return { success: true };
        })
        .then((response) => sendResponse(response))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });

  // Generate unique ID
  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Validate that a URL is safe to open (only http/https allowed)
  function isAllowedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Get active distribution from storage
  async function getActiveDistribution(): Promise<DistributionTask | null> {
    const { distributionTask } = (await chrome.storage.local.get([DISTRIBUTION_TASK_KEY])) as {
      distributionTask?: DistributionTask;
    };
    return distributionTask && distributionTask.inProgress ? distributionTask : null;
  }

  // Save active distribution
  async function setActiveDistribution(task: DistributionTask): Promise<void> {
    await chrome.storage.local.set({ [DISTRIBUTION_TASK_KEY]: task });
  }

  // Get task by ID
  async function getTask(taskId: string): Promise<DistributionTask | null> {
    const { distributionTask } = (await chrome.storage.local.get([DISTRIBUTION_TASK_KEY])) as {
      distributionTask?: DistributionTask;
    };
    return distributionTask && distributionTask.id === taskId ? distributionTask : null;
  }

  // Update task properties
  async function updateTask(taskId: string, updates: Partial<DistributionTask>): Promise<void> {
    const task = await getTask(taskId);
    if (!task) return;
    await setActiveDistribution({ ...task, ...updates });
  }

  // Check if task is cancelled
  async function isTaskCancelled(taskId: string): Promise<boolean> {
    const task = await getTask(taskId);
    return task?.cancelled ?? false;
  }

  // Clear task from storage
  async function clearTask(taskId: string): Promise<void> {
    const task = await getTask(taskId);
    if (task && task.id === taskId) {
      await chrome.storage.local.remove([DISTRIBUTION_TASK_KEY]);
    }
  }

  // Handle distribution logic
  async function handleDistribute(taskId: string, prompt: string, products: Product[]): Promise<void> {
    const results: DistributionResult[] = [];
    const delay = 500;
    let completed = 0;
    const tabIds: number[] = [];

    try {
      await updateTask(taskId, { tabIds, total: products.length, completed: 0, inProgress: true });

      let groupId: number | null = null;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (await isTaskCancelled(taskId)) break;

        if (!isAllowedUrl(product.url)) {
          results.push({
            productName: product.name,
            success: false,
            error: 'Invalid or unsafe URL',
          });
          completed++;
          await updateTask(taskId, { completed });
          notifyProgress(taskId, completed, products.length);
          continue;
        }

        try {
          const tab = await chrome.tabs.create({
            url: product.url,
            active: false,
          });

          if (!tab.id) continue;

          tabIds.push(tab.id);
          await updateTask(taskId, { tabIds });

          if (await isTaskCancelled(taskId)) break;

          try {
            if (groupId === null) {
              groupId = await chrome.tabs.group({ tabIds: [tab.id] });
              await chrome.tabGroups.update(groupId, {
                title: 'Chorus',
                color: 'grey',
                collapsed: false,
              });
            } else {
              await chrome.tabs.group({ tabIds: [tab.id], groupId });
            }
          } catch (error) {
            console.warn('Chorus: Failed to add tab to group:', error);
          }

          await waitForTabLoad(tab.id);

          if (await isTaskCancelled(taskId)) break;

          const fillResult = await fillPrompt(
            tab.id,
            prompt,
            product.selector,
            product.submitSelector
          );

          results.push({
            productName: product.name,
            success: fillResult.success,
            error: fillResult.error,
          });

          completed++;
          await updateTask(taskId, { completed });
          notifyProgress(taskId, completed, products.length);
        } catch (error) {
          if (!(await isTaskCancelled(taskId))) {
            results.push({
              productName: product.name,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            completed++;
            await updateTask(taskId, { completed });
            notifyProgress(taskId, completed, products.length);
          }
        }

        if (i < products.length - 1 && !(await isTaskCancelled(taskId))) {
          await sleep(delay);
        }
      }
    } finally {
      const task = await getTask(taskId);
      if (task?.cancelled && tabIds.length > 0) {
        for (const tabId of tabIds) {
          try {
            await chrome.tabs.remove(tabId);
          } catch {
            // Tab may already be closed
          }
        }
      }
      await clearTask(taskId);
      notifyComplete(taskId, results);
    }
  }

  // Notify progress update
  function notifyProgress(taskId: string, completed: number, total: number): void {
    const message: DistributionProgressMessage = {
      action: 'distributionProgress',
      taskId,
      completed,
      total,
    };
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore error (popup may be closed)
    });
  }

  // Notify distribution completion
  function notifyComplete(taskId: string, results: DistributionResult[]): void {
    const message: DistributionCompleteMessage = {
      action: 'distributionComplete',
      taskId,
      results,
    };
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore error (popup may be closed)
    });
  }

  // Wait for tab to complete loading
  function waitForTabLoad(tabId: number, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkStatus = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error('Tab closed'));
            return;
          }

          if (tab.status === 'complete') {
            // Wait an extra 1 second to ensure page is fully rendered
            setTimeout(() => resolve(), 1000);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Page load timeout'));
          } else {
            setTimeout(checkStatus, 500);
          }
        });
      };

      checkStatus();
    });
  }

  // Fill prompt into page
  async function fillPrompt(
    tabId: number,
    prompt: string,
    customSelector?: string,
    customSubmitSelector?: string
  ): Promise<{ success: boolean; error?: string }> {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await sendMessageToTab(tabId, {
          action: 'fillPrompt',
          prompt,
          selector: customSelector,
          submitSelector: customSubmitSelector,
        });

        if (response) {
          return response;
        }
      } catch (error) {
        console.log(`Chorus: Content script not ready, retry ${i + 1}/${maxRetries}`);
        if (i < maxRetries - 1) {
          await sleep(500);
        }
      }
    }

    return { success: false, error: 'Content script not responding' };
  }

  // Send message to tab
  function sendMessageToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Delay function
  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Listen for install event
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Chorus extension installed');
    } else if (details.reason === 'update') {
      console.log('Chorus extension updated');
    }
  });
});
