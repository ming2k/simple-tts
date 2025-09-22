import { AudioController } from '../audioController.js';

// Mock dependencies
const mockTTSService = {
  getVoiceSettings: jest.fn(),
  synthesizeSingleChunk: jest.fn(),
};

const mockAudioPlayer = {
  stopAudio: jest.fn(),
  playAudioSegmentsInOrder: jest.fn(),
  concatenateMP3Chunks: jest.fn(),
  playAudioBuffer: jest.fn(),
};

const mockTextProcessor = {
  segmentByPunctuation: jest.fn(),
  splitIntoChunks: jest.fn(),
};

// Mock the modules
jest.mock('../audioPlayer.js', () => ({
  AudioPlayer: jest.fn().mockImplementation(() => mockAudioPlayer)
}));

jest.mock('../textProcessor.js', () => ({
  TextProcessor: jest.fn().mockImplementation(() => mockTextProcessor)
}));

describe('AudioController', () => {
  let audioController;

  beforeEach(() => {
    audioController = new AudioController(mockTTSService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with TTS service and create audio player and text processor', () => {
      expect(audioController.ttsService).toBe(mockTTSService);
      expect(audioController.audioPlayer).toBe(mockAudioPlayer);
      expect(audioController.textProcessor).toBe(mockTextProcessor);
    });
  });

  describe('stopAudio', () => {
    test('should delegate to audio player', async () => {
      await audioController.stopAudio();

      expect(mockAudioPlayer.stopAudio).toHaveBeenCalledTimes(1);
    });
  });

  describe('synthesizeSequential', () => {
    const mockText = 'Hello world. How are you?';
    const mockUserSettings = { rate: 1.2 };
    const mockVoiceSettings = { voice: 'en-US-AriaNeural', rate: 1.2, pitch: 1.0 };
    const mockSegments = [
      { order: 0, text: 'Hello world.', type: 'sentence' },
      { order: 1, text: 'How are you?', type: 'sentence' }
    ];
    const mockBlobs = [
      new Blob(['audio1'], { type: 'audio/wav' }),
      new Blob(['audio2'], { type: 'audio/wav' })
    ];

    beforeEach(() => {
      mockTTSService.getVoiceSettings.mockResolvedValue(mockVoiceSettings);
      mockTextProcessor.segmentByPunctuation.mockReturnValue(mockSegments);
      mockTTSService.synthesizeSingleChunk
        .mockResolvedValueOnce(mockBlobs[0])
        .mockResolvedValueOnce(mockBlobs[1]);
    });

    test('should synthesize text segments sequentially', async () => {
      const result = await audioController.synthesizeSequential(mockText, mockUserSettings);

      expect(mockTTSService.getVoiceSettings).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockTextProcessor.segmentByPunctuation).toHaveBeenCalledWith(mockText);
      expect(mockTTSService.synthesizeSingleChunk).toHaveBeenCalledTimes(2);
      expect(mockTTSService.synthesizeSingleChunk).toHaveBeenNthCalledWith(1, 'Hello world.', mockVoiceSettings);
      expect(mockTTSService.synthesizeSingleChunk).toHaveBeenNthCalledWith(2, 'How are you?', mockVoiceSettings);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        order: 0,
        blob: mockBlobs[0],
        text: 'Hello world.',
        type: 'sentence'
      });
      expect(result[1]).toEqual({
        order: 1,
        blob: mockBlobs[1],
        text: 'How are you?',
        type: 'sentence'
      });
    });

    test('should handle synthesis errors', async () => {
      mockTTSService.synthesizeSingleChunk.mockRejectedValueOnce(new Error('Synthesis failed'));

      await expect(audioController.synthesizeSequential(mockText, mockUserSettings))
        .rejects.toThrow('Synthesis failed');
    });

    test('should include delays between requests', async () => {
      const startTime = Date.now();
      await audioController.synthesizeSequential(mockText, mockUserSettings);
      const endTime = Date.now();

      // Should take at least 100ms for the delay between segments
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('synthesizeParallel', () => {
    const mockText = 'First chunk. Second chunk.';
    const mockUserSettings = { rate: 1.5 };
    const mockVoiceSettings = { voice: 'en-US-AriaNeural', rate: 1.5, pitch: 1.0 };
    const mockChunks = [
      { order: 0, text: 'First chunk.' },
      { order: 1, text: 'Second chunk.' }
    ];
    const mockBlobs = [
      new Blob(['audio1'], { type: 'audio/wav' }),
      new Blob(['audio2'], { type: 'audio/wav' })
    ];

    beforeEach(() => {
      mockTTSService.getVoiceSettings.mockResolvedValue(mockVoiceSettings);
      mockTextProcessor.splitIntoChunks.mockReturnValue(mockChunks);
      mockTTSService.synthesizeSingleChunk
        .mockResolvedValueOnce(mockBlobs[0])
        .mockResolvedValueOnce(mockBlobs[1]);
    });

    test('should synthesize text chunks in parallel', async () => {
      const result = await audioController.synthesizeParallel(mockText, mockUserSettings);

      expect(mockTTSService.getVoiceSettings).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockTextProcessor.splitIntoChunks).toHaveBeenCalledWith(mockText);
      expect(mockTTSService.synthesizeSingleChunk).toHaveBeenCalledTimes(2);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        order: 0,
        blob: mockBlobs[0]
      });
      expect(result[1]).toEqual({
        order: 1,
        blob: mockBlobs[1]
      });
    });

    test('should sort results by order', async () => {
      // Simulate out-of-order completion
      const unorderedChunks = [
        { order: 1, text: 'Second chunk.' },
        { order: 0, text: 'First chunk.' }
      ];
      mockTextProcessor.splitIntoChunks.mockReturnValue(unorderedChunks);

      const result = await audioController.synthesizeParallel(mockText, mockUserSettings);

      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
    });

    test('should handle parallel synthesis errors', async () => {
      mockTTSService.synthesizeSingleChunk
        .mockResolvedValueOnce(mockBlobs[0])
        .mockRejectedValueOnce(new Error('Parallel synthesis failed'));

      await expect(audioController.synthesizeParallel(mockText, mockUserSettings))
        .rejects.toThrow('Parallel synthesis failed');
    });
  });

  describe('playTextSequential', () => {
    const mockText = 'Test text';
    const mockUserSettings = { rate: 1.3 };
    const mockVoiceSettings = { voice: 'en-US-AriaNeural', rate: 1.3, pitch: 1.0 };
    const mockAudioSegments = [
      { order: 0, blob: new Blob(['audio1']), text: 'Test', type: 'sentence' }
    ];

    beforeEach(() => {
      audioController.synthesizeSequential = jest.fn().mockResolvedValue(mockAudioSegments);
      mockTTSService.getVoiceSettings.mockResolvedValue(mockVoiceSettings);
    });

    test('should play text using sequential synthesis', async () => {
      await audioController.playTextSequential(mockText, mockUserSettings);

      expect(mockAudioPlayer.stopAudio).toHaveBeenCalledTimes(1);
      expect(audioController.synthesizeSequential).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockTTSService.getVoiceSettings).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockAudioPlayer.playAudioSegmentsInOrder).toHaveBeenCalledWith(mockAudioSegments, 1.3);
    });
  });

  describe('playTextParallel', () => {
    const mockText = 'Test text';
    const mockUserSettings = { rate: 1.1 };
    const mockVoiceSettings = { voice: 'en-US-AriaNeural', rate: 1.1, pitch: 1.0 };
    const mockMP3Chunks = [
      { order: 0, blob: new Blob(['audio1']) }
    ];
    const mockConcatenatedBuffer = { duration: 2.5 };

    beforeEach(() => {
      audioController.synthesizeParallel = jest.fn().mockResolvedValue(mockMP3Chunks);
      mockTTSService.getVoiceSettings.mockResolvedValue(mockVoiceSettings);
      mockAudioPlayer.concatenateMP3Chunks.mockResolvedValue(mockConcatenatedBuffer);
    });

    test('should play text using parallel synthesis and concatenation', async () => {
      await audioController.playTextParallel(mockText, mockUserSettings);

      expect(mockAudioPlayer.stopAudio).toHaveBeenCalledTimes(1);
      expect(audioController.synthesizeParallel).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockAudioPlayer.concatenateMP3Chunks).toHaveBeenCalledWith(mockMP3Chunks);
      expect(mockTTSService.getVoiceSettings).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockAudioPlayer.playAudioBuffer).toHaveBeenCalledWith(mockConcatenatedBuffer, 1.1);
    });
  });

  describe('playTextWithSequentialConcatenation', () => {
    const mockText = 'Test text';
    const mockUserSettings = { rate: 0.9 };
    const mockVoiceSettings = { voice: 'en-US-AriaNeural', rate: 0.9, pitch: 1.0 };
    const mockAudioSegments = [
      { order: 0, blob: new Blob(['audio1']), text: 'Test', type: 'sentence' }
    ];
    const mockConcatenatedBuffer = { duration: 1.8 };

    beforeEach(() => {
      audioController.synthesizeSequential = jest.fn().mockResolvedValue(mockAudioSegments);
      mockTTSService.getVoiceSettings.mockResolvedValue(mockVoiceSettings);
      mockAudioPlayer.concatenateMP3Chunks.mockResolvedValue(mockConcatenatedBuffer);
    });

    test('should play text using sequential synthesis with concatenation', async () => {
      await audioController.playTextWithSequentialConcatenation(mockText, mockUserSettings);

      expect(mockAudioPlayer.stopAudio).toHaveBeenCalledTimes(1);
      expect(audioController.synthesizeSequential).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockAudioPlayer.concatenateMP3Chunks).toHaveBeenCalledWith(mockAudioSegments);
      expect(mockTTSService.getVoiceSettings).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockAudioPlayer.playAudioBuffer).toHaveBeenCalledWith(mockConcatenatedBuffer, 0.9);
    });
  });

  describe('getSequentialAudioSegments', () => {
    test('should delegate to synthesizeSequential', async () => {
      const mockText = 'Test text';
      const mockUserSettings = { rate: 1.0 };
      const mockSegments = [{ order: 0, blob: new Blob(['audio']) }];

      audioController.synthesizeSequential = jest.fn().mockResolvedValue(mockSegments);

      const result = await audioController.getSequentialAudioSegments(mockText, mockUserSettings);

      expect(audioController.synthesizeSequential).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(result).toBe(mockSegments);
    });
  });

  describe('synthesizeSpeech', () => {
    const mockText = 'Test speech synthesis';
    const mockUserSettings = { rate: 1.2 };
    const mockVoiceSettings = { voice: 'en-US-AriaNeural', rate: 1.2, pitch: 1.0 };
    const mockSentences = ['Test speech', 'synthesis'];
    const mockBlobs = [
      new Blob(['audio1'], { type: 'audio/wav' }),
      new Blob(['audio2'], { type: 'audio/wav' })
    ];

    beforeEach(() => {
      mockTTSService.getVoiceSettings.mockResolvedValue(mockVoiceSettings);
      mockTextProcessor.splitIntoChunks.mockReturnValue([
        { text: 'Test speech' },
        { text: 'synthesis' }
      ]);
      mockTTSService.synthesizeSingleChunk
        .mockResolvedValueOnce(mockBlobs[0])
        .mockResolvedValueOnce(mockBlobs[1]);
    });

    test('should synthesize speech and return audio blobs', async () => {
      const result = await audioController.synthesizeSpeech(mockText, mockUserSettings);

      expect(mockAudioPlayer.stopAudio).toHaveBeenCalledTimes(1);
      expect(mockTTSService.getVoiceSettings).toHaveBeenCalledWith(mockText, mockUserSettings);
      expect(mockTextProcessor.splitIntoChunks).toHaveBeenCalledWith(mockText);
      expect(mockTTSService.synthesizeSingleChunk).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockBlobs);
    });

    test('should throw error if some blobs are invalid', async () => {
      mockTTSService.synthesizeSingleChunk
        .mockResolvedValueOnce(mockBlobs[0])
        .mockResolvedValueOnce(null); // Invalid blob

      await expect(audioController.synthesizeSpeech(mockText, mockUserSettings))
        .rejects.toThrow('Failed to synthesize one or more audio chunks');
    });
  });
});