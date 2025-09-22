# Development Guide

This guide provides comprehensive instructions for setting up the development environment, understanding the refactored architecture, and contributing to Simple TTS.

For Azure TTS of Speech Service documentation refer these:
- [Text to speech REST API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)

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

## Key Development Features

### 1. SSML Generation (createSSML)

The refactored `createSSML` method includes comprehensive security and formatting:

```javascript
// Enhanced SSML with proper escaping and language detection
const ssml = ttsService.createSSML(
  'Hello <world> & "quotes"',  // Automatically escaped
  'en-US-AriaNeural',         // Auto-detects language
  1.2,                        // Speech rate
  10                          // Pitch percentage
);

// Output:
// <speak version='1.0' xml:lang='en-US'>
//   <voice xml:lang='en-US' xml:gender='Male' name='en-US-AriaNeural'>
//     <prosody rate="1.2" pitch="10%">
//       Hello &lt;world&gt; &amp; &quot;quotes&quot;
//     </prosody>
//   </voice>
// </speak>
```

### 2. Audio Processing Strategies

**Sequential Processing** (natural reading):
```javascript
await tts.playTextSequential(text, settings);
```
- Respects punctuation boundaries
- Natural reading rhythm
- Better for complex text

**Parallel Processing** (faster synthesis):
```javascript
await tts.playTextParallel(text, settings);
```
- Concurrent chunk processing
- Faster for long text
- Requires audio concatenation

### 3. Bearer Token Authentication

Modern Azure authentication with automatic management:

```javascript
// Automatic token management
const token = await ttsService.getAccessToken();

// Request format:
POST /cognitiveservices/v1 HTTP/1.1
Authorization: Bearer {access_token}
X-Microsoft-OutputFormat: riff-24khz-16bit-mono-pcm
Content-Type: application/ssml+xml
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

### Key Test Categories

#### TTSService Tests (ttsService.test.js)

**createSSML() Tests** - 8 comprehensive tests covering:
- ✅ Valid SSML structure with default parameters
- ✅ Custom voice configuration
- ✅ Rate and pitch parameter handling
- ✅ XML character escaping for security
- ✅ Multi-language voice support
- ✅ Empty text edge cases
- ✅ Neural voice gender detection
- ✅ SSML format validation

**Token Management Tests:**
- Access token fetching and caching
- Token expiry handling
- Error handling for invalid credentials

#### TextProcessor Tests (textProcessor.test.js)

- Text chunking by sentence boundaries
- Punctuation-based segmentation
- Character limit enforcement
- XML character escaping
- Edge case handling

#### AudioPlayer Tests (audioPlayer.test.js)

- Audio context initialization and management
- Audio chunk playback with custom rates
- MP3 chunk concatenation
- Sequential segment playback
- Error handling and recovery

#### AudioController Tests (audioController.test.js)

- Sequential vs parallel synthesis workflows
- Audio orchestration and coordination
- Settings management and voice selection
- Error propagation and handling

#### Integration Tests (index.test.js)

- SimpleTTS facade functionality
- Service composition and delegation
- End-to-end workflow testing
- Error handling across services

### Test Environment

The test suite uses:

- **Jest** - Testing framework
- **jsdom** - Browser environment simulation
- **Comprehensive mocking** for:
  - Web Audio API
  - XMLHttpRequest
  - webextension-polyfill
  - Azure Speech Service responses

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

### Continuous Integration

Tests run automatically on:
- Code commits
- Pull requests
- Release builds

Ensure all tests pass before submitting contributions.

## API Documentation

### Services Architecture

Simple TTS uses a modular service architecture with clear separation of concerns:

#### SimpleTTS (Main Interface)

The primary facade for all TTS operations.

```javascript
import { SimpleTTS } from './src/services/index.js';

const tts = new SimpleTTS(azureKey, azureRegion);
```

**Constructor:**
- `azureKey` (string): Azure Speech Service subscription key
- `azureRegion` (string): Azure region (e.g., 'eastus', 'westus2')

**Methods:**

##### Audio Playback
```javascript
// Sequential processing (respects punctuation, better for reading)
await tts.playTextSequential(text, userSettings);

// Parallel processing (faster synthesis, concatenated playback)
await tts.playTextParallel(text, userSettings);

// Sequential with concatenation (best quality + performance)
await tts.playTextWithSequentialConcatenation(text, userSettings);

// Stop current audio
await tts.stopAudio();
```

##### Speech Synthesis
```javascript
// Get audio blobs without playback
const audioBlobs = await tts.synthesizeSpeech(text, userSettings);

// Get sequential audio segments with metadata
const segments = await tts.getSequentialAudioSegments(text, userSettings);
```

##### Utility Methods
```javascript
// Get available voices
const voicesList = await tts.getVoicesList();

// Split text into sentences
const sentences = tts.splitIntoSentences(text);
```

#### TTSService (Core Azure Integration)

Handles Azure Speech Service API communication.

##### createSSML(text, voice, rate, pitch)
Generates SSML markup for Azure Speech Service.

```javascript
const ssml = ttsService.createSSML(
  'Hello world',
  'en-US-AriaNeural',  // voice name
  1.2,                 // speech rate (0.5-2.0)
  10                   // pitch adjustment in percentage
);

