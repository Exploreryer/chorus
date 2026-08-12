import { defineContentScript } from 'wxt/utils/define-content-script';
import type {
  ContentScriptRequest,
  DistributionErrorCode,
  FillPromptResponse,
  InspectPageResponse,
  PlatformAdapter,
  ProductId,
} from '../types';
import { getPlatform, platformMatches } from '../utils/platforms';

export default defineContentScript({
  matches: platformMatches,
  runAt: 'document_idle',

  main() {
    chrome.runtime.onMessage.addListener(
      (
        request: ContentScriptRequest,
        _sender: unknown,
        sendResponse: (response?: FillPromptResponse | InspectPageResponse) => void
      ) => {
        if (request.action === 'inspectPage') {
          inspectPage(request.productId).then(sendResponse).catch(() => {
            sendResponse({
              ready: false,
              inputEmpty: false,
              conversationEmpty: false,
              authRequired: false,
            });
          });
          return true;
        }

        if (request.action === 'fillPrompt') {
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
      }
    );
  },
});

async function inspectPage(productId: ProductId): Promise<InspectPageResponse> {
  const adapter = getPlatform(productId)?.adapter;
  if (!adapter) {
    return {
      ready: false,
      inputEmpty: false,
      conversationEmpty: false,
      authRequired: false,
    };
  }

  const authRequired = Boolean(findVisibleElementNow(adapter.authSelectors));
  const input = findVisibleElementNow(adapter.inputSelectors);
  return {
    ready: Boolean(input),
    inputEmpty: Boolean(input && readInput(input).trim().length === 0),
    conversationEmpty: countElements(adapter.sentIndicators) === 0,
    authRequired,
  };
}

async function fillAndSubmit(productId: ProductId, prompt: string): Promise<FillPromptResponse> {
  const adapter = getPlatform(productId)?.adapter;
  if (!adapter) return failure('UNKNOWN', 'Unsupported product');

  if (findVisibleElementNow(adapter.authSelectors)) {
    return failure('AUTH_REQUIRED', 'Sign in required');
  }

  const input = await findVisibleElement(adapter.inputSelectors, 12, 500);
  if (!input) return failure('INPUT_NOT_FOUND', 'Prompt input was not found');
  if (readInput(input).trim().length > 0) {
    return failure('INPUT_NOT_EMPTY', 'The existing draft was left unchanged');
  }

  const before = captureConfirmationState(adapter, prompt);
  await writePrompt(input, prompt);
  await sleep(350);

  const submit = await findVisibleElement(adapter.submitSelectors, 8, 350, true);
  if (!submit) {
    return failure('SUBMIT_NOT_FOUND', 'Prompt was filled but the send button was not found');
  }

  clickElement(submit);
  const confirmed = await confirmSent(adapter, input, prompt, before);
  return confirmed
    ? { success: true }
    : failure('SUBMIT_NOT_CONFIRMED', 'Prompt was filled but sending was not confirmed');
}

interface ConfirmationState {
  sentCount: number;
  matchingPromptCount: number;
  generatingCount: number;
}

function captureConfirmationState(adapter: PlatformAdapter, prompt: string): ConfirmationState {
  return {
    sentCount: countElements(adapter.sentIndicators),
    matchingPromptCount: countMatchingText(adapter.sentIndicators, prompt),
    generatingCount: countElements(adapter.generatingIndicators),
  };
}

async function confirmSent(
  adapter: PlatformAdapter,
  input: HTMLElement,
  prompt: string,
  before: ConfirmationState
): Promise<boolean> {
  const start = Date.now();
  let inputClearedAt: number | null = null;

  while (Date.now() - start < adapter.confirmTimeoutMs) {
    const now = captureConfirmationState(adapter, prompt);
    if (now.matchingPromptCount > before.matchingPromptCount) return true;
    if (now.sentCount > before.sentCount) return true;
    if (now.generatingCount > before.generatingCount || now.generatingCount > 0) return true;

    if (readInput(input).trim().length === 0) {
      inputClearedAt ??= Date.now();
      if (Date.now() - inputClearedAt >= 800) return true;
    } else {
      inputClearedAt = null;
    }
    await sleep(200);
  }
  return false;
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
    const element = findVisibleElementNow(selectors, requireEnabled);
    if (element) return element;
    if (attempt < attempts - 1) await sleep(delay);
  }
  return null;
}

function findVisibleElementNow(
  selectors: string[],
  requireEnabled = false
): HTMLElement | null {
  for (const selector of selectors) {
    for (const element of queryAll(selector)) {
      const htmlElement = element as HTMLElement;
      if (!isVisible(htmlElement)) continue;
      if (requireEnabled && isDisabled(htmlElement)) continue;
      return htmlElement;
    }
  }
  return null;
}

function queryAll(selector: string): Element[] {
  try {
    return [...document.querySelectorAll(selector)];
  } catch {
    return [];
  }
}

function countElements(selectors: string[]): number {
  return selectors.reduce((count, selector) => count + queryAll(selector).length, 0);
}

function countMatchingText(selectors: string[], prompt: string): number {
  const expected = normalizeText(prompt);
  return selectors.reduce(
    (count, selector) =>
      count +
      queryAll(selector).filter((element) => normalizeText(element.textContent ?? '').includes(expected))
        .length,
    0
  );
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
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

function readInput(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.textContent ?? '';
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
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (!document.execCommand('insertText', false, prompt)) element.textContent = prompt;
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
