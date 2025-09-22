// Jest setup file for TTS services testing

// Mock webextension-polyfill
global.browser = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
    },
  },
};

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createBuffer: jest.fn(),
  createBufferSource: jest.fn().mockReturnValue({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    disconnect: jest.fn(),
    playbackRate: { value: 1 },
    onended: null,
  }),
  decodeAudioData: jest.fn().mockResolvedValue({
    duration: 1.0,
    length: 44100,
    numberOfChannels: 1,
    sampleRate: 44100,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(44100)),
  }),
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
  resume: jest.fn().mockResolvedValue(),
  destination: {},
}));

global.webkitAudioContext = global.AudioContext;

// Mock XMLHttpRequest
global.XMLHttpRequest = jest.fn().mockImplementation(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  onload: null,
  onerror: null,
  status: 200,
  response: new ArrayBuffer(1024),
  responseType: 'arraybuffer',
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options?.type || '',
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
}));