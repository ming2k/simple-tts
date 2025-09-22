export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.currentAudio = null;
    this.streamingPlayer = null;
  }

  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const sampleRate = this.audioContext.sampleRate;
      const silentBuffer = this.audioContext.createBuffer(1, sampleRate, sampleRate);
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);

      const startTime = this.audioContext.currentTime;
      source.start(startTime);
      source.stop(startTime + 0.5);

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return this.audioContext;
  }

  async stopAudio() {
    if (this.currentAudio) {
      if (this.currentAudio.source) {
        this.currentAudio.source.stop();
        this.currentAudio.source.disconnect();
      }
      this.currentAudio = null;
    }

    if (this.streamingPlayer) {
      this.streamingPlayer.pause();
      this.streamingPlayer.currentTime = 0;
      this.streamingPlayer = null;
    }
  }

  async playAudioChunk(audioBlob, rate = 1, existingContext = null) {
    return new Promise((resolve, reject) => {
      const playChunk = async () => {
        try {
          const context = existingContext || (await this.initAudioContext());

          if (context.state !== "running") {
            await context.resume();
          }

          const source = context.createBufferSource();
          this.currentAudio = { context, source };

          const arrayBuffer = await audioBlob.arrayBuffer();
          let audioBuffer;

          try {
            audioBuffer = await context.decodeAudioData(arrayBuffer);
          } catch (decodeError) {
            console.warn('Failed to decode audio format:', decodeError);
            // Audio format not supported by WebAudio API
            throw new Error(`Audio format not supported: ${decodeError.message}`);
          }

          source.buffer = audioBuffer;
          source.playbackRate.value = rate;
          source.connect(context.destination);

          const startTime = context.currentTime + 0.1;

          source.onended = () => {
            source.disconnect();
            resolve();
          };

          source.start(startTime);
        } catch (error) {
          console.error("Playback error:", error);
          reject(error);
        }
      };

      playChunk();
    });
  }

  async playAudioBuffer(audioBuffer, rate = 1) {
    try {
      const audioContext = await this.initAudioContext();

      return new Promise((resolve, reject) => {
        try {
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = rate;
          source.connect(audioContext.destination);

          this.currentAudio = { context: audioContext, source };

          source.onended = () => {
            source.disconnect();
            resolve();
          };

          source.start();

        } catch (error) {
          console.error('AudioBuffer playback error:', error);
          reject(error);
        }
      });

    } catch (error) {
      console.error('AudioBuffer playback failed:', error);
      throw error;
    }
  }

  async concatenateAudioChunks(audioChunks) {
    const audioContext = await this.initAudioContext();
    const audioBuffers = [];
    let totalSamples = 0;

    for (let i = 0; i < audioChunks.length; i++) {
      const chunk = audioChunks[i];

      try {
        const arrayBuffer = await chunk.blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
        totalSamples += audioBuffer.length;
      } catch (error) {
        console.error(`Failed to decode chunk ${i + 1}:`, error);
        throw error;
      }
    }

    const sampleRate = audioBuffers[0].sampleRate;
    const channels = audioBuffers[0].numberOfChannels;
    const concatenatedBuffer = audioContext.createBuffer(channels, totalSamples, sampleRate);

    let offset = 0;
    for (let i = 0; i < audioBuffers.length; i++) {
      const buffer = audioBuffers[i];
      for (let channel = 0; channel < channels; channel++) {
        const sourceData = buffer.getChannelData(channel);
        const targetData = concatenatedBuffer.getChannelData(channel);
        targetData.set(sourceData, offset);
      }
      offset += buffer.length;
    }

    return concatenatedBuffer;
  }

  // Keep backward compatibility
  async concatenateMP3Chunks(mp3Chunks) {
    return await this.concatenateAudioChunks(mp3Chunks);
  }

  async playStreamingAudio(audioBlob, rate = 1, onProgress = null) {
    try {
      // Check if we're in a browser extension context
      if (typeof window !== 'undefined' && window.ttsPlayer) {
        // Use the content script's player for browser extension
        const objectUrl = URL.createObjectURL(audioBlob);
        try {
          await window.ttsPlayer.play(objectUrl, rate);
          if (onProgress) onProgress({ stage: 'ready', progress: 100 });
          return;
        } catch (extensionError) {
          console.warn('Extension player failed, trying direct audio:', extensionError);
          URL.revokeObjectURL(objectUrl);
          // Fall through to direct audio
        }
      }

      // Direct HTML5 audio approach
      const audio = new Audio();
      this.streamingPlayer = audio;

      // Set up the audio source
      const objectUrl = URL.createObjectURL(audioBlob);
      audio.src = objectUrl;
      audio.playbackRate = rate;

      return new Promise((resolve, reject) => {
        let resolved = false;

        const cleanup = () => {
          if (!resolved) {
            URL.revokeObjectURL(objectUrl);
            this.streamingPlayer = null;
            resolved = true;
          }
        };

        audio.oncanplaythrough = () => {
          if (onProgress) onProgress({ stage: 'ready', progress: 100 });
        };

        audio.onended = () => {
          cleanup();
          resolve();
        };

        audio.onerror = (error) => {
          console.error('Direct audio playback error:', error);
          cleanup();

          // Try WebAudio as final fallback
          this.playAudioChunk(audioBlob, rate)
            .then(resolve)
            .catch(reject);
        };

        // Start playback
        audio.play().catch((playError) => {
          console.error('Audio play() failed:', playError);
          cleanup();

          // Try WebAudio as final fallback
          this.playAudioChunk(audioBlob, rate)
            .then(resolve)
            .catch(reject);
        });
      });

    } catch (error) {
      console.error('Streaming playback failed completely, using WebAudio fallback:', error);

      // Final fallback to WebAudio
      return await this.playAudioChunk(audioBlob, rate);
    }
  }

  async playAudioSegmentsInOrder(audioSegments, playbackRate = 1) {
    try {
      const audioContext = await this.initAudioContext();

      if (audioContext.state !== "running") {
        await audioContext.resume();
      }

      const sortedSegments = [...audioSegments].sort((a, b) => a.order - b.order);

      for (let i = 0; i < sortedSegments.length; i++) {
        const segment = sortedSegments[i];

        try {
          await this.playAudioChunk(segment.blob, playbackRate, audioContext);

          if (i < sortedSegments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (error) {
          console.error(`Error playing segment ${i + 1}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in ordered audio playback:', error);
      throw error;
    }
  }
}