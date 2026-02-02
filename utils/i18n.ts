// Internationalization utility

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    // Prompt section
    promptLabel: 'Question',
    clearBtn: 'Clear',
    promptPlaceholder: 'What do you want to ask?',

    // Products section
    selectProducts: 'AI Products',
    manageBtn: 'Manage',
    noProducts: 'No products added',
    addFirstBtn: 'Add Product',

    // Progress
    progressText: '{completed} / {total}',
    cancelProgressBtn: 'Cancel',

    // Actions
    distributeBtn: 'Ask All',

    // Status messages
    statusFillRequired: 'Please fill in all required fields',
    statusProductUpdated: 'Product updated',
    statusProductAdded: 'Product added',
    statusProductDeleted: 'Product deleted',
    statusEnterPrompt: 'Please enter a prompt',
    statusSelectProduct: 'Please select at least one product',
    statusDistributeSuccess: 'Sent to {count} products',
    statusDistributePartial: 'Sent: {success}, Failed: {fail}',
    statusDistributeFailed: 'Failed: {error}',
    statusDistributeCancelled: 'Cancelled',

    // Manage modal
    manageTitle: 'Manage Products',
    addProductBtn: '+ Add Product',
    noProductsText: 'No products yet',

    // Edit modal
    editTitle: 'Edit Product',
    addTitle: 'Add Product',
    productNameLabel: 'Name *',
    productNamePlaceholder: 'e.g., ChatGPT',
    productUrlLabel: 'URL *',
    productUrlPlaceholder: 'https://chat.openai.com',
    productSelectorLabel: 'Input Selector (Optional)',
    productSelectorPlaceholder: 'e.g., textarea',
    productSelectorHint: 'Auto-detected if empty',
    productSubmitSelectorLabel: 'Send Button Selector (Optional)',
    productSubmitSelectorPlaceholder: 'e.g., button[type="submit"]',
    productSubmitSelectorHint: 'Auto-submit if configured',
    cancelBtn: 'Cancel',
    saveBtn: 'Save',

    // Delete confirmation
    deleteConfirm: 'Delete this product?',

    // Button titles
    editTitleAttr: 'Edit',
    deleteTitleAttr: 'Delete',
  },
  zh: {
    // Prompt section
    promptLabel: '问题',
    clearBtn: '清空',
    promptPlaceholder: '想问点什么？',

    // Products section
    selectProducts: 'AI 产品',
    manageBtn: '管理',
    noProducts: '暂无产品',
    addFirstBtn: '添加产品',

    // Progress
    progressText: '{completed} / {total}',
    cancelProgressBtn: '取消',

    // Actions
    distributeBtn: '一起问',

    // Status messages
    statusFillRequired: '请填写必填项',
    statusProductUpdated: '已更新',
    statusProductAdded: '已添加',
    statusProductDeleted: '已删除',
    statusEnterPrompt: '请输入提示词',
    statusSelectProduct: '请至少选择一个产品',
    statusDistributeSuccess: '已发送到 {count} 个产品',
    statusDistributePartial: '成功 {success}，失败 {fail}',
    statusDistributeFailed: '发送失败：{error}',
    statusDistributeCancelled: '已取消',

    // Manage modal
    manageTitle: '管理产品',
    addProductBtn: '+ 添加产品',
    noProductsText: '暂无产品',

    // Edit modal
    editTitle: '编辑产品',
    addTitle: '添加产品',
    productNameLabel: '名称 *',
    productNamePlaceholder: '如：ChatGPT',
    productUrlLabel: '网址 *',
    productUrlPlaceholder: 'https://chat.openai.com',
    productSelectorLabel: '输入框选择器（可选）',
    productSelectorPlaceholder: '如：textarea',
    productSelectorHint: '留空则自动识别',
    productSubmitSelectorLabel: '发送按钮选择器（可选）',
    productSubmitSelectorPlaceholder: '如：button[type="submit"]',
    productSubmitSelectorHint: '配置后将自动发送',
    cancelBtn: '取消',
    saveBtn: '保存',

    // Delete confirmation
    deleteConfirm: '确定删除此产品？',

    // Button titles
    editTitleAttr: '编辑',
    deleteTitleAttr: '删除',
  },
};

