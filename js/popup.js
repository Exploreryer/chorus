

// 默认 AI 产品列表
const DEFAULT_PRODUCTS = [
  // Agent 产品
  {
    id: 'manus',
    name: 'Manus',
    url: 'https://www.manus.im',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: true
  },
  {
    id: 'anygen',
    name: 'Anygen',
    url: 'https://www.anygen.io/',
    selector: 'textarea',
    submitSelector: 'button[aria-label*="send" i], button[aria-label*="发送" i]',
    enabled: true
  },
  {
    id: 'coze',
    name: '扣子',
    url: 'https://www.coze.cn',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: true
  },
  {
    id: 'minimax',
    name: 'Minimax',
    url: 'https://agent.minimaxi.com/',
    selector: 'textarea',
    submitSelector: 'button[aria-label*="send" i]',
    enabled: true
  },
  
  // Chat 产品
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    selector: 'textarea',
    submitSelector: 'button[data-testid="send-button"]',
    enabled: true
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    selector: 'div[contenteditable="true"]',
    submitSelector: 'button[aria-label*="send" i]',
    enabled: true
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai',
    selector: 'textarea',
    submitSelector: 'button[aria-label*="submit" i]',
    enabled: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    selector: 'textarea',
    submitSelector: 'button[aria-label*="send" i]',
    enabled: true
  },
  {
    id: 'qianwen',
    name: '千问',
    url: 'https://www.qianwen.com/',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: true
  },

  {
    id: 'doubao',
    name: '豆包',
    url: 'https://www.doubao.com',
    selector: 'textarea',
    submitSelector: 'button[aria-label*="发送" i]',
    enabled: true
  },
  {
    id: 'yiyan',
    name: '文心一言',
    url: 'https://yiyan.baidu.com',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: true
  },
  {
    id: 'kimi',
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: true
  },
  {
    id: 'genspark',
    name: 'Genspark',
    url: 'https://www.genspark.ai',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: true
  },
  {
    id: 'autoglm',
    name: 'AutoGLM',
    url: 'https://chatglm.cn',
    selector: 'textarea',
    submitSelector: 'button[aria-label*="send" i]',
    enabled: true
  },
  {
    id: 'metaso',
    name: '秘塔 AI 搜索',
    url: 'https://metaso.cn',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: true
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://x.com/i/grok',
    selector: 'textarea',
    submitSelector: 'button[data-testid="send-button"]',
    enabled: true
  },
  {
    id: 'zhipu',
    name: '智谱',
    url: 'https://chatglm.cn',
    selector: 'textarea',
    submitSelector: 'button[aria-label*="发送" i]',
    enabled: true
  }
];

// 全局状态
let products = [];
let editingProductId = null;

