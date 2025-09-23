export class AudioPlayer {
  constructor() {
    this.currentAudio = null;
    this.currentMediaSource = null;
  }

  async stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      if (this.currentAudio.src) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      this.currentAudio = null;
    }

    if (this.currentMediaSource && this.currentMediaSource.readyState === 'open') {
      try {
        this.currentMediaSource.endOfStream();
      } catch {
        // MediaSource might already be closed
      }
    }
    this.currentMediaSource = null;
  }

  async playStreamingResponse(response, rate = 1, onProgress = null) {
    await this.stopAudio();

    if (!window.MediaSource) {
      return this.playBlobFallback(response, rate, onProgress);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const mediaSource = new MediaSource();

      audio.src = URL.createObjectURL(mediaSource);
      audio.playbackRate = rate;
      this.currentAudio = audio;
      this.currentMediaSource = mediaSource;

      mediaSource.addEventListener('sourceopen', () => {
        this.handleStreamingPlayback(response, mediaSource, audio, onProgress)
          .then(resolve)
          .catch(reject);
      });

      audio.onerror = () => {
        this.cleanup(audio, mediaSource);
        reject(new Error('Audio playback failed'));
      };
    });
  }

  async handleStreamingPlayback(response, mediaSource, audio, onProgress) {
    try {
      if (mediaSource.readyState !== 'open') {
        throw new Error('MediaSource not ready');
      }

      const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
      const reader = response.body.getReader();

      let totalSize = parseInt(response.headers.get('content-length') || '0');
      let receivedSize = 0;
      let hasStartedPlaying = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (mediaSource.readyState === 'open') {
            mediaSource.endOfStream();
          }
          break;
        }

        receivedSize += value.byteLength;
        if (onProgress && totalSize > 0) {
          onProgress({
            stage: 'streaming',
            progress: Math.round((receivedSize / totalSize) * 100)
          });
        }

        // Wait for sourceBuffer to be ready
        while (sourceBuffer.updating) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Check if mediaSource is still open before appending
        if (mediaSource.readyState === 'open') {
          sourceBuffer.appendBuffer(value);
        } else {
          break;
        }

        if (!hasStartedPlaying && audio.readyState >= 3) {
          hasStartedPlaying = true;
          await audio.play();
        }
      }

      return new Promise((resolve) => {
        audio.onended = () => {
          this.cleanup(audio, mediaSource);
          resolve();
        };
      });

    } catch (error) {
      this.cleanup(audio, mediaSource);
      throw error;
    }
  }

  async playBlobFallback(response, rate = 1, onProgress = null) {
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/webm; codecs="opus"' });

    const audio = new Audio();
    const objectUrl = URL.createObjectURL(blob);

    audio.src = objectUrl;
    audio.playbackRate = rate;
    this.currentAudio = audio;

    return new Promise((resolve, reject) => {
      audio.oncanplaythrough = () => {
        if (onProgress) onProgress({ stage: 'ready', progress: 100 });
      };

      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        this.currentAudio = null;
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }

  cleanup(audio, mediaSource = null) {
    if (audio && audio.src) {
      URL.revokeObjectURL(audio.src);
    }
    if (this.currentAudio === audio) {
      this.currentAudio = null;
    }

    if (mediaSource && mediaSource.readyState === 'open') {
      try {
        mediaSource.endOfStream();
      } catch {
        // MediaSource might already be closed
      }
    }
    if (this.currentMediaSource === mediaSource) {
      this.currentMediaSource = null;
    }
  }
}