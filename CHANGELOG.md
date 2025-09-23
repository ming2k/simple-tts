# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2025-01-23

### 🚀 Major Features

- **Simplified TTS Request Handling**: Streamlined the text-to-speech request processing pipeline for better performance and reliability
- **Dark Theme Support**: Added comprehensive dark theme support throughout the extension interface
- **Streaming Response Support**: Implemented streaming audio response capabilities for improved user experience

### ✨ New Features

- **Enhanced Audio Settings Page**: Complete redesign of the audio settings interface (formerly voice settings)
  - Organized layout with dedicated sections for voice selection and playback settings
  - Improved responsive design for better mobile and desktop experience
  - Enhanced form controls with better visual feedback
- **Improved Voice Testing**: Fixed voice test functionality to use actual Azure TTS service instead of browser speech synthesis
- **Better Button Positioning**: Optimized button layout and positioning throughout the interface

### 🎨 UI/UX Improvements

- **Modern Interface Design**: Updated styling with better visual hierarchy and spacing
- **Enhanced Form Controls**:
  - Improved select fields with better hover and focus states
  - Enhanced sliders with better visual feedback and animations
  - Styled value displays with monospace fonts and proper styling
- **Better Responsive Design**: Improved mobile experience with flexible breakpoints
- **Clean Typography**: Removed emojis for a more professional appearance

### 🔧 Technical Improvements

- **Optimized Audio Settings**: Renamed and reorganized voice settings to audio settings for better clarity
- **Better Error Handling**: Improved error messages and user feedback
- **Enhanced Build Process**: Updated build configuration for better performance

### 🏗️ Breaking Changes

- **Settings URL Change**: Voice settings page is now accessible via `settings.html#audio` instead of `settings.html#voice`
- **Component Renaming**: `VoiceSettings` component renamed to `AudioSettings` for consistency

### 🐛 Bug Fixes

- Fixed voice test functionality that was using incorrect speech synthesis API
- Resolved layout issues with button positioning in audio settings
- Fixed responsive design issues on mobile devices

### 📚 Documentation

- Updated README with current features and installation instructions
- Added comprehensive changelog documentation

---

## [3.1.3] - Previous Release

### Features
- Basic text-to-speech functionality
- Azure Speech Service integration
- Multi-language voice support
- Context menu integration
- Popup interface for direct text input

### Technical
- React-based UI components
- WebExtension API compatibility
- Cross-browser support (Firefox and Chrome)