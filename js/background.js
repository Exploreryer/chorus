// 后台服务脚本 - 处理分发逻辑

// 全局变量跟踪分发状态
let currentDistribution = null;
let distributionCancelled = false;

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'distribute') {
    distributionCancelled = false;
    handleDistribute(request.prompt, request.products)
      .then(results => {
        if (distributionCancelled) {
          sendResponse({ cancelled: true });
        } else {
          sendResponse({ success: true, results });
        }
      })
      .catch(error => {
        if (distributionCancelled) {
          sendResponse({ cancelled: true });
        } else {
          sendResponse({ success: false, error: error.message });
        }
      });
    return true; // 保持消息通道开启以支持异步响应
  } else if (request.action === 'cancelDistribution') {
    distributionCancelled = true;
    if (currentDistribution && currentDistribution.tabIds) {
      // 关闭已创建的标签页
      currentDistribution.tabIds.forEach(tabId => {
        chrome.tabs.remove(tabId).catch(() => {});
      });
    }
    // 清除进度状态
    chrome.storage.local.set({
      distributionInProgress: false,
      distributionProgress: null
    });
    // 通知popup取消
    chrome.runtime.sendMessage({
      action: 'distributionCancelled'
    }).catch(() => {});
    sendResponse({ success: true });
    return true;
  }
});

// 处理分发逻辑
async function handleDistribute(prompt, products) {
  const results = [];
  const delay = 500; // 每个标签页创建间隔（毫秒）
  let completed = 0;
  const tabIds = [];
  
  // 保存当前分发状态
  currentDistribution = { tabIds };
  
  // 初始化进度状态
  await chrome.storage.local.set({
    distributionInProgress: true,
    distributionProgress: {
      completed: 0,
      total: products.length
    }
  });
  
  // 创建标签组（延迟到第一个标签页创建后）
  let groupId = null;
  
  for (const product of products) {
    // 检查是否已取消
    if (distributionCancelled) {
      break;
    }
    
    try {
      // 创建新标签页
      const tab = await chrome.tabs.create({
        url: product.url,
        active: false // 不自动切换到新标签页
      });
      
      tabIds.push(tab.id);
      currentDistribution.tabIds = tabIds;

      // 检查是否已取消
      if (distributionCancelled) {
        break;
      }

      // 将标签添加到标签组（第一个标签创建组，后续添加到组）
      try {
        if (groupId === null) {
          groupId = await chrome.tabs.group({ tabIds: [tab.id] });
          await chrome.tabGroups.update(groupId, {
            title: 'Chorus',
            color: 'grey',
            collapsed: false
          });
        } else {
          await chrome.tabs.group({ tabIds: [tab.id], groupId });
        }
      } catch (error) {
        console.warn('Failed to add tab to group:', error);
      }

      // 等待页面加载完成
      await waitForTabLoad(tab.id);

      // 检查是否已取消
      if (distributionCancelled) {
        break;
      }

      // 激活标签页以确保内容填充和点击操作能正常执行
      await chrome.tabs.update(tab.id, { active: true });
      await sleep(300);

      // 发送填充指令到 content script
      const fillResult = await fillPrompt(tab.id, prompt, product.selector, product.submitSelector);
      
      results.push({
        productName: product.name,
        success: fillResult.success,
        error: fillResult.error
      });
      
      // 更新进度
      completed++;
      await updateProgress(completed, products.length);
      notifyProgress(completed, products.length);
      
      // 延迟以避免浏览器负载过高
      if (products.indexOf(product) < products.length - 1 && !distributionCancelled) {
        await sleep(delay);
      }
    } catch (error) {
      if (!distributionCancelled) {
        results.push({
          productName: product.name,
          success: false,
          error: error.message
        });
        
        // 更新进度（即使失败也计入）
        completed++;
        await updateProgress(completed, products.length);
        notifyProgress(completed, products.length);
      }
    }
  }
  
  // 清除进度状态
  await chrome.storage.local.set({
    distributionInProgress: false,
    distributionProgress: null
  });
  
  // 清除当前分发状态
  currentDistribution = null;
  
  return results;
}

// 更新进度状态到存储
async function updateProgress(completed, total) {
  await chrome.storage.local.set({
    distributionProgress: {
      completed,
      total
    }
  });
}

// 通知进度更新
function notifyProgress(completed, total) {
  chrome.runtime.sendMessage({
    action: 'distributionProgress',
    completed,
    total
  }).catch(() => {
    // 忽略错误（popup 可能已关闭）
  });
}

// 等待标签页加载完成
function waitForTabLoad(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Tab closed'));
          return;
        }
        
        if (tab.status === 'complete') {
          // 额外等待 1 秒确保页面完全渲染
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

// 填充 Prompt 到页面
async function fillPrompt(tabId, prompt, customSelector, customSubmitSelector) {
  // 等待 content script 准备就绪（通过重试机制）
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await sendMessageToTab(tabId, {
        action: 'fillPrompt',
        prompt,
        selector: customSelector,
        submitSelector: customSubmitSelector
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

// 向标签页发送消息
function sendMessageToTab(tabId, message) {
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

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Chorus 插件已安装');
  } else if (details.reason === 'update') {
    console.log('Chorus 插件已更新');
  }
});
