import { SimpleTTS } from '../index.js';

// Mock the dependencies
const mockTTSService = {
  getVoicesList: jest.fn(),
};

const mockAudioController = {
  stopAudio: jest.fn(),
  playTextSequential: jest.fn(),
  playTextParallel: jest.fn(),
  playTextWithSequentialConcatenation: jest.fn(),
  synthesizeSpeech: jest.fn(),
  getSequentialAudioSegments: jest.fn(),
};

// Mock the service classes
jest.mock('../ttsService.js', () => ({
  TTSService: jest.fn().mockImplementation(() => mockTTSService)
}));

jest.mock('../audioController.js', () => ({
  AudioController: jest.fn().mockImplementation(() => mockAudioController)
}));

describe('SimpleTTS Integration', () => {
  let simpleTTS;
  const mockAzureKey = 'test-azure-key';
  const mockAzureRegion = 'eastus';

  beforeEach(() => {
    const { TTSService } = require('../ttsService.js');
    const { AudioController } = require('../audioController.js');

    simpleTTS = new SimpleTTS(mockAzureKey, mockAzureRegion);

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should create TTS service and audio controller with correct parameters', () => {
      const { TTSService } = require('../ttsService.js');
      const { AudioController } = require('../audioController.js');

      expect(TTSService).toHaveBeenCalledWith(mockAzureKey, mockAzureRegion);
      expect(AudioController).toHaveBeenCalledWith(simpleTTS.ttsService);
      expect(simpleTTS.ttsService).toBe(mockTTSService);
      expect(simpleTTS.audioController).toBe(mockAudioController);
    });
  });

  describe('audio control methods', () => {
    const mockText = 'Test text for speech synthesis';
    const mockUserSettings = { rate: 1.2, pitch: 1.1 };

    test('should delegate stopAudio to audio controller', async () => {
      await simpleTTS.stopAudio();

      expect(mockAudioController.stopAudio).toHaveBeenCalledTimes(1);
    });

    test('should delegate playTextSequential to audio controller', async () => {
      await simpleTTS.playTextSequential(mockText, mockUserSettings);

      expect(mockAudioController.playTextSequential).toHaveBeenCalledWith(mockText, mockUserSettings);
    });

    test('should delegate playTextParallel to audio controller', async () => {
      await simpleTTS.playTextParallel(mockText, mockUserSettings);

      expect(mockAudioController.playTextParallel).toHaveBeenCalledWith(mockText, mockUserSettings);
    });

    test('should delegate playTextWithSequentialConcatenation to audio controller', async () => {
      await simpleTTS.playTextWithSequentialConcatenation(mockText, mockUserSettings);

      expect(mockAudioController.playTextWithSequentialConcatenation).toHaveBeenCalledWith(mockText, mockUserSettings);
    });

    test('should delegate synthesizeSpeech to audio controller', async () => {
      const mockResult = [new Blob(['audio1']), new Blob(['audio2'])];
      mockAudioController.synthesizeSpeech.mockResolvedValue(mockResult);

      const result = await simpleTTS.synthesizeSpeech(mockText, mockUserSettings);

      expect(mockAudioController.synthesizeSpeech).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(result).toBe(mockResult);
    });

    test('should delegate getSequentialAudioSegments to audio controller', async () => {
      const mockSegments = [
        { order: 0, blob: new Blob(['audio1']), text: 'Test', type: 'sentence' }
      ];
      mockAudioController.getSequentialAudioSegments.mockResolvedValue(mockSegments);

      const result = await simpleTTS.getSequentialAudioSegments(mockText, mockUserSettings);

      expect(mockAudioController.getSequentialAudioSegments).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(result).toBe(mockSegments);
    });
  });

  describe('TTS service methods', () => {
    test('should delegate getVoicesList to TTS service', async () => {
      const mockVoices = {
        'en-US': [
          { value: 'en-US-AriaNeural', label: 'Aria (Female)' }
        ]
      };
      mockTTSService.getVoicesList.mockResolvedValue(mockVoices);

      const result = await simpleTTS.getVoicesList();

      expect(mockTTSService.getVoicesList).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockVoices);
    });

  });

  describe('error handling', () => {
    test('should propagate errors from audio controller', async () => {
      const mockError = new Error('Audio controller error');
      mockAudioController.playTextSequential.mockRejectedValue(mockError);

      await expect(simpleTTS.playTextSequential('test text')).rejects.toThrow('Audio controller error');
    });

    test('should propagate errors from TTS service', async () => {
      const mockError = new Error('TTS service error');
      mockTTSService.getVoicesList.mockRejectedValue(mockError);

      await expect(simpleTTS.getVoicesList()).rejects.toThrow('TTS service error');
    });
  });

  describe('method chaining and workflow', () => {
    test('should support typical usage workflow', async () => {
      const mockText = 'Hello world. This is a test.';
      const mockSettings = { rate: 1.1 };

      // Simulate a typical workflow
      await simpleTTS.stopAudio();
      await simpleTTS.playTextSequential(mockText, mockSettings);

      expect(mockAudioController.stopAudio).toHaveBeenCalledTimes(1);
      expect(mockAudioController.playTextSequential).toHaveBeenCalledWith(mockText, mockSettings);
    });

    test('should handle concurrent operations gracefully', async () => {
      const text1 = 'First text';
      const text2 = 'Second text';

      // Start multiple operations
      const promise1 = simpleTTS.playTextSequential(text1);
      const promise2 = simpleTTS.playTextParallel(text2);

      await Promise.all([promise1, promise2]);

      expect(mockAudioController.playTextSequential).toHaveBeenCalledWith(text1, {});
      expect(mockAudioController.playTextParallel).toHaveBeenCalledWith(text2, {});
    });
  });

  describe('module exports', () => {
    test('should export all required classes', () => {
      const exports = require('../index.js');

      expect(exports.SimpleTTS).toBeDefined();
      expect(exports.TTSService).toBeDefined();
      expect(exports.AudioController).toBeDefined();
      expect(exports.AudioPlayer).toBeDefined();
      expect(exports.TextProcessor).toBeDefined();
    });
  });
});