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
git
