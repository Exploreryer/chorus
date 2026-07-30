import type {
  FillPromptRequest,
  FillPromptResponse,
  ProductId,
  DistributionErrorCode,
} from '../types';

type Adapter = {
  inputSelectors: string[];
  submitSelectors: string[];
};

const adapters: Record<ProductId, Adapter> = {
  chatgpt: {
    inputSelectors: ['#prompt-textarea', 'div[contenteditable="true"][data-placeholder]'],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="发送提示"]',
    ],
  },
  claude: {
    inputSelectors: [
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][data-placeholder]',
    ],
    submitSelectors: [
      'button[aria-label="Send message"]',
      'button[aria-label="发送消息"]',
    ],
  },
  gemini: {
    inputSelectors: [
      'div.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'rich-textarea div[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[aria-label*="Send message" i]',
      'button[aria-label*="发送消息" i]',
      'button.send-button',
    ],
  },
  perplexity: {
    inputSelectors: [
      'textarea[placeholder]',
      'div[contenteditable="true"][role="textbox"]',
      'div.ProseMirror[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[aria-label*="Submit" i]',
      'button[aria-label*="Send" i]',
      'button[data-testid*="submit" i]',
    ],
  },
  grok: {
    inputSelectors: [
      'textarea[placeholder]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[data-testid="sendButton"]',
      'button[data-testid="send-button"]',
      'button[aria-label*="Send" i]',
    ],
  },
  manus: {
    inputSelectors: [
      'textarea[placeholder]',
      'div[contenteditable="true"][role="textbox"]',
      'div.ProseMirror[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[type="submit"]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="发送" i]',
    ],
  },
};

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://www.perplexity.ai/*',
    'https://perplexity.ai/*',
    'https://x.com/i/grok*',
    'https://manus.im/*',
    'https://www.manus.im/*',
  ],
  runAt: 'document_idle',

  main() {
    chrome.runtime.onMessage.addListener(
      (
        request: FillPromptRequest,
        _sender: unknown,
        sendResponse: (response?: FillPromptResponse) => void
      ) => {
        if (request.action !== 'fillPrompt') return;

        fillAndSubmit(request.productId, request.prompt)
          .then(sendResponse)
          .catch((error: unknown) => {
            sendResponse({
              success: false,
              errorCode: 'UNKNOWN',
              error: error instanceof Error ? error.message : 'Unknown error',
            } satisfies FillPromptResponse);
          });

        return true;
      }
    );
  },
});

async function fillAndSubmit(productId: ProductId, prompt: string): Promise<FillPromptResponse> {
  const adapter = adapters[productId];
  const input = await findVisibleElement(adapter.inputSelectors, 12, 500);

  if (!input) {
    return failure('INPUT_NOT_FOUND', 'Prompt input was not found');
  }

  await writePrompt(input, prompt);
  await sleep(350);

  const submit = await findVisibleElement(adapter.submitSelectors, 8, 350, true);
  if (!submit) {
    return failure('SUBMIT_NOT_FOUND', 'Prompt was filled but the send button was not found');
  }

  clickElement(submit);
  await sleep(250);

  return { success: true };
}

function failure(errorCode: DistributionErrorCode, error: string): FillPromptResponse {
  return { success: false, errorCode, error };
}

async function findVisibleElement(
  selectors: string[],
  attempts: number,
  delay: number,
  requireEnabled = false
): Promise<HTMLElement | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    for (const selector of selectors) {
      let elements: NodeListOf<Element>;
      try {
        elements = document.querySelectorAll(selector);
      } catch {
        continue;
      }

      for (const element of elements) {
        const htmlElement = element as HTMLElement;
        if (!isVisible(htmlElement)) continue;
        if (requireEnabled && isDisabled(htmlElement)) continue;
        return htmlElement;
      }
    }

    if (attempt < attempts - 1) await sleep(delay);
  }

  return null;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function isDisabled(element: HTMLElement): boolean {
  return (
    (element as HTMLButtonElement).disabled === true ||
    element.getAttribute('aria-disabled') === 'true'
  );
}

async function writePrompt(element: HTMLElement, prompt: string): Promise<void> {
  element.focus();

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (descriptor?.set) descriptor.set.call(element, prompt);
    else element.value = prompt;
  } else {
    element.textContent = '';
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    if (!document.execCommand('insertText', false, prompt)) {
      element.textContent = prompt;
    }
  }

  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: prompt,
    })
  );
  element.dispatchEvent(new Event('change', { bubbles: true }));

  await sleep(100);
}

function clickElement(element: HTMLElement): void {
  element.scrollIntoView({ block: 'nearest' });
  element.focus();
  element.click();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
