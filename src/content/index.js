import browser from "webextension-polyfill";
import { AudioService } from "../services/audioService";
import { createTTSStream } from "../utils/audioPlayer";

console.log("[Simple TTS] Content script loaded/reloaded");

// Create floating mini window
function createMiniWindow() {
  // Try to get saved position from storage
  let savedPosition = {};
  try {
    const saved = localStorage.getItem("tts-window-position");
    if (saved) {
      savedPosition = JSON.parse(saved);
    }
  } catch (e) {
    // Use default position
  }

  // Add CSS variables for theme support
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --tts-bg-primary: #ffffff;
      --tts-bg-secondary: #f8fafc;
      --tts-bg-hover: #e2e8f0;
      --tts-text-primary: #1e293b;
      --tts-text-secondary: #64748b;
      --tts-text-accent: #3b82f6;
      --tts-border: rgba(0,0,0,0.08);
      --tts-shadow: rgba(0,0,0,0.12);
      --tts-shadow-active: rgba(0,0,0,0.2);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --tts-bg-primary: #0f172a;
        --tts-bg-secondary: #1e293b;
        --tts-bg-hover: #334155;
        --tts-text-primary: #f1f5f9;
        --tts-text-secondary: #94a3b8;
        --tts-text-accent: #60a5fa;
        --tts-border: rgba(255,255,255,0.08);
        --tts-shadow: rgba(0,0,0,0.4);
        --tts-shadow-active: rgba(0,0,0,0.6);
      }
    }

    /* Reset any potential conflicts */
    #tts-mini-window * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      #tts-mini-window {
        padding: 2px 4px;
        min-width: 45px;
        max-width: 75px;
        gap: 2px;
        border-radius: 10px;
      }
    }

    @media (max-width: 480px) {
      #tts-mini-window {
        padding: 1px 3px;
        min-width: 40px;
        max-width: 70px;
        gap: 1px;
        border-radius: 8px;
        min-height: 22px;
      }
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement("div");
  container.id = "tts-mini-window";
  container.style.cssText = `
    position: fixed;
    bottom: ${savedPosition.bottom || "20px"};
    right: ${savedPosition.right || "20px"};
    background: var(--tts-bg-primary);
    padding: 3px 5px;
    border-radius: 15px;
    box-shadow: 0 2px 12px var(--tts-shadow);
    display: none;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
    z-index: 2147483647;
    cursor: move;
    user-select: none;
    -webkit-user-select: none;
    transform: ${savedPosition.transform || "none"};
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    min-height: 30px;
    min-width: 62px;
    max-width: 100px;
    transition: all 0.2s ease;
    will-change: transform;
    contain: layout style paint;
    isolation: isolate;
  `;

  // Add draggable functionality
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = savedPosition.xOffset || 0;
  let yOffset = savedPosition.yOffset || 0;

  function dragStart(e) {
    // Only start dragging if clicking on the container or logo (not buttons)
    if (e.target === container || e.target === logoContainer || e.target.closest('svg')) {
      e.preventDefault();
      e.stopPropagation();

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;

      container.style.cursor = "grabbing";
      container.style.zIndex = "2147483647";
      container.style.transition = "none"; // Disable transitions during drag
      container.style.pointerEvents = "none"; // Prevent interference during drag

      // Ensure smooth dragging
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();

      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;

      // Use requestAnimationFrame for smooth movement
      requestAnimationFrame(() => {
        const transform = `translate(${currentX}px, ${currentY}px)`;
        container.style.transform = transform;
      });

      // Save position
      if (!window.ttsPositionSaveTimeout) {
        window.ttsPositionSaveTimeout = setTimeout(() => {
          try {
            localStorage.setItem("tts-window-position", JSON.stringify({
              transform: `translate(${currentX}px, ${currentY}px)`,
              xOffset: currentX,
              yOffset: currentY,
            }));
          } catch (e) {}
          window.ttsPositionSaveTimeout = null;
        }, 100);
      }
    }
  }

  function dragEnd() {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = "move";
      container.style.transition = "all 0.2s ease"; // Re-enable transitions
      container.style.pointerEvents = "auto"; // Re-enable pointer events

      // Restore body selection
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";

      // Save final position
      if (window.ttsPositionSaveTimeout) {
        clearTimeout(window.ttsPositionSaveTimeout);
        window.ttsPositionSaveTimeout = null;
      }
      try {
        localStorage.setItem("tts-window-position", JSON.stringify({
          transform: `translate(${xOffset}px, ${yOffset}px)`,
          xOffset: xOffset,
          yOffset: yOffset,
        }));
      } catch (e) {}
    }
  }

  // Base style for all icons (uniform size and styling)
  const iconBaseStyle = `
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-select: none;
    position: relative;
  `;

  // Create the extension logo to identify what this widget is
  const logoContainer = document.createElement("div");
  logoContainer.style.cssText = iconBaseStyle;

  // Extension logo SVG - exact match with extension icon but without background
  logoContainer.innerHTML = `
    <svg width="23" height="23" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <text x="24" y="32" font-family="Arial" font-size="32" fill="var(--tts-text-accent)" text-anchor="middle">T</text>
      <path d="M14,16 L34,16" stroke="var(--tts-text-accent)" stroke-width="2"/>
      <path d="M18,36 L30,36" stroke="var(--tts-text-accent)" stroke-width="2"/>
    </svg>
  `;
  logoContainer.title = "Simple TTS";

  // Create replay/play button with consistent styling
  const replayButton = document.createElement("button");
  replayButton.style.cssText = `
    ${iconBaseStyle}
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.15s ease;
    padding: 1px;
    color: var(--tts-text-primary);
    outline: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  `;
  replayButton.innerHTML = `
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5v14l11-7z" fill="currentColor"/>
    </svg>
  `;
  replayButton.title = "Play/Replay";

  // Create close button with consistent styling
  const closeButton = document.createElement("button");
  closeButton.style.cssText = replayButton.style.cssText;
  closeButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  closeButton.title = "Close";

  // Add hover effects for buttons
  [replayButton, closeButton].forEach(button => {
    button.addEventListener("mouseenter", () => {
      if (!isDragging) {
        button.style.background = "var(--tts-bg-hover)";
        button.style.transform = "scale(1.1)";
      }
    });

    button.addEventListener("mouseleave", () => {
      if (!isDragging) {
        button.style.background = "transparent";
        button.style.transform = "scale(1)";
      }
    });

    button.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Prevent dragging when clicking buttons
      // Don't prevent default as it can interfere with click events
      if (!isDragging) {
        button.style.transform = "scale(0.95)";
      }
    });

    button.addEventListener("mouseup", (e) => {
      e.stopPropagation();
      if (!isDragging) {
        button.style.transform = "scale(1.1)";
      }
    });

    // Touch support
    button.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      if (!isDragging) {
        button.style.background = "var(--tts-bg-hover)";
        button.style.transform = "scale(1.05)";
      }
    }, { passive: false });

    button.addEventListener("touchend", (e) => {
      e.stopPropagation();
      if (!isDragging) {
        setTimeout(() => {
          button.style.background = "transparent";
          button.style.transform = "scale(1)";
        }, 100);
      }
    }, { passive: false });
  });

  // Assemble the widget
  container.appendChild(logoContainer);
  container.appendChild(replayButton);
  container.appendChild(closeButton);

  // Add drag event listeners after all elements are created
  container.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

  // Touch drag support for mobile
  container.addEventListener("touchstart", (e) => {
    if (e.target === container || e.target === logoContainer || e.target.closest('svg')) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      dragStart(mouseEvent);
    }
  }, { passive: false });

  document.addEventListener("touchmove", (e) => {
    if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      drag(mouseEvent);
    }
  }, { passive: false });

  document.addEventListener("touchend", (_e) => {
    if (isDragging) {
      dragEnd();
    }
  }, { passive: false });

  return {
    container,
    logoContainer,
    replayButton,
    closeButton,
    updateStatus(isPlaying, hasEnded = false) {
      if (isPlaying) {
        replayButton.innerHTML = `
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
          </svg>
        `;
        replayButton.title = "Pause";
        container.style.background = "var(--tts-bg-secondary)";
        container.style.boxShadow = "0 6px 20px var(--tts-shadow-active)";
      } else if (hasEnded) {
        // Show replay icon when audio has ended
        replayButton.innerHTML = `
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18 8l.94.94L20 8l-1.06-.94L18 8zM4 16l-1.06.94L2 16l.94-.94L4 16z" fill="currentColor"/>
          </svg>
        `;
        replayButton.title = "Replay";
        container.style.background = "var(--tts-bg-primary)";
        container.style.boxShadow = "0 4px 16px var(--tts-shadow)";
      } else {
        replayButton.innerHTML = `
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
          </svg>
        `;
        replayButton.title = "Play";
        container.style.background = "var(--tts-bg-primary)";
        container.style.boxShadow = "0 4px 16px var(--tts-shadow)";
      }
    }
  };
}