// Current language - default to English
let lang = 'en';

// Get translation
export function t(key: string, params: Record<string, string> = {}): string {
  const translation = translations[lang]?.[key] || translations.en[key] || key;

  // Replace parameters
  if (params && Object.keys(params).length > 0) {
    return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }

  return translation;
}

// Set language
export async function setLanguage(newLang: string): Promise<void> {
  if (translations[newLang]) {
    lang = newLang;
    await chrome.storage.local.set({ language: newLang });
    updateUI();
  }
}

// Initialize language
export async function initLanguage(): Promise<void> {
  const result = await chrome.storage.local.get(['language']);
  if (result.language && translations[result.language]) {
    lang = result.language;
  }
  // If no saved language setting, default to English (don't auto-switch based on browser)
  updateUI();
}

// Get current language
export function currentLang(): string {
  return lang;
}

// Update UI text
function updateUI(): void {
  // Update HTML text
  const elements: Record<string, string> = {
    subtitle: '.subtitle',
    promptLabel: 'label[for="promptInput"]',
    clearBtn: '#clearBtn',
    promptPlaceholder: '#promptInput',
    selectProducts: '.products-section .section-header label',
    manageBtn: '#manageBtn',
    noProducts: '#emptyState p',
    addFirstBtn: '#addFirstBtn',
    distributeBtn: '#distributeBtn',
    manageTitle: '#manageModal h2',
    addProductBtn: '#addProductBtn span',
    editTitle: '#editModalTitle',
    productNameLabel: 'label[for="productName"]',
    productUrlLabel: 'label[for="productUrl"]',
    productSelectorLabel: 'label[for="productSelector"]',
    productSubmitSelectorLabel: 'label[for="productSubmitSelector"]',
    cancelBtn: '#cancelEditBtn',
    saveBtn: '#saveProductBtn',
  };

  for (const [key, selector] of Object.entries(elements)) {
    const element = document.querySelector(selector);
    if (element) {
      if (key === 'promptPlaceholder') {
        (element as HTMLTextAreaElement).placeholder = t(key);
      } else if (key === 'addProductBtn') {
        element.textContent = t(key);
      } else {
        element.textContent = t(key);
      }
    }
  }

  // Update placeholders
  const promptInput = document.getElementById('promptInput') as HTMLTextAreaElement;
  if (promptInput) {
    promptInput.placeholder = t('promptPlaceholder');
  }

  const productName = document.getElementById('productName') as HTMLInputElement;
  if (productName) {
    productName.placeholder = t('productNamePlaceholder');
  }

  const productUrl = document.getElementById('productUrl') as HTMLInputElement;
  if (productUrl) {
    productUrl.placeholder = t('productUrlPlaceholder');
  }

  const productSelector = document.getElementById('productSelector') as HTMLInputElement;
  if (productSelector) {
    productSelector.placeholder = t('productSelectorPlaceholder');
    const hint = productSelector.nextElementSibling;
    if (hint && hint.classList.contains('form-hint')) {
      hint.textContent = t('productSelectorHint');
    }
  }

  const productSubmitSelector = document.getElementById(
    'productSubmitSelector'
  ) as HTMLInputElement;
  if (productSubmitSelector) {
    productSubmitSelector.placeholder = t('productSubmitSelectorPlaceholder');
    const hint = productSubmitSelector.nextElementSibling;
    if (hint && hint.classList.contains('form-hint')) {
      hint.textContent = t('productSubmitSelectorHint');
    }
  }

  // Update HTML lang attribute
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  // Update language switch button
  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.textContent = lang === 'zh' ? '中/EN' : 'EN/中';
  }

  // Update cancel button
  const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
  if (cancelBtn && cancelBtn.style.display !== 'none') {
    cancelBtn.textContent = t('cancelProgressBtn');
  }

  // Trigger custom event to notify other scripts
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}