// DOM 元素
const promptInput = document.getElementById('promptInput');
const clearBtn = document.getElementById('clearBtn');
const productsList = document.getElementById('productsList');
const emptyState = document.getElementById('emptyState');
const distributeBtn = document.getElementById('distributeBtn');
const statusMsg = document.getElementById('statusMsg');
const manageBtn = document.getElementById('manageBtn');
const manageModal = document.getElementById('manageModal');
const closeModal = document.getElementById('closeModal');
const manageProductsList = document.getElementById('manageProductsList');
const addProductBtn = document.getElementById('addProductBtn');
const addFirstBtn = document.getElementById('addFirstBtn');
const editModal = document.getElementById('editModal');
const closeEditModal = document.getElementById('closeEditModal');
const productForm = document.getElementById('productForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editModalTitle = document.getElementById('editModalTitle');
const langBtn = document.getElementById('langBtn');
const cancelBtn = document.getElementById('cancelBtn');
let distributionCancelled = false;

// 初始化
async function init() {
  await initLanguage();
  await loadProducts();
  renderProductsList();
  updateDistributeButton();
  await restoreProgressState();
  bindEvents();
}

// 恢复进度状态
async function restoreProgressState() {
  const { distributionInProgress, distributionProgress } = await chrome.storage.local.get([
    'distributionInProgress',
    'distributionProgress'
  ]);
  
  if (distributionInProgress && distributionProgress) {
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressSection.style.display = 'block';
    const percent = (distributionProgress.completed / distributionProgress.total) * 100;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = t('progressText', { completed: distributionProgress.completed, total: distributionProgress.total });
    
    distributeBtn.disabled = true;
  }
}

// 加载产品列表
async function loadProducts() {
  const result = await chrome.storage.local.get(['products']);
  if (result.products && result.products.length > 0) {
    products = result.products;
  } else {
    // 首次使用，初始化默认产品列表
    products = DEFAULT_PRODUCTS.map(p => ({ ...p, id: generateId() }));
    await saveProducts();
  }
}

// 保存产品列表
async function saveProducts() {
  await chrome.storage.local.set({ products });
}

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 渲染产品列表
function renderProductsList() {
  if (products.length === 0) {
    productsList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  productsList.style.display = 'block';
  emptyState.style.display = 'none';

  productsList.innerHTML = products.map(product => `
    <div class="product-item" data-id="${product.id}">
      <input type="checkbox" id="product-${product.id}" ${product.enabled ? 'checked' : ''}>
      <div class="product-info">
        <div class="product-name">${escapeHtml(product.name)}</div>
      </div>
    </div>
  `).join('');

  // 绑定复选框事件
  products.forEach(product => {
    const checkbox = document.getElementById(`product-${product.id}`);
    if (checkbox) {
      checkbox.addEventListener('change', async (e) => {
        product.enabled = e.target.checked;
        await saveProducts();
        updateDistributeButton();
      });
    }
  });
}

// 渲染管理产品列表
function renderManageProductsList() {
  if (products.length === 0) {
    manageProductsList.innerHTML = `<p style="text-align: center; color: #8492a6; padding: 20px;">${t('noProductsText')}</p>`;
    return;
  }

  manageProductsList.innerHTML = products.map(product => `
    <div class="manage-product-item" data-id="${product.id}">
      <div class="product-info">
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="product-url">${escapeHtml(product.url)}</div>
      </div>
      <div class="manage-product-actions">
        <button class="btn-icon-only edit" data-id="${product.id}" title="${t('editTitleAttr')}">✏️</button>
        <button class="btn-icon-only delete" data-id="${product.id}" title="${t('deleteTitleAttr')}">🗑️</button>
      </div>
    </div>
  `).join('');

  // 绑定编辑和删除按钮
  document.querySelectorAll('.btn-icon-only.edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  document.querySelectorAll('.btn-icon-only.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

// 更新分发按钮状态
function updateDistributeButton() {
  const hasPrompt = promptInput.value.trim().length > 0;
  const hasEnabledProducts = products.some(p => p.enabled);
  distributeBtn.disabled = !hasPrompt || !hasEnabledProducts;
}

// 绑定事件
function bindEvents() {
  // 清空按钮
  clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    updateDistributeButton();
  });

  // Prompt 输入变化
  promptInput.addEventListener('input', updateDistributeButton);

  // 分发按钮
  distributeBtn.addEventListener('click', handleDistribute);

  // 管理按钮
  manageBtn.addEventListener('click', () => {
    renderManageProductsList();
    manageModal.style.display = 'flex';
  });

  // 关闭管理模态框
  closeModal.addEventListener('click', () => {
    manageModal.style.display = 'none';
    renderProductsList();
  });

  // 添加产品按钮
  addProductBtn.addEventListener('click', () => openEditModal());
  addFirstBtn.addEventListener('click', () => openEditModal());

  // 关闭编辑模态框
  closeEditModal.addEventListener('click', closeEditModalHandler);
  cancelEditBtn.addEventListener('click', closeEditModalHandler);

  // 产品表单提交
  productForm.addEventListener('submit', handleProductFormSubmit);

  // 点击模态框外部关闭
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
  
  // 语言切换按钮
  if (langBtn) {
    langBtn.addEventListener('click', async () => {
      const newLang = currentLang === 'zh' ? 'en' : 'zh';
      await setLanguage(newLang);
    });
  }
  
  // 取消按钮
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelDistribution);
  }
  
  // 监听语言变化事件
  document.addEventListener('languageChanged', () => {
    renderManageProductsList();
    renderProductsList();
    if (editingProductId) {
      openEditModal(editingProductId);
    }
  });
}

// 打开编辑模态框
function openEditModal(productId = null) {
  editingProductId = productId;
  
  if (productId) {
    // 编辑模式
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    editModalTitle.textContent = t('editTitle');
    document.getElementById('productName').value = product.name;
    document.getElementById('productUrl').value = product.url;
    document.getElementById('productSelector').value = product.selector || '';
    document.getElementById('productSubmitSelector').value = product.submitSelector || '';
  } else {
    // 添加模式
    editModalTitle.textContent = t('addTitle');
    productForm.reset();
  }
  
  manageModal.style.display = 'none';
  editModal.style.display = 'flex';
}

// 关闭编辑模态框
function closeEditModalHandler() {
  editModal.style.display = 'none';
  editingProductId = null;
  productForm.reset();
  if (products.length > 0) {
    manageModal.style.display = 'flex';
  }
}

