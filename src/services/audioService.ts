import { AudioStatus, TTSRequest, AudioOperationParams } from '../types/storage.ts';

interface UIController {
  updateStatus(isPlaying: boolean, audioStatus?: AudioStatus): void;
}

export class AudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentMediaSource: MediaSource | null = null;
  private uiControllers: Set<UIController> = new Set();
  private statusUpdatePending: boolean = false;
  private lastStatus: AudioStatus | null = null;
  private eventListenersAdded: Set<string> = new Set();
  private boundUpdateStatus?: () => void;
  private autoplayBlocked: boolean = false;

  // Caching for replay functionality
  private cachedAudioData: Blob | null = null;
  private cachedAudioUrl: string | null = null;
  private lastRequest: TTSRequest | null = null;

  constructor() {
    // Empty constructor - all initialization done in field declarations
  }

  // Add a UI controller (popup, mini-window, etc.)
  addUIController(controller: UIController): void {
    if (controller && typeof controller.updateStatus === 'function') {
      this.uiControllers.add(controller);
    }
  }

  // Remove a UI controller
  removeUIController(controller: UIController): void {
    this.uiControllers.delete(controller);
  }

  // Cache audio data from streaming response for replay
  async cacheAudioData(response: Response): Promise<void> {
    try {
      // Clone the response to avoid consuming the original stream
      const responseClone = response.clone();
      const arrayBuffer = await responseClone.arrayBuffer();

      // Clean up old cached data
      this.clearCache();

      // Create blob and URL for cached audio
      this.cachedAudioData = new Blob([arrayBuffer], { type: 'audio/webm; codecs="opus"' });
      this.cachedAudioUrl = URL.createObjectURL(this.cachedAudioData);

      console.log('AudioController: Audio cached for replay');
    } catch (error) {
      console.warn('AudioController: Failed to cache audio data:', error);
    }
  }

  // Clear cached audio data
  clearCache() {
    if (this.cachedAudioUrl) {
      URL.revokeObjectURL(this.cachedAudioUrl);
      this.cachedAudioUrl = null;
      this.cachedAudioData = null;
    }
  }

  // Store last TTS request for replay
  setLastRequest(text: string, settings: any, credentials: { azureKey: string; azureRegion: string }): void {
    this.lastRequest = {
      text,
      settings,
      credentials
    };
  }

  // Clear last request
  clearLastRequest(): void {
    this.lastRequest = null;
  }

  // Play cached audio using traditional Audio element
  async playCachedAudio(rate = 1) {
    if (!this.cachedAudioUrl) {
      throw new Error('No cached audio available');
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = this.cachedAudioUrl;
      audio.playbackRate = rate;

      // Create bound function for event listeners
      const boundUpdateStatus = () => this.updateButtonStatus();

      // Add event listeners for status updates
      const events = ['play', 'pause', 'ended', 'playing', 'waiting', 'error'];
      events.forEach(event => {
        audio.addEventListener(event, boundUpdateStatus);
      });

      audio.onended = () => {
        // Clean up event listeners
        events.forEach(event => {
          audio.removeEventListener(event, boundUpdateStatus);
        });
        resolve();
      };

      audio.onerror = () => {
        // Clean up event listeners
        events.forEach(event => {
          audio.removeEventListener(event, boundUpdateStatus);
        });
        reject(new Error('Cached audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }

  // Handle play/pause/resume logic - separate from replay
  async handlePlayPause() {
    if (!this.currentAudio) {
      // No current audio - this should trigger new generation, not replay
      throw new Error('No audio to play - generate new audio first');
    }

    const isPlaying = this.getCurrentPlayingState();

    if (isPlaying) {
      // Currently playing - pause it
      this.currentAudio.pause();
      this.updateButtonStatus();
    } else {
      try {
        if (this.currentAudio.ended) {
          // Audio ended - restart from beginning (this is resume from end)
          this.currentAudio.currentTime = 0;
        }

        await this.currentAudio.play();
        // Clear autoplay blocked flag on successful manual play
        this.autoplayBlocked = false;
        this.updateButtonStatus();
      } catch (playError) {
        if (playError.name === 'NotAllowedError') {
          // This shouldn't happen for user-initiated play, but handle it
          console.error('AudioService: Play failed even after user interaction:', playError);
          this.autoplayBlocked = true;
        }
        this.updateButtonStatus();
        throw playError;
      }
    }
  }

  // Handle replay logic (from cache or regenerate)
  async handleReplay() {
    if (this.cachedAudioUrl) {
      // Use cached audio for instant replay
      console.log('AudioController: Playing cached audio');
      const rate = this.lastRequest?.settings?.rate || 1;
      await this.playCachedAudio(rate);
    } else if (this.lastRequest) {
      // Regenerate audio if no cache available
      console.log('AudioController: No cache available, regenerating audio');
      throw new Error('Regeneration not implemented - should be handled by caller with TTSService');
    } else {
      throw new Error('No audio to replay');
    }
  }

  // Centralized method to handle all audio operations
  // This is the main interface that UI components should use
  async handleAudioOperation(operation, params = {}) {
    switch (operation) {
      case 'play': {
        // Start new TTS playback
        const { text, settings, credentials, ttsService } = params;
        this.setLastRequest(text, settings, credentials);

        const streamingResponse = await ttsService.createStreamingResponse(text, settings);
        await this.cacheAudioData(streamingResponse);
        await this.playStreamingResponse(streamingResponse, settings.rate || 1);
        break;
      }

      case 'playPause':
        // Handle play/pause/resume
        await this.handlePlayPause();
        break;

      case 'replay':
        // Handle replay from cache or regenerate
        await this.handleReplay();
        break;

      case 'stop':
        // Stop audio and clean up
        await this.stopAudio();
        break;

      case 'regenerateReplay': {
        // Handle regeneration when replay cache is missing
        if (this.lastRequest) {
          const { ttsService } = params;
          const lastReq = this.lastRequest;
          ttsService.setCredentials(lastReq.credentials.azureKey, lastReq.credentials.azureRegion);

          const streamingResponse = await ttsService.createStreamingResponse(lastReq.text, lastReq.settings);
          await this.cacheAudioData(streamingResponse);
          await this.playStreamingResponse(streamingResponse, lastReq.settings.rate || 1);
        }
        break;
      }

      default:
        throw new Error(`Unknown audio operation: ${operation}`);
    }
  }

  // Optimized status update with debouncing and state consistency
  updateButtonStatus() {
    if (this.statusUpdatePending) return;

    this.statusUpdatePending = true;

    requestAnimationFrame(() => {
      try {
        const newStatus = this.getAudioStatus();

        // Compare only the playing state for change detection to avoid excessive updates
        const statusChanged = this.lastStatus?.isPlaying !== newStatus.isPlaying ||
                              this.lastStatus?.hasAudio !== newStatus.hasAudio ||
                              this.lastStatus?.canReplay !== newStatus.canReplay;

        // Only update if status actually changed
        if (statusChanged) {
          // Update all registered UI controllers
          this.uiControllers.forEach(controller => {
            try {
              if (typeof controller.updateStatus === 'function') {
                controller.updateStatus(newStatus.isPlaying, newStatus);
              }
            } catch (error) {
              console.warn('Error updating UI controller:', error);
              // Remove faulty controllers
              this.uiControllers.delete(controller);
            }
          });

          this.lastStatus = newStatus;
          console.log('AudioController: Status updated to', newStatus);
        }
      } catch (error) {
        console.warn('Error updating button status:', error);
      } finally {
        this.statusUpdatePending = false;
      }
    });
  }

  // Centralized method to determine current playing state
  getCurrentPlayingState() {
    if (!this.currentAudio) return false;

    // Check if audio is actually playing (not paused, not ended, has duration)
    return !this.currentAudio.paused &&
           !this.currentAudio.ended &&
           this.currentAudio.readyState >= 2 &&
           this.currentAudio.currentTime >= 0;
  }

  // Get current audio status for UI components
  getAudioStatus() {
    const isPlaying = this.getCurrentPlayingState();
    const hasAudio = !!(this.currentAudio || this.cachedAudioUrl);
    const hasCache = !!this.cachedAudioUrl;
    const canReplay = !!(this.cachedAudioUrl || this.lastRequest);

    // More comprehensive status detection
    const isEnded = this.currentAudio?.ended || false;
    const isPaused = this.currentAudio ? this.currentAudio.paused && !this.currentAudio.ended : false;

    return {
      isPlaying,
      hasAudio,
      hasCache,
      canReplay,
      isEnded,
      isPaused,
      autoplayBlocked: this.autoplayBlocked
    };
  }

  async stopAudio() {
    // Store references to avoid race conditions
    const audio = this.currentAudio;
    const mediaSource = this.currentMediaSource;

    // Clear references immediately to prevent new operations
    this.currentAudio = null;
    this.currentMediaSource = null;

    // Remove event listeners to prevent stale events
    this.removeAudioEventListeners(audio);

    // Clean up audio and MediaSource
    this.cleanup(audio, mediaSource);

    // Clear cache and last request when stopping
    this.clearCache();
    this.clearLastRequest();

    // Reset status tracking
    this.lastStatus = null;

    // Update button status after stopping
    this.updateButtonStatus();
  }

  // Remove event listeners from audio element
  removeAudioEventListeners(audio) {
    if (!audio) return;

    const events = ['play', 'pause', 'ended', 'playing', 'waiting', 'error', 'loadstart', 'canplay'];
    events.forEach(event => {
      audio.removeEventListener(event, this.boundUpdateStatus);
    });
  }

  async playStreamingResponse(response, rate = 1, onProgress = null) {
    await this.stopAudio();

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const mediaSource = new MediaSource();

      audio.src = URL.createObjectURL(mediaSource);
      audio.playbackRate = rate;
      this.currentAudio = audio;
      this.currentMediaSource = mediaSource;

      // Create bound function for consistent event listener management
      this.boundUpdateStatus = () => this.updateButtonStatus();

      // Add comprehensive event listeners for button status updates
      const events = ['play', 'pause', 'ended', 'playing', 'waiting', 'loadstart', 'canplay'];
      events.forEach(event => {
        audio.addEventListener(event, this.boundUpdateStatus);
      });

      mediaSource.addEventListener('sourceopen', () => {
        this.handleStreamingPlayback(response, mediaSource, audio, onProgress)
          .then(resolve)
          .catch(reject);
      });

      audio.onerror = () => {
        this.removeAudioEventListeners(audio);
        this.cleanup(audio, mediaSource);
        this.updateButtonStatus();
        reject(new Error('Audio playback failed'));
      };
    });
  }

  async handleStreamingPlayback(response, mediaSource, audio, onProgress) {
    let sourceBuffer = null;
    let reader = null;

    try {
      if (mediaSource.readyState !== 'open') {
        throw new Error('MediaSource not ready');
      }

      sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
      reader = response.body.getReader();

      let totalSize = parseInt(response.headers.get('content-length') || '0');
      let receivedSize = 0;
      let hasStartedPlaying = false;

      while (true) {
        // Check if MediaSource is still valid before each operation
        if (mediaSource.readyState === 'closed' || mediaSource.readyState === 'ended') {
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          // Only end stream if MediaSource is still open and valid
          if (mediaSource.readyState === 'open') {
            try {
              // Double-check that we can still call endOfStream
              if (typeof mediaSource.endOfStream === 'function') {
                mediaSource.endOfStream();
              }
            } catch (e) {
              // Ignore the warning if MediaSource became invalid between checks
              if (e.name !== 'InvalidStateError') {
                console.warn('Failed to end MediaSource stream:', e.message);
              }
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
            sourceBuffer.appendBuffer(value);
          } catch (appendError) {
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

        // Start playing as soon as we have enough data buffered (readyState 2 or higher)
        if (!hasStartedPlaying && audio.readyState >= 2) {
          hasStartedPlaying = true;
          try {
            await audio.play();
            // Autoplay succeeded
            this.autoplayBlocked = false;
            console.log('AudioService: Streaming audio started automatically');
            this.updateButtonStatus();
          } catch (playError) {
            console.warn('Autoplay failed, setting up for user interaction:', playError.message);
            // If autoplay failed, mark it as blocked and set up for user interaction
            if (playError.name === 'NotAllowedError') {
              this.autoplayBlocked = true;
              console.log('AudioService: Autoplay blocked, buffering will continue in background');

              // Set up one-time event handlers for user interaction
              const handleUserInteraction = async (event) => {
                if (this.currentAudio === audio && !audio.paused) return; // Already playing

                try {
                  await audio.play();
                  this.autoplayBlocked = false;
                  console.log('AudioService: Streaming playback started after user interaction');
                  this.updateButtonStatus();

                  // Remove listeners after successful play
                  document.removeEventListener('click', handleUserInteraction);
                  document.removeEventListener('keydown', handleUserInteraction);
                  document.removeEventListener('touchstart', handleUserInteraction);
                } catch (retryError) {
                  console.error('AudioService: Still failed to play after user interaction:', retryError);
                }
              };

              // Add event listeners for user interaction
              document.addEventListener('click', handleUserInteraction, { once: true });
              document.addEventListener('keydown', handleUserInteraction, { once: true });
              document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
            }
            this.updateButtonStatus();
          }
        }
      }

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.removeAudioEventListeners(audio);
          this.cleanup(audio, mediaSource);
          this.updateButtonStatus();
          reject(new Error('Audio playback timeout'));
        }, 30000); // 30 second timeout

        audio.onended = () => {
          console.log('AudioPlayer: Audio ended, resolving promise');
          clearTimeout(timeoutId);
          // Update status BEFORE cleanup to capture the ended state
          this.updateButtonStatus();
          this.removeAudioEventListeners(audio);
          this.cleanup(audio, mediaSource);
          // Update status again after cleanup
          this.updateButtonStatus();
          resolve();
        };

        audio.onerror = () => {
          console.log('AudioPlayer: Audio error, rejecting promise');
          clearTimeout(timeoutId);
          this.removeAudioEventListeners(audio);
          this.cleanup(audio, mediaSource);
          this.updateButtonStatus();
          reject(new Error('Audio playback error'));
        };
      });

    } catch (error) {
      // Clean up reader if it was created
      if (reader) {
        try {
          await reader.cancel();
        } catch (e) {
          console.warn('Failed to cancel reader:', e.message);
        }
      }
      this.removeAudioEventListeners(audio);
      this.cleanup(audio, mediaSource);
      this.updateButtonStatus();
      throw error;
    }
  }


  cleanup(audio, mediaSource = null) {
    // Clean up audio element
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load(); // Reset the audio element state

        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      } catch (e) {
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
              } catch (removeError) {
                // Ignore InvalidStateError during cleanup
                if (removeError.name !== 'InvalidStateError') {
                  console.warn('Failed to remove source buffer:', removeError.message);
                }
              }
            }
          }

          // End the stream only if MediaSource is still valid
          try {
            if (typeof mediaSource.endOfStream === 'function' && mediaSource.readyState === 'open') {
              mediaSource.endOfStream();
            }
          } catch (endError) {
            // Ignore InvalidStateError during cleanup - MediaSource was likely closed externally
            if (endError.name !== 'InvalidStateError') {
              console.warn('Failed to end MediaSource stream:', endError.message);
            }
          }
        }
      } catch (e) {
        // MediaSource might already be closed or in invalid state - ignore InvalidStateError
        if (e.name !== 'InvalidStateError') {
          console.warn('Error cleaning up MediaSource:', e.message);
        }
      }

      if (this.currentMediaSource === mediaSource) {
        this.currentMediaSource = null;
      }
    }
  }
}
