import './style.css';
import type { DistributeResponse, DistributionResult, ProductId } from '../../types';
import { defaultProducts } from '../../utils/defaultProducts';
import { currentLanguage, initLanguage, t, toggleLanguage } from '../../utils/i18n';
import { track } from '../../utils/analytics';

const DEFAULT_SELECTION = defaultProducts
  .filter((product) => product.defaultEnabled)
  .map((product) => product.id);

const elements = {
  tagline: document.getElementById('tagline') as HTMLParagraphElement,
  languageButton: document.getElementById('languageButton') as HTMLButtonElement,
  promptLabel: document.getElementById('promptLabel') as HTMLLabelElement,
  promptInput: document.getElementById('promptInput') as HTMLTextAreaElement,
  clearButton: document.getElementById('clearButton') as HTMLButtonElement,
  modelsLabel: document.getElementById('modelsLabel') as HTMLHeadingElement,
  modelsHint: document.getElementById('modelsHint') as HTMLParagraphElement,
  modelsGrid: document.getElementById('modelsGrid') as HTMLDivElement,
  progressPanel: document.getElementById('progressPanel') as HTMLDivElement,
  progressText: document.getElementById('progressText') as HTMLSpanElement,
  progressBar: document.getElementById('progressBar') as HTMLDivElement,
  cancelButton: document.getElementById('cancelButton') as HTMLButtonElement,
  resultsPanel: document.getElementById('resultsPanel') as HTMLElement,
  resultsTitle: document.getElementById('resultsTitle') as HTMLHeadingElement,
  resultsList: document.getElementById('resultsList') as HTMLDivElement,
  retryButton: document.getElementById('retryButton') as HTMLButtonElement,
  inlineMessage: document.getElementById('inlineMessage') as HTMLParagraphElement,
  askButton: document.getElementById('askButton') as HTMLButtonElement,
  privacyNote: document.getElementById('privacyNote') as HTMLParagraphElement,
};

let selectedProductIds = new Set<ProductId>();
let isSending = false;
let lastFailedProductIds: ProductId[] = [];

async function init(): Promise<void> {
  await initLanguage();
  selectedProductIds = new Set(await loadSelection());
  bindEvents();
  renderAll();
  await restoreProgress();
  await track('popup_opened');
}

async function loadSelection(): Promise<ProductId[]> {
  const stored = await chrome.storage.local.get(['selectedProductIds', 'products']);

  if (Array.isArray(stored.selectedProductIds)) {
    const supported = stored.selectedProductIds.filter((id: string) =>
      defaultProducts.some((product) => product.id === id)
    ) as ProductId[];
    if (supported.length > 0) return supported;
  }

  if (Array.isArray(stored.products)) {
    const migrated = stored.products
      .filter((product: { id?: string; enabled?: boolean }) => product.enabled)
      .map((product: { id: ProductId }) => product.id)
      .filter((id: ProductId) => defaultProducts.some((product) => product.id === id));
    if (migrated.length > 0) {
      await saveSelection(migrated);
      return migrated;
    }
  }

  await saveSelection(DEFAULT_SELECTION);
  return DEFAULT_SELECTION;
}

async function saveSelection(ids: ProductId[] = [...selectedProductIds]): Promise<void> {
  await chrome.storage.local.set({ selectedProductIds: ids });
}

function bindEvents(): void {
  elements.promptInput.addEventListener('input', () => {
    clearMessage();
    renderAction();
  });

  elements.clearButton.addEventListener('click', () => {
    elements.promptInput.value = '';
    elements.promptInput.focus();
    clearMessage();
    renderAction();
  });

  elements.languageButton.addEventListener('click', async () => {
    await toggleLanguage();
    renderAll();
  });

  elements.askButton.addEventListener('click', () => startDistribution([...selectedProductIds]));
  elements.cancelButton.addEventListener('click', cancelDistribution);
  elements.retryButton.addEventListener('click', () => startDistribution(lastFailedProductIds));

  chrome.runtime.onMessage.addListener(
    (message: { action?: string; completed?: number; total?: number }) => {
      if (message.action === 'distributionProgress') {
        renderProgress(message.completed ?? 0, message.total ?? 0);
      } else if (message.action === 'distributionCancelled') {
        finishSendingState();
        hideProgress();
      }
    }
  );
}

function renderAll(): void {
  elements.tagline.textContent = t('tagline');
  elements.languageButton.textContent = currentLanguage() === 'zh' ? 'EN' : '中';
  elements.promptLabel.textContent = t('promptLabel');
  elements.promptInput.placeholder = t('promptPlaceholder');
  elements.clearButton.textContent = t('clear');
  elements.modelsLabel.textContent = t('modelsLabel');
  elements.modelsHint.textContent = t('modelsHint');
  elements.cancelButton.textContent = t('cancel');
  elements.retryButton.textContent = t('tryAgain');
  elements.privacyNote.textContent = t('privacy');
  renderModels();
  renderAction();
}