// Initialize mini window with streaming audio player
function initAudioPlayer() {
  try {
    // Clean up any existing mini-window from previous extension loads (Firefox reload issue)
    const existingMiniWindow = document.getElementById("tts-mini-window");
    if (existingMiniWindow) {
      console.log('[Simple TTS] Cleaning up old mini-window from previous load');
      existingMiniWindow.remove();
    }
    window.ttsMiniWindow = null;
    currentAudioElement = null;

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

      const player = getStreamingAudioPlayer();
      await player.stopAudio();
      player.clearCache();
      currentAudioElement = null;
      lastPlaybackRequest = null;

      // Remove from DOM
      miniWindow.container.remove();
      window.ttsMiniWindow = null;
    });

    console.log('[Simple TTS] Mini-window initialized successfully');
    return true;
  } catch (error) {
    console.error('[Simple TTS] Failed to initialize mini-window:', error);
    throw error;
  }
}

// Initialize player when page loads
initAudioPlayer();


// Initialize streaming audio player for mini-window
let streamingAudioPlayer = null;
let lastPlaybackRequest = null;
let currentAudioElement = null;

// Update UI based on AudioService state
function updateMiniWindowUI() {
  if (!window.ttsMiniWindow) return;

  const player = getStreamingAudioPlayer();
  const isPlaying = player.isPlaying();
  const hasEnded = player.hasEnded();

  console.log('[Simple TTS] updateMiniWindowUI - isPlaying:', isPlaying, 'hasEnded:', hasEnded);
  window.ttsMiniWindow.updateStatus(isPlaying, hasEnded);
}

