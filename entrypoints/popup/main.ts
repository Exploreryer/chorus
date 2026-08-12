import './style.css';
import type {
  DistributeResponse,
  DistributionResult,
  DistributionTask,
  DistributionTaskUpdatedMessage,
  PlatformReadiness,
  PlatformReadinessMap,
  ProductId,
} from '../../types';
import { defaultProducts } from '../../utils/platforms';
import { currentLanguage, initLanguage, t, toggleLanguage } from '../../utils/i18n';

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
  refreshReadinessButton: document.getElementById('refreshReadinessButton') as HTMLButtonElement,
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
let currentTask: DistributionTask | null = null;
let readiness: PlatformReadinessMap = {};
let lastFailedProductIds: ProductId[] = [];
let startPending = false;

async function init(): Promise<void> {
  await initLanguage();
  selectedProductIds = new Set(await loadSelection());
  bindEvents();
  renderAll();
  await Promise.all([restoreTask(), refreshReadiness()]);
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

  elements.refreshReadinessButton.addEventListener('click', refreshReadiness);
  elements.askButton.addEventListener('click', () => startDistribution([...selectedProductIds]));
  elements.cancelButton.addEventListener('click', cancelDistribution);
  elements.retryButton.addEventListener('click', () => startDistribution(lastFailedProductIds));
  elements.resultsList.addEventListener('click', handleResultAction);

  chrome.runtime.onMessage.addListener((message: DistributionTaskUpdatedMessage) => {
    if (message.action !== 'distributionTaskUpdated') return;
    if (currentTask?.status === 'running' && message.task.id !== currentTask.id) return;
    applyTask(message.task);
  });
}

function renderAll(): void {
  elements.tagline.textContent = t('tagline');
  elements.languageButton.textContent = currentLanguage() === 'zh' ? 'EN' : '中';
  elements.promptLabel.textContent = t('promptLabel');
  elements.promptInput.placeholder = t('promptPlaceholder');
  elements.clearButton.textContent = t('clear');
  elements.modelsLabel.textContent = t('modelsLabel');
  elements.modelsHint.textContent = t('modelsHint');
  elements.refreshReadinessButton.textContent = t('refreshStatus');
  elements.cancelButton.textContent = t('cancel');
  elements.retryButton.textContent = t('retryFailed');
  elements.privacyNote.textContent = t('privacy');
  renderModels();
  renderTask();
  renderAction();
}

