import type {
  CancelDistributionRequest,
  DistributeRequest,
  DistributionResult,
  DistributionState,
  FillPromptResponse,
  Product,
} from '../types';
import { getProduct } from '../utils/defaultProducts';
import { track } from '../utils/analytics';

export default defineBackground(() => {
  let currentDistribution: DistributionState | null = null;
  let cancelled = false;

  chrome.runtime.onMessage.addListener(
    (
      request: DistributeRequest | CancelDistributionRequest,
      _sender: unknown,
      sendResponse: (response: unknown) => void
    ) => {
      if (request.action === 'distribute') {
        cancelled = false;
        distribute(request as DistributeRequest)
          .then((results) =>
            sendResponse(cancelled ? { cancelled: true } : { success: true, results })
          )
          .catch((error: unknown) =>
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        return true;
      }

      if (request.action === 'cancelDistribution') {
        cancelDistribution(request as CancelDistributionRequest)
          .then(() => sendResponse({ success: true }))
          .catch(() => sendResponse({ success: false }));
        return true;
      }
    }
  );

  async function distribute(request: DistributeRequest): Promise<DistributionResult[]> {
    const products = request.productIds
      .map(getProduct)
      .filter((product): product is Product => Boolean(product));

    currentDistribution = { createdTabIds: [] };
    await setProgress(0, products.length);
    await track('distribution_started', { platformCount: products.length });

    let completed = 0;
    const indexedResults = await Promise.all(
      products.map(async (product, index) => {
        await sleep(index * 220);
        if (cancelled) return null;

        const result = await sendToProduct(product, request.prompt);
        completed += 1;
        await setProgress(completed, products.length, product.id);

        await track(result.success ? 'platform_success' : 'platform_failure', {
          productId: product.id,
          reusedTab: result.reusedTab,
          errorCode: result.errorCode ?? '',
        });

        chrome.runtime
          .sendMessage({
            action: 'distributionProgress',
            completed,
            total: products.length,
            productId: product.id,
          })
          .catch(() => undefined);

        return { index, result };
      })
    );

    if (!cancelled) await groupCreatedTabs();

    const results = indexedResults
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.index - b.index)
      .map((item) => item.result);

    await chrome.storage.local.set({
      distributionInProgress: false,
      distributionProgress: null,
    });

    await track('distribution_completed', {
      successCount: results.filter((result) => result.success).length,
      failureCount: results.filter((result) => !result.success).length,
    });

    currentDistribution = null;
    return results;
  }

  async function sendToProduct(product: Product, prompt: string): Promise<DistributionResult> {
    const existingTabs = await chrome.tabs.query({ url: product.matches });
    const existingTab = existingTabs.find(
      (tab: { id?: number; url?: string }) => tab.id && !isLoginUrl(tab.url, product)
    );

    if (existingTab?.id) {
      const existingResult = await tryFill(existingTab.id, product, prompt);
      if (existingResult.success || existingResult.errorCode !== 'CONTENT_SCRIPT_UNAVAILABLE') {
        return toResult(product, existingTab.id, true, existingResult);
      }
    }

    if (cancelled) {
      return toResult(product, undefined, false, failure('UNKNOWN', 'Cancelled'));
    }

    const newTab = await chrome.tabs.create({ url: product.url, active: false });
    if (!newTab.id) {
      return toResult(product, undefined, false, failure('UNKNOWN', 'Tab was not created'));
    }

    currentDistribution?.createdTabIds.push(newTab.id);

    try {
      await waitForTabLoad(newTab.id);
      const refreshedTab = await chrome.tabs.get(newTab.id);
      if (isLoginUrl(refreshedTab.url, product)) {
        return toResult(product, newTab.id, false, failure('AUTH_REQUIRED', 'Sign in required'));
      }

      const fillResult = await tryFill(newTab.id, product, prompt);
      return toResult(product, newTab.id, false, fillResult);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = message === 'TAB_CLOSED' ? 'TAB_CLOSED' : 'PAGE_LOAD_TIMEOUT';
      return toResult(product, newTab.id, false, failure(errorCode, message));
    }
  }

  async function tryFill(
    tabId: number,
    product: Product,
    prompt: string
  ): Promise<FillPromptResponse> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'fillPrompt',
        productId: product.id,
        prompt,
      });

      return response ?? failure('CONTENT_SCRIPT_UNAVAILABLE', 'Page is not ready');
    } catch {
      return failure('CONTENT_SCRIPT_UNAVAILABLE', 'Page is not ready');
    }
  }

  async function waitForTabLoad(tabId: number, timeout = 30000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (cancelled) throw new Error('TAB_CLOSED');

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

  async function groupCreatedTabs(): Promise<void> {
    const tabIds = currentDistribution?.createdTabIds.filter(Boolean) ?? [];
    if (tabIds.length < 2) return;

    try {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: 'Chorus',
        color: 'grey',
        collapsed: false,
      });
    } catch {
      // Grouping is helpful but not required for a successful distribution.
    }
  }

  async function cancelDistribution(_request: CancelDistributionRequest): Promise<void> {
    cancelled = true;
    const createdTabIds = currentDistribution?.createdTabIds ?? [];
    if (createdTabIds.length > 0) {
      await chrome.tabs.remove(createdTabIds).catch(() => undefined);
    }

    await chrome.storage.local.set({
      distributionInProgress: false,
      distributionProgress: null,
    });
    await track('distribution_cancelled');
    chrome.runtime.sendMessage({ action: 'distributionCancelled' }).catch(() => undefined);
  }

  async function setProgress(
    completed: number,
    total: number,
    productId?: Product['id']
  ): Promise<void> {
    await chrome.storage.local.set({
      distributionInProgress: completed < total,
      distributionProgress: { completed, total, productId },
    });
  }
});

function isLoginUrl(url: string | undefined, product: Product): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return product.loginHints.some((hint) => lowerUrl.includes(hint.toLowerCase()));
}

function failure(errorCode: DistributionResult['errorCode'], error: string): FillPromptResponse {
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
