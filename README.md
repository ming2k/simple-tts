# Simple TTS

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Firefox Add-on](https://img.shields.io/amo/v/simple-tts?label=Firefox&logo=firefox)](https://addons.mozilla.org/en-US/firefox/addon/simple-tts/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Coming%20Soon-lightgrey?logo=google-chrome)](#installation)

A powerful yet simple browser extension that converts text to speech using Azure's premium neural voices. Get natural-sounding speech synthesis for any text on the web or your own content.

## Features

- **One-Click Text-to-Speech**: Right-click any selected text to hear it spoken
- **Popup Interface**: Type or paste text directly in the extension popup
- **Multi-Language Support**: High-quality neural voices in multiple languages
- **Customizable Settings**: Adjust speech rate, pitch, and voice selection
- **Modern UI**: Clean, intuitive interface with system theme support
- **Privacy-First**: All data stays local, no tracking or analytics
- **Cross-Browser**: Supports both Firefox and Chrome

## Installation

### Firefox
[![Get Simple TTS for Firefox](https://blog.mozilla.org/addons/files/2015/11/get-the-addon.png)](https://addons.mozilla.org/en-US/firefox/addon/simple-tts/)

### Chrome
> **Coming Soon!** We're looking for help packaging and publishing to the Chrome Web Store. [Contribute here](#contributing)!

## Quick Start

### 1. Get Azure Speech Service Credentials

Simple TTS uses Microsoft Azure's premium speech synthesis service for the highest quality voices.

1. **Sign up for Azure**: Create a free [Azure account](https://azure.microsoft.com/free/) (includes $200 credit)
2. **Create Speech Resource**: In the Azure portal, create a new Speech Service resource
3. **Get Credentials**: Copy your API key and region from the resource overview
4. **Preview Voices**: Try different voices at [Azure Voice Gallery](https://speech.microsoft.com/portal/voicegallery)

> **Tip**: Azure offers a generous free tier with 5 hours of neural voice synthesis per month.

### 2. Configure the Extension

1. Click the Simple TTS extension icon in your browser
2. Complete the guided onboarding process
3. Enter your Azure Speech key and region
4. Select your preferred voice and adjust settings

## How to Use

### Method 1: Context Menu (Recommended)
1. **Select text** on any webpage
2. **Right-click** and choose "**Speak selected text**"
3. **Listen** as the text is converted to natural speech

### Method 2: Extension Popup
1. **Click** the Simple TTS icon in your toolbar
2. **Type or paste** your text in the input field
3. **Click "Speak"** to hear your text converted to speech
4. **Adjust settings** like speed and voice as needed

### Method 3: Keyboard Shortcuts
- Press the selected text speech hotkey (configurable in extension settings)

## Development

### Prerequisites
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)

### Quick Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env  # Edit with your Azure credentials

# Development build with hot reload
npm run dev           # Both Firefox and Chrome
npm run dev:firefox   # Firefox only
npm run dev:chrome    # Chrome only
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development build with watch mode for both browsers |
| `npm run build` | Production build for both browsers |
| `npm run lint` | Run ESLint code quality checks |
| `npm run format` | Format code with Prettier |
| `npm run package` | Build and create ZIP files for distribution |
| `npm run clean` | Remove all build directories |

### Project Architecture

```
simple-tts/
├── src/
│   ├── popup/              # Extension popup interface
│   ├── settings/           # Settings and configuration pages
│   ├── onboarding/         # First-time setup wizard
│   ├── background/         # Background scripts and context menu
│   ├── content/            # Content scripts for web page integration
│   ├── services/           # TTS service and API integration
│   ├── utils/              # Utility functions and helpers
│   ├── assets/             # Icons, images, and static files
│   └── _locales/           # Internationalization files
├── webpack.*.js            # Build configuration
├── CLAUDE.md               # Development guide for AI assistants
└── package.json            # Dependencies and scripts
```

### Environment Configuration

Create a `.env` file for development:
```bash
# Azure Speech Service Configuration
AZURE_SPEECH_KEY=your_speech_service_key
AZURE_REGION=your_azure_region  # e.g., eastus, westus2
```

### Build Outputs
- **Development**: `dev/firefox/` and `dev/chrome/`
- **Production**: `dist/firefox/` and `dist/chrome/`
- **Packages**: `simple-tts-firefox.zip` and `simple-tts-chrome.zip`

### Firefox Development & Debugging

#### Loading the Extension in Firefox

1. **Build the development version**:
   ```bash
   npm run dev:firefox
   ```

2. **Open Firefox Developer Tools**:
   - Navigate to `about:debugging` in Firefox
   - Click "This Firefox" in the sidebar
   - Click "Load Temporary Add-on"

3. **Load the extension**:
   - Navigate to the `dev/firefox/` directory
   - Select the `manifest.json` file
   - The extension will be loaded and appear in the list

#### Debugging Tools & Techniques

##### Background Script Debugging
1. **Access Background Script Console**:
   - Go to `about:debugging`
   - Find your extension in the list
   - Click "Inspect" next to your extension
   - This opens the background script's dedicated console

2. **View Background Script Logs**:
   ```javascript
   // Use these in your background scripts for debugging
   console.log('Debug message');
   console.error('Error message');
   ```

##### Popup Debugging
1. **Inspect Popup**:
   - Right-click on the extension icon in the toolbar
   - Select "Inspect Element" or press `Ctrl+Shift+I`
   - The popup's DevTools will open in a separate window

2. **Persistent Popup for Debugging**:
   - Open popup DevTools
   - In the console, run: `document.documentElement.style.display = 'block'`
   - This keeps the popup open while debugging

##### Content Script Debugging
1. **Debug on Web Pages**:
   - Open any webpage where content scripts run
   - Press `F12` to open DevTools
   - Content script logs appear in the page's console
   - Look for your extension's messages in the Console tab

##### Settings Page Debugging
1. **Debug Settings Page**:
   - Go to `about:addons`
   - Find Simple TTS and click "Preferences" or the gear icon
   - Right-click on the settings page and select "Inspect Element"

#### Hot Reload Development

The development build includes automatic reloading:

1. **Start development mode**:
   ```bash
   npm run dev:firefox
   ```

2. **Make changes to your code** - the extension will automatically rebuild

3. **Reload the extension**:
   - Go to `about:debugging`
   - Click "Reload" button next to your extension
   - Or use the keyboard shortcut: `Ctrl+R` in the extension's context

#### Common Firefox Debugging Scenarios

##### Debugging Permission Issues
```javascript
// Check if permissions are granted
browser.permissions.contains({permissions: ['activeTab']})
  .then(hasPermission => console.log('Has activeTab permission:', hasPermission));
```

##### Debugging Storage Issues
```javascript
// Check extension storage
browser.storage.local.get().then(items => {
  console.log('All stored items:', items);
});
```

##### Debugging Message Passing
```javascript
// In background script - listen for messages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  console.log('From:', sender);
  return true; // Important: return true for async responses
});

// In content script - send messages
browser.runtime.sendMessage({action: 'test'})
  .then(response => console.log('Response:', response))
  .catch(error => console.error('Message error:', error));
```

#### Troubleshooting Common Issues

##### Extension Not Loading
- Check `manifest.json` syntax with a JSON validator
- Verify all file paths in manifest are correct
- Check browser console for detailed error messages
- Ensure all required permissions are declared

##### Background Script Errors
- Check the background script console in `about:debugging`
- Verify service worker compatibility (use persistent background pages for MV2)
- Check for async/await usage with proper error handling

##### Content Script Not Injecting
```javascript
// Debug content script injection
browser.tabs.executeScript({
  code: 'console.log("Content script test");'
}).catch(error => console.error('Injection failed:', error));
```

##### TTS Not Working
- Check Azure credentials in extension storage
- Verify network connectivity to Azure services
- Check for CORS issues in the browser console
- Test with different voice/language combinations

#### Firefox-Specific Considerations

##### Manifest V2 vs V3
- Firefox currently uses Manifest V2
- Use `background.scripts` instead of `background.service_worker`
- Use `browser` API instead of `chrome` API (or include polyfill)

##### Firefox Extension APIs
```javascript
// Use Firefox's native browser API
browser.contextMenus.create({
  id: "speak-selection",
  title: "Speak selected text",
  contexts: ["selection"]
});
```

##### Performance Monitoring
- Use Firefox's built-in profiler: `about:profiling`
- Monitor memory usage in `about:memory`
- Check extension impact in `about:performance`

## Privacy & Security

Simple TTS is designed with privacy as a core principle:

- **Local Storage Only**: All settings and credentials stored locally in your browser
- **Minimal Permissions**: Only requests permissions necessary for TTS functionality
- **No Data Collection**: Zero user data collection, tracking, or analytics
- **No Third-Party Scripts**: No external tracking pixels or analytics services
- **Direct API Communication**: Communicates only with Azure Speech Service for TTS
- **Open Source**: Full source code available for audit and review

Your text is sent to Azure's Speech Service for conversion but is not stored or logged by us.

## Contributing

We welcome contributions! Here's how you can help:

### Areas Needing Help
- **Chrome Web Store Publishing**: Help package and publish to Chrome Web Store
- **Internationalization**: Translate the extension to more languages  
- **UI/UX Improvements**: Enhance the user interface and experience
- **Documentation**: Improve docs, add tutorials, create videos
- **Bug Reports**: Test and report issues
- **Feature Requests**: Suggest and implement new features

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Code** your changes following the existing style
4. **Test** your changes: `npm run build && npm run lint`
5. **Commit** with a clear message: `git commit -m 'Add amazing feature'`
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

### Reporting Issues

Found a bug? Please [open an issue](https://github.com/mingsterism/simple-tts/issues) with:
- Browser version and extension version
- Steps to reproduce the issue
- Expected vs actual behavior
- Console errors (if any)

## Roadmap

- [ ] Chrome Web Store publication
- [ ] Keyboard shortcuts for quick access
- [ ] SSML support for advanced speech control
- [ ] Voice bookmarking and favorites
- [ ] Offline TTS support (Web Speech API fallback)
- [ ] Reading progress highlighting
- [ ] Multiple language auto-detection
- [ ] Export audio files

## Acknowledgments

- **Microsoft Azure** for providing excellent Speech Services
- **React & Webpack** for the development framework
- **Mozilla & Chrome** for extension platform support
- **Contributors** who help improve this project

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) - see the LICENSE file for details.

---

<div align="center">

**Made with love for the open source community**

[Report Bug](https://github.com/mingsterism/simple-tts/issues) • [Request Feature](https://github.com/mingsterism/simple-tts/issues) • [Contribute](https://github.com/mingsterism/simple-tts/pulls)

</div>
