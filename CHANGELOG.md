# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [4.2.1] - 2025-01-13

### Fixed

- Optimized mini window UI and performance
- Fixed storage format issues
- Fixed audio playback event handling

---

## [4.0.0] - 2025-01-23

### Added

- Streaming audio response support using MediaSource API
- Dark theme support
- Redesigned audio settings page

### Changed

- Renamed VoiceSettings to AudioSettings
- Settings URL changed from `settings.html#voice` to `settings.html#audio`

### Fixed

- Voice test now uses Azure TTS instead of browser speech synthesis
- Layout and responsive design issues

---

## [3.1.3] - Previous Release

### Features

- Basic text-to-speech with Azure Speech Service
- Multi-language voice support
- Context menu integration
- Popup interface for text input
- Cross-browser support (Firefox and Chrome)
