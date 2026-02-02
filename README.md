# Chorus - AI Prompt Comparison Assistant

![Chorus Logo](icons/icon128.png)

**Chorus** is a Chrome browser extension designed for AI product evaluation and Prompt effectiveness comparison scenarios. It can synchronously distribute Prompts to multiple AI conversation products with one click, completely eliminating the tedious process of repeatedly manually opening pages and copying/pasting, allowing you to complete multi-product answer comparisons in the simplest way with maximum efficiency.

![Chorus Demo](chorus-demo-screenshot.png)

## ✨ Core Features

### 🚀 One-Click Prompt Distribution
- Enter a Prompt once, distribute it to multiple specified AI conversation products with one click
- Automatically open new tabs for each product and fill in content
- Significantly save evaluation time, improve work efficiency by 3x or more

### 📋 Product List Management
- Custom add, edit, and delete AI products
- Flexibly select products to participate in this round of evaluation
- Support custom input selector configuration (advanced feature)

### 🎯 Intelligent Auto-Fill
- Automatically identify input boxes on target pages
- Support multiple input box types (textarea, contenteditable, input)
- Intelligent retry mechanism to ensure fill success rate

### 🔒 Privacy Protection
- All operations completed locally, no cloud storage
- No data uploaded to servers
- No Prompt history recorded (optional)

### 🎨 Minimalist Beautiful Interface
- Material Design style
- Clear information hierarchy
- Smooth interactive experience

## 📦 Preset AI Products

The extension comes pre-configured with the following commonly used AI conversation products:

| Product Name | Website |
|-------------|---------|
| ChatGPT | https://chat.openai.com |
| Claude | https://claude.ai |
| Gemini | https://gemini.google.com |
| Wenxin Yiyan | https://yiyan.baidu.com |
| Tongyi Qianwen | https://tongyi.aliyun.com |
| Kimi | https://kimi.moonshot.cn |
| Doubao | https://www.doubao.com |

You can also add other AI products as needed.

## 🔧 Installation

### Method 1: Developer Mode Installation (Recommended)

1. **Download Extension Files**
   - Download `chorus-extension-v1.0.0.zip` and extract to a local folder

2. **Open Chrome Extensions Page**
   - Enter in Chrome browser address bar: `chrome://extensions/`
   - Or click Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Turn on the "Developer mode" switch in the top right corner of the page

4. **Load Extension**
   - Click "Load unpacked"
   - Select the extracted `chorus-extension` folder
   - Click "Select Folder"

5. **Complete Installation**
   - The extension icon will appear in the Chrome toolbar
   - If you don't see the icon, click the extensions icon (puzzle icon) and pin Chorus

### Method 2: Install from Chrome Web Store (Future Support)

The extension is currently in development version and has not been published to Chrome Web Store. After official release, you can install it directly from the app store with one click.

## 📖 User Guide

### Basic Usage Flow

1. **Open Extension**
   - Click the Chorus icon in the Chrome toolbar

2. **Enter Prompt**
   - Enter or paste your Prompt in the text box
   - Supports multi-line text and basic formatting

3. **Select AI Products**
   - Check the AI products you want to evaluate
   - You can select one or more products

4. **One-Click Distribution**
   - Click the "Execute" button
   - The extension will automatically open tabs for all selected products and fill in the Prompt

5. **View Results**
   - Switch browser tabs to view each product's answers
   - Easily perform horizontal comparison

### Managing AI Products

1. **Open Management Interface**
   - Click the "Manage" button in the extension popup

2. **Add New Product**
   - Click "+ Add New Product"
   - Fill in product name and URL
   - (Optional) Fill in custom input selector
   - Click "Save"

3. **Edit Product**
   - Click the "✏️" icon on the right side of the product in the management list
   - Modify information and click "Save"

4. **Delete Product**
   - Click the "🗑️" icon on the right side of the product in the management list
   - Confirm deletion

### Advanced Feature: Custom Selector

If the extension cannot automatically identify an AI product's input box, you can manually configure the selector:

1. **Open Target AI Product Page**
2. **Right-click Input Box → Inspect**
3. **View Element's CSS Selector**
   - Examples: `textarea`, `div[contenteditable="true"]`, `#prompt-input`