// 处理产品表单提交
async function handleProductFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('productName').value.trim();
  const url = document.getElementById('productUrl').value.trim();
  const selector = document.getElementById('productSelector').value.trim();
  const submitSelector = document.getElementById('productSubmitSelector').value.trim();
  
  if (!name || !url) {
    showStatus(t('statusFillRequired'), 'error');
    return;
  }
  
  if (editingProductId) {
    // 编辑现有产品
    const product = products.find(p => p.id === editingProductId);
    if (product) {
      product.name = name;
      product.url = url;
      product.selector = selector;
      product.submitSelector = submitSelector;
    }
  } else {
    // 添加新产品
    products.push({
      id: generateId(),
      name,
      url,
      selector,
      submitSelector,
      enabled: true
    });
  }
  
  await saveProducts();
  closeEditModalHandler();
  renderManageProductsList();
  renderProductsList();
  updateDistributeButton();
  showStatus(editingProductId ? t('statusProductUpdated') : t('statusProductAdded'), 'success');
}

// 删除产品
async function deleteProduct(productId) {
  if (!confirm(t('deleteConfirm'))) return;
  
  products = products.filter(p => p.id !== productId);
  await saveProducts();
  renderManageProductsList();
  renderProductsList();
  updateDistributeButton();
  showStatus(t('statusProductDeleted'), 'success');
}

// 处理分发
async function handleDistribute() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showStatus(t('statusEnterPrompt'), 'error');
    return;
  }
  
  const enabledProducts = products.filter(p => p.enabled);
  if (enabledProducts.length === 0) {
    showStatus(t('statusSelectProduct'), 'error');
    return;
  }
  
  // 重置取消标志
  distributionCancelled = false;
  
  // 禁用按钮并显示进度条
  distributeBtn.disabled = true;
  
  const progressSection = document.getElementById('progressSection');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  progressSection.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = t('progressText', { completed: 0, total: enabledProducts.length });
  if (cancelBtn) {
    cancelBtn.style.display = 'block';
    cancelBtn.textContent = t('cancelBtn');
  }
  
  try {
    // 监听进度更新
    const progressListener = (message) => {
      if (message.action === 'distributionProgress') {
        const percent = (message.completed / message.total) * 100;
        progressFill.style.width = `${percent}%`;
        progressText.textContent = t('progressText', { completed: message.completed, total: message.total });
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
    
    // 发送消息到 background script
    const response = await chrome.runtime.sendMessage({
      action: 'distribute',
      prompt,
      products: enabledProducts
    });
    
    chrome.runtime.onMessage.removeListener(progressListener);
    
    // 检查是否被取消
    if (distributionCancelled) {
      return;
    }
    
    if (response && response.success) {
      const successCount = response.results.filter(r => r.success).length;
      const failCount = response.results.length - successCount;
      
      // 完成进度
      progressFill.style.width = '100%';
      progressText.textContent = t('progressText', { completed: enabledProducts.length, total: enabledProducts.length });
      
      // 隐藏取消按钮
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      
      // 2秒后隐藏进度条
      setTimeout(() => {
        progressSection.style.display = 'none';
      }, 2000);
      
      if (failCount === 0) {
        showStatus(t('statusDistributeSuccess', { count: successCount }), 'success');
      } else {
        showStatus(t('statusDistributePartial', { success: successCount, fail: failCount }), 'error');
      }
    } else if (response && response.cancelled) {
      progressSection.style.display = 'none';
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      showStatus('Distribution cancelled', 'info');
    } else {
      progressSection.style.display = 'none';
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      showStatus(t('statusDistributeFailed', { error: response?.error || 'Unknown error' }), 'error');
    }
  } catch (error) {
    if (!distributionCancelled) {
      progressSection.style.display = 'none';
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
      showStatus(t('statusDistributeFailed', { error: error.message }), 'error');
    }
  } finally {
    if (!distributionCancelled) {
      distributeBtn.disabled = false;
      updateDistributeButton();
    }
  }
}

// 取消分发
async function cancelDistribution() {
  distributionCancelled = true;
  await chrome.runtime.sendMessage({ action: 'cancelDistribution' });
  const progressSection = document.getElementById('progressSection');
  const cancelBtn = document.getElementById('cancelBtn');
  progressSection.style.display = 'none';
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
  distributeBtn.disabled = false;
  updateDistributeButton();
  showStatus('Distribution cancelled', 'info');
}

// 显示状态消息
function showStatus(message, type = 'info') {
  statusMsg.textContent = message;
  statusMsg.className = `status-msg ${type}`;
  statusMsg.style.display = 'block';
  
  setTimeout(() => {
    statusMsg.style.display = 'none';
  }, 3000);
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 启动
init();
