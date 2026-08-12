# Chorus — Compare AI Answers

Chorus is a privacy-first Chrome extension that sends one question to ChatGPT, Claude, Gemini, Perplexity, Grok, and Manus through the accounts already signed in to your browser.

> Chorus is the current working name. A final name will be selected before the Chrome Web Store submission because another directly competing extension already uses this name.

## What the launch version does

- Sends one prompt to the AI sites you select
- Reuses only empty, safe-to-use tabs and preserves existing drafts and conversations
- Opens a fresh tab when an existing tab is not safe to reuse
- Confirms sending per platform and reports sign-in, loading, input, and send failures separately
- Keeps task progress recoverable if the popup closes
- Lets you open a result or retry only the failed platforms
- Uses no Chorus backend and sends prompts only to the selected AI websites

The launch scope intentionally stops here. Answer aggregation, cross-checking, and multi-AI conversation sets are later product work.

## Supported platforms

- ChatGPT
- Claude
- Gemini
- Perplexity
- Grok
- Manus

Platform URLs and page adapters have one source of truth: [`utils/platforms.json`](utils/platforms.json).

## Privacy and permissions

Read the [Privacy Policy](PRIVACY.md) and the permission explanations in [Chrome Web Store Submission](docs/CHROME_WEB_STORE_SUBMISSION.md).

## Develop and verify

```bash
npm ci
npm run dev
npm run verify
```

`npm run verify` type-checks the code, validates all six platform adapters, creates the production WXT build and ZIP, and checks the manifest, permissions, icons, popup CSS/script, and archive contents.

Production outputs:

- Unpacked extension: `.output/chrome-mv3/`
- Store upload ZIP: `.output/chorus-1.1.0-chrome.zip`

Always load the WXT-generated folder or upload the WXT-generated ZIP. Do not manually assemble a test package.

## Release status

The source and package checks are automated. Real Chrome acceptance results and remaining submission work are tracked in [Chrome Web Store Submission](docs/CHROME_WEB_STORE_SUBMISSION.md).
