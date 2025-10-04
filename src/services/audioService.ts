export class AudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentMediaSource: MediaSource | null = null;
  private isStopping: boolean = false;

  async stopAudio(): Promise<void> {
    // Set stopping flag to prevent error propagation
    this.isStopping = true;

    // Store references to avoid race conditions
    const audio = this.currentAudio;
    const mediaSource = this.currentMediaSource;

    // Clear references immediately to prevent new operations
    this.currentAudio = null;
    this.currentMediaSource = null;

    // Clean up audio and MediaSource
    this.cleanup(audio, mediaSource);
  }

  async playStreamingResponse(response: Response, rate: number = 1, onProgress: ((progress: any) => void) | null = null): Promise<void> {
    await this.stopAudio();

    // Reset stopping flag for new playback
    this.isStopping = false;

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
              console.warn('Failed to end MediaSource stream:', e.message);
            }
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
        const timeoutId = setTimeout(() => {
          if (!this.isStopping) {
            this.cleanup(audio, mediaSource);
            reject(new Error('Audio playback timeout'));
          }
        }, 30000); // 30 second timeout

        audio.onended = () => {
          clearTimeout(timeoutId);
          this.cleanup(audio, mediaSource);
          resolve();
        };

        audio.onerror = () => {
          clearTimeout(timeoutId);
          // Don't reject if we're intentionally stopping
          if (!this.isStopping) {
            this.cleanup(audio, mediaSource);
            reject(new Error('Audio playback error'));
          } else {
            // Just resolve when stopping intentionally
            this.cleanup(audio, mediaSource);
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
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        this.currentAudio = null;
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
    if (mediaSource) {
      try {
        // Check current state before attempting operations
        if (mediaSource.readyState === 'open') {
          // Close any source buffers first
          for (let i = 0; i < mediaSource.sourceBuffers.length; i++) {
            const buffer = mediaSource.sourceBuffers[i];
            if (buffer && !buffer.updating) {
              try {
                mediaSource.removeSourceBuffer(buffer);
              } catch (removeError: any) {
                console.warn('Failed to remove source buffer:', removeError.message);
              }
            }
          }

          // End the stream
          mediaSource.endOfStream();
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
}
