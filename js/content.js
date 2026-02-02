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
    console.log('Chorus: Starting fill prompt, selector:', customSelector);

    // 尝试定位输入框
    const inputElement = await findInputElement(customSelector);

    if (!inputElement) {
      console.warn('Chorus: Input field not found');
      return {
        success: false,
        error: 'Input field not found'
      };
    }

    console.log('Chorus: Found input element:', inputElement.tagName, inputElement.className);

    // 填充内容
    await fillContent(inputElement, prompt);

    // 等待按钮从禁用状态变为可用状态
    // 对于特定平台需要更长的等待时间
    const hostname = window.location.hostname;
    const waitTime = (hostname.includes('baidu.com') || hostname.includes('doubao.com')) ? 1500 : 800;
    console.log(`Chorus: Waiting ${waitTime}ms for button to enable...`);
    await sleep(waitTime);

    // 尝试自动发送（无论是否配置了自定义选择器都尝试）
    const submitResult = await autoSubmit(customSubmitSelector, inputElement);
    if (!submitResult.success) {
      console.warn('Chorus: Auto-submit failed', submitResult.error);
    }

    return {
      success: true,
      message: submitResult.success ? 'Prompt filled and sent successfully' : 'Prompt filled successfully'
    };
  } catch (error) {
    console.error('Chorus: Fill prompt error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 查找输入框元素
async function findInputElement(customSelector, maxRetries = 5, retryDelay = 800) {
  for (let i = 0; i < maxRetries; i++) {
    let element = null;
    console.log(`Chorus: Finding input element, attempt ${i + 1}/${maxRetries}`);

    // 1. 如果提供了自定义选择器，优先使用
    if (customSelector) {
      element = document.querySelector(customSelector);
      if (element && isVisible(element)) {
        console.log('Chorus: Found element with custom selector');
        return element;
      }
    }

    // 2. 尝试常见的输入框选择器（按优先级排序）
    const selectors = [
      // 现代 AI 产品常见选择器
      '#prompt-textarea',  // ChatGPT
      '[data-testid="text-input"]',  // 通用测试 ID
      'div[contenteditable="true"][data-placeholder]',  // Claude 等
      'div.ProseMirror[contenteditable="true"]',  // 使用 ProseMirror 的编辑器

      // Textarea
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="ask" i]',
      'textarea[placeholder*="输入" i]',
      'textarea[placeholder*="问" i]',
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Send" i]',
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
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Chorus: Selector "${selector}" found ${elements.length} elements`);

        // 过滤隐藏元素
        for (const el of elements) {
          if (isVisible(el) && isEditable(el)) {
            element = el;
            console.log('Chorus: Found visible editable element with selector:', selector);
            break;
          }
        }

        if (element) break;
      } catch (e) {
        // 忽略无效选择器错误
      }
    }

    if (element) {
      return element;
    }

    // 如果没找到且还有重试次数，等待后重试
    if (i < maxRetries - 1) {
      console.log(`Chorus: Waiting ${retryDelay}ms before retry...`);
      await sleep(retryDelay);
    }
  }

  console.warn('Chorus: Could not find input element after', maxRetries, 'attempts');
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
  console.log('Chorus: Filling content to element:', element.tagName, element.className);

  // 检查是否是特定平台需要特殊处理
  const hostname = window.location.hostname;
  const needsSpecialHandling = hostname.includes('baidu.com') || hostname.includes('doubao.com');

  if (needsSpecialHandling) {
    console.log('Chorus: Using special handling for', hostname);
    await fillWithTypingSimulation(element, content);
  } else {
    await fillWithEvents(element, content);
  }

  // 再次聚焦
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

  await sleep(300);
  console.log('Chorus: Content filled successfully');
}

// 标准填充方式（使用事件）
async function fillWithEvents(element, content) {
  // 聚焦元素
  element.focus();
  await sleep(100);

  // 根据元素类型填充内容
  if (element.contentEditable === 'true') {
    // Contenteditable 元素（如 Claude）
    element.innerHTML = '';
    const textNode = document.createTextNode(content);
    element.appendChild(textNode);

    // 触发多种事件以确保 React/Vue 检测到变化
    const events = ['focus', 'input', 'change', 'keyup', 'keydown'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  } else {
    // Textarea 或 Input 元素

    // 方法 1: 直接设置 value
    element.value = content;

    // 方法 2: 使用 nativeInputValueSetter (React 应用兼容性)
    try {
      const prototype = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(element, content);
      }
    } catch (e) {
      console.warn('Chorus: nativeInputValueSetter failed', e);
    }

    // 触发所有相关事件
    const events = [
      new Event('focus', { bubbles: true }),
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new KeyboardEvent('keydown', { bubbles: true, key: 'a' }),
      new KeyboardEvent('keypress', { bubbles: true, key: 'a' }),
      new KeyboardEvent('keyup', { bubbles: true, key: 'a' })
    ];

    events.forEach((event, index) => {
      setTimeout(() => element.dispatchEvent(event), index * 10);
    });
  }
}

// 高效的 React/Vue 受控组件填充方案
async function fillWithTypingSimulation(element, content) {
  element.focus();
  await sleep(200);

  // 方案 1: 尝试使用 execCommand('insertText') - 最优雅且高效
  // 这会正确触发受控组件的更新，且支持任意长度文本
  if (document.execCommand) {
    try {
      // 先全选
      element.select();
      await sleep(50);

      // 使用 insertText 命令插入（这会替换选中的内容）
      const success = document.execCommand('insertText', false, content);

      if (success) {
        console.log('Chorus: Used execCommand insertText successfully');
        // 触发必要的事件确保框架感知
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    } catch (e) {
      console.warn('Chorus: execCommand failed, falling back to chunked input', e);
    }
  }

  // 方案 2: 分段输入（比逐字符快 20-50 倍）
  console.log('Chorus: Using chunked input fallback');

  // 先清空
  if (element.contentEditable === 'true') {
    element.innerHTML = '';
  } else {
    element.value = '';
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  // 分段大小：50 字符为一段
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }

  // 逐段输入（最多 20 段，再多的话直接塞剩余内容）
  for (let i = 0; i < chunks.length && i < 20; i++) {
    const chunk = chunks[i];

    if (element.contentEditable === 'true') {
      element.textContent += chunk;
    } else {
      element.value += chunk;
    }

    // 触发输入事件
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: chunk
    }));

    // 短停顿（10ms），感知不到但足够框架处理
    await sleep(10);
  }

  // 如果还有剩余（超过 1000 字的情况），直接塞进去
  if (chunks.length > 20) {
    const remaining = chunks.slice(20).join('');
    if (element.contentEditable === 'true') {
      element.textContent += remaining;
    } else {
      element.value += remaining;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 最后触发 change 事件
  await sleep(50);
  element.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('Chorus: Chunked input completed');
}

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 自动发送消息
async function autoSubmit(customSubmitSelector, inputElement, maxRetries = 12, retryDelay = 500) {
  const hostname = window.location.hostname;
  console.log(`Chorus: Auto-submit starting for ${hostname}`);

  for (let i = 0; i < maxRetries; i++) {
    console.log(`Chorus: Auto-submit attempt ${i + 1}/${maxRetries}`);

    // 1. 如果提供了自定义选择器，优先使用
    if (customSubmitSelector) {
      const button = document.querySelector(customSubmitSelector);
      if (button && isVisible(button) && !button.disabled && !button.getAttribute('aria-disabled')) {
        console.log('Chorus: Found submit button with custom selector');
        await clickButton(button);
        return { success: true, message: 'Auto-submitted successfully' };
      }
    }

    // 2. 尝试平台特定的选择器
    const platformSelectors = getPlatformSpecificSelectors(hostname);
    for (const selector of platformSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (isVisible(btn) && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
            console.log('Chorus: Found platform-specific button:', selector);
            await clickButton(btn);
            return { success: true, message: 'Auto-submitted via platform selector' };
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }

    // 3. 尝试常见的发送按钮选择器
    const commonSelectors = [
      // ChatGPT 特定
      'button[data-testid="send-button"]:not([disabled])',
      'button[data-testid="send-button"]:not([aria-disabled="true"])',

      // Claude 特定
      'button[aria-label="Send message"]:not([disabled])',

      // 通用选择器
      'button[data-testid="submit-button"]:not([disabled])',
      'button[aria-label*="send" i]:not([disabled])',
      'button[aria-label*="submit" i]:not([disabled])',
      'button[aria-label*="发送" i]:not([disabled])',
      'button[type="submit"]:not([disabled])',
      'button[class*="send" i]:not([disabled])',

      // SVG 图标按钮
      'button svg[class*="send" i]',
      'button svg[class*="arrow-up" i]',
      'button:has(> svg):not([disabled])'
    ];

    for (const selector of commonSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (isVisible(btn) && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
            // 过滤掉一些明显不是发送按钮的
            const text = btn.textContent.toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

            // 跳过取消、关闭等按钮
            if (text.includes('cancel') || text.includes('取消') ||
                text.includes('close') || text.includes('关闭') ||
                text.includes('stop') || text.includes('停止') ||
                ariaLabel.includes('cancel') || ariaLabel.includes('close')) {
              continue;
            }

            console.log('Chorus: Found submit button:', selector);
            await clickButton(btn);
            return { success: true, message: 'Auto-submitted successfully' };
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }

    // 4. 尝试通过 Enter 键发送（对 textarea 有效）
    if (inputElement && (inputElement.tagName === 'TEXTAREA' || inputElement.contentEditable === 'true')) {
      console.log('Chorus: Trying Enter key submission');
      const enterResult = await submitWithEnterKey(inputElement);
      if (enterResult.success) {
        return enterResult;
      }
    }

    // 如果没找到且还有重试次数，等待后重试
    if (i < maxRetries - 1) {
      console.log(`Chorus: Waiting ${retryDelay}ms before retry...`);
      await sleep(retryDelay);
    }
  }

  return {
    success: false,
    error: 'Send button not found or disabled after all retries'
  };
}

// 获取平台特定的选择器
function getPlatformSpecificSelectors(hostname) {
  const selectors = [];

  if (hostname.includes('baidu.com')) {
    // 文心一言特定选择器
    selectors.push(
      'button[type="submit"]:not([disabled])',
      '.send-btn:not([disabled])',
      'button.send-button:not([disabled])',
      '[class*="send" i][class*="btn" i]:not([disabled])'
    );
  }

  if (hostname.includes('doubao.com')) {
    // 豆包特定选择器
    selectors.push(
      'button[aria-label*="发送" i]:not([disabled])',
      'button[class*="send" i]:not([disabled])',
      'button[type="submit"]:not([disabled])',
      '[data-testid*="send" i]:not([disabled])'
    );
  }

  if (hostname.includes('coze.cn')) {
    // Coze 特定选择器
    selectors.push(
      'button[type="submit"]:not([disabled])',
      'button.send-button:not([disabled])'
    );
  }

  return selectors;
}

// 使用 Enter 键发送（适用于 textarea 元素）
async function submitWithEnterKey(element) {
  try {
    element.focus();
    await sleep(200);

    // 模拟按 Enter 键（不包含 Shift，Shift+Enter 通常是换行）
    const keyOptions = {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      charCode: 13
    };

    // 先触发 beforeinput 和 input（某些现代框架使用）
    const beforeInputEvent = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertLineBreak'
    });
    element.dispatchEvent(beforeInputEvent);

    await sleep(50);

    // 触发 keydown
    const keydownEvent = new KeyboardEvent('keydown', keyOptions);
    element.dispatchEvent(keydownEvent);

    await sleep(50);

    // 触发 keypress（某些旧网站使用）
    const keypressEvent = new KeyboardEvent('keypress', keyOptions);
    element.dispatchEvent(keypressEvent);

    await sleep(50);

    // 触发 input 事件
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertLineBreak'
    });
    element.dispatchEvent(inputEvent);

    await sleep(50);

    // 触发 keyup
    const keyupEvent = new KeyboardEvent('keyup', keyOptions);
    element.dispatchEvent(keyupEvent);

    // 最后再触发一次 change
    await sleep(50);
    element.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(100);

    console.log('Chorus: Enter key events dispatched');
    return { success: true, message: 'Submitted via Enter key' };
  } catch (error) {
    console.warn('Chorus: Enter key submission failed', error);
    return { success: false, error: error.message };
  }
}

// 点击按钮
async function clickButton(button) {
  console.log('Chorus: Clicking button', button.className, button.getAttribute('data-testid'));

  // 滚动到按钮可见
  button.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  await sleep(50);

  // 聚焦按钮
  button.focus();
  await sleep(50);

  // 获取按钮的位置信息
  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // 触发鼠标事件（模拟真实鼠标点击）
  const mouseOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y
  };

  button.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
  await sleep(50);
  button.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
  await sleep(50);
  button.dispatchEvent(new MouseEvent('click', mouseOptions));

  // 备用：原生 click
  button.click();

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