// Output:
// <speak version='1.0' xml:lang='en-US'>
//   <voice xml:lang='en-US' xml:gender='Female' name='en-US-AriaNeural'>
//     <prosody rate="1.2" pitch="10%">
//       Hello world
//     </prosody>
//   </voice>
// </speak>
```

**Parameters:**
- `text` (string): Text to convert to SSML
- `voice` (string): Azure voice name (default: 'en-US-ChristopherNeural')
- `rate` (number): Speech rate multiplier (default: 1)
- `pitch` (number): Pitch adjustment percentage (default: 1)

**Features:**
- Automatic XML character escaping
- Language detection from voice name
- Gender inference for Neural voices
- Proper SSML structure validation

##### getAccessToken()
Manages Azure access tokens with automatic refresh.

```javascript
const token = await ttsService.getAccessToken();
```

**Features:**
- Automatic token caching (9-minute expiry)
- Token refresh on expiration
- Bearer authentication for modern Azure API

##### synthesizeSingleChunk(text, settings)
Synthesizes a single text chunk to audio.

```javascript
const audioBlob = await ttsService.synthesizeSingleChunk(
  'Hello world',
  { voice: 'en-US-AriaNeural', rate: 1.2, pitch: 1.1 }
);
```

**Returns:** Blob object containing PCM audio data

#### AudioController (Orchestration)

Manages complex synthesis workflows and audio coordination.

##### synthesizeSequential(text, userSettings)
Processes text segments sequentially for natural reading flow.

```javascript
const audioSegments = await audioController.synthesizeSequential(text, {
  voice: 'en-US-AriaNeural',
  rate: 1.1,
  pitch: 1.0
});

// Returns: Array of { order, blob, text, type }
```

**Benefits:**
- Respects punctuation boundaries
- Natural reading rhythm
- Better pronunciation of complex text

##### synthesizeParallel(text, userSettings)
Processes text chunks in parallel for faster synthesis.

```javascript
const audioChunks = await audioController.synthesizeParallel(text, settings);

// Returns: Array of { order, blob } sorted by original order
```

**Benefits:**
- Faster processing for long text
- Efficient resource utilization
- Maintains text order

#### AudioPlayer (Playback Engine)

Low-level audio playback using Web Audio API.

**Methods:**
- `playAudioChunk(audioBlob, rate, existingContext)` - Plays a single audio blob with specified playback rate
- `concatenateMP3Chunks(mp3Chunks)` - Combines multiple audio chunks into a single AudioBuffer
- `playAudioSegmentsInOrder(audioSegments, playbackRate)` - Plays audio segments sequentially with gaps between segments

#### TextProcessor (Text Utilities)

Handles text analysis and preparation.

**Methods:**
- `splitIntoChunks(text)` - Splits text into sentence-based chunks for parallel processing
- `segmentByPunctuation(text)` - Advanced segmentation that respects line breaks and punctuation hierarchy
- `escapeXmlChars(text)` - Escapes XML special characters for safe SSML generation

```javascript
const escaped = textProcessor.escapeXmlChars('<script>alert("test");</script>');
// Returns: "&lt;script&gt;alert(&quot;test&quot;);&lt;/script&gt;"
```

### User Settings Format

```javascript
const userSettings = {
  voice: 'en-US-AriaNeural',  // Azure voice name
  rate: 1.2,                  // Speech rate (0.5-2.0)
  pitch: 1.1                  // Pitch multiplier (0.5-2.0)
};
```

### Audio Formats

Simple TTS uses high-quality PCM audio:

- **Format**: `riff-24khz-16bit-mono-pcm`
- **Sample Rate**: 24 kHz
- **Bit Depth**: 16-bit
- **Channels**: Mono

### Error Handling

All async methods throw descriptive errors:

```javascript
try {
  await tts.playTextSequential(text);
} catch (error) {
  if (error.message.includes('Azure credentials')) {
    // Handle authentication error
  } else if (error.message.includes('Network error')) {
    // Handle network issues
  }
}
```

### Azure API Integration

#### Authentication Flow
1. Request access token using subscription key
2. Cache token for 9 minutes (10-minute Azure expiry)
3. Use Bearer token for all TTS requests
4. Automatic token refresh on expiration

#### Request Format
```http
POST /cognitiveservices/v1 HTTP/1.1
Host: {region}.tts.speech.microsoft.com
Authorization: Bearer {access_token}
Content-Type: application/ssml+xml
X-Microsoft-OutputFormat: riff-24khz-16bit-mono-pcm

<speak version='1.0' xml:lang='en-US'>
  <voice xml:lang='en-US' xml:gender='Male' name='en-US-ChristopherNeural'>
    <prosody rate="1" pitch="1%">
      Text content
    </prosody>
  </voice>
</speak>
```

### Voice Selection

Voices are automatically selected based on:
1. User's language-specific settings
2. Global default settings fallback
3. Hardcoded language defaults

The system supports all Azure Neural voices with automatic language detection from voice names.

### Performance Considerations

- **Sequential**: Better for natural reading, slower synthesis
- **Parallel**: Faster synthesis, requires concatenation
- **Chunking**: Respects 1000-character limit per Azure request
- **Caching**: Token caching reduces API overhead

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

## Getting Help

- **📚 Documentation**: Check this DEVELOPMENT.md for comprehensive guides
- **🧪 Testing**: Run test suite before reporting issues
- **🐛 Issues**: Use GitHub issue tracker for bugs/features
- **🏗️ Architecture**: Review service separation in `/src/services`
- **📖 Examples**: See API documentation section above for usage patterns

The refactored architecture makes Simple TTS more maintainable, testable, and extensible while preserving all existing functionality. Happy coding! 🚀
