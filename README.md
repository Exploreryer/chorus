# Chorus - AI Prompt Comparison Assistant

![Chorus Logo](public/icons/icon128.png)

**Chorus** is a Chrome extension built with WXT and TypeScript for AI product evaluation and prompt comparison. Distribute prompts to multiple AI chat platforms with one click, eliminating repetitive copy-pasting.

## ✨ Features

- **One-Click Distribution**: Send prompts to multiple AI products simultaneously
- **Product Management**: Add, edit, and customize AI products
- **Auto-Fill & Submit**: Automatically fill prompts and trigger sending
- **Tab Grouping**: Organizes opened tabs into a "Chorus AI" group
- **Privacy-First**: All operations are local; no data is uploaded
- **Multi-Language**: English and Chinese support

## 🚀 Technology Stack

- **Framework**: [WXT](https://wxt.dev/) - Next-gen web extension framework
- **Language**: TypeScript with full type safety
- **Build Tool**: Vite (via WXT)
- **Manifest**: MV3 (Manifest Version 3)

## 📦 Installation

### For Users

1. Download the latest release from [Releases](https://github.com/Exploreryer/chorus/releases)
2. Extract the zip file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the `.output/chrome-mv3/` folder
6. The Chorus icon will appear in the toolbar

### For Developers

```bash
# Clone the repository
git clone https://github.com/Exploreryer/chorus.git
cd chorus

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

See [QUICK_START.md](./QUICK_START.md) for detailed development guide.

## 🎯 Usage

1. Click the Chorus icon in the toolbar
2. Enter your prompt in the text area
3. Select the AI products to compare
4. Click "Ask All" to open tabs and auto-fill prompts
5. Switch between tabs to compare responses

## 🔧 Managing Products

Click the "Manage" button to:
- Add new products (name, URL, optional selectors)
- Edit existing products
- Delete products

### Custom Selectors

If auto-fill fails for a product, configure custom CSS selectors:
- **Input Selector**: e.g., `textarea`, `div[contenteditable="true"]`
- **Submit Selector**: e.g., `button[type="submit"]`

## 🤖 Supported AI Products (Presets)

**Agent Products:**
- Manus, Anygen, Coze, Minimax

**Chat Products:**
- ChatGPT, Claude, Gemini, Perplexity, Grok
- Kimi, Doubao, ERNIE Bot, Tongyi Qwen
- ChatGLM, Metaso, Genspark, and more

## 🛠️ Development

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Build for Firefox
npm run build:firefox

# Create distribution zip
npm run zip
```

### Project Structure

```
chorus/
├── entrypoints/          # Extension entrypoints
│   ├── background.ts    # Background service worker
│   ├── content.ts       # Content script
│   └── popup/           # Popup UI
├── utils/               # Utility functions
├── types/               # TypeScript definitions
├── public/              # Static assets
└── wxt.config.ts        # WXT configuration
```

## 🔒 Permissions

| Permission | Purpose |
|-----------|---------|
| `storage` | Save product list and settings locally |
| `tabs` | Create and manage tabs |
| `tabGroups` | Organize tabs into groups |
| `scripting` | Fill content into AI platform pages |
| `host_permissions` | Access all websites for auto-fill |

## ❓ FAQ

**Q: Why didn't the prompt get filled?**  
A: The page structure may have changed. Try configuring a custom selector for that product.

**Q: Does it save my prompt history?**  
A: No. Prompts are only used in the current session.

**Q: Extension not loading after build?**  
A: Make sure you're loading the `.output/chrome-mv3/` directory, not the project root.

**Q: How do I enable HMR during development?**  
A: Run `npm run dev` and the extension will auto-reload when you make changes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Use TypeScript for all new code
2. Follow existing code style
3. Add types for all functions and variables
4. Test in both Chrome and Firefox if possible
5. Update documentation as needed

## 📝 License

MIT License

## 🔗 Links

- [WXT Documentation](https://wxt.dev/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Quick Start Guide](./QUICK_START.md)

---

**Make AI comparison simpler.**
