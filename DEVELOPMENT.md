# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (optional, for pre-configured credentials)
cp .env.example .env

# Start development build with hot reload
npm run dev
```

## Testing in Browsers

### Firefox

1. Run the development build:
   ```bash
   npm run dev:firefox
   ```

2. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```

3. Click **"Load Temporary Add-on..."**

4. Navigate to the project folder and select:
   ```
   dev/firefox/manifest.json
   ```

5. The extension icon should appear in the toolbar

### Chrome

1. Run the development build:
   ```bash
   npm run dev:chrome
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

3. Enable **"Developer mode"** (toggle in top-right corner)

4. Click **"Load unpacked"**

5. Select the folder:
   ```
   dev/chrome/
   ```

6. The extension icon should appear in the toolbar

## When to Reload

Webpack watch mode (`npm run dev`) automatically rebuilds files on save, but browsers need manual reload to pick up changes.

### Reload Required

| Change Type | Firefox | Chrome |
|-------------|---------|--------|
| Background script | Reload extension | Reload extension |
| Content script | Reload extension + refresh page | Reload extension + refresh page |
| Popup UI | Reload extension | Close and reopen popup |
| Settings page | Refresh settings page | Refresh settings page |
| manifest.json | Reload extension | Reload extension |

### How to Reload

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **"Reload"** button next to the extension

**Chrome:**
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card

### Tips

- After reloading the extension, refresh any open tabs to get the new content script
- If popup changes don't appear, close the popup completely and reopen it
- Background script changes require full extension reload in both browsers

## Project Structure

```
narravo/
├── src/
│   ├── services/          # Core TTS services
│   │   ├── ttsService.ts      # Azure API integration, SSML generation
│   │   └── audioService.ts    # MediaSource API audio playback
│   ├── content/           # Content scripts (mini player window)
│   ├── background/        # Background service worker
│   ├── popup/             # Extension popup UI (React)
│   ├── settings/          # Settings page (React)
│   ├── onboarding/        # First-time setup wizard (React)
│   ├── utils/             # Shared utilities
│   ├── types/             # TypeScript type definitions
│   └── assets/            # Icons and images
├── dev/                   # Development build output
│   ├── firefox/
│   └── chrome/
├── dist/                  # Production build output
├── webpack.config.dev.js  # Development webpack config
├── webpack.config.dist.js # Production webpack config
└── package.json
```

## Azure TTS API

The extension uses Azure Cognitive Services Speech API.

Documentation:
- [Text to speech REST API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)
- [Quickstart: Convert text to speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech)

### Audio Format

Uses WebM + Opus for streaming playback:

```
X-Microsoft-OutputFormat: webm-24khz-16bit-mono-opus
```

Audio chunks are streamed via HTTP/2 and played through the browser's MediaSource API for low-latency playback.

## Debugging

### Enable Debug Logging

In the browser console on any page with the extension loaded:

```javascript
localStorage.setItem('tts-debug', 'true');
```

### Network Monitoring

Monitor Azure API requests in DevTools Network tab:
- Token requests: `/sts/v1.0/issueToken`
- TTS synthesis: `/cognitiveservices/v1`
- Voice list: `/cognitiveservices/voices/list`

### Background Script Logs

- **Firefox**: `about:debugging` > Click "Inspect" on the extension
- **Chrome**: `chrome://extensions/` > Click "Service Worker" link

## Building for Distribution

```bash
# Build production bundles
npm run build

# Create ZIP files for store submission
npm run package

# Output files:
# - narravo-firefox.zip (for Firefox Add-ons)
# - narravo-chrome.zip (for Chrome Web Store)
```

## Code Quality

```bash
# Run linter
npm run lint

# Auto-format code
npm run format
```

## Commit Convention

```
feat(services): add new feature
fix(audio): fix playback issue
refactor(tts): improve code structure
docs: update documentation
```

## Release Process

### 1. Prepare Release

```bash
# Update version in these files:
# - package.json
# - src/manifest-chrome.json
# - src/manifest-firefox.json

# Update CHANGELOG.md with changes

# Commit and tag
git add -A
git commit -m "Release version x.y.z"
git tag vx.y.z -m ""
git push origin main --tags
```

### 2. Build Packages

```bash
npm run build
npm run package
```

Output files:
- `narravo-firefox.zip`
- `narravo-chrome.zip`

### 3. Publish to Firefox Add-ons

1. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Select **Narravo** from your extensions
3. Click **Upload New Version**
4. Upload `narravo-firefox.zip`
5. Fill in release notes from CHANGELOG.md
6. Submit for review

Review typically takes 1-3 days.

### 4. Publish to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Select **Narravo** from your extensions
3. Click **Package** > **Upload new package**
4. Upload `narravo-chrome.zip`
5. Update store listing if needed
6. Submit for review

Review typically takes 1-3 days.

### Store URLs

- Firefox: https://addons.mozilla.org/en-US/firefox/addon/narravo/
- Chrome: https://chromewebstore.google.com/detail/narravo/hhkmldfjckdcopnlfldfbolhhekbendn
