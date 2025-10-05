/**
 * AudioService - Manages audio playback with MediaSource API for streaming TTS
 *
 * State Machine:
 *   None → Playing ⇄ Paused → Ended → (replay) Playing
 *   Any state → stopAudio() → None
 *
 * Key Features:
 * - Streaming playback via MediaSource API (for HTTP/2 chunked responses)
 * - Audio chunk caching for replay without new API calls
 * - Automatic cleanup to prevent memory leaks
 *
 * Public Methods:
 * - playStreamingResponse(): Start new playback (auto-stops current, caches chunks)
 * - replayFromCache():       Replay from cached chunks (no new API request)
 * - pauseAudio/resumeAudio:  Pause/resume current playback
 * - stopAudio():             Stop playback (preserves cache for replay)
 * - clearCache():            Clear cached chunks (prevents replay)
 * - State checks: isPlaying(), isPaused(), hasEnded(), hasCachedAudio()
 *
 * IMPORTANT Design Notes:
 * - Each playback creates a NEW HTMLAudioElement (old ones are cleaned up)
 * - All audio elements have className='simple-tts-audio' for cleanup on extension reload
 * - isStopping flag prevents error events from propagating during intentional stops
 * - Cache is preserved across stop/replay cycle (only cleared explicitly or on new playback)
 */
export class AudioService {
  // Current playback state
  private currentAudio: HTMLAudioElement | null = null;
  private currentMediaSource: MediaSource | null = null;

  // CRITICAL: Flag to prevent error propagation during intentional stops
  // Without this, stopping audio would trigger error handlers and reject promises
  private isStopping: boolean = false;

  private playbackTimeoutId: number | null = null;

  // Cache for replay functionality (preserves chunks for replay without new API call)
  private cachedChunks: Uint8Array[] = [];
  private cachedRate: number = 1;

  /**
   * Stop current audio playback
   *
   * CRITICAL PATTERNS:
   * 1. Set isStopping flag FIRST to prevent error handlers from firing
   * 2. Store references before clearing to avoid race conditions
   * 3. Clear this.currentAudio/MediaSource BEFORE cleanup to prevent new operations
   * 4. Preserve cache for replay (only cleared by clearCache() or new playback)
   *
   * WHY THIS ORDER MATTERS:
   * - If we cleanup before clearing references, new operations could start
   * - If we don't set isStopping first, cleanup triggers error events
   */
  async stopAudio(): Promise<void> {
    // Step 1: Set flag to prevent error propagation during cleanup
    this.isStopping = true;

    // Step 2: Clear any pending timeouts
    if (this.playbackTimeoutId !== null) {
      window.clearTimeout(this.playbackTimeoutId);
      this.playbackTimeoutId = null;
    }

    // Step 3: Store references to current audio/MediaSource
    // IMPORTANT: Store before clearing to avoid race conditions
    const audio = this.currentAudio;
    const mediaSource = this.currentMediaSource;

    // Step 4: Clear instance references IMMEDIATELY
    // This prevents new operations from starting during cleanup
    this.currentAudio = null;
    this.currentMediaSource = null;

    // NOTE: Cache is intentionally preserved for replay functionality
    // Call clearCache() explicitly if you want to clear it

    // Step 5: Clean up the stored references
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

  /**
   * Replay audio from cached chunks
   *
   * CRITICAL: Cache preservation pattern
   *
   * WHY WE NEED TO COPY CACHE BEFORE STOPPING:
   * - We need to stop current playback before starting replay
   * - But stopAudio() could potentially clear references
   * - So we copy cache to local variables FIRST
   *
   * CACHE RE-CACHING PATTERN:
   * - We clear this.cachedChunks before replay
   * - During playback, handleCachedPlayback() will re-cache chunks
   * - This ensures cache is always fresh and in sync
   *
   * @throws {Error} If no cached audio is available
   */
  async replayFromCache(): Promise<void> {
    if (!this.hasCachedAudio()) {
      throw new Error('No cached audio available for replay');
    }

    // IMPORTANT: Copy cache to local variables BEFORE stopping
    // stopAudio() doesn't clear cache, but we do this defensively
    const cachedChunks = [...this.cachedChunks];
    const cachedRate = this.cachedRate;

    // Stop current playback if any
    await this.stopAudio();

    // Reset stopping flag to allow new playback
    this.isStopping = false;

    // Clear cache for re-caching during replay
    // The handleCachedPlayback() will rebuild the cache
    this.cachedChunks = [];
    this.cachedRate = cachedRate;

    if (!window.MediaSource) {
      return this.playCachedBlobFallback(cachedChunks, cachedRate);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const mediaSource = new MediaSource();

      // CRITICAL: Mark all TTS audio elements with a className
      // This allows content script to find and clean up orphaned audio elements
      // when the extension is reloaded (prevents memory leaks and "ended" event issues)
      audio.className = 'simple-tts-audio';
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

  /**
   * Play streaming TTS response using MediaSource API
   *
   * This method handles HTTP/2 chunked responses and caches chunks for replay.
   *
   * IMPORTANT SEQUENCE:
   * 1. Stop current playback (preserves old cache)
   * 2. Clear cache for NEW playback (prevents old data from mixing)
   * 3. Create new audio element
   * 4. Stream chunks and cache them as they arrive
   *
   * @param response - HTTP response with streaming audio data
   * @param rate - Playback speed (1.0 = normal)
   * @param onProgress - Optional progress callback
   */
  async playStreamingResponse(response: Response, rate: number = 1, onProgress: ((progress: any) => void) | null = null): Promise<void> {
    // Stop current playback before starting new one
    await this.stopAudio();

    // Reset stopping flag to allow new playback
    this.isStopping = false;

    // IMPORTANT: Clear cache for fresh playback
    // Each new playback gets its own cache to prevent data mixing
    this.cachedChunks = [];
    this.cachedRate = rate;

    if (!window.MediaSource) {
      return this.playBlobFallback(response, rate, onProgress);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const mediaSource = new MediaSource();

      audio.className = 'simple-tts-audio';
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
          console.log('[AudioService] handleStreamingPlayback - audio.onended fired, audio.ended:', audio.ended);
          if (this.playbackTimeoutId !== null) {
            window.clearTimeout(this.playbackTimeoutId);
            this.playbackTimeoutId = null;
          }
          // Cleanup MediaSource but keep audio element reference
          this.cleanupMediaSource(mediaSource);
          console.log('[AudioService] after cleanup - currentAudio exists:', !!this.currentAudio, 'ended:', this.currentAudio?.ended);
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

    audio.className = 'simple-tts-audio';
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

    audio.className = 'simple-tts-audio';
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
