import type { Product } from '../types';

export const defaultProducts: Product[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    defaultEnabled: true,
    loginHints: ['/auth/login', '/auth/error'],
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    matches: ['https://claude.ai/*'],
    defaultEnabled: true,
    loginHints: ['/login', '/oauth'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    matches: ['https://gemini.google.com/*'],
    defaultEnabled: true,
    loginHints: ['/signin', 'accounts.google.com'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    matches: ['https://www.perplexity.ai/*', 'https://perplexity.ai/*'],
    defaultEnabled: false,
    loginHints: ['/login', '/signin'],
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://x.com/i/grok',
    matches: ['https://x.com/i/grok*'],
    defaultEnabled: false,
    loginHints: ['/i/flow/login', '/login'],
  },
  {
    id: 'manus',
    name: 'Manus',
    url: 'https://manus.im/app',
    matches: ['https://manus.im/*', 'https://www.manus.im/*'],
    defaultEnabled: false,
    loginHints: ['/login', '/signin'],
  },
];

export function getProduct(id: Product['id']): Product | undefined {
  return defaultProducts.find((product) => product.id === id);
}
