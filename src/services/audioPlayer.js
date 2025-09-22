export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.currentAudio = null;
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
          const audioBuffer = await context.decodeAudioData(arrayBuffer);

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

  async concatenateMP3Chunks(mp3Chunks) {
    const audioContext = await this.initAudioContext();
    const audioBuffers = [];
    let totalSamples = 0;

    for (let i = 0; i < mp3Chunks.length; i++) {
      const chunk = mp3Chunks[i];

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