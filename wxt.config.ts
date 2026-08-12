import { defineConfig } from 'wxt';
import platforms from './utils/platforms.json';

const hostPermissions = [...new Set(platforms.flatMap((platform) => platform.matches))];

export default defineConfig({
  manifest: {
    name: 'Chorus - Compare AI Answers',
    version: '1.1.0',
    description: 'Ask once across ChatGPT, Claude, Gemini, Perplexity, Grok and Manus using your existing accounts',
    homepage_url: 'https://github.com/Exploreryer/chorus',
    permissions: ['storage', 'tabGroups', 'scripting'],
    host_permissions: hostPermissions,
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  outDir: '.output',
  srcDir: '.',
});
