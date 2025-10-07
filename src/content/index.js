import browser from "webextension-polyfill";
import { AudioService } from "../services/audioService";
import { createTTSStream } from "../utils/audioPlayer";
import { createMiniWindow } from "./miniWindow";

console.log("[Simple TTS] Content script loaded/reloaded");

// Mini window UI is defined in src/content/miniWindow.ts

/**
 * Initialize mini window and clean up any stale state
 *
 * IMPORTANT: This function is called on extension load/reload and when starting TTS.
 * It ensures that:
 * 1. Old mini windows from previous extension loads are removed (prevents duplicates)
 * 2. Orphaned audio elements are cleaned up (prevents memory leaks and "ended" event issues)
 * 3. State is reset to prevent conflicts
 *
 * WARNING: Always clean up orphaned audio elements BEFORE creating new ones, otherwise
 * the "ended" event may not fire correctly after extension reload.
 */
function initAudioPlayer() {
  try {
    // Clean up any existing mini-window from previous extension loads
    // This happens when the extension is reloaded in Firefox/Chrome
    const existingMiniWindow = document.getElementById("tts-mini-window");
    if (existingMiniWindow) {
      console.log('[Simple TTS] Cleaning up old mini-window from previous load');
      if (window.ttsMiniWindow && typeof window.ttsMiniWindow.destroy === "function") {
        window.ttsMiniWindow.destroy();
      }
      existingMiniWindow.remove();
    }
    window.ttsMiniWindow = null;
    currentAudioElement = null;
    if (currentPlaybackAbortController) {
      try {
        currentPlaybackAbortController.abort();
      } catch (abortError) {
        console.warn("[Simple TTS] Abort controller cleanup failed:", abortError);
      }
      currentPlaybackAbortController = null;
    }
    setPlaybackState("idle", { suppressUI: true });

    // CRITICAL: Clean up orphaned audio elements from previous extension loads
    // Without this, audio elements can continue playing without event listeners,
    // causing the mini window to not recognize when audio has ended
    const orphanedAudios = document.querySelectorAll('audio.simple-tts-audio');
    if (orphanedAudios.length > 0) {
      console.log('[Simple TTS] Cleaning up', orphanedAudios.length, 'orphaned audio elements');
      orphanedAudios.forEach(audio => {
        audio.pause();
        audio.src = '';
        audio.remove();
      });
    }

    // Prevent multiple initializations in the same context
    if (window.ttsMiniWindow) {
      return;
    }

    console.log('[Simple TTS] Initializing mini-window');
    const miniWindow = createMiniWindow();

    // Store miniWindow reference globally
    window.ttsMiniWindow = miniWindow;

    document.body.appendChild(miniWindow.container);

    // Replay/Play/Pause button handler
    miniWindow.replayButton.addEventListener('click', handleReplayButtonClick);

    // Close button handler - removes the mini-window
    miniWindow.closeButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      await stopStreamingAudio({ clearCache: true });

      // Remove from DOM
      miniWindow.destroy();
      miniWindow.container.remove();
      window.ttsMiniWindow = null;
    });

    console.log('[Simple TTS] Mini-window initialized successfully');
    setPlaybackState("idle");
    return true;
  } catch (error) {
    console.error('[Simple TTS] Failed to initialize mini-window:', error);
    throw error;
  }
}

// Initialize player when page loads
initAudioPlayer();

/**
 * Global state management for TTS playback
 *
 * IMPORTANT: These variables maintain state across the entire content script lifecycle
 *
 * - streamingAudioPlayer: Singleton AudioService instance
 *   WARNING: DO NOT create multiple instances - this will cause conflicts
 *
 * - currentAudioElement: Reference to the current HTML audio element
 *   PURPOSE: Prevents duplicate event listener attachment
 *   PATTERN: Check if new audio !== currentAudioElement before attaching listeners
 *
 * - lastPlaybackRequest: Cached TTS request (text, settings, credentials)
 *   PURPOSE: Enables replay functionality without making new API calls
 *   LIFECYCLE: Set on PLAY_STREAMING_TTS, cleared on STOP_AUDIO or close button
 */
let streamingAudioPlayer = null;
let currentAudioElement = null;
let lastPlaybackRequest = null;
let currentPlaybackAbortController = null;
let playbackState = "idle";
let currentPlaybackSource = null; // "stream" | "cache" | null
let cachedReplayActive = false;
let hasHandledPageExit = false;

/**
 * Lightweight guard to detect expected abort/cancel scenarios.
 * @param {unknown} error
 * @returns {boolean}
 */
function isAbortError(error) {
  if (!error) return false;

  const name = typeof error === "object" ? error.name : undefined;
  if (name === "AbortError") return true;

  const message = typeof error?.message === "string" ? error.message : "";
  return message.toLowerCase().includes("abort");
}

