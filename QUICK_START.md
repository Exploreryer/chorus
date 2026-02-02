# Quick Start Guide - WXT Development

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

This starts WXT with Hot Module Replacement (HMR). Your extension will automatically reload when you make changes!

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3/` folder
5. Done! The extension is now loaded

### 4. Make Changes

Edit any file and watch it reload instantly:
- `entrypoints/popup/main.ts` - Popup logic
- `entrypoints/popup/style.css` - Popup styles
- `entrypoints/background.ts` - Background worker
- `entrypoints/content.ts` - Content script

### 5. Build for Production

```bash
npm run build
```

Output will be in `.output/chrome-mv3/` and a zip file will be created automatically.

---

## 📂 Where to Find Things

### Main Files
- **Popup UI**: `entrypoints/popup/`
- **Background Worker**: `entrypoints/background.ts`
- **Content Script**: `entrypoints/content.ts`
- **Types**: `types/index.ts`
- **Utilities**: `utils/`
- **Config**: `wxt.config.ts`

### Key Concepts

#### Entrypoints
WXT uses file-based entrypoints. Files in `entrypoints/` become extension components:
- `background.ts` → Background service worker
- `content.ts` → Content script
- `popup/` → Popup UI

#### TypeScript
All code is TypeScript. Use types for everything:
```typescript
// Good
function handleClick(product: Product): void {
  // ...
}

// Bad
function handleClick(product: any) {
  // ...
}
```

#### Hot Module Replacement
When you save a file:
- ✅ Popup code: Instant reload (< 100ms)
- ✅ Styles: Instant update (no reload)
- ⚠️ Background/Content: Automatic extension reload

---

## 🔧 Common Tasks

### Add a New AI Product
Edit `utils/defaultProducts.ts`:
```typescript
export const defaultProducts: Product[] = [
  // ... existing products
  {
    id: 'myai',
    name: 'My AI',
    url: 'https://myai.com',
    selector: 'textarea',
    submitSelector: 'button[type="submit"]',
    enabled: false,
  },
];
```

### Add a Translation
Edit `utils/i18n.ts`:
```typescript
const translations = {
  en: {
    myNewKey: 'My New Text',
    // ...
  },
  zh: {
    myNewKey: '我的新文本',
    // ...
  },
};
```

### Modify Popup Styles
Edit `entrypoints/popup/style.css` - changes apply instantly!

### Add a New Type
Edit `types/index.ts`:
```typescript
export interface MyNewType {
  id: string;
  name: string;
  // ...
}
```

---

## 🐛 Debugging

### View Console Logs

**Popup:**
1. Right-click extension icon
2. Click "Inspect popup"
3. See console in DevTools

**Background:**
1. Go to `chrome://extensions/`
2. Find Chorus extension
3. Click "service worker" link
4. See console in DevTools

**Content Script:**
1. Open any webpage
2. Press F12 to open DevTools
3. Console shows content script logs

### Common Issues

**"Module not found" error:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Extension not loading:**
- Make sure you loaded `.output/chrome-mv3/`, not the project root
- Try `npm run build` again
- Check Chrome console for errors

**HMR not working:**
- Restart dev server: `npm run dev`
- Reload extension manually
- Check terminal for errors

---

## 📦 Building & Releasing

### Development Build (with source maps)
```bash
npm run dev
```

### Production Build (optimized)
```bash
npm run build
```

### Create Distribution Zip
```bash
npm run zip
# Or just run build (postbuild script auto-zips)
```

### Build for Firefox
```bash
npm run build:firefox
```

---

## 🎯 Development Workflow

```bash
# 1. Start dev server
npm run dev

# 2. Load extension in Chrome
# chrome://extensions/ → Load unpacked → .output/chrome-mv3/

# 3. Make changes to code
# Files auto-reload!

# 4. When done, build for production
npm run build

# 5. Test production build
# Reload extension with .output/chrome-mv3/

# 6. Create release
# Use .output/chorus-1.0.0-chrome.zip
```

---

## 💡 Pro Tips

1. **Keep dev server running** - It's fast and auto-reloads
2. **Use TypeScript types** - They catch bugs before runtime
3. **Check build output** - `npm run build` shows bundle size
4. **Use browser DevTools** - Full debugging support
5. **Read WXT docs** - https://wxt.dev/ has great examples

---

## 🆘 Need Help?

- **WXT Docs**: https://wxt.dev/
- **Issues**: Check GitHub Issues
- **Examples**: Check WXT examples on GitHub
- **Types**: Use Ctrl+Click in VSCode to jump to definitions

---

## 📚 Learn More

- [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) - Full migration details
- [README_WXT.md](./README_WXT.md) - Complete documentation
- [WXT Documentation](https://wxt.dev/) - Framework docs
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - TS guide

---

**Happy coding! 🚀**
