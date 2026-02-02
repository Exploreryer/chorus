// 国际化翻译文件
const translations = {
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
    deleteTitleAttr: 'Delete'
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
    deleteTitleAttr: '删除'
  }
};

// 当前语言 - 默认为英文
let currentLang = 'en';

// 获取翻译
function t(key, params = {}) {
  const translation = translations[currentLang]?.[key] || translations.en[key] || key;
  
  // 替换参数
  if (params && Object.keys(params).length > 0) {
    return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }
  
  return translation;
}

// 设置语言
async function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    await chrome.storage.local.set({ language: lang });
    updateUI();
  }
}

// 初始化语言
async function initLanguage() {
  const result = await chrome.storage.local.get(['language']);
  if (result.language && translations[result.language]) {
    currentLang = result.language;
  }
  // 如果没有保存的语言设置，默认使用英文（不根据浏览器自动切换）
  updateUI();
}

// 更新UI文本
function updateUI() {
  // 更新HTML中的文本
  const elements = {
    'subtitle': '.subtitle',
    'promptLabel': 'label[for="promptInput"]',
    'clearBtn': '#clearBtn',
    'promptPlaceholder': '#promptInput',
    'selectProducts': '.products-section .section-header label',
    'manageBtn': '#manageBtn',
    'noProducts': '#emptyState p',
    'addFirstBtn': '#addFirstBtn',
    'distributeBtn': '#distributeBtn',
    'manageTitle': '#manageModal h2',
    'addProductBtn': '#addProductBtn span',
    'editTitle': '#editModalTitle',
    'productNameLabel': 'label[for="productName"]',
    'productUrlLabel': 'label[for="productUrl"]',
    'productSelectorLabel': 'label[for="productSelector"]',
    'productSubmitSelectorLabel': 'label[for="productSubmitSelector"]',
    'cancelBtn': '#cancelEditBtn',
    'saveBtn': '#saveProductBtn'
  };
  
  for (const [key, selector] of Object.entries(elements)) {
    const element = document.querySelector(selector);
    if (element) {
      if (key === 'promptPlaceholder') {
        element.placeholder = t(key);
      } else if (key === 'addProductBtn') {
        element.textContent = t(key);
      } else {
        element.textContent = t(key);
      }
    }
  }
  
  // 更新placeholder
  const promptInput = document.getElementById('promptInput');
  if (promptInput) {
    promptInput.placeholder = t('promptPlaceholder');
  }
  
  const productName = document.getElementById('productName');
  if (productName) {
    productName.placeholder = t('productNamePlaceholder');
  }
  
  const productUrl = document.getElementById('productUrl');
  if (productUrl) {
    productUrl.placeholder = t('productUrlPlaceholder');
  }
  
  const productSelector = document.getElementById('productSelector');
  if (productSelector) {
    productSelector.placeholder = t('productSelectorPlaceholder');
    const hint = productSelector.nextElementSibling;
    if (hint && hint.classList.contains('form-hint')) {
      hint.textContent = t('productSelectorHint');
    }
  }
  
  const productSubmitSelector = document.getElementById('productSubmitSelector');
  if (productSubmitSelector) {
    productSubmitSelector.placeholder = t('productSubmitSelectorPlaceholder');
    const hint = productSubmitSelector.nextElementSibling;
    if (hint && hint.classList.contains('form-hint')) {
      hint.textContent = t('productSubmitSelectorHint');
    }
  }
  
  // 更新HTML lang属性
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  
  // 更新语言切换按钮
  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.textContent = currentLang === 'zh' ? '中/EN' : 'EN/中';
  }
  
  // 更新取消按钮
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn && cancelBtn.style.display !== 'none') {
    cancelBtn.textContent = t('cancelProgressBtn');
  }
  
  // 触发自定义事件，通知其他脚本更新
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
}

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t, setLanguage, initLanguage, currentLang };
}
