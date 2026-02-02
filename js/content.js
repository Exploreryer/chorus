// 内容脚本 - 注入到目标页面进行自动填充

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillPrompt') {
    fillPrompt(request.prompt, request.selector, request.submitSelector)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true; // 保持消息通道开启以支持异步响应
  }
});

// 填充 Prompt 到输入框
async function fillPrompt(prompt, customSelector, customSubmitSelector) {
  try {
    // 尝试定位输入框
    const inputElement = await findInputElement(customSelector);
    
    if (!inputElement) {
      return {
        success: false,
        error: '未找到输入框'
      };
    }
    
    // 填充内容
    await fillContent(inputElement, prompt);
    
    // 如果配置了发送按钮选择器，尝试自动发送
    if (customSubmitSelector) {
      const submitResult = await autoSubmit(customSubmitSelector);
      if (!submitResult.success) {
        console.warn('Chorus: 自动发送失败', submitResult.error);
      }
    }
    
    return {
      success: true,
      message: customSubmitSelector ? '已成功填充并发送 Prompt' : '已成功填充 Prompt'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 查找输入框元素
async function findInputElement(customSelector, maxRetries = 3, retryDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    let element = null;
    
    // 1. 如果提供了自定义选择器，优先使用
    if (customSelector) {
      element = document.querySelector(customSelector);
      if (element) return element;
    }
    
    // 2. 尝试常见的输入框选择器
    const selectors = [
      // Textarea
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="ask" i]',
      'textarea[placeholder*="输入" i]',
      'textarea[placeholder*="问" i]',
      'textarea:not([disabled]):not([readonly])',
      
      // Contenteditable
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]:not([disabled])',
      '[contenteditable="true"]',
      
      // Input
      'input[type="text"][placeholder*="message" i]',
      'input[type="text"][placeholder*="prompt" i]',
      'input[type="text"]:not([disabled]):not([readonly])',
      
      // 通用选择器（最后尝试）
      'textarea',
      'input[type="text"]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      
      // 过滤隐藏元素
      for (const el of elements) {
        if (isVisible(el) && isEditable(el)) {
          element = el;
          break;
        }
      }
      
      if (element) break;
    }
    
    if (element) {
      return element;
    }
    
    // 如果没找到且还有重试次数，等待后重试
    if (i < maxRetries - 1) {
      await sleep(retryDelay);
    }
  }
  
  return null;
}

// 检查元素是否可见
function isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 &&
         element.offsetHeight > 0;
}

// 检查元素是否可编辑
function isEditable(element) {
  if (element.disabled || element.readOnly) {
    return false;
  }
  
  if (element.contentEditable === 'true') {
    return true;
  }
  
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return true;
  }
  
  return false;
}

// 填充内容到元素
async function fillContent(element, content) {
  // 聚焦元素
  element.focus();
  await sleep(100);
  
  // 根据元素类型填充内容
  if (element.contentEditable === 'true') {
    // Contenteditable 元素
    element.textContent = content;
    
    // 触发 input 事件
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Textarea 或 Input 元素
    
    // 方法 1: 直接设置 value
    element.value = content;
    
    // 方法 2: 使用 nativeInputValueSetter (React 应用)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, content);
    }
    
    // 触发所有相关事件
    const events = [
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new KeyboardEvent('keydown', { bubbles: true }),
      new KeyboardEvent('keyup', { bubbles: true }),
      new KeyboardEvent('keypress', { bubbles: true })
    ];
    
    events.forEach(event => element.dispatchEvent(event));
  }
  
  // 再次聚焦确保光标在正确位置
  element.focus();
  
  // 将光标移到末尾
  if (element.setSelectionRange) {
    element.setSelectionRange(content.length, content.length);
  } else if (element.contentEditable === 'true') {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  await sleep(100);
}

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 自动发送消息
async function autoSubmit(customSubmitSelector, maxRetries = 3, retryDelay = 500) {
  for (let i = 0; i < maxRetries; i++) {
    let submitButton = null;
    
    // 1. 如果提供了自定义选择器，优先使用
    if (customSubmitSelector) {
      submitButton = document.querySelector(customSubmitSelector);
      if (submitButton && isVisible(submitButton) && !submitButton.disabled) {
        await clickButton(submitButton);
        return { success: true, message: '已自动发送' };
      }
    }
    
    // 2. 尝试常见的发送按钮选择器
    const selectors = [
      // 按 data-testid
      'button[data-testid="send-button"]',
      'button[data-testid="submit-button"]',
      
      // 按 aria-label
      'button[aria-label*="send" i]:not([disabled])',
      'button[aria-label*="submit" i]:not([disabled])',
      'button[aria-label*="发送" i]:not([disabled])',
      'button[aria-label*="提交" i]:not([disabled])',
      
      // 按 type
      'button[type="submit"]:not([disabled])',
      
      // 按 class
      'button[class*="send" i]:not([disabled])',
      'button[class*="submit" i]:not([disabled])',
      
      // 通用选择器（包含发送图标的按钮）
      'button:has(svg):not([disabled])',
      
      // 最后尝试：输入框附近的按钮
      'form button[type="submit"]:not([disabled])',
      'form button:not([disabled])'
    ];
    
    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);
      for (const btn of buttons) {
        if (isVisible(btn) && !btn.disabled) {
          // 过滤掉一些明显不是发送按钮的
          const text = btn.textContent.toLowerCase();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          
          // 跳过取消、关闭等按钮
          if (text.includes('cancel') || text.includes('取消') || 
              text.includes('close') || text.includes('关闭') ||
              ariaLabel.includes('cancel') || ariaLabel.includes('close')) {
            continue;
          }
          
          submitButton = btn;
          break;
        }
      }
      if (submitButton) break;
    }
    
    if (submitButton) {
      await clickButton(submitButton);
      return { success: true, message: '已自动发送' };
    }
    
    // 如果没找到且还有重试次数，等待后重试
    if (i < maxRetries - 1) {
      await sleep(retryDelay);
    }
  }
  
  return {
    success: false,
    error: '未找到发送按钮'
  };
}

// 点击按钮
async function clickButton(button) {
  // 聚焦按钮
  button.focus();
  await sleep(100);
  
  // 触发点击事件
  button.click();
  
  // 也触发鼠标事件（兼容性）
  const mouseEvents = [
    new MouseEvent('mousedown', { bubbles: true }),
    new MouseEvent('mouseup', { bubbles: true }),
    new MouseEvent('click', { bubbles: true })
  ];
  
  mouseEvents.forEach(event => button.dispatchEvent(event));
  
  await sleep(100);
}

// 页面加载完成后的初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Chorus content script loaded');
  });
} else {
  console.log('Chorus content script loaded');
}
