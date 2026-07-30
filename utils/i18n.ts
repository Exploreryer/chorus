export type Language = 'en' | 'zh';

const translations = {
  en: {
    tagline: 'Ask once across your trusted AI tools',
    promptLabel: 'Your question',
    clear: 'Clear',
    promptPlaceholder: 'What do you want to compare?',
    modelsLabel: 'Send to',
    modelsHint: 'Choose at least two for a useful comparison',
    privacy: 'Uses your existing signed-in sessions · Prompts stay in your browser',
    ask: 'Ask {count} AIs',
    askOne: 'Ask 1 AI',
    cancel: 'Cancel',
    progress: 'Sending {completed} of {total}',
    resultTitle: 'Sent',
    resultPartial: 'Some platforms need attention',
    tryAgain: 'Try again',
    authRequired: 'Sign in first',
    inputNotFound: 'Input not found',
    submitNotFound: 'Filled but not sent',
    pageLoadTimeout: 'Page took too long',
    contentUnavailable: 'Open or reload the site',
    unknownError: 'Could not send',
    emptyPrompt: 'Write a question first',
    selectProduct: 'Choose at least one AI',
    completed: 'Opened in {count} AI tools',
    existingTab: 'Reused open tab',
    newTab: 'Opened new tab',
  },
  zh: {
    tagline: '一个问题，同时问你信任的 AI',
    promptLabel: '你的问题',
    clear: '清空',
    promptPlaceholder: '你想比较什么？',
    modelsLabel: '发送到',
    modelsHint: '至少选择两个，比较才更有意义',
    privacy: '使用你已登录的账号 · Prompt 只在浏览器本地处理',
    ask: '同时问 {count} 个 AI',
    askOne: '问 1 个 AI',
    cancel: '取消',
    progress: '正在发送 {completed} / {total}',
    resultTitle: '已发送',
    resultPartial: '部分平台需要处理',
    tryAgain: '重试',
    authRequired: '请先登录',
    inputNotFound: '未找到输入框',
    submitNotFound: '已填入但未发送',
    pageLoadTimeout: '页面加载超时',
    contentUnavailable: '请打开或刷新页面',
    unknownError: '发送失败',
    emptyPrompt: '请先输入问题',
    selectProduct: '请至少选择一个 AI',
    completed: '已在 {count} 个 AI 中打开',
    existingTab: '复用已打开页面',
    newTab: '打开新页面',
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
