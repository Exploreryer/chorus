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
  
  // 创建标签组
  let groupId = null;
  try {
    groupId = await chrome.tabs.group({ tabIds: [] });
    await chrome.tabGroups.update(groupId, {
      title: 'Chorus AI 横评',
      color: 'grey',
      collapsed: false
    });
  } catch (error) {
    console.warn('Failed to create tab group:', error);
    // 如果标签组创建失败，继续正常流程
  }
  
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
      
      // 将标签添加到标签组
      if (groupId !== null) {
        try {
          await chrome.tabs.group({ tabIds: [tab.id], groupId });
        } catch (error) {
          console.warn('Failed to add tab to group:', error);
        }
      }
      
      // 等待页面加载完成
      await waitForTabLoad(tab.id);
      
      // 检查是否已取消
      if (distributionCancelled) {
        break;
      }
      
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
          reject(new Error('标签页已关闭'));
          return;
        }
        
        if (tab.status === 'complete') {
          // 额外等待 1 秒确保页面完全渲染
          setTimeout(() => resolve(), 1000);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('页面加载超时'));
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
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: 'fillPrompt',
        prompt,
        selector: customSelector,
        submitSelector: customSubmitSelector
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: '无法与页面通信: ' + chrome.runtime.lastError.message
          });
        } else {
          resolve(response || { success: false, error: '未收到响应' });
        }
      }
    );
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
