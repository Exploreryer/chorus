import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Chorus - AI Prompt Comparison Assistant',
    version: '1.0.1',
    description: 'One-click synchronous distribution of Prompts to multiple AI conversation products for easy horizontal comparison evaluation',
    permissions: ['storage', 'tabs', 'tabGroups', 'scripting'],
    host_permissions: ['https://*/*', 'http://*/*'],
  },
  outDir: '.output',
  srcDir: '.',
});
