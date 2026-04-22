/**
 * AudioService - Streaming audio playback with MediaSource API
 *
 * Features:
 * - True streaming: audio plays while downloading
 * - Pause/resume during playback
 * - Cached replay without re-fetching
 */
import { PlaybackState } from '../types';

export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private state: PlaybackState = 'idle';
  private onStateChange: (state: PlaybackState) => void;

  constructor(onStateChange: (state: PlaybackState) => void = () => {}) {
    this.onStateChange = onStateChange;
  }

  private setState(newState: PlaybackState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  getState(): PlaybackState {
    return this.state;
  }

  async stopAudio(): Promise<void> {
    this.abortController?.abort();
    this.abortController = null;
    this.cleanup();
  }

  pauseAudio(): void {
    if (this.audio && !this.audio.paused && !this.audio.ended) {
      this.audio.pause();
    }
  }

  async resumeAudio(): Promise<void> {
    if (this.audio?.paused && !this.audio.ended) {
      await this.audio.play();
    }
  }

  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused && !this.audio.ended;
  }

  isPaused(): boolean {
    return this.audio !== null && this.audio.paused && !this.audio.ended;
  }

  hasEnded(): boolean {
    return this.audio?.ended ?? false;
  }

  hasAudio(): boolean {
    return this.audio !== null && this.audio.src !== '';
  }

  getCurrentAudio(): HTMLAudioElement | null {
    return this.audio;
  }

  hasCachedAudio(): boolean {
    return this.cachedChunks.length > 0;
  }

  clearCache(): void {
    this.cachedChunks = [];
    this.cachedRate = 1;
  }

  /**
   * Play streaming TTS response with MediaSource
   */
  async playStreamingResponse(
    response: Response,
    rate: number = 1,
    onProgress?: (progress: { stage: string; progress: number }) => void
  ): Promise<void> {
    await this.stopAudio();

    this.cachedChunks = [];
    this.cachedRate = rate;
    this.abortController = new AbortController();

    if (!window.MediaSource) {
      return this.playWithBlob(response, rate, onProgress);
    }

    return this.playWithMediaSource(response, rate, this.abortController.signal, onProgress);
  }

  /**
   * Replay from cached chunks
   */
  async replayFromCache(): Promise<void> {
    if (!this.hasCachedAudio()) {
      throw new Error('No cached audio available');
    }

    await this.stopAudio();
    this.abortController = new AbortController();

    const blob = new Blob(this.cachedChunks, { type: 'audio/webm; codecs="opus"' });
    return this.playBlob(blob, this.cachedRate, this.abortController.signal);
  }

  /**
   * Streaming playback with MediaSource API
   */
  private async playWithMediaSource(
    response: Response,
    rate: number,
    signal: AbortSignal,
    onProgress?: (progress: { stage: string; progress: number }) => void
  ): Promise<void> {
    const mediaSource = new MediaSource();
    const audio = this.createAudio(URL.createObjectURL(mediaSource), rate);

    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        this.cleanup();
        return resolve();
      }

      const onAbort = () => {
        this.cleanup();
        resolve();
      };
      signal.addEventListener('abort', onAbort, { once: true });

      mediaSource.addEventListener('sourceopen', async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
          await this.streamToBuffer(response, sourceBuffer, mediaSource, audio, signal, onProgress);

          // Wait for playback to complete
          await this.waitForEnd(audio, signal);
          signal.removeEventListener('abort', onAbort);
          resolve();
        } catch (err: any) {
          signal.removeEventListener('abort', onAbort);
          if (signal.aborted || err?.name === 'AbortError') {
            resolve();
          } else {
            reject(err);
          }
        }
      }, { once: true });

      audio.onerror = () => {
        signal.removeEventListener('abort', onAbort);
        reject(new Error('Audio playback failed'));
      };
    });
  }

  /**
   * Stream response data to SourceBuffer and start playback
   */
  private async streamToBuffer(
    response: Response,
    sourceBuffer: SourceBuffer,
    mediaSource: MediaSource,
    audio: HTMLAudioElement,
    signal: AbortSignal,
    onProgress?: (progress: { stage: string; progress: number }) => void
  ): Promise<void> {
    const reader = response.body!.getReader();
    const totalSize = parseInt(response.headers.get('content-length') || '0');
    let receivedSize = 0;
    let playStarted = false;

    try {
      while (true) {
        if (signal.aborted || mediaSource.readyState !== 'open') break;

        const { done, value } = await reader.read();
        if (done) break;

        // Cache for replay
        this.cachedChunks.push(new Uint8Array(value));
        receivedSize += value.byteLength;

        if (onProgress && totalSize > 0) {
          onProgress({ stage: 'streaming', progress: Math.round((receivedSize / totalSize) * 100) });
        }

        // Wait for buffer ready
        await this.waitForBufferReady(sourceBuffer, mediaSource, signal);
        if (signal.aborted || mediaSource.readyState !== 'open') break;

        sourceBuffer.appendBuffer(value);

        // Start playback once we have some data
        if (!playStarted && audio.readyState >= 2) {
          playStarted = true;
          await audio.play().catch(() => {});
        }
      }

      // End the stream
      await this.waitForBufferReady(sourceBuffer, mediaSource, signal);
      if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream();
      }

      // Ensure playback started
      if (!playStarted && audio.readyState >= 2) {
        await audio.play().catch(() => {});
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Wait for SourceBuffer to be ready for appending
   */
  private async waitForBufferReady(
    sourceBuffer: SourceBuffer,
    mediaSource: MediaSource,
    signal: AbortSignal
  ): Promise<void> {
    while (sourceBuffer.updating && mediaSource.readyState === 'open' && !signal.aborted) {
      await new Promise(r => setTimeout(r, 10));
    }
  }

  /**
   * Wait for audio to finish playing
   */
  private waitForEnd(audio: HTMLAudioElement, signal: AbortSignal): Promise<void> {
    return new Promise(resolve => {
      if (audio.ended || signal.aborted) {
        return resolve();
      }

      const checkEnd = () => {
        if (audio.ended || signal.aborted) {
          audio.removeEventListener('ended', checkEnd);
          audio.removeEventListener('timeupdate', checkEnd);
          resolve();
        } else if (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.1) {
          audio.removeEventListener('ended', checkEnd);
          audio.removeEventListener('timeupdate', checkEnd);
          resolve();
        }
      };

      audio.addEventListener('ended', checkEnd);
      audio.addEventListener('timeupdate', checkEnd);
    });
  }

  /**
   * Fallback: collect all data then play as Blob
   */
  private async playWithBlob(
    response: Response,
    rate: number,
    onProgress?: (progress: { stage: string; progress: number }) => void
  ): Promise<void> {
    const reader = response.body!.getReader();
    const totalSize = parseInt(response.headers.get('content-length') || '0');
    let receivedSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        this.cachedChunks.push(new Uint8Array(value));
        receivedSize += value.byteLength;

        if (onProgress && totalSize > 0) {
          onProgress({ stage: 'streaming', progress: Math.round((receivedSize / totalSize) * 100) });
        }
      }
    } finally {
      reader.releaseLock();
    }

    const blob = new Blob(this.cachedChunks, { type: 'audio/webm; codecs="opus"' });
    return this.playBlob(blob, rate, this.abortController!.signal);
  }

  /**
   * Play a Blob URL
   */
  private playBlob(blob: Blob, rate: number, signal: AbortSignal): Promise<void> {
    const url = URL.createObjectURL(blob);
    const audio = this.createAudio(url, rate);

    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        URL.revokeObjectURL(url);
        return resolve();
      }

      const cleanup = () => URL.revokeObjectURL(url);

      const onAbort = () => {
        cleanup();
        audio.pause();
        resolve();
      };
      signal.addEventListener('abort', onAbort, { once: true });

      audio.onended = () => {
        cleanup();
        signal.removeEventListener('abort', onAbort);
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        signal.removeEventListener('abort', onAbort);
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(err => {
        cleanup();
        signal.removeEventListener('abort', onAbort);
        if (err.name === 'NotAllowedError') {
          reject(new Error('Autoplay blocked. Click on the page and try again.'));
        } else {
          reject(err);
        }
      });
    });
  }

  private createAudio(src: string, rate: number): HTMLAudioElement {
    const audio = new Audio();
    audio.className = 'narravo-audio';
    audio.src = src;
    audio.playbackRate = rate;
    this.audio = audio;
    return audio;
  }

  private cleanup(): void {
    if (this.audio) {
      const url = this.audio.src;
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
      if (url) URL.revokeObjectURL(url);
      this.audio = null;
    }
  }
}
