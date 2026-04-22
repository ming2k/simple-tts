# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [6.0.0] - 2026-04-23

### Changed

- Renamed project from **Simple TTS** to **Narravo**
- **Migrated build system from Webpack to WXT** for modern extension development
- **Converted codebase to TypeScript** for improved type safety and developer experience
- Major refactor to unify TTS service usage across components using a centralized AudioService
- Implemented reactive settings management with WXT's storage API and custom hooks
- Updated dependencies to modern versions (React 18.3+, Styled Components 6+)
- Modernized and polished Popup and Onboarding UI design with sound wave animations
- Fixed Chrome Web Store badges in README.md

## [5.0.0] - 2025-01-14

### Changed

- Unified settings storage: merged `settings` and `voiceSettings` into single storage object
- Refactored AudioService with cleaner streaming playback using AbortController
- Redesigned settings, popup, and mini window UI with consistent flat design
- Fixed Voice Selection layout stability with CSS Grid

### Removed

- Removed deprecated `voiceSettingsStorage.ts` (replaced by unified `settingsStorage.ts`)

---

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
