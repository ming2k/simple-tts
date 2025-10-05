/**
 * AudioService - Manages audio playback with MediaSource API
 *
 * States: None → Playing ⇄ Paused → Ended → (replay) Playing
 *         Any state → stopAudio() → None
 *
 * Methods:
 * - playStreamingResponse(): Start playback (clears cache, stops current)
 * - replayFromCache():      Replay from cached chunks (no new request)
 * - pauseAudio/resumeAudio: Pause/resume playback
 * - stopAudio():            Stop audio (keeps cache), clearCache() to clear
 * - isPlaying/isPaused/hasEnded/hasCachedAudio: State checks
 */
export class AudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentMediaSource: MediaSource | null = null;
  private isStopping: boolean = false;
  private playbackTimeoutId: number | null = null;
  private cachedChunks: Uint8Array[] = [];
  private cachedRate: number = 1;

  async stopAudio(): Promise<void> {
    // Set stopping flag to prevent error propagation
    this.isStopping = true;

    // Clear timeout if exists
    if (this.playbackTimeoutId !== null) {
      window.clearTimeout(this.playbackTimeoutId);
      this.playbackTimeoutId = null;
    }

    // Store references to avoid race conditions
    const audio = this.currentAudio;
    const mediaSource = this.currentMediaSource;

    // Clear references immediately to prevent new operations
    this.currentAudio = null;
    this.currentMediaSource = null;

    // Keep cache for replay - don't clear it here

    // Clean up audio and MediaSource
    this.cleanup(audio, mediaSource);
  }

  pauseAudio(): void {
    if (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended) {
      this.currentAudio.pause();
    }
  }

  async resumeAudio(): Promise<void> {
    if (this.currentAudio && this.currentAudio.paused && !this.currentAudio.ended) {
      try {
        await this.currentAudio.play();
      } catch (error) {
        console.error('Resume audio failed:', error);
        throw error;
      }
    }
  }

  isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused && !this.currentAudio.ended;
  }

  isPaused(): boolean {
    return this.currentAudio !== null && this.currentAudio.paused && !this.currentAudio.ended;
  }

  hasEnded(): boolean {
    return this.currentAudio !== null && this.currentAudio.ended;
  }

  hasAudio(): boolean {
    return this.currentAudio !== null && this.currentAudio.src !== '';
  }

  getCurrentAudio(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  hasCachedAudio(): boolean {
    return this.cachedChunks.length > 0;
  }

  clearCache(): void {
    this.cachedChunks = [];
    this.cachedRate = 1;
  }

  async replayFromCache(): Promise<void> {
    if (!this.hasCachedAudio()) {
      throw new Error('No cached audio available for replay');
    }

    // Preserve cache before stopping
    const cachedChunks = [...this.cachedChunks];
    const cachedRate = this.cachedRate;

    // Stop current playback if any
    await this.stopAudio();

    // Reset stopping flag for new playback
    this.isStopping = false;

    // Reset cache to prepare for recaching during replay
    this.cachedChunks = [];
    this.cachedRate = cachedRate;

    if (!window.MediaSource) {
      return this.playCachedBlobFallback(cachedChunks, cachedRate);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const mediaSource = new MediaSource();

      audio.src = URL.createObjectURL(mediaSource);
      audio.playbackRate = cachedRate;
      this.currentAudio = audio;
      this.currentMediaSource = mediaSource;

      mediaSource.addEventListener('sourceopen', () => {
        this.handleCachedPlayback(cachedChunks, mediaSource, audio)
          .then(resolve)
          .catch(reject);
      });

      audio.onerror = () => {
        if (!this.isStopping) {
          this.cleanup(audio, mediaSource);
          reject(new Error('Audio playback failed'));
        }
      };
    });
  }

  async playStreamingResponse(response: Response, rate: number = 1, onProgress: ((progress: any) => void) | null = null): Promise<void> {
    await this.stopAudio();

    // Reset stopping flag for new playback
    this.isStopping = false;

    // Clear cache and save new rate for fresh playback
    this.cachedChunks = [];
    this.cachedRate = rate;

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
        // Don't reject if we're intentionally stopping
        if (!this.isStopping) {
          this.cleanup(audio, mediaSource);
          reject(new Error('Audio playback failed'));
        }
      };
    });
  }

  private async handleStreamingPlayback(
    response: Response,
    mediaSource: MediaSource,
    audio: HTMLAudioElement,
    onProgress: ((progress: any) => void) | null
  ): Promise<void> {
    let sourceBuffer: SourceBuffer | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      if (mediaSource.readyState !== 'open') {
        throw new Error('MediaSource not ready');
      }

      sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
      reader = response.body!.getReader();

      let totalSize = parseInt(response.headers.get('content-length') || '0');
      let receivedSize = 0;
      let hasStartedPlaying = false;

      while (true) {
        // Check if MediaSource is still valid before each operation
        if (mediaSource.readyState !== 'open') {
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          // Only end stream if MediaSource is still open
          if (mediaSource.readyState === 'open') {
            try {
              mediaSource.endOfStream();
            } catch (e: any) {
              // Silently ignore - MediaSource state might have changed
              if (e.name !== 'InvalidStateError') {
                console.warn('Failed to end MediaSource stream:', e.message);
              }
            }
          }
          break;
        }

        receivedSize += value.byteLength;

        // Cache the chunk for replay
        this.cachedChunks.push(new Uint8Array(value));

        if (onProgress && totalSize > 0) {
          onProgress({
            stage: 'streaming',
            progress: Math.round((receivedSize / totalSize) * 100)
          });
        }

        // Wait for sourceBuffer to be ready with timeout
        let waitCount = 0;
        while (sourceBuffer.updating && waitCount < 500) { // Max 5 seconds wait
          await new Promise(resolve => setTimeout(resolve, 10));
          waitCount++;

          // Check if MediaSource was closed while waiting
          if (mediaSource.readyState !== 'open') {
            break;
          }
        }

        // Only append if MediaSource is still open and sourceBuffer is not updating
        if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
          try {
            sourceBuffer.appendBuffer(value as BufferSource);
          } catch (appendError: any) {
            // MediaSource might have been closed between checks
            if (appendError.name === 'InvalidStateError') {
              console.warn('MediaSource became invalid during append:', appendError.message);
              break;
            }
            throw appendError;
          }
        } else {
          break;
        }

        if (!hasStartedPlaying && audio.readyState >= 3) {
          hasStartedPlaying = true;
          try {
            await audio.play();
          } catch (playError: any) {
            console.warn('Play failed, continuing with buffering:', playError.message);
            // If autoplay failed, we'll try again after user interaction
            if (playError.name === 'NotAllowedError') {
              console.log('Autoplay blocked, will require user interaction');
            }
          }
        }
      }

      return new Promise((resolve, reject) => {
        this.playbackTimeoutId = window.setTimeout(() => {
          if (!this.isStopping) {
            reject(new Error('Audio playback timeout'));
          }
          this.playbackTimeoutId = null;
        }, 30000) as unknown as number; // 30 second timeout

        audio.onended = () => {
          if (this.playbackTimeoutId !== null) {
            window.clearTimeout(this.playbackTimeoutId);
            this.playbackTimeoutId = null;
          }
          // Cleanup MediaSource but keep audio element reference
          this.cleanupMediaSource(mediaSource);
          resolve();
        };

        audio.onerror = () => {
          if (this.playbackTimeoutId !== null) {
            window.clearTimeout(this.playbackTimeoutId);
            this.playbackTimeoutId = null;
          }
          // Don't reject if we're intentionally stopping
          if (!this.isStopping) {
            reject(new Error('Audio playback error'));
          } else {
            resolve();
          }
        };
      });

    } catch (error) {
      // Clean up reader if it was created
      if (reader) {
        try {
          await reader.cancel();
        } catch (e: any) {
          console.warn('Failed to cancel reader:', e.message);
        }
      }
      this.cleanup(audio, mediaSource);
      throw error;
    }
  }

  private async handleCachedPlayback(
    cachedChunks: Uint8Array[],
    mediaSource: MediaSource,
    audio: HTMLAudioElement
  ): Promise<void> {
    let sourceBuffer: SourceBuffer | null = null;

    try {
      if (mediaSource.readyState !== 'open') {
        throw new Error('MediaSource not ready');
      }

      sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
      let hasStartedPlaying = false;

      for (let i = 0; i < cachedChunks.length; i++) {
        const chunk = cachedChunks[i];

        // Check if MediaSource is still valid
        if (mediaSource.readyState !== 'open') {
          break;
        }

        // Re-cache the chunk
        this.cachedChunks.push(chunk);

        // Wait for sourceBuffer to be ready
        let waitCount = 0;
        while (sourceBuffer.updating && waitCount < 500) {
          await new Promise(resolve => setTimeout(resolve, 10));
          waitCount++;

          if (mediaSource.readyState !== 'open') {
            break;
          }
        }

        // Append chunk if ready
        if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
          try {
            sourceBuffer.appendBuffer(chunk as BufferSource);
          } catch (appendError: any) {
            if (appendError.name === 'InvalidStateError') {
              console.warn('MediaSource became invalid during append:', appendError.message);
              break;
            }
            throw appendError;
          }
        } else {
          break;
        }

        // Start playing once enough data is buffered
        if (!hasStartedPlaying && audio.readyState >= 3) {
          hasStartedPlaying = true;
          try {
            await audio.play();
          } catch (playError: any) {
            console.warn('Play failed, continuing with buffering:', playError.message);
          }
        }
      }

      // End the stream after all chunks are appended
      if (mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch (e: any) {
          if (e.name !== 'InvalidStateError') {
            console.warn('Failed to end MediaSource stream:', e.message);
          }
        }
      }

      return new Promise((resolve, reject) => {
        this.playbackTimeoutId = window.setTimeout(() => {
          if (!this.isStopping) {
            reject(new Error('Audio playback timeout'));
          }
          this.playbackTimeoutId = null;
        }, 30000) as unknown as number;

        audio.onended = () => {
          if (this.playbackTimeoutId !== null) {
            window.clearTimeout(this.playbackTimeoutId);
            this.playbackTimeoutId = null;
          }
          // Cleanup MediaSource but keep audio element reference
          this.cleanupMediaSource(mediaSource);
          resolve();
        };

        audio.onerror = () => {
          if (this.playbackTimeoutId !== null) {
            window.clearTimeout(this.playbackTimeoutId);
            this.playbackTimeoutId = null;
          }
          if (!this.isStopping) {
            reject(new Error('Audio playback error'));
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      this.cleanup(audio, mediaSource);
      throw error;
    }
  }

  private async playCachedBlobFallback(cachedChunks: Uint8Array[], rate: number = 1): Promise<void> {
    // Combine all cached chunks into a single blob
    const totalLength = cachedChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const combinedArray = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of cachedChunks) {
      combinedArray.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const blob = new Blob([combinedArray], { type: 'audio/webm; codecs="opus"' });

    const audio = new Audio();
    const objectUrl = URL.createObjectURL(blob);

    audio.src = objectUrl;
    audio.playbackRate = rate;
    this.currentAudio = audio;

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        // Keep audio element in ended state
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        if (!this.isStopping) {
          reject(new Error('Audio playback failed'));
        } else {
          resolve();
        }
      };

      audio.play().catch((err) => {
        if (!this.isStopping) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async playBlobFallback(response: Response, rate: number = 1, onProgress: ((progress: any) => void) | null): Promise<void> {
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
        // Keep audio element in ended state
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Don't reject if we're intentionally stopping
        if (!this.isStopping) {
          reject(new Error('Audio playback failed'));
        } else {
          resolve();
        }
      };

      audio.play().catch((err) => {
        if (!this.isStopping) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private cleanupMediaSource(mediaSource: MediaSource | null): void {
    // Clean up MediaSource only (keep audio element)
    if (mediaSource) {
      try {
        // Only attempt cleanup if MediaSource is still open
        if (mediaSource.readyState === 'open') {
          try {
            // End the stream first before removing buffers
            mediaSource.endOfStream();
          } catch (endError: any) {
            // endOfStream might fail if already ended or in invalid state
            if (endError.name !== 'InvalidStateError') {
              console.warn('Failed to end MediaSource stream:', endError.message);
            }
          }
        }
      } catch (e: any) {
        // MediaSource might already be closed or in invalid state
        console.warn('Error cleaning up MediaSource:', e.message);
      }

      if (this.currentMediaSource === mediaSource) {
        this.currentMediaSource = null;
      }
    }
  }

  private cleanup(audio: HTMLAudioElement | null, mediaSource: MediaSource | null = null): void {
    // Clean up audio element
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load(); // Reset the audio element state

        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      } catch (e: any) {
        console.warn('Error cleaning up audio element:', e.message);
      }

      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
    }

    // Clean up MediaSource
    this.cleanupMediaSource(mediaSource);
  }
}
