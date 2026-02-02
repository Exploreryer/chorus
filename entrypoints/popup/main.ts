import './style.css';
import type { Product, DistributionProgress } from '../../types';
import { defaultProducts } from '../../utils/defaultProducts';
import { t, setLanguage, initLanguage, currentLang } from '../../utils/i18n';

// Global state
let products: Product[] = [];
let editingProductId: string | null = null;
let distributionCancelled = false;

// DOM elements
const promptInput = document.getElementById('promptInput') as HTMLTextAreaElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const productsList = document.getElementById('productsList') as HTMLDivElement;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;
const distributeBtn = document.getElementById('distributeBtn') as HTMLButtonElement;
const statusMsg = document.getElementById('statusMsg') as HTMLDivElement;
const manageBtn = document.getElementById('manageBtn') as HTMLButtonElement;
const manageModal = document.getElementById('manageModal') as HTMLDivElement;
const closeModal = document.getElementById('closeModal') as HTMLButtonElement;
const manageProductsList = document.getElementById('manageProductsList') as HTMLDivElement;
const addProductBtn = document.getElementById('addProductBtn') as HTMLButtonElement;
const addFirstBtn = document.getElementById('addFirstBtn') as HTMLButtonElement;
const editModal = document.getElementById('editModal') as HTMLDivElement;
const closeEditModal = document.getElementById('closeEditModal') as HTMLButtonElement;
const productForm = document.getElementById('productForm') as HTMLFormElement;
const cancelEditBtn = document.getElementById('cancelEditBtn') as HTMLButtonElement;
const editModalTitle = document.getElementById('editModalTitle') as HTMLHeadingElement;
const langBtn = document.getElementById('langBtn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;

// Initialize
async function init() {
  await initLanguage();
  await loadProducts();
  renderProductsList();
  updateDistributeButton();
  await restoreProgressState();
  bindEvents();
}

// Restore progress state
async function restoreProgressState() {
  const result = await chrome.storage.local.get([
    'distributionInProgress',
    'distributionProgress',
  ]);

  if (result.distributionInProgress && result.distributionProgress) {
    const progressSection = document.getElementById('progressSection') as HTMLDivElement;
    const progressFill = document.getElementById('progressFill') as HTMLDivElement;
    const progressText = document.getElementById('progressText') as HTMLDivElement;

    const progress = result.distributionProgress as DistributionProgress;
    progressSection.style.display = 'block';
    const percent = (progress.completed / progress.total) * 100;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = t('progressText', {
      completed: progress.completed.toString(),
      total: progress.total.toString(),
    });

    distributeBtn.disabled = true;
  }
}

// Load products list
async function loadProducts() {
  const result = await chrome.storage.local.get(['products']);
  if (result.products && result.products.length > 0) {
    products = result.products;
  } else {
    // First time use, initialize default products list
    products = defaultProducts.map((p) => ({ ...p }));
    await saveProducts();
  }
}

// Save products list
async function saveProducts() {
  await chrome.storage.local.set({ products });
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Render products list
function renderProductsList() {
  if (products.length === 0) {
    productsList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  productsList.style.display = 'block';
  emptyState.style.display = 'none';

  productsList.innerHTML = products
    .map(
      (product) => `
    <div class="product-item" data-id="${product.id}">
      <input type="checkbox" id="product-${product.id}" ${product.enabled ? 'checked' : ''}>
      <div class="product-info">
        <div class="product-name">${escapeHtml(product.name)}</div>
      </div>
    </div>
  `
    )
    .join('');

  // Bind click events: clicking entire row toggles checkbox
  products.forEach((product) => {
    const item = document.querySelector(`.product-item[data-id="${product.id}"]`);
    const checkbox = document.getElementById(`product-${product.id}`) as HTMLInputElement;

    if (item && checkbox) {
      // Click entire row to toggle
      item.addEventListener('click', async (e) => {
        // If clicking checkbox itself, let checkbox's change event handle it
        if ((e.target as HTMLElement).tagName === 'INPUT') return;

        // Toggle checkbox state
        checkbox.checked = !checkbox.checked;
        product.enabled = checkbox.checked;
        await saveProducts();
        updateDistributeButton();
      });

      // Checkbox change event
      checkbox.addEventListener('change', async (e) => {
        product.enabled = (e.target as HTMLInputElement).checked;
        await saveProducts();
        updateDistributeButton();
      });
    }
  });
}

// Render manage products list
function renderManageProductsList() {
  if (products.length === 0) {
    manageProductsList.innerHTML = `<p style="text-align: center; color: #8492a6; padding: 20px;">${t('noProductsText')}</p>`;
    return;
  }

  manageProductsList.innerHTML = products
    .map(
      (product) => `
    <div class="manage-product-row" data-id="${product.id}">
      <div class="manage-product-info">
        <div class="manage-product-name">${escapeHtml(product.name)}</div>
        <div class="manage-product-url">${escapeHtml(product.url)}</div>
      </div>
      <div class="manage-product-actions">
        <button class="btn-icon-text edit" data-id="${product.id}" title="${t('editTitleAttr')}">
          <span>✏️</span>
        </button>
        <button class="btn-icon-text delete" data-id="${product.id}" title="${t('deleteTitleAttr')}">
          <span>🗑️</span>
        </button>
      </div>
    </div>
  `
    )
    .join('');

  // Bind edit and delete buttons
  document.querySelectorAll('.manage-product-actions .edit').forEach((btn) => {
    btn.addEventListener('click', () =>
      openEditModal((btn as HTMLElement).dataset.id as string)
    );
  });

  document.querySelectorAll('.manage-product-actions .delete').forEach((btn) => {
    btn.addEventListener('click', () =>
      deleteProduct((btn as HTMLElement).dataset.id as string)
    );
  });
}

// Update distribute button state
function updateDistributeButton() {
  const hasPrompt = promptInput.value.trim().length > 0;
  const hasEnabledProducts = products.some((p) => p.enabled);
  distributeBtn.disabled = !hasPrompt || !hasEnabledProducts;
}

// Bind events
function bindEvents() {
  // Clear button
  clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    updateDistributeButton();
  });

  // Prompt input change
  promptInput.addEventListener('input', updateDistributeButton);

  // Distribute button
  distributeBtn.addEventListener('click', handleDistribute);

  // Manage button
  manageBtn.addEventListener('click', () => {
    renderManageProductsList();
    manageModal.style.display = 'flex';
  });

  // Close manage modal
  closeModal.addEventListener('click', () => {
    manageModal.style.display = 'none';
    renderProductsList();
  });

  // Add product button
  addProductBtn.addEventListener('click', () => openEditModal());
  addFirstBtn.addEventListener('click', () => openEditModal());

  // Close edit modal
  closeEditModal.addEventListener('click', closeEditModalHandler);
  cancelEditBtn.addEventListener('click', closeEditModalHandler);

  // Product form submit
  productForm.addEventListener('submit', handleProductFormSubmit);

  // Click outside modal to close
  manageModal.addEventListener('click', (e) => {
    if (e.target === manageModal) {
      manageModal.style.display = 'none';
      renderProductsList();
    }
  });

  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModalHandler();
    }
  });

  // Language switch button
  if (langBtn) {
    langBtn.addEventListener('click', async () => {
      const newLang = currentLang() === 'zh' ? 'en' : 'zh';
      await setLanguage(newLang);
    });
  }

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelDistribution);
  }

  // Listen for language change event
  document.addEventListener('languageChanged', () => {
    renderManageProductsList();
    renderProductsList();
    if (editingProductId) {
      openEditModal(editingProductId);
    }
  });
}

