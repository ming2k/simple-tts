import { AudioPlayer } from '../audioPlayer.js';

describe('AudioPlayer', () => {
  let audioPlayer;
  let mockAudioContext;
  let mockAudioBuffer;
  let mockSource;

  beforeEach(() => {
    audioPlayer = new AudioPlayer();

    mockSource = {
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
      playbackRate: { value: 1 },
      onended: null,
    };

    mockAudioBuffer = {
      duration: 2.5,
      length: 110250,
      numberOfChannels: 1,
      sampleRate: 44100,
      getChannelData: jest.fn().mockReturnValue(new Float32Array(110250)),
    };

    mockAudioContext = {
      createBuffer: jest.fn().mockReturnValue(mockAudioBuffer),
      createBufferSource: jest.fn().mockReturnValue(mockSource),
      decodeAudioData: jest.fn().mockResolvedValue(mockAudioBuffer),
      currentTime: 0,
      sampleRate: 44100,
      state: 'running',
      resume: jest.fn().mockResolvedValue(),
      destination: {},
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    jest.clearAllMocks();
  });

  describe('initAudioContext', () => {
    test('should create and initialize audio context', async () => {
      const context = await audioPlayer.initAudioContext();

      expect(global.AudioContext).toHaveBeenCalled();
      expect(context).toBe(mockAudioContext);
      expect(audioPlayer.audioContext).toBe(mockAudioContext);
    });

    test('should return existing context if already initialized', async () => {
      const firstContext = await audioPlayer.initAudioContext();
      const secondContext = await audioPlayer.initAudioContext();

      expect(firstContext).toBe(secondContext);
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
    });

    test('should set up silent buffer for initialization', async () => {
      await audioPlayer.initAudioContext();

      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, 44100, 44100);
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockSource.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockSource.start).toHaveBeenCalled();
      expect(mockSource.stop).toHaveBeenCalled();
    });
  });

  describe('stopAudio', () => {
    test('should stop and disconnect current audio source', async () => {
      audioPlayer.currentAudio = {
        context: mockAudioContext,
        source: mockSource
      };

      await audioPlayer.stopAudio();

      expect(mockSource.stop).toHaveBeenCalled();
      expect(mockSource.disconnect).toHaveBeenCalled();
      expect(audioPlayer.currentAudio).toBeNull();
    });

    test('should handle no current audio gracefully', async () => {
      audioPlayer.currentAudio = null;

      await expect(audioPlayer.stopAudio()).resolves.not.toThrow();
    });

    test('should handle current audio without source', async () => {
      audioPlayer.currentAudio = { context: mockAudioContext };

      await expect(audioPlayer.stopAudio()).resolves.not.toThrow();
      expect(audioPlayer.currentAudio).toBeNull();
    });
  });

  describe('playAudioChunk', () => {
    let mockBlob;

    beforeEach(() => {
      mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      };
    });

    test('should play audio chunk successfully', async () => {
      const playPromise = audioPlayer.playAudioChunk(mockBlob, 1.0);

      // Simulate audio ended
      setTimeout(() => {
        mockSource.onended();
      }, 0);

      await playPromise;

      expect(mockBlob.arrayBuffer).toHaveBeenCalled();
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(mockSource.buffer).toBe(mockAudioBuffer);
      expect(mockSource.playbackRate.value).toBe(1.0);
      expect(mockSource.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockSource.start).toHaveBeenCalled();
    });

    test('should handle custom playback rate', async () => {
      const playPromise = audioPlayer.playAudioChunk(mockBlob, 1.5);

      setTimeout(() => {
        mockSource.onended();
      }, 0);

      await playPromise;

      expect(mockSource.playbackRate.value).toBe(1.5);
    });

    test('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended';

      const playPromise = audioPlayer.playAudioChunk(mockBlob);

      setTimeout(() => {
        mockSource.onended();
      }, 0);

      await playPromise;

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    test('should use existing context when provided', async () => {
      const existingContext = { ...mockAudioContext };

      const playPromise = audioPlayer.playAudioChunk(mockBlob, 1.0, existingContext);

      setTimeout(() => {
        mockSource.onended();
      }, 0);

      await playPromise;

      expect(global.AudioContext).not.toHaveBeenCalled();
    });

    test('should handle decode errors', async () => {
      mockAudioContext.decodeAudioData.mockRejectedValueOnce(new Error('Decode failed'));

      await expect(audioPlayer.playAudioChunk(mockBlob)).rejects.toThrow('Decode failed');
    });
  });

  describe('concatenateMP3Chunks', () => {
    let mockChunks;

    beforeEach(() => {
      mockChunks = [
        { blob: { arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(512)) } },
        { blob: { arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(512)) } }
      ];

      mockAudioContext.createBuffer.mockReturnValue({
        length: 88200,
        numberOfChannels: 1,
        sampleRate: 44100,
        getChannelData: jest.fn().mockReturnValue({
          set: jest.fn()
        })
      });
    });

    test('should concatenate multiple audio chunks', async () => {
      const result = await audioPlayer.concatenateMP3Chunks(mockChunks);

      expect(mockChunks[0].blob.arrayBuffer).toHaveBeenCalled();
      expect(mockChunks[1].blob.arrayBuffer).toHaveBeenCalled();
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, 220500, 44100);
      expect(result).toBeDefined();
    });

    test('should handle decode errors in chunks', async () => {
      mockAudioContext.decodeAudioData
        .mockResolvedValueOnce(mockAudioBuffer)
        .mockRejectedValueOnce(new Error('Decode failed'));

      await expect(audioPlayer.concatenateMP3Chunks(mockChunks)).rejects.toThrow('Failed to decode chunk 2');
    });

    test('should handle empty chunks array', async () => {
      await expect(audioPlayer.concatenateMP3Chunks([])).rejects.toThrow();
    });
  });

  describe('playAudioBuffer', () => {
    test('should play audio buffer successfully', async () => {
      const playPromise = audioPlayer.playAudioBuffer(mockAudioBuffer, 1.2);

      setTimeout(() => {
        mockSource.onended();
      }, 0);

      await playPromise;

      expect(mockSource.buffer).toBe(mockAudioBuffer);
      expect(mockSource.playbackRate.value).toBe(1.2);
      expect(mockSource.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockSource.start).toHaveBeenCalled();
    });

    test('should handle audio context initialization errors', async () => {
      global.AudioContext.mockImplementationOnce(() => {
        throw new Error('AudioContext failed');
      });

      await expect(audioPlayer.playAudioBuffer(mockAudioBuffer)).rejects.toThrow('AudioContext failed');
    });
  });

  describe('playAudioSegmentsInOrder', () => {
    let mockSegments;

    beforeEach(() => {
      mockSegments = [
        { order: 1, blob: { arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(512)) } },
        { order: 0, blob: { arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(512)) } },
        { order: 2, blob: { arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(512)) } }
      ];

      // Mock the playAudioChunk method
      audioPlayer.playAudioChunk = jest.fn().mockResolvedValue();
    });

    test('should play segments in correct order', async () => {
      await audioPlayer.playAudioSegmentsInOrder(mockSegments, 1.0);

      expect(audioPlayer.playAudioChunk).toHaveBeenCalledTimes(3);

      // Check that segments were played in order 0, 1, 2
      const calls = audioPlayer.playAudioChunk.mock.calls;
      expect(calls[0][0]).toBe(mockSegments[1].blob); // order: 0
      expect(calls[1][0]).toBe(mockSegments[0].blob); // order: 1
      expect(calls[2][0]).toBe(mockSegments[2].blob); // order: 2

      // Check playback rate was passed correctly
      calls.forEach(call => {
        expect(call[1]).toBe(1.0);
      });
    });

    test('should handle empty segments array', async () => {
      await expect(audioPlayer.playAudioSegmentsInOrder([], 1.0)).resolves.not.toThrow();
      expect(audioPlayer.playAudioChunk).not.toHaveBeenCalled();
    });

    test('should continue playing even if one segment fails', async () => {
      audioPlayer.playAudioChunk = jest.fn()
        .mockResolvedValueOnce() // First segment succeeds
        .mockRejectedValueOnce(new Error('Playback failed')) // Second segment fails
        .mockResolvedValueOnce(); // Third segment succeeds

      await audioPlayer.playAudioSegmentsInOrder(mockSegments, 1.0);

      expect(audioPlayer.playAudioChunk).toHaveBeenCalledTimes(3);
    });
  });
});