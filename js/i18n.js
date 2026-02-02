// 国际化翻译文件
const translations = {
  en: {
    // Header
    subtitle: 'AI Prompt Comparison Assistant',
    
    // Prompt section
    promptLabel: 'Enter Prompt',
    clearBtn: 'Clear',
    promptPlaceholder: 'Enter or paste your Prompt here...',
    
    // Products section
    selectProducts: 'Select AI Products',
    manageBtn: 'Manage',
    noProducts: 'No AI products',
    addFirstBtn: 'Add First Product',
    
    // Progress
    progressText: '{completed} / {total}',
    cancelBtn: 'Cancel',
    
    // Actions
    distributeBtn: 'Execute',
    
    // Status messages
    statusFillRequired: 'Please fill in required fields',
    statusProductUpdated: 'Product updated',
    statusProductAdded: 'Product added',
    statusProductDeleted: 'Product deleted',
    statusEnterPrompt: 'Please enter a Prompt',
    statusSelectProduct: 'Please select at least one AI product',
    statusDistributeSuccess: 'Successfully distributed to {count} products',
    statusDistributePartial: 'Success: {success}, Failed: {fail}',
    statusDistributeFailed: 'Distribution failed: {error}',
    statusDistributeCancelled: 'Distribution cancelled',
    
    // Manage modal
    manageTitle: 'Manage AI Products',
    addProductBtn: '+ Add New Product',
    noProductsText: 'No products',
    
    // Edit modal
    editTitle: 'Edit Product',
    addTitle: 'Add Product',
    productNameLabel: 'Product Name *',
    productNamePlaceholder: 'e.g., ChatGPT',
    productUrlLabel: 'Product URL *',
    productUrlPlaceholder: 'https://chat.openai.com',
    productSelectorLabel: 'Input Selector (Optional)',
    productSelectorPlaceholder: 'e.g., textarea or div[contenteditable=\'true\']',
    productSelectorHint: 'Leave empty to use default selector auto-detection',
    productSubmitSelectorLabel: 'Submit Button Selector (Optional)',
    productSubmitSelectorPlaceholder: 'e.g., button[type=\'submit\'] or button[aria-label*=\'send\']',
    productSubmitSelectorHint: 'Leave empty to use default selector auto-detection. If configured, will auto-submit message',
    cancelBtn: 'Cancel',
    saveBtn: 'Save',
    
    // Delete confirmation
    deleteConfirm: 'Are you sure you want to delete this product?',
    
    // Button titles
    editTitleAttr: 'Edit',
    deleteTitleAttr: 'Delete'
  },
  zh: {
    // Header
    subtitle: 'AI Prompt 横评助手',
    
    // Prompt section
    promptLabel: '输入 Prompt',
    clearBtn: '清空',
    promptPlaceholder: '在此输入或粘贴您的 Prompt...',
    
    // Products section
    selectProducts: '选择 AI 产品',
    manageBtn: '管理',
    noProducts: '暂无 AI 产品',
    addFirstBtn: '添加第一个产品',
    
    // Progress
    progressText: '{completed} / {total}',
    cancelBtn: '取消',
    
    // Actions
    distributeBtn: '执行',
    
    // Status messages
    statusFillRequired: '请填写必填项',
    statusProductUpdated: '产品已更新',
    statusProductAdded: '产品已添加',
    statusProductDeleted: '产品已删除',
    statusEnterPrompt: '请输入 Prompt',
    statusSelectProduct: '请至少选择一个 AI 产品',
    statusDistributeSuccess: '成功分发到 {count} 个产品',
    statusDistributePartial: '成功 {success} 个，失败 {fail} 个',
    statusDistributeFailed: '分发失败: {error}',
    statusDistributeCancelled: '分发已取消',
    
    // Manage modal
    manageTitle: '管理 AI 产品',
    addProductBtn: '+ 添加新产品',
    noProductsText: '暂无产品',
    
    // Edit modal
    editTitle: '编辑产品',
    addTitle: '添加产品',
    productNameLabel: '产品名称 *',
    productNamePlaceholder: '例如：ChatGPT',
    productUrlLabel: '产品 URL *',
    productUrlPlaceholder: 'https://chat.openai.com',
    productSelectorLabel: '输入框选择器（可选）',
    productSelectorPlaceholder: '例如：textarea 或 div[contenteditable=\'true\']',
    productSelectorHint: '留空将使用默认选择器自动识别',
    productSubmitSelectorLabel: '发送按钮选择器（可选）',
    productSubmitSelectorPlaceholder: '例如：button[type=\'submit\'] 或 button[aria-label*=\'send\']',
    productSubmitSelectorHint: '留空将使用默认选择器自动识别，配置后将自动发送消息',
    cancelBtn: '取消',
    saveBtn: '保存',
    
    // Delete confirmation
    deleteConfirm: '确定要删除这个产品吗?',
    
    // Button titles
    editTitleAttr: '编辑',
    deleteTitleAttr: '删除'
  }
};

// 当前语言
let currentLang = 'zh';

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
  } else {
    // 根据浏览器语言自动选择
    const browserLang = navigator.language || navigator.userLanguage;
    currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
    await chrome.storage.local.set({ language: currentLang });
  }
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
    cancelBtn.textContent = t('cancelBtn');
  }
  
  // 触发自定义事件，通知其他脚本更新
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
}

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t, setLanguage, initLanguage, currentLang };
}