function setPlaybackState(state, { suppressUI = false } = {}) {
  if (playbackState === state) return;
  playbackState = state;

  if (state === "idle") {
    currentPlaybackSource = null;
    cachedReplayActive = false;
  } else if (state === "ended") {
    cachedReplayActive = false;
    currentPlaybackSource = null;
  } else if (state === "error") {
    cachedReplayActive = false;
  }

  if (!suppressUI) {
    updateMiniWindowUI();
  }
}

async function stopStreamingAudio({ clearCache = false } = {}) {
  if (currentPlaybackAbortController) {
    try {
      currentPlaybackAbortController.abort();
    } catch (abortError) {
      console.warn("[Simple TTS] Abort controller error:", abortError);
    }
    currentPlaybackAbortController = null;
  }

  if (streamingAudioPlayer) {
    try {
      await streamingAudioPlayer.stopAudio();
      if (clearCache) {
        streamingAudioPlayer.clearCache();
      }
    } catch (error) {
      if (!isAbortError(error)) {
        console.warn("[Simple TTS] Failed to stop audio cleanly:", error);
      }
    }
  }

  currentAudioElement = null;

  if (clearCache) {
    lastPlaybackRequest = null;
  }

  setPlaybackState("idle");
}

/**
 * Update mini window UI based on AudioService state
 *
 * This function syncs the UI (play/pause/replay icons) with the actual audio playback state.
 * Called after any state change: play, pause, resume, end, etc.
 */
function updateMiniWindowUI() {
  if (!window.ttsMiniWindow) return;

  const player = streamingAudioPlayer;
  const rawHasAudio = Boolean(player && player.hasAudio && player.hasAudio());
  const rawHasCachedAudio = Boolean(player && player.hasCachedAudio && player.hasCachedAudio());
  const hasAudio = rawHasAudio || cachedReplayActive;
  const hasCachedAudio = rawHasCachedAudio || cachedReplayActive;
  const hasRequest = cachedReplayActive || Boolean(lastPlaybackRequest);

  window.ttsMiniWindow.updateStatus({
    state: playbackState,
    hasAudio,
    hasCachedAudio,
    hasRequest
  });
}

function syncStateFromPlayer(player) {
  if (!player) return;
  try {
    if (player.isPlaying()) {
      setPlaybackState("playing");
      return;
    }
    if (player.isPaused()) {
      setPlaybackState("paused");
      return;
    }
    if (player.hasEnded && player.hasEnded()) {
      setPlaybackState("ended");
      return;
    }
  } catch (error) {
    console.warn("[Simple TTS] Failed to sync state from player:", error);
  }
}

/**
 * Attach event listeners to audio element
 *
 * CRITICAL: This function prevents duplicate event listener attachment
 * by tracking the currentAudioElement reference.
 *
 * WHY THIS MATTERS:
 * - Each AudioService.playStreamingResponse() creates a NEW audio element
 * - Without tracking, we'd attach multiple listeners to the same element
 * - Multiple listeners cause updateMiniWindowUI() to be called multiple times
 *
 * PATTERN:
 * 1. Check if audio element exists
 * 2. Check if it's the same as currentAudioElement (already has listeners)
 * 3. If new audio, update currentAudioElement and attach listeners
 *
 * @param {AudioService} player - The audio service instance
 * @returns {boolean} - true if listeners attached or already attached, false if no audio
 */
