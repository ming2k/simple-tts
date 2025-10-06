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

Simple TTS uses Microsoft Azure's speech synthesis service for the highest quality voices.

1. **Sign up for Azure**: Create a free [Azure account](https://azure.microsoft.com)
2. **Create Speech Resource**: In the Azure portal, create a new `Speech Service` resource
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

### Architecture Overview

Simple TTS uses a modular, clean architecture with separated concerns:

```
src/services/
├── ttsService.js        # Azure API integration, token management, SSML generation
├── audioController.js   # Audio orchestration, synthesis workflows
├── audioPlayer.js       # Web Audio API management, playback controls
├── textProcessor.js     # Text chunking, segmentation, XML escaping
└── index.js            # Main SimpleTTS facade interface
```

### Quick Setup
```bash
npm install          # Install dependencies
npm run dev:firefox  # Development build for Firefox
npm run dev:chrome   # Development build for Chrome
npm test            # Run unit tests
npm run lint        # Code linting
```

For detailed development setup, debugging guides, and architecture documentation, see [DEVELOPMENT.md](DEVELOPMENT.md).

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

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute, report issues, and set up your development environment.

## Acknowledgments

- **Microsoft Azure** for providing excellent Speech Services
- **React & Webpack** for the development framework
- **Mozilla & Chrome** for extension platform support
- **Contributors** who help improve this project

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) - see the LICENSE file for details.