// Open edit modal
function openEditModal(productId?: string) {
  editingProductId = productId || null;

  if (productId) {
    // Edit mode
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    editModalTitle.textContent = t('editTitle');
    (document.getElementById('productName') as HTMLInputElement).value = product.name;
    (document.getElementById('productUrl') as HTMLInputElement).value = product.url;
    (document.getElementById('productSelector') as HTMLInputElement).value =
      product.selector || '';
    (document.getElementById('productSubmitSelector') as HTMLInputElement).value =
      product.submitSelector || '';
  } else {
    // Add mode
    editModalTitle.textContent = t('addTitle');
    productForm.reset();
  }

  manageModal.style.display = 'none';
  editModal.style.display = 'flex';
}

// Close edit modal
function closeEditModalHandler() {
  editModal.style.display = 'none';
  editingProductId = null;
  productForm.reset();
  if (products.length > 0) {
    manageModal.style.display = 'flex';
  }
}

// Handle product form submit
async function handleProductFormSubmit(e: Event) {
  e.preventDefault();

  const name = (document.getElementById('productName') as HTMLInputElement).value.trim();
  const url = (document.getElementById('productUrl') as HTMLInputElement).value.trim();
  const selector = (
    document.getElementById('productSelector') as HTMLInputElement
  ).value.trim();
  const submitSelector = (
    document.getElementById('productSubmitSelector') as HTMLInputElement
  ).value.trim();

  if (!name || !url) {
    showStatus(t('statusFillRequired'), 'error');
    return;
  }

  if (editingProductId) {
    // Edit existing product
    const product = products.find((p) => p.id === editingProductId);
    if (product) {
      product.name = name;
      product.url = url;
      product.selector = selector;
      product.submitSelector = submitSelector;
    }
  } else {
    // Add new product
    products.push({
      id: generateId(),
      name,
      url,
      selector,
      submitSelector,
      enabled: true,
    });
  }

  await saveProducts();
  closeEditModalHandler();
  renderManageProductsList();
  renderProductsList();
  updateDistributeButton();
  showStatus(
    editingProductId ? t('statusProductUpdated') : t('statusProductAdded'),
    'success'
  );
}

