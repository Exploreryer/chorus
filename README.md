# Chorus - Compare AI Answers

Chorus is a privacy-first Chrome extension that sends one question to several AI products using the accounts already signed in to your browser.

## Supported products

- ChatGPT
- Claude
- Gemini
- Perplexity
- Grok
- Manus

## What changed in 1.1

- A simplified first-run experience with ChatGPT, Claude and Gemini selected by default
- A focused product list instead of custom CSS selector configuration
- Reuse of existing AI tabs when possible
- Clear per-platform results such as sign-in required, input not found or filled but not sent
- Narrow host permissions limited to supported AI products
- Local-only aggregate product events that never store prompt text

## How it works

1. Open Chorus
2. Write one question
3. Choose the AI products you want to use
4. Select **Ask**
5. Chorus reuses an existing product tab when possible or opens a new one, then fills and sends the question

Prompts are processed locally and are not uploaded by Chorus.

## Development

```bash
npm install
npm run dev
npm run build
```

Built with WXT, TypeScript and Manifest V3.
