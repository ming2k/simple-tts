# Project Guide

Browser extension for Azure Text-to-Speech with streaming audio playback.

## Principles

- Follow Occam's razor and KISS
- No emojis in code or docs
- Prefer simple solutions over complex abstractions

## Architecture

```
src/
├── services/
│   ├── ttsService.ts      # Azure TTS API (SSML, voice list)
│   └── audioService.ts    # MediaSource streaming playback
├── content/               # Mini player (injected into pages)
├── background/            # Service worker, context menu
├── popup/                 # Extension popup (React)
├── settings/              # Settings page (React)
├── onboarding/            # Setup wizard (React)
├── utils/                 # Shared utilities
└── types/                 # TypeScript types
```

## Key Technical Details

### Audio Streaming
- Azure TTS returns WebM+Opus chunks via HTTP/2
- Use browser's MediaSource API for streaming playback
- AudioService handles caching for replay

### API Format
```
POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
Header: X-Microsoft-OutputFormat: webm-24khz-16bit-mono-opus
Body: SSML
```

### Browser Support
- Chrome: Manifest V3 with `action` API
- Firefox: Manifest V2 with `browserAction` API

## Development

```bash
npm install
npm run dev          # Watch mode
npm run build        # Production build
```

See DEVELOPMENT.md for browser testing instructions.

## Code Style

- Use TypeScript for services and types
- Use React + styled-components for UI
- Use `useMemo`/`useCallback` for performance
- Avoid over-engineering - minimal code for the task