function attachAudioEventListeners(player) {
  const audio = player.getCurrentAudio();
  if (!audio) {
    console.log('[Simple TTS] attachAudioEventListeners - no audio element');
    return false;
  }

  // IMPORTANT: Check if listeners are already attached to this audio element
  if (audio === currentAudioElement) {
    console.log('[Simple TTS] attachAudioEventListeners - already attached');
    return true;
  }

  // Track current audio to prevent duplicate listeners on next call
  currentAudioElement = audio;

  // Handler for all audio state changes (play, pause, ended)
  const handleStateChange = (event) => {
    console.log('[Simple TTS] Audio event:', event.type);
    switch (event.type) {
      case 'play':
      case 'playing': {
        setPlaybackState("playing");
        break;
      }
      case 'pause': {
        if (audio.ended) {
          setPlaybackState("ended");
        } else {
          setPlaybackState("paused");
        }
        break;
      }
      case 'ended': {
        setPlaybackState("ended");
        break;
      }
      default:
        updateMiniWindowUI();
    }
  };

  // Attach listeners for all state changes we care about
  audio.addEventListener('play', handleStateChange);
  audio.addEventListener('playing', handleStateChange);
  audio.addEventListener('pause', handleStateChange);
  audio.addEventListener('ended', handleStateChange);

  audio.addEventListener('waiting', () => {
    setPlaybackState("loading");
  });

  audio.addEventListener('canplay', () => {
    if (audio.ended) {
      setPlaybackState("ended");
      return;
    }
    if (audio.paused && playbackState === "loading") {
      setPlaybackState("paused");
    }
  });

  audio.addEventListener('error', (event) => {
    // Ignore errors fired after we've already cleaned up
    if (!["loading", "playing", "paused"].includes(playbackState)) {
      return;
    }
    console.error('[Simple TTS] Audio element error:', event);
    setPlaybackState("error");
  });

  // Use timeupdate as fallback for Firefox where ended event may not fire reliably
  // timeupdate fires periodically during playback (~250ms), allowing us to detect when audio ends
  audio.addEventListener('timeupdate', () => {
    if (!audio.paused && !audio.ended && playbackState === "loading") {
      setPlaybackState("playing");
    }
    // Check if audio has reached the end (within 0.1 seconds of duration)
    if (audio.duration > 0 && audio.currentTime >= audio.duration - 0.1) {
      console.log('[Simple TTS] timeupdate detected audio end');
      if (playbackState !== "ended") {
        setPlaybackState("ended");
      }
    }
  });

  console.log('[Simple TTS] Event listeners attached to new audio element');

  // Initial UI update
  if (audio.ended) {
    setPlaybackState("ended");
  } else if (audio.paused) {
    // If autoplay was blocked, stay consistent with UI
    setPlaybackState(playbackState === "loading" ? "paused" : "paused");
  } else {
    setPlaybackState("playing");
  }

  return true;
}

/**
 * Attach listeners with retry logic
 *
 * WHY RETRY IS NEEDED:
 * The audio element is created asynchronously by MediaSource API.
 * We may try to attach listeners before the audio element is ready.
 *
 * @param {AudioService} player - The audio service instance
 * @param {number} maxRetries - Maximum retry attempts (default: 5)
 * @returns {Promise<boolean>} - true if successful, false if all retries failed
 */
