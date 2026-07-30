import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Chorus - Compare AI Answers',
    version: '1.1.0',
    description: 'Ask once across ChatGPT, Claude, Gemini, Perplexity, Grok and Manus using your existing accounts',
    permissions: ['storage', 'tabs', 'tabGroups'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
      'https://www.perplexity.ai/*',
      'https://perplexity.ai/*',
      'https://x.com/i/grok*',
      'https://manus.im/*',
      'https://www.manus.im/*',
    ],
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  outDir: '.output',
  srcDir: '.',
});
