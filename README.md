# Chorus - AI Prompt Comparison Assistant

![Chorus Logo](icons/icon128.png)

**Chorus** is a Chrome extension for AI product evaluation and prompt comparison. Distribute prompts to multiple AI chat platforms with one click, eliminating repetitive copy-pasting.

![Chorus Demo](chorus-demo-screenshot.png)

## Features

- **One-Click Distribution**: Send prompts to multiple AI products simultaneously
- **Product Management**: Add, edit, and customize AI products
- **Auto-Fill & Submit**: Automatically fill prompts and trigger sending
- **Tab Grouping**: Organizes opened tabs into a "Chorus AI" group
- **Privacy-First**: All operations are local; no data is uploaded

## Preset AI Products

ChatGPT, Claude, Gemini, Perplexity, Grok, Kimi, Doubao, Wenxin Yiyan, Tongyi Qianwen, and more.

## Installation

1. Download and extract the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extracted folder
5. The Chorus icon will appear in the toolbar

## Usage

1. Click the Chorus icon in the toolbar
2. Enter your prompt in the text area
3. Select the AI products to compare
4. Click "Execute" to open tabs and auto-fill prompts
5. Switch between tabs to compare responses

## Managing Products

Click the "Manage" button to:
- Add new products (name, URL, optional selectors)
- Edit existing products
- Delete products

### Custom Selectors

If auto-fill fails for a product, configure custom CSS selectors:
- **Input Selector**: e.g., `textarea`, `div[contenteditable="true"]`
- **Submit Selector**: e.g., `button[type="submit"]`

## Notes

- Ensure you are logged into the AI products before use
- Some AI platforms may require manual confirmation for the first use
- Opening many tabs simultaneously may affect browser performance

## Permissions

| Permission | Purpose |
|-----------|---------|
| `storage` | Save product list and settings locally |
| `tabs` | Create and manage tabs |
| `scripting` | Fill content into AI platform pages |

## FAQ

**Q: Why didn't the prompt get filled?**
A: The page structure may have changed. Try configuring a custom selector for that product.

**Q: Does it save my prompt history?**
A: No. Prompts are only used in the current session.

**Q: Is there a limit on the number of products?**
A: Technically no, but opening too many tabs may slow down your browser.

## License

MIT License

---

**Make AI comparison simpler.**
