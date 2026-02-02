import type { FillPromptRequest, FillPromptResponse } from '../types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // Listen for messages from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'fillPrompt') {
        const { prompt, selector, submitSelector } = request as FillPromptRequest;
        fillPrompt(prompt, selector, submitSelector)
          .then((result) => {
            sendResponse(result);
          })
          .catch((error: Error) => {
            sendResponse({
              success: false,
              error: error.message,
            });
          });
        return true; // Keep message channel open for async response
      }
    });

    console.log('Chorus content script loaded');
  },
});

// Fill prompt into input field
async function fillPrompt(
  prompt: string,
  customSelector?: string,
  customSubmitSelector?: string
): Promise<FillPromptResponse> {
  try {
    console.log('Chorus: Starting fill prompt, selector:', customSelector);

    // Try to locate input element
    const inputElement = await findInputElement(customSelector);

    if (!inputElement) {
      console.warn('Chorus: Input field not found');
      return {
        success: false,
        error: 'Input field not found',
      };
    }

    console.log('Chorus: Found input element:', inputElement.tagName, inputElement.className);

    // Fill content
    await fillContent(inputElement, prompt);

    // Wait for button to become enabled
    // Some platforms need longer wait time
    const hostname = window.location.hostname;
    const waitTime =
      hostname.includes('baidu.com') || hostname.includes('doubao.com') ? 1500 : 800;
    console.log(`Chorus: Waiting ${waitTime}ms for button to enable...`);
    await sleep(waitTime);

    // Try auto-submit (whether custom selector is configured or not)
    const submitResult = await autoSubmit(customSubmitSelector, inputElement);
    if (!submitResult.success) {
      console.warn('Chorus: Auto-submit failed', submitResult.error);
    }

    return {
      success: true,
      message: submitResult.success
        ? 'Prompt filled and sent successfully'
        : 'Prompt filled successfully',
    };
  } catch (error) {
    console.error('Chorus: Fill prompt error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Find input element
async function findInputElement(
  customSelector?: string,
  maxRetries = 5,
  retryDelay = 800
): Promise<HTMLElement | null> {
  for (let i = 0; i < maxRetries; i++) {
    let element: HTMLElement | null = null;
    console.log(`Chorus: Finding input element, attempt ${i + 1}/${maxRetries}`);

    // 1. If custom selector provided, use it first
    if (customSelector) {
      element = document.querySelector(customSelector) as HTMLElement;
      if (element && isVisible(element)) {
        console.log('Chorus: Found element with custom selector');
        return element;
      }
    }

    // 2. Try common input field selectors (ordered by priority)
    const selectors = [
      // Modern AI products common selectors
      '#prompt-textarea',
      '[data-testid="text-input"]',
      'div[contenteditable="true"][data-placeholder]',
      'div.ProseMirror[contenteditable="true"]',

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

      // Generic selectors (last resort)
      'textarea',
      'input[type="text"]',
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Chorus: Selector "${selector}" found ${elements.length} elements`);

        // Filter hidden elements
        for (const el of elements) {
          if (isVisible(el as HTMLElement) && isEditable(el as HTMLElement)) {
            element = el as HTMLElement;
            console.log('Chorus: Found visible editable element with selector:', selector);
            break;
          }
        }

        if (element) break;
      } catch (e) {
        // Ignore invalid selector errors
      }
    }

    if (element) {
      return element;
    }

    // If not found and retries remain, wait and retry
    if (i < maxRetries - 1) {
      console.log(`Chorus: Waiting ${retryDelay}ms before retry...`);
      await sleep(retryDelay);
    }
  }

  console.warn('Chorus: Could not find input element after', maxRetries, 'attempts');
  return null;
}

// Check if element is visible
function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

// Check if element is editable
function isEditable(element: HTMLElement): boolean {
  if ((element as any).disabled || (element as any).readOnly) {
    return false;
  }

  if ((element as any).contentEditable === 'true') {
    return true;
  }

  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return true;
  }

  return false;
}

// Fill content into element
async function fillContent(element: HTMLElement, content: string): Promise<void> {
  console.log('Chorus: Filling content to element:', element.tagName, element.className);

  // Check if specific platform needs special handling
  const hostname = window.location.hostname;
  const needsSpecialHandling =
    hostname.includes('baidu.com') || hostname.includes('doubao.com');

  if (needsSpecialHandling) {
    console.log('Chorus: Using special handling for', hostname);
    await fillWithTypingSimulation(element, content);
  } else {
    await fillWithEvents(element, content);
  }

  // Focus again
  element.focus();

  // Move cursor to end
  if ((element as any).setSelectionRange) {
    (element as any).setSelectionRange(content.length, content.length);
  } else if ((element as any).contentEditable === 'true') {
    const range = document.createRange();
    const selection = window.getSelection();
    if (selection) {
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  await sleep(300);
  console.log('Chorus: Content filled successfully');
}

// Standard fill method (using events)
async function fillWithEvents(element: HTMLElement, content: string): Promise<void> {
  // Focus element
  element.focus();
  await sleep(100);

  // Fill content based on element type
  if ((element as any).contentEditable === 'true') {
    // Contenteditable element (like Claude)
    element.innerHTML = '';
    const textNode = document.createTextNode(content);
    element.appendChild(textNode);

    // Trigger various events to ensure React/Vue detect changes
    const events = ['focus', 'input', 'change', 'keyup', 'keydown'];
    events.forEach((eventType) => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  } else {
    // Textarea or Input element
    (element as any).value = content;

    // Use nativeInputValueSetter (React app compatibility)
    try {
      const prototype =
        element.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(element, content);
      }
    } catch (e) {
      console.warn('Chorus: nativeInputValueSetter failed', e);
    }

    // Trigger all relevant events
    const events = [
      new Event('focus', { bubbles: true }),
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new KeyboardEvent('keydown', { bubbles: true, key: 'a' }),
      new KeyboardEvent('keypress', { bubbles: true, key: 'a' }),
      new KeyboardEvent('keyup', { bubbles: true, key: 'a' }),
    ];

    events.forEach((event, index) => {
      setTimeout(() => element.dispatchEvent(event), index * 10);
    });
  }
}

// Efficient React/Vue controlled component fill solution
async function fillWithTypingSimulation(element: HTMLElement, content: string): Promise<void> {
  element.focus();
  await sleep(200);

  // Method 1: Try using execCommand('insertText') - most elegant and efficient
  if (document.execCommand) {
    try {
      // Select all first
      (element as any).select?.();
      await sleep(50);

      // Use insertText command to insert (this will replace selected content)
      const success = document.execCommand('insertText', false, content);

      if (success) {
        console.log('Chorus: Used execCommand insertText successfully');
        // Trigger necessary events to ensure framework awareness
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    } catch (e) {
      console.warn('Chorus: execCommand failed, falling back to chunked input', e);
    }
  }

  // Method 2: Chunked input (20-50x faster than character by character)
  console.log('Chorus: Using chunked input fallback');

  // Clear first
  if ((element as any).contentEditable === 'true') {
    element.innerHTML = '';
  } else {
    (element as any).value = '';
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  // Chunk size: 50 characters per chunk
  const chunkSize = 50;
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }

  // Input chunk by chunk (max 20 chunks, rest goes in directly)
  for (let i = 0; i < chunks.length && i < 20; i++) {
    const chunk = chunks[i];

    if ((element as any).contentEditable === 'true') {
      element.textContent += chunk;
    } else {
      (element as any).value += chunk;
    }

    // Trigger input event
    element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: chunk,
      })
    );

    // Short pause (10ms), imperceptible but enough for framework processing
    await sleep(10);
  }

  // If remaining (case of >1000 characters), insert directly
  if (chunks.length > 20) {
    const remaining = chunks.slice(20).join('');
    if ((element as any).contentEditable === 'true') {
      element.textContent += remaining;
    } else {
      (element as any).value += remaining;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Finally trigger change event
  await sleep(50);
  element.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('Chorus: Chunked input completed');
}

// Auto-submit message
async function autoSubmit(
  customSubmitSelector?: string,
  inputElement?: HTMLElement,
  maxRetries = 12,
  retryDelay = 500
): Promise<{ success: boolean; message?: string; error?: string }> {
  const hostname = window.location.hostname;
  console.log(`Chorus: Auto-submit starting for ${hostname}`);

  for (let i = 0; i < maxRetries; i++) {
    console.log(`Chorus: Auto-submit attempt ${i + 1}/${maxRetries}`);

    // 1. If custom selector provided, use it first
    if (customSubmitSelector) {
      const button = document.querySelector(customSubmitSelector) as HTMLElement;
      if (
        button &&
        isVisible(button) &&
        !(button as any).disabled &&
        !button.getAttribute('aria-disabled')
      ) {
        console.log('Chorus: Found submit button with custom selector');
        await clickButton(button);
        return { success: true, message: 'Auto-submitted successfully' };
      }
    }

    // 2. Try platform-specific selectors
    const platformSelectors = getPlatformSpecificSelectors(hostname);
    for (const selector of platformSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (
            isVisible(btn as HTMLElement) &&
            !(btn as any).disabled &&
            btn.getAttribute('aria-disabled') !== 'true'
          ) {
            console.log('Chorus: Found platform-specific button:', selector);
            await clickButton(btn as HTMLElement);
            return { success: true, message: 'Auto-submitted via platform selector' };
          }
        }
      } catch (e) {
        // Ignore selector errors
      }
    }

    // 3. Try common send button selectors
    const commonSelectors = [
      // ChatGPT specific
      'button[data-testid="send-button"]:not([disabled])',
      'button[data-testid="send-button"]:not([aria-disabled="true"])',

      // Claude specific
      'button[aria-label="Send message"]:not([disabled])',

      // Generic selectors
      'button[data-testid="submit-button"]:not([disabled])',
      'button[aria-label*="send" i]:not([disabled])',
      'button[aria-label*="submit" i]:not([disabled])',
      'button[aria-label*="发送" i]:not([disabled])',
      'button[type="submit"]:not([disabled])',
      'button[class*="send" i]:not([disabled])',

      // SVG icon buttons
      'button svg[class*="send" i]',
      'button svg[class*="arrow-up" i]',
      'button:has(> svg):not([disabled])',
    ];

    for (const selector of commonSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (
            isVisible(btn as HTMLElement) &&
            !(btn as any).disabled &&
            btn.getAttribute('aria-disabled') !== 'true'
          ) {
            // Filter out obviously non-send buttons
            const text = btn.textContent?.toLowerCase() || '';
            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';

            // Skip cancel, close buttons
            if (
              text.includes('cancel') ||
              text.includes('取消') ||
              text.includes('close') ||
              text.includes('关闭') ||
              text.includes('stop') ||
              text.includes('停止') ||
              ariaLabel.includes('cancel') ||
              ariaLabel.includes('close')
            ) {
              continue;
            }

            console.log('Chorus: Found submit button:', selector);
            await clickButton(btn as HTMLElement);
            return { success: true, message: 'Auto-submitted successfully' };
          }
        }
      } catch (e) {
        // Ignore selector errors
      }
    }

    // 4. Try submitting with Enter key (effective for textarea)
    if (
      inputElement &&
      (inputElement.tagName === 'TEXTAREA' ||
        (inputElement as any).contentEditable === 'true')
    ) {
      console.log('Chorus: Trying Enter key submission');
      const enterResult = await submitWithEnterKey(inputElement);
      if (enterResult.success) {
        return enterResult;
      }
    }

    // If not found and retries remain, wait and retry
    if (i < maxRetries - 1) {
      console.log(`Chorus: Waiting ${retryDelay}ms before retry...`);
      await sleep(retryDelay);
    }
  }

  return {
    success: false,
    error: 'Send button not found or disabled after all retries',
  };
}

// Get platform-specific selectors
function getPlatformSpecificSelectors(hostname: string): string[] {
  const selectors: string[] = [];

  if (hostname.includes('baidu.com')) {
    selectors.push(
      'button[type="submit"]:not([disabled])',
      '.send-btn:not([disabled])',
      'button.send-button:not([disabled])',
      '[class*="send" i][class*="btn" i]:not([disabled])'
    );
  }

  if (hostname.includes('doubao.com')) {
    selectors.push(
      'button[aria-label*="发送" i]:not([disabled])',
      'button[class*="send" i]:not([disabled])',
      'button[type="submit"]:not([disabled])',
      '[data-testid*="send" i]:not([disabled])'
    );
  }

  if (hostname.includes('coze.cn')) {
    selectors.push(
      'button[type="submit"]:not([disabled])',
      'button.send-button:not([disabled])'
    );
  }

  return selectors;
}

// Submit using Enter key (suitable for textarea elements)
async function submitWithEnterKey(
  element: HTMLElement
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    element.focus();
    await sleep(200);

    // Simulate pressing Enter key (without Shift, Shift+Enter is usually line break)
    const keyOptions = {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      charCode: 13,
    };

    // First trigger beforeinput and input (some modern frameworks use this)
    const beforeInputEvent = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertLineBreak',
    });
    element.dispatchEvent(beforeInputEvent);

    await sleep(50);

    // Trigger keydown
    const keydownEvent = new KeyboardEvent('keydown', keyOptions);
    element.dispatchEvent(keydownEvent);

    await sleep(50);

    // Trigger keypress (some old websites use this)
    const keypressEvent = new KeyboardEvent('keypress', keyOptions);
    element.dispatchEvent(keypressEvent);

    await sleep(50);

    // Trigger input event
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertLineBreak',
    });
    element.dispatchEvent(inputEvent);

    await sleep(50);

    // Trigger keyup
    const keyupEvent = new KeyboardEvent('keyup', keyOptions);
    element.dispatchEvent(keyupEvent);

    // Finally trigger change again
    await sleep(50);
    element.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(100);

    console.log('Chorus: Enter key events dispatched');
    return { success: true, message: 'Submitted via Enter key' };
  } catch (error) {
    console.warn('Chorus: Enter key submission failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Click button
async function clickButton(button: HTMLElement): Promise<void> {
  console.log(
    'Chorus: Clicking button',
    button.className,
    button.getAttribute('data-testid')
  );

  // Scroll button into view
  button.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  await sleep(50);

  // Focus button
  button.focus();
  await sleep(50);

  // Get button position
  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // Trigger mouse events (simulate real mouse click)
  const mouseOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
  };

  button.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
  await sleep(50);
  button.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
  await sleep(50);
  button.dispatchEvent(new MouseEvent('click', mouseOptions));

  // Fallback: native click
  button.click();

  await sleep(100);
}

// Delay function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