// Delete product
async function deleteProduct(productId: string) {
  if (!confirm(t('deleteConfirm'))) return;

  products = products.filter((p) => p.id !== productId);
  await saveProducts();
  renderManageProductsList();
  renderProductsList();
  updateDistributeButton();
  showStatus(t('statusProductDeleted'), 'success');
}

// Handle distribution
async function handleDistribute() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showStatus(t('statusEnterPrompt'), 'error');
    return;
  }

  const enabledProducts = products.filter((p) => p.enabled);
  if (enabledProducts.length === 0) {
    showStatus(t('statusSelectProduct'), 'error');
    return;
  }

  // Reset cancel flag
  distributionCancelled = false;

  // Disable button and show progress bar
  distributeBtn.disabled = true;

  const progressSection = document.getElementById('progressSection') as HTMLDivElement;
  const progressFill = document.getElementById('progressFill') as HTMLDivElement;
  const progressText = document.getElementById('progressText') as HTMLDivElement;

  progressSection.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = t('progressText', {
    completed: '0',
    total: enabledProducts.length.toString(),
  });
  if (cancelBtn) {
    cancelBtn.style.display = 'block';
    cancelBtn.textContent = t('cancelProgressBtn');
  }

  try {
    // Listen for progress updates
    const progressListener = (message: any) => {
      if (message.action === 'distributionProgress') {
        const percent = (message.completed / message.total) * 100;
        progressFill.style.width = `${percent}%`;
        progressText.textContent = t('progressText', {
          completed: message.completed.toString(),
          total: message.total.toString(),
        });
      } else if (message.action === 'distributionCancelled') {
        progressSection.style.display = 'none';
        if (cancelBtn) {
          cancelBtn.style.display = 'none';
        }
        showStatus(t('statusDistributeCancelled'), 'info');
        distributeBtn.disabled = false;
        updateDistributeButton();
      }
    };

    chrome.runtime.onMessage.addListener(progressListener);

    let response: any;
    try {
      // Send message to background script
      response = await chrome.runtime.sendMessage({
        action: 'distribute',
        prompt,
        products: enabledProducts,
      });
    } finally {
      chrome.runtime.onMessage.removeListener(progressListener);
    }

    // Check if cancelled
    if (distributionCancelled) {
      return;
    }

    if (response && response.success) {
      const successCount = response.results.filter((r: any) => r.success).length;
      const failCount = response.results.length - successCount;

      // Complete progress
      progressFill.style.width = '100%';
      progressText.textContent = t('progressText', {
        completed: enabledProducts.length.toString(),
        total: enabledProducts.length.toString(),
      });

      // Hide cancel button
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }

      // Hide progress bar after 2 seconds
      setTimeout(() => {
        progressSection.style.display = 'none';
      }, 2000);

      if (failCount === 0) {
        showStatus(t('statusDistributeSuccess', { count: successCount.toString() }), 'success');
      } else {
        showStatus(
          t('statusDistributePartial', {
            success: successCount.toString(),
            fail: failCount.toString(),
          }),
          'error'
        );
      }
    } else if (response && response.cancelled) {
      progressSection.style.display = 'none';
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      showStatus(t('statusDistributeCancelled'), 'info');
    } else {
      progressSection.style.display = 'none';
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      showStatus(
        t('statusDistributeFailed', { error: response?.error || 'Unknown error' }),
        'error'
      );
    }
  } catch (error) {
    if (!distributionCancelled) {
      progressSection.style.display = 'none';
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      showStatus(
        t('statusDistributeFailed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        'error'
      );
    }
  } finally {
    if (!distributionCancelled) {
      distributeBtn.disabled = false;
      updateDistributeButton();
    }
  }
}

// Cancel distribution
async function cancelDistribution() {
  distributionCancelled = true;
  await chrome.runtime.sendMessage({ action: 'cancelDistribution' });
  const progressSection = document.getElementById('progressSection') as HTMLDivElement;
  const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
  progressSection.style.display = 'none';
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
  distributeBtn.disabled = false;
  updateDistributeButton();
  showStatus(t('statusDistributeCancelled'), 'info');
}

// Show status message
function showStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
  statusMsg.textContent = message;
  statusMsg.className = `status-msg ${type}`;
  statusMsg.style.display = 'block';

  setTimeout(() => {
    statusMsg.style.display = 'none';
  }, 3000);
}

// HTML escape
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();