4. **Edit the product in the extension and fill in the selector**

Common selector examples:
- `textarea` - Standard text area
- `div[contenteditable="true"]` - Editable div
- `input[type="text"]` - Text input box
- `#chat-input` - Element with ID
- `.message-input` - Element with class

## 🎯 Use Cases

### AI Product Evaluators
- Quickly compare answer quality across multiple AI products
- Evaluate capability differences between different models
- Create comparison videos or articles

### Prompt Engineers
- Verify Prompt performance across different models
- Optimize Prompt design
- Research model characteristics

### Content Creators
- Collect creative inspiration from multiple AIs
- Compare different output styles
- Improve content creation efficiency

### Product Managers/Developers
- Competitive analysis
- Feature comparison
- User experience research

## ⚠️ Notes

1. **Network Connection**
   - Ensure you can normally access target AI product websites
   - Some products may require login before use

2. **Login Status**
   - It's recommended to log in to all AI products to be evaluated in advance
   - The extension will not automatically handle login process

3. **Page Loading**
   - The extension will wait for page loading to complete (maximum 30 seconds)
   - If page loading is slow, timeout prompts may appear

4. **Input Box Identification**
   - The extension will automatically try multiple selectors
   - If automatic identification fails, please configure a custom selector

5. **Browser Performance**
   - Opening multiple tabs simultaneously may consume more memory
   - It's recommended to appropriately control the number of products based on computer performance

6. **Privacy & Security**
   - The extension will not upload your Prompts to any server
   - All data is only saved locally in the browser

## 🔐 Permissions

The extension requires the following permissions:

| Permission | Purpose |
|-----------|---------|
| `storage` | Save product list and configuration locally |
| `tabs` | Create and manage tabs |
| `scripting` | Inject scripts into pages to fill content |
| `host_permissions` | Access target AI product websites |

**Privacy Commitment**: The extension does not collect, store, or transmit any of your personal information or usage data.

## 🐛 FAQ

### Q1: No response after clicking "Execute"?
**A**: Please check:
- Whether a Prompt has been entered
- Whether at least one AI product has been selected
- Whether there are error messages in the browser console

### Q2: Input box of a certain product is not auto-filled?
**A**: Possible reasons:
- Special page structure, extension cannot automatically identify
- Solution: Configure a custom selector for this product in the management interface

### Q3: Content incomplete or garbled after filling?
**A**: Possibly:
- Target website has character limits on input
- Recommend shortening the Prompt or testing in segments

### Q4: Will the extension save my Prompt history?
**A**: Not saved by default. All Prompts are only used in the current session and will not remain after closing the extension.

### Q5: Can I distribute to more than 10 products simultaneously?
**A**: Technically possible, but not recommended. Opening too many tabs simultaneously will affect browser performance.

### Q6: Does the extension support mobile?
**A**: Currently only supports Chrome desktop version. Mobile browsers do not support extensions.

## 🛠️ Tech Stack

- **Manifest Version**: V3
- **Frontend**: Native HTML/CSS/JavaScript
- **Storage**: Chrome Storage API
- **Communication**: Chrome Runtime & Tabs API
- **Permissions**: Scripting API

## 📝 Version History

### v1.0.0 (2026-02-02)
- ✨ Initial release
- 🚀 Support one-click Prompt distribution to multiple AI products
- 📋 Product list management functionality
- 🎯 Intelligent auto-fill
- 🎨 Minimalist beautiful interface
- 🔒 Fully localized, privacy protected
- 🌐 English/Chinese language support

## 🤝 Feedback & Support

If you encounter problems during use or have improvement suggestions, please contact us through the following methods:

- **Issue Reports**: Submit issues on GitHub Issues
- **Feature Suggestions**: Start discussions on GitHub Discussions
- **Email Contact**: chorus-support@example.com

## 📄 License

This project is open source under the MIT License.

## 🙏 Acknowledgments

Thanks to all AI product evaluators and Prompt engineers for their feedback and support!

---

**Make AI comparison simpler, make Prompt testing more efficient!** 🎉
