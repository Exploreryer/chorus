# Local test guide

## Build the release candidate

```bash
npm ci
npm run verify
```

The verification command must finish successfully before browser testing.

## Load it in Chrome

1. Open `chrome://extensions/`
2. Turn on Developer mode
3. Select **Load unpacked**
4. Choose `.output/chrome-mv3/`
5. Pin the extension and open its popup

The popup must have complete styling. If it appears as bare HTML, unload it and rebuild; never patch the generated package by hand.

## Test the launch flow

1. Sign in to the AI websites you want to test
2. Open the popup and refresh platform status
3. Enter a unique harmless prompt
4. Select the target platforms and send
5. Confirm that each successful result contains the exact prompt as a user message
6. Confirm that sign-in and page failures are clearly reported
7. Test an existing draft: Chorus must preserve it and open a fresh tab
8. Close and reopen the popup during sending: progress must be restored
9. Retry one failed platform without resending successful platforms
10. Cancel a run: newly created tabs must close

Record results in [`docs/CHROME_WEB_STORE_SUBMISSION.md`](docs/CHROME_WEB_STORE_SUBMISSION.md).

## Change platform adapters

Edit only `utils/platforms.json`. Keep host patterns narrow and run `npm run verify`; the validator prevents manifest, content-script, and runtime configuration drift.

Key code:

- Popup: `entrypoints/popup/`
- Task and tab management: `entrypoints/background.ts`
- Page interaction and send confirmation: `entrypoints/content.ts`
- Shared protocol: `types/index.ts`
