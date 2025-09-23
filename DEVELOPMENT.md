# Development Guide

This guide provides comprehensive instructions for setting up the development environment, understanding the refactored architecture, and contributing to Simple TTS.

For Azure TTS of Speech Service documentation refer these:
- [Text to speech REST API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)
https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech?tabs=linux&pivots=programming-language-rest


## Quick Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env  # Edit with your Azure credentials

# Development build with hot reload
npm run dev           # Both Firefox and Chrome
npm run dev:firefox   # Firefox only
npm run dev:chrome    # Chrome only

# Testing and quality
npm test              # Run unit tests (63+ tests)
npm run test:coverage # Coverage report
npm run lint          # ESLint code checking
npm run format        # Prettier auto-formatting
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development build with watch mode for both browsers |
| `npm run build` | Production build for both browsers |
| `npm run test` | Run comprehensive unit test suite |
| `npm run test:watch` | Watch mode for test development |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Run ESLint code quality checks |
| `npm run format` | Format code with Prettier |
| `npm run package` | Build and create ZIP files for distribution |
| `npm run clean` | Remove all build directories |

## Refactored Architecture

Simple TTS has been refactored into a **clean, modular architecture** with separated concerns:

```
simple-tts/
├── src/
│   ├── services/           # 🔧 Core TTS business logic (REFACTORED)
│   │   ├── ttsService.js        # Azure API integration, token management, SSML
│   │   ├── audioController.js   # Audio orchestration, synthesis workflows
│   │   ├── audioPlayer.js       # Web Audio API management, playback
│   │   ├── textProcessor.js     # Text chunking, segmentation, XML escaping
│   │   ├── index.js            # Main SimpleTTS facade interface
│   │   └── __tests__/          # Comprehensive unit tests (63+ tests)
│   ├── popup/              # Extension popup interface
│   ├── settings/           # Settings and configuration pages
│   ├── onboarding/         # First-time setup wizard
│   ├── background/         # Background scripts and context menu
│   ├── content/            # Content scripts for web page integration
│   ├── utils/              # Utility functions and helpers
│   ├── assets/             # Icons, images, and static files
│   └── _locales/           # Internationalization files
├── webpack.*.js            # Build configuration
├── jest.config.js          # Test configuration
├── CLAUDE.md               # Development guide for AI assistants
└── package.json            # Dependencies and scripts
```


## Testing Guide

Simple TTS includes comprehensive unit tests covering all service components with 63+ test cases.

### Test Structure

```
src/services/__tests__/
├── textProcessor.test.js    # Text processing utilities
├── ttsService.test.js       # Azure API integration & SSML
├── audioPlayer.test.js      # Audio playback engine
├── audioController.test.js  # Audio orchestration
├── index.test.js           # Integration tests
└── setup.js                # Test environment setup
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- textProcessor.test.js

# Run tests matching pattern
npm test -- --testNamePattern="createSSML"

# Watch mode for development
npm run test:watch
```

### Example: createSSML Test

```javascript
test('should create valid SSML with default parameters', () => {
  const text = 'Hello world';
  const ssml = ttsService.createSSML(text);

  expect(ssml).toContain(`<speak version='1.0' xml:lang='en-US'>`);
  expect(ssml).toContain(`<voice xml:lang='en-US' xml:gender='Male' name='en-US-ChristopherNeural'>`);
  expect(ssml).toContain(`<prosody rate="1" pitch="1%">`);
  expect(ssml).toContain('Hello world');
  expect(ssml).toContain('</prosody>');
  expect(ssml).toContain('</voice>');
  expect(ssml).toContain('</speak>');
});
```

### Writing New Tests

When adding new functionality:

1. **Create test file** following naming convention: `*.test.js`
2. **Mock dependencies** using the established patterns in `setup.js`
3. **Test edge cases** including error conditions
4. **Verify security** especially for SSML generation and text processing
5. **Update coverage** ensure new code is properly tested

### Mock Usage

Tests use comprehensive mocking to simulate browser environments:

```javascript
// Mocked Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createBufferSource: jest.fn(),
  decodeAudioData: jest.fn(),
  // ... other methods
}));

// Mocked browser storage
global.browser = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
    },
  },
};
```

## Development Workflow

### Code Quality

```bash
npm run lint          # ESLint checking
npm run format        # Prettier formatting
npm test              # Full test suite
npm run test:watch    # Development testing
```

### Extension Loading

#### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dev/firefox/manifest.json`

#### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dev/chrome/` folder

### Building & Packaging

```bash
npm run build         # Production build
npm run package       # Distribution ZIPs
npm run package:firefox  # Firefox AMO submission
npm run package:chrome   # Chrome Web Store submission
```

## Debugging

### Service Debugging

```javascript
// Enable verbose logging
localStorage.setItem('tts-debug', 'true');

// Track synthesis performance
console.time('synthesis');
await ttsService.synthesizeSingleChunk(text);
console.timeEnd('synthesis');

// Monitor audio context
console.log('Audio state:', audioContext.state);
```

### Network Monitoring

Monitor Azure API requests:
- **Token requests**: `/sts/v1.0/issueToken` (Bearer auth)
- **TTS requests**: `/cognitiveservices/v1` (PCM format)
- **Voice lists**: `/cognitiveservices/voices/list`

## Performance Optimizations

### Text Processing
- **1000-character chunks** for Azure API limits
- **Smart segmentation** by punctuation and line breaks
- **Parallel synthesis** for long content

### Audio Management
- **Context reuse** across playback sessions
- **Memory-efficient** audio buffer management
- **Strategic concatenation** for seamless playback

### API Efficiency
- **Token caching** (9-minute lifetime)
- **Request optimization** and batching
- **Exponential backoff** for error recovery

## Contributing

### Development Standards
- Follow modular architecture patterns
- Add unit tests for all new features
- Maintain >90% test coverage
- Update documentation for API changes
- Ensure cross-browser compatibility

### Commit Convention
```bash
feat(services): add parallel audio processing
fix(tts): resolve token refresh race condition
test(createSSML): add comprehensive SSML validation
docs(api): update synthesis examples
refactor(audio): separate playback concerns
```

### Pull Request Checklist
- [ ] All tests pass (`npm test`)
- [ ] Code follows style guide (`npm run lint`)
- [ ] Documentation updated for changes
- [ ] Test coverage maintained
- [ ] Cross-browser testing completed

## Security Considerations

### API Security
- Store credentials in browser storage only
- Implement proper SSML escaping for XSS prevention
- Validate all user input
- Use Bearer tokens instead of subscription keys

### Extension Security
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "https://*.speech.microsoft.com/*"
  ]
}
```
