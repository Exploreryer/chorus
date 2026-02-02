import type {
  Product,
  DistributionResult,
  DistributionState,
  DistributeRequest,
  CancelDistributionRequest,
  DistributeResponse,
} from '../types';

export default defineBackground(() => {
  // Global variables for distribution state
  let currentDistribution: DistributionState | null = null;
  let distributionCancelled = false;

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'distribute') {
      const { prompt, products } = request as DistributeRequest;
      distributionCancelled = false;
      handleDistribute(prompt, products)
        .then((results) => {
          if (distributionCancelled) {
            sendResponse({ cancelled: true });
          } else {
            sendResponse({ success: true, results });
          }
        })
        .catch((error: Error) => {
          if (distributionCancelled) {
            sendResponse({ cancelled: true });
          } else {
            sendResponse({ success: false, error: error.message });
          }
        });
      return true; // Keep message channel open for async response
    } else if (request.action === 'cancelDistribution') {
      distributionCancelled = true;
      if (currentDistribution && currentDistribution.tabIds) {
        // Close created tabs
        currentDistribution.tabIds.forEach((tabId) => {
          chrome.tabs.remove(tabId).catch(() => {});
        });
      }
      // Clear progress state
      chrome.storage.local.set({
        distributionInProgress: false,
        distributionProgress: null,
      });
      // Notify popup of cancellation
      chrome.runtime.sendMessage({
        action: 'distributionCancelled',
      }).catch(() => {});
      sendResponse({ success: true });
      return true;
    }
  });

  // Handle distribution logic
  async function handleDistribute(
    prompt: string,
    products: Product[]
  ): Promise<DistributionResult[]> {
    const results: DistributionResult[] = [];
    const delay = 500; // Interval between tab creation (ms)
    let completed = 0;
    const tabIds: number[] = [];

    // Save current distribution state
    currentDistribution = { tabIds };

    // Initialize progress state
    await chrome.storage.local.set({
      distributionInProgress: true,
      distributionProgress: {
        completed: 0,
        total: products.length,
      },
    });

    // Create tab group (delayed until first tab is created)
    let groupId: number | null = null;

    for (const product of products) {
      // Check if cancelled
      if (distributionCancelled) {
        break;
      }

      try {
        // Create new tab
        const tab = await chrome.tabs.create({
          url: product.url,
          active: false, // Don't switch to new tab automatically
        });

        if (!tab.id) continue;

        tabIds.push(tab.id);
        currentDistribution.tabIds = tabIds;

        // Check if cancelled
        if (distributionCancelled) {
          break;
        }

        // Add tab to group (first tab creates group, subsequent add to group)
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
          console.warn('Failed to add tab to group:', error);
        }

        // Wait for page to load
        await waitForTabLoad(tab.id);

        // Check if cancelled
        if (distributionCancelled) {
          break;
        }

        // Activate tab to ensure content filling and click operations work properly
        await chrome.tabs.update(tab.id, { active: true });
        await sleep(300);

        // Send fill instruction to content script
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

        // Update progress
        completed++;
        await updateProgress(completed, products.length);
        notifyProgress(completed, products.length);

        // Delay to avoid browser overload
        if (products.indexOf(product) < products.length - 1 && !distributionCancelled) {
          await sleep(delay);
        }
      } catch (error) {
        if (!distributionCancelled) {
          results.push({
            productName: product.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Update progress (even on failure)
          completed++;
          await updateProgress(completed, products.length);
          notifyProgress(completed, products.length);
        }
      }
    }

    // Clear progress state
    await chrome.storage.local.set({
      distributionInProgress: false,
      distributionProgress: null,
    });

    // Clear current distribution state
    currentDistribution = null;

    return results;
  }

  // Update progress state in storage
  async function updateProgress(completed: number, total: number): Promise<void> {
    await chrome.storage.local.set({
      distributionProgress: {
        completed,
        total,
      },
    });
  }

  // Notify progress update
  function notifyProgress(completed: number, total: number): void {
    chrome.runtime
      .sendMessage({
        action: 'distributionProgress',
        completed,
        total,
      })
      .catch(() => {
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
    // Wait for content script to be ready (retry mechanism)
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