async function attachAudioEventListenersWithRetry(player, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    if (attachAudioEventListeners(player)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  console.warn('Failed to attach audio event listeners after retries');
  updateMiniWindowUI();
  return false;
}

function getStreamingAudioPlayer() {
  if (!streamingAudioPlayer) {
    streamingAudioPlayer = new AudioService();
  }
  return streamingAudioPlayer;
}

// Play audio from request
async function playAudioFromRequest(request) {
  const player = getStreamingAudioPlayer();

  if (currentPlaybackAbortController) {
    try {
      currentPlaybackAbortController.abort();
    } catch (abortError) {
      console.warn("[Simple TTS] Previous playback abort failed:", abortError);
    }
  }

  const abortController = new AbortController();
  currentPlaybackAbortController = abortController;

  currentPlaybackSource = "stream";
  cachedReplayActive = false;
  setPlaybackState("loading");

  let streamingResponse;
  try {
    streamingResponse = await createTTSStream(
      request.text,
      request.settings,
      request.credentials,
      abortController.signal
    );
  } catch (error) {
    if (isAbortError(error)) {
      setPlaybackState("idle");
      return;
    }
    setPlaybackState("error");
    throw error;
  }

  try {
    const playbackPromise = player.playStreamingResponse(
      streamingResponse,
      request.settings.rate || 1
    );

    // Attach listeners with retry
    await attachAudioEventListenersWithRetry(player);
    syncStateFromPlayer(player);

    await playbackPromise;
    if (["playing", "paused", "loading"].includes(playbackState)) {
      setPlaybackState("ended");
    }
  } catch (error) {
    if (isAbortError(error)) {
      setPlaybackState("idle");
      return;
    }
    if (error?.name === 'NotAllowedError') {
      setPlaybackState("paused");
      return;
    }
    setPlaybackState("error");
    throw error;
  } finally {
    if (currentPlaybackAbortController === abortController) {
      currentPlaybackAbortController = null;
    }
  }
}

// Replay button handler
async function handleReplayButtonClick(e) {
  e.stopPropagation();
  e.preventDefault();

  if (playbackState === "loading") {
    return;
  }

  const player = getStreamingAudioPlayer();

  // Handle play/pause/resume using AudioService methods
  if (player.isPlaying()) {
    // Currently playing -> pause
    player.pauseAudio();
    setPlaybackState("paused");
    return;
  }

  if (player.isPaused()) {
    // Paused -> resume
    try {
      await player.resumeAudio();
      setPlaybackState("playing");
    } catch (error) {
      console.error('Resume failed:', error);
      setPlaybackState("error");
    }
    return;
  }

  // Replay from cache or last request (ended or no audio)
  if (player.hasCachedAudio()) {
    // Use cached audio for replay (no new request)
    try {
      currentPlaybackSource = "cache";
      cachedReplayActive = true;
      setPlaybackState("loading");

      const replayPromise = player.replayFromCache();

      // Attach listeners with retry
      await attachAudioEventListenersWithRetry(player);
      syncStateFromPlayer(player);

      const audio = player.getCurrentAudio();
      if (audio) {
        if (!audio.paused && !audio.ended) {
          setPlaybackState("playing");
        } else if (audio.paused && audio.currentTime > 0) {
          setPlaybackState("paused");
        } else {
          setPlaybackState("paused");
        }
      } else {
        setPlaybackState("playing");
      }

      await replayPromise;

      cachedReplayActive = false;
      currentPlaybackSource = null;

      const replayAudio = player.getCurrentAudio();
      if (replayAudio && replayAudio.ended) {
        setPlaybackState("ended");
        return;
      }
      if (player.hasEnded && player.hasEnded()) {
        setPlaybackState("ended");
        return;
      }
      if (player.isPaused && player.isPaused()) {
        setPlaybackState("paused");
        return;
      }
      if (player.isPlaying && player.isPlaying()) {
        setPlaybackState("playing");
        return;
      }

      setPlaybackState("ended");
    } catch (error) {
      console.error('Replay from cache failed:', error);
      cachedReplayActive = false;
      currentPlaybackSource = null;
      if (isAbortError(error)) {
        setPlaybackState("idle");
      } else {
        setPlaybackState("error");
      }
    }
  } else if (lastPlaybackRequest) {
    // Fallback to making a new request if no cache available
    try {
      await playAudioFromRequest(lastPlaybackRequest);
    } catch (error) {
      console.error('Replay failed:', error);
      if (isAbortError(error)) {
        setPlaybackState("idle");
      } else {
        setPlaybackState("error");
      }
    }
  }
}

// Listen for messages from background script
browser.runtime.onMessage.addListener(async (request, _sender, _sendResponse) => {
  try {
    switch (request.type) {
      case "PING": {
        return { pong: true };
      }

      case "PLAY_STREAMING_TTS": {
        try {
          /**
           * IMPORTANT: Initialization order matters!
           *
           * Step 1: Ensure mini window exists BEFORE starting playback
           * - initAudioPlayer() cleans up old windows and orphaned audio
           * - Must happen first to prevent conflicts
           */
          if (!window.ttsMiniWindow || !document.getElementById("tts-mini-window")) {
            initAudioPlayer();
          }

          // Show mini-window in the DOM
          const miniWindow = document.getElementById("tts-mini-window");
          if (miniWindow) {
            miniWindow.style.display = "flex";
          }

          /**
           * Step 2: Wait for DOM to be ready
           * The 50ms delay ensures the mini window is fully rendered before
           * we start attaching event listeners and updating UI
           */
          await new Promise(resolve => setTimeout(resolve, 50));
          updateMiniWindowUI();

          /**
           * Step 3: Cache request for replay functionality
           * This allows the replay button to work without making a new API call
           * NOTE: Cleared on STOP_AUDIO or close button click
           */
          lastPlaybackRequest = {
            text: request.text,
            settings: request.settings,
            credentials: request.credentials
          };

          /**
           * Step 4: Start audio playback
           * playAudioFromRequest() will:
           * - Create TTS stream
           * - Start playback
           * - Attach event listeners with retry
           */
          try {
            await playAudioFromRequest(lastPlaybackRequest);
            return { success: true };
          } catch (playError) {
            // NotAllowedError = browser blocked autoplay (requires user interaction)
            if (playError.name === 'NotAllowedError') {
              updateMiniWindowUI();
              return { success: true, requiresUserInteraction: true };
            }
            throw playError;
          }
        } catch (error) {
          updateMiniWindowUI();
          return { success: false, error: error.message };
        }
      }

      case "STOP_AUDIO": {
        // CRITICAL: Complete cleanup sequence to prevent memory leaks and stale state
        await stopStreamingAudio({ clearCache: true });

        // Remove mini window from DOM (prevents duplicate windows on next play)
        if (window.ttsMiniWindow) {
          if (typeof window.ttsMiniWindow.destroy === "function") {
            window.ttsMiniWindow.destroy();
          }
          window.ttsMiniWindow.container.remove();
          window.ttsMiniWindow = null;
        }
        break;
      }

    }
    return true;
  } catch (error) {
    throw error;
  }
});

function handlePageExit() {
  if (hasHandledPageExit) {
    return;
  }
  hasHandledPageExit = true;
  void stopStreamingAudio({ clearCache: true });
}

window.addEventListener("pagehide", handlePageExit);
window.addEventListener("beforeunload", handlePageExit);
