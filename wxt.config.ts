import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Chorus - AI Prompt Comparison Assistant',
    version: '1.0.2',
    description: 'One-click synchronous distribution of Prompts to multiple AI conversation products for easy horizontal comparison evaluation',
    permissions: ['storage', 'tabs', 'tabGroups', 'scripting'],
    host_permissions: ['https://*/*', 'http://*/*'],
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  outDir: '.output',
  srcDir: '.',
});