function renderModels(): void {
  elements.modelsGrid.innerHTML = defaultProducts
    .map((product) => {
      const selected = selectedProductIds.has(product.id);
      const status = readiness[product.id];
      return `
        <button
          class="model-option${selected ? ' selected' : ''}"
          type="button"
          data-product-id="${product.id}"
          aria-pressed="${selected}"
        >
          <span class="model-avatar" aria-hidden="true">${product.name.slice(0, 1)}</span>
          <span class="model-copy">
            <span class="model-name">${product.name}</span>
            <span class="model-status ${status ?? ''}">${status ? readinessLabel(status) : ''}</span>
          </span>
          <span class="model-check" aria-hidden="true">${selected ? '✓' : ''}</span>
        </button>
      `;
    })
    .join('');

  elements.modelsGrid.querySelectorAll<HTMLButtonElement>('.model-option').forEach((button) => {
    button.addEventListener('click', async () => {
      if (currentTask?.status === 'running') return;
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
    startPending ||
    currentTask?.status === 'running' ||
    count === 0 ||
    elements.promptInput.value.trim().length === 0;
}

async function startDistribution(productIds: ProductId[]): Promise<void> {
  const prompt = elements.promptInput.value.trim();
  if (!prompt) return showMessage(t('emptyPrompt'));
  if (productIds.length === 0) return showMessage(t('selectProduct'));
  if (startPending || currentTask?.status === 'running') return;

  startPending = true;
  clearMessage();
  elements.resultsPanel.hidden = true;
  renderProgress(0, productIds.length);
  renderAction();

  try {
    const response = (await chrome.runtime.sendMessage({
      action: 'distribute',
      prompt,
      productIds,
    })) as DistributeResponse;

    if (!response.success || !response.task) {
      if (response.task) applyTask(response.task);
      showMessage(
        response.errorCode === 'TASK_IN_PROGRESS' ? t('taskInProgress') : response.error ?? t('unknownError')
      );
      return;
    }
    applyTask(response.task);
  } catch (error: unknown) {
    showMessage(error instanceof Error ? error.message : t('unknownError'));
    hideProgress();
  } finally {
    startPending = false;
    renderAction();
  }
}

async function cancelDistribution(): Promise<void> {
  if (!currentTask || currentTask.status !== 'running') return;
  await chrome.runtime
    .sendMessage({ action: 'cancelDistribution', taskId: currentTask.id })
    .catch(() => undefined);
}

async function restoreTask(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    action: 'getDistributionTask',
  })) as DistributeResponse;
  if (response.success && response.task) applyTask(response.task);
}

async function refreshReadiness(): Promise<void> {
  elements.refreshReadinessButton.disabled = true;
  elements.refreshReadinessButton.textContent = t('checkingStatus');
  try {
    const response = (await chrome.runtime.sendMessage({
      action: 'checkPlatformReadiness',
    })) as { success?: boolean; readiness?: PlatformReadinessMap };
    if (response.success && response.readiness) readiness = response.readiness;
  } finally {
    elements.refreshReadinessButton.disabled = false;
    elements.refreshReadinessButton.textContent = t('refreshStatus');
    renderModels();
  }
}

function applyTask(task: DistributionTask): void {
  currentTask = task;
  if (!elements.promptInput.value.trim()) elements.promptInput.value = task.prompt;
  renderTask();
  renderModels();
  renderAction();
}

function renderTask(): void {
  if (!currentTask) return;
  if (currentTask.status === 'running') {
    renderProgress(currentTask.completed, currentTask.total);
    if (currentTask.results.length > 0) renderResults(currentTask.results, true);
    return;
  }

  hideProgress();
  if (currentTask.results.length > 0) renderResults(currentTask.results, false);
  if (currentTask.status === 'cancelled') showMessage(t('taskCancelled'));
  if (currentTask.status === 'failed') {
    showMessage(
      currentTask.errorCode === 'TASK_INTERRUPTED' ? t('taskInterrupted') : currentTask.error ?? t('unknownError')
    );
  }
}

function renderProgress(completed: number, total: number): void {
  elements.progressPanel.hidden = false;
  elements.progressText.textContent = t('progress', {
    completed: String(completed),
    total: String(total),
  });
  elements.progressBar.style.width = `${total === 0 ? 0 : Math.round((completed / total) * 100)}%`;
}

function hideProgress(): void {
  elements.progressPanel.hidden = true;
  elements.progressBar.style.width = '0%';
}

function renderResults(results: DistributionResult[], inProgress: boolean): void {
  const failures = results.filter((result) => !result.success);
  const successes = results.filter((result) => result.success);
  lastFailedProductIds = failures.map((result) => result.productId);
  elements.resultsTitle.textContent = inProgress
    ? t('resultsSoFar')
    : failures.length === 0
      ? t('completed', { count: String(successes.length) })
      : t('resultPartial');
  elements.retryButton.hidden = inProgress || failures.length === 0;

  elements.resultsList.innerHTML = results
    .map((result) => `
      <div class="result-row ${result.success ? 'success' : 'failure'}">
        <span class="result-indicator" aria-hidden="true">${result.success ? '✓' : '!'}</span>
        <span class="result-copy">
          <span class="result-name">${escapeHtml(result.productName)}</span>
          <span class="result-detail">${escapeHtml(
            result.success
              ? result.reusedTab
                ? t('existingTab')
                : t('newTab')
              : errorLabel(result)
          )}</span>
        </span>
        <span class="result-actions">
          ${result.tabId ? `<button class="result-action" type="button" data-action="open" data-tab-id="${result.tabId}">${t('open')}</button>` : ''}
          ${!inProgress && !result.success ? `<button class="result-action" type="button" data-action="retry" data-product-id="${result.productId}">${t('retryOne')}</button>` : ''}
        </span>
      </div>
    `)
    .join('');
  elements.resultsPanel.hidden = false;
}

function handleResultAction(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'open' && button.dataset.tabId) {
    void chrome.tabs
      .update(Number(button.dataset.tabId), { active: true })
      .then(() => window.close())
      .catch(() => showMessage(t('tabClosed')));
  }
  if (button.dataset.action === 'retry' && button.dataset.productId) {
    void startDistribution([button.dataset.productId as ProductId]);
  }
}

function errorLabel(result: DistributionResult): string {
  switch (result.errorCode) {
    case 'AUTH_REQUIRED':
      return t('authRequired');
    case 'INPUT_NOT_FOUND':
      return t('inputNotFound');
    case 'INPUT_NOT_EMPTY':
      return t('draftPreserved');
    case 'CONVERSATION_NOT_EMPTY':
      return t('conversationPreserved');
    case 'SUBMIT_NOT_FOUND':
      return t('submitNotFound');
    case 'SUBMIT_NOT_CONFIRMED':
      return t('submitNotConfirmed');
    case 'PAGE_LOAD_TIMEOUT':
      return t('pageLoadTimeout');
    case 'CONTENT_SCRIPT_UNAVAILABLE':
      return t('contentUnavailable');
    case 'TAB_CLOSED':
      return t('tabClosed');
    default:
      return t('unknownError');
  }
}

function readinessLabel(status: PlatformReadiness): string {
  switch (status) {
    case 'ready':
      return t('statusReady');
    case 'willOpen':
      return t('statusWillOpen');
    case 'signIn':
      return t('statusSignIn');
    default:
      return t('statusUnavailable');
  }
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