function renderModels(): void {
  elements.modelsGrid.innerHTML = defaultProducts
    .map((product) => {
      const selected = selectedProductIds.has(product.id);
      return `
        <button
          class="model-option${selected ? ' selected' : ''}"
          type="button"
          data-product-id="${product.id}"
          aria-pressed="${selected}"
        >
          <span class="model-avatar" aria-hidden="true">${product.name.slice(0, 1)}</span>
          <span class="model-name">${product.name}</span>
          <span class="model-check" aria-hidden="true">${selected ? '✓' : ''}</span>
        </button>
      `;
    })
    .join('');

  elements.modelsGrid.querySelectorAll<HTMLButtonElement>('.model-option').forEach((button) => {
    button.addEventListener('click', async () => {
      const productId = button.dataset.productId as ProductId;
      if (selectedProductIds.has(productId)) selectedProductIds.delete(productId);
      else selectedProductIds.add(productId);

      await saveSelection();
      clearMessage();
      renderModels();
      renderAction();
    });
  });
}

function renderAction(): void {
  const count = selectedProductIds.size;
  elements.askButton.textContent = count === 1 ? t('askOne') : t('ask', { count: String(count) });
  elements.askButton.disabled =
    isSending || count === 0 || elements.promptInput.value.trim().length === 0;
}

async function startDistribution(productIds: ProductId[]): Promise<void> {
  const prompt = elements.promptInput.value.trim();
  if (!prompt) return showMessage(t('emptyPrompt'));
  if (productIds.length === 0) return showMessage(t('selectProduct'));

  isSending = true;
  lastFailedProductIds = [];
  elements.resultsPanel.hidden = true;
  elements.retryButton.hidden = true;
  clearMessage();
  renderAction();
  renderProgress(0, productIds.length);

  try {
    const response = (await chrome.runtime.sendMessage({
      action: 'distribute',
      prompt,
      productIds,
    })) as DistributeResponse;

    if (response.cancelled) {
      hideProgress();
      return;
    }

    if (!response.success || !response.results) {
      showMessage(response.error ?? t('unknownError'));
      hideProgress();
      return;
    }

    renderResults(response.results);
    hideProgress();
  } catch (error: unknown) {
    showMessage(error instanceof Error ? error.message : t('unknownError'));
    hideProgress();
  } finally {
    finishSendingState();
  }
}

async function cancelDistribution(): Promise<void> {
  await chrome.runtime.sendMessage({ action: 'cancelDistribution' }).catch(() => undefined);
  finishSendingState();
  hideProgress();
}

function renderProgress(completed: number, total: number): void {
  elements.progressPanel.hidden = false;
  elements.progressText.textContent = t('progress', {
    completed: String(completed),
    total: String(total),
  });
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  elements.progressBar.style.width = `${percentage}%`;
}

function hideProgress(): void {
  elements.progressPanel.hidden = true;
  elements.progressBar.style.width = '0%';
}

function renderResults(results: DistributionResult[]): void {
  const failures = results.filter((result) => !result.success);
  const successes = results.filter((result) => result.success);
  lastFailedProductIds = failures.map((result) => result.productId);

  elements.resultsTitle.textContent =
    failures.length === 0
      ? t('completed', { count: String(successes.length) })
      : t('resultPartial');
  elements.retryButton.hidden = failures.length === 0;

  elements.resultsList.innerHTML = results
    .map((result) => {
      const detail = result.success
        ? result.reusedTab
          ? t('existingTab')
          : t('newTab')
        : errorLabel(result);

      return `
        <div class="result-row ${result.success ? 'success' : 'failure'}">
          <span class="result-indicator" aria-hidden="true">${result.success ? '✓' : '!'}</span>
          <span class="result-name">${escapeHtml(result.productName)}</span>
          <span class="result-detail">${escapeHtml(detail)}</span>
        </div>
      `;
    })
    .join('');

  elements.resultsPanel.hidden = false;
}

function errorLabel(result: DistributionResult): string {
  switch (result.errorCode) {
    case 'AUTH_REQUIRED':
      return t('authRequired');
    case 'INPUT_NOT_FOUND':
      return t('inputNotFound');
    case 'SUBMIT_NOT_FOUND':
      return t('submitNotFound');
    case 'PAGE_LOAD_TIMEOUT':
      return t('pageLoadTimeout');
    case 'CONTENT_SCRIPT_UNAVAILABLE':
      return t('contentUnavailable');
    default:
      return t('unknownError');
  }
}

async function restoreProgress(): Promise<void> {
  const stored = await chrome.storage.local.get([
    'distributionInProgress',
    'distributionProgress',
  ]);
  if (stored.distributionInProgress && stored.distributionProgress) {
    isSending = true;
    renderProgress(stored.distributionProgress.completed, stored.distributionProgress.total);
    renderAction();
  }
}

function finishSendingState(): void {
  isSending = false;
  renderAction();
}

function showMessage(message: string): void {
  elements.inlineMessage.textContent = message;
  elements.inlineMessage.hidden = false;
}

function clearMessage(): void {
  elements.inlineMessage.hidden = true;
  elements.inlineMessage.textContent = '';
}

function escapeHtml(value: string): string {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

void init();
