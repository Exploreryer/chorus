export type Language = 'en' | 'zh';

const translations = {
  en: {
    tagline: 'Ask once across your trusted AI tools',
    promptLabel: 'Your question',
    clear: 'Clear',
    promptPlaceholder: 'What do you want to compare?',
    modelsLabel: 'Send to',
    modelsHint: 'Choose at least two for a useful comparison',
    refreshStatus: 'Refresh status',
    checkingStatus: 'Checking…',
    privacy: 'Sent only to the AI sites you choose · Chorus has no server',
    ask: 'Ask {count} AIs',
    askOne: 'Ask 1 AI',
    cancel: 'Cancel',
    progress: 'Sending {completed} of {total}',
    resultTitle: 'Sent',
    resultPartial: 'Some platforms need attention',
    tryAgain: 'Try again',
    retryFailed: 'Retry failed',
    retryOne: 'Retry',
    open: 'Open',
    resultsSoFar: 'Results so far',
    authRequired: 'Sign in first',
    inputNotFound: 'Input not found',
    draftPreserved: 'Draft left unchanged',
    conversationPreserved: 'Existing conversation left unchanged',
    submitNotFound: 'Filled but not sent',
    submitNotConfirmed: 'Could not confirm sending',
    pageLoadTimeout: 'Page took too long',
    contentUnavailable: 'Open or reload the site',
    tabClosed: 'Tab was closed',
    taskInProgress: 'Another send is still running',
    taskCancelled: 'Sending cancelled',
    taskInterrupted: 'The previous send was interrupted. You can retry failed platforms.',
    unknownError: 'Could not send',
    emptyPrompt: 'Write a question first',
    selectProduct: 'Choose at least one AI',
    completed: 'Sent to {count} AI tools',
    existingTab: 'Reused open tab',
    newTab: 'Opened new tab',
    statusReady: 'Ready',
    statusWillOpen: 'Will open a new tab',
    statusSignIn: 'Sign in required',
    statusUnavailable: 'Use a new tab',
  },
  zh: {
    tagline: '一个问题，同时问你信任的 AI',
    promptLabel: '你的问题',
    clear: '清空',
    promptPlaceholder: '你想比较什么？',
    modelsLabel: '发送到',
    modelsHint: '至少选择两个，比较才更有意义',
    refreshStatus: '刷新状态',
    checkingStatus: '检查中…',
    privacy: '仅发送到你选择的 AI 网站 · Chorus 没有服务器',
    ask: '同时问 {count} 个 AI',
    askOne: '问 1 个 AI',
    cancel: '取消',
    progress: '正在发送 {completed} / {total}',
    resultTitle: '已发送',
    resultPartial: '部分平台需要处理',
    tryAgain: '重试',
    retryFailed: '重试失败项',
    retryOne: '重试',
    open: '打开',
    resultsSoFar: '当前结果',
    authRequired: '请先登录',
    inputNotFound: '未找到输入框',
    draftPreserved: '已保留原有草稿',
    conversationPreserved: '已保留现有对话',
    submitNotFound: '已填入但未发送',
    submitNotConfirmed: '无法确认是否已发送',
    pageLoadTimeout: '页面加载超时',
    contentUnavailable: '请打开或刷新页面',
    tabClosed: '标签页已关闭',
    taskInProgress: '已有发送任务正在进行',
    taskCancelled: '已取消发送',
    taskInterrupted: '上次发送被中断，可以重试失败平台',
    unknownError: '发送失败',
    emptyPrompt: '请先输入问题',
    selectProduct: '请至少选择一个 AI',
    completed: '已发送到 {count} 个 AI',
    existingTab: '复用已打开页面',
    newTab: '打开新页面',
    statusReady: '已准备',
    statusWillOpen: '将打开新标签页',
    statusSignIn: '需要登录',
    statusUnavailable: '将使用新标签页',
  },
} as const;

let language: Language = 'en';

export function t(key: keyof (typeof translations)['en'], params: Record<string, string> = {}): string {
  let value: string = translations[language][key] ?? translations.en[key];
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replace(`{${name}}`, replacement);
  }
  return value;
}

export async function initLanguage(): Promise<void> {
  const saved = await chrome.storage.local.get('language');
  if (saved.language === 'zh' || saved.language === 'en') {
    language = saved.language;
  } else if (chrome.i18n.getUILanguage().toLowerCase().startsWith('zh')) {
    language = 'zh';
  }
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
}

export async function toggleLanguage(): Promise<void> {
  language = language === 'zh' ? 'en' : 'zh';
  await chrome.storage.local.set({ language });
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
}

export function currentLanguage(): Language {
  return language;
}