// Attach event listeners to audio element (called once per audio element)
function attachAudioEventListeners(player) {
  const audio = player.getCurrentAudio();
  if (!audio) {
    console.log('[Simple TTS] attachAudioEventListeners - no audio element');
    return false;
  }
  if (audio === currentAudioElement) {
    console.log('[Simple TTS] attachAudioEventListeners - already attached');
    return true; // Already attached
  }

  // Track current audio to prevent duplicate listeners
  currentAudioElement = audio;

  // Use named functions for listeners to enable proper cleanup
  const handleStateChange = (event) => {
    console.log('[Simple TTS] Audio event:', event.type);
    updateMiniWindowUI();
  };

  audio.addEventListener('play', handleStateChange);
  audio.addEventListener('pause', handleStateChange);
  audio.addEventListener('ended', handleStateChange);

  console.log('[Simple TTS] Event listeners attached to new audio element');

  // Initial update
  updateMiniWindowUI();
  return true;
}

// Attach listeners with retry (for when audio element is being created)
async function attachAudioEventListenersWithRetry(player, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    if (attachAudioEventListeners(player)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  console.warn('Failed to attach audio event listeners after retries');
  // Update UI anyway
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

  const streamingResponse = await createTTSStream(
    request.text,
    request.settings,
    request.credentials
  );

  const playbackPromise = player.playStreamingResponse(
    streamingResponse,
    request.settings.rate || 1
  );

  // Attach listeners with retry
  await attachAudioEventListenersWithRetry(player);

  await playbackPromise;
}

// Replay button handler
async function handleReplayButtonClick(e) {
  e.stopPropagation();
  e.preventDefault();

  const player = getStreamingAudioPlayer();

  // Handle play/pause/resume using AudioService methods
  if (player.isPlaying()) {
    // Currently playing -> pause
    player.pauseAudio();
    updateMiniWindowUI();
    return;
  }

  if (player.isPaused()) {
    // Paused -> resume
    try {
      await player.resumeAudio();
      updateMiniWindowUI();
    } catch (error) {
      console.error('Resume failed:', error);
      updateMiniWindowUI();
    }
    return;
  }

  // Replay from cache or last request (ended or no audio)
  if (player.hasCachedAudio()) {
    // Use cached audio for replay (no new request)
    try {
      const replayPromise = player.replayFromCache();

      // Attach listeners with retry
      await attachAudioEventListenersWithRetry(player);

      await replayPromise;
    } catch (error) {
      console.error('Replay from cache failed:', error);
      updateMiniWindowUI();
    }
  } else if (lastPlaybackRequest) {
    // Fallback to making a new request if no cache available
    try {
      await playAudioFromRequest(lastPlaybackRequest);
    } catch (error) {
      console.error('Replay failed:', error);
      updateMiniWindowUI();
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
          // Step 1: Ensure mini window exists and is shown FIRST
          if (!window.ttsMiniWindow || !document.getElementById("tts-mini-window")) {
            initAudioPlayer();
          }

          // Show mini-window when user first calls TTS
          const miniWindow = document.getElementById("tts-mini-window");
          if (miniWindow) {
            miniWindow.style.display = "flex";
          }

          // Step 2: Wait for mini-window to be ready in DOM and update initial UI
          await new Promise(resolve => setTimeout(resolve, 50));
          updateMiniWindowUI();

          // Step 3: Save request for replay functionality
          lastPlaybackRequest = {
            text: request.text,
            settings: request.settings,
            credentials: request.credentials
          };

          // Step 4: Now play audio with UI ready
          try {
            await playAudioFromRequest(lastPlaybackRequest);
            return { success: true };
          } catch (playError) {
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
        const player = getStreamingAudioPlayer();
        await player.stopAudio();
        player.clearCache();
        currentAudioElement = null;
        lastPlaybackRequest = null;
        updateMiniWindowUI();
        break;
      }

    }
    return true;
  } catch (error) {
    throw error;
  }
});
