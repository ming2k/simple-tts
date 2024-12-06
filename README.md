# Simple TTS

A browser extension that provides quick and simple text-to-speech functionality using Azure's high-quality voice synthesis.

## Features

- Convert selected text to speech with right-click context menu
- Type or paste text directly in the popup for conversion
- Multiple language support with natural-sounding voices
- Adjustable speech rate and pitch
- Easy-to-use interface
- Supports both Firefox and Chrome browsers

## Installation

### Firefox
[Get it from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/simple-tts/)

### Chrome

NEED SOMEONE TO PACKAGE IT!!!

<!-- [Get it from Chrome Web Store](link-to-chrome-store) -->

## Setup

1. Get your Azure Speech Service credentials:
   - Sign up for [Azure Speech Service](https://azure.microsoft.com/services/cognitive-services/speech-services/)
   - Create a Speech resource in the Azure portal
   - Get your API key and region from the resource overview page
   - Or try voices in [Azure Voice Gallery](https://speech.microsoft.com/portal/voicegallery)

2. Configure the extension:
   - Click the extension icon and complete the onboarding process
   - Enter your Azure Speech key and region
   - Customize voice settings (optional)

## Usage

### From Context Menu
1. Select any text on a webpage
2. Right-click and choose "Speak selected text"

### From Popup
1. Click the extension icon
2. Type or paste text
3. Click "Speak" to convert to speech

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/mingsterism/simple-tts.git
cd simple-tts

# Install dependencies
npm install

# Create required directories
mkdir -p src/assets src/_locales

# Development build with hot reload
npm run dev

# Production build
npm run build
```

### Project Structure
```
simple-tts/
├── src/
│   ├── assets/           # Extension assets (icons, etc)
│   ├── _locales/         # Internationalization files
│   ├── popup/           # Popup UI components
│   ├── onboarding/      # Onboarding flow components
│   ├── settings/        # Settings page components
│   ├── background/      # Background scripts
│   ├── manifest-firefox.json
│   └── manifest-chrome.json
├── webpack.config.dev.js
├── webpack.config.dist.js
└── webpack.utils.js
```

### Environment Setup
Create a `.env` file in the root directory:
```env
AZURE_SPEECH_KEY=your_azure_key
AZURE_REGION=your_azure_region
```

### Build Output
- Development: `dev/firefox/` and `dev/chrome/`
- Production: `dist/firefox/` and `dist/chrome/`

## Privacy

This extension:
- Only requests permissions necessary for TTS functionality
- Stores Azure credentials locally
- Does not collect any user data
- Does not make any tracking or analytics calls

## License

[MIT License](LICENSE)
