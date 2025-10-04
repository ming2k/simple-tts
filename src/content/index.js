import browser from "webextension-polyfill";
import { AudioService } from "../services/audioService";
import { TTSService } from "../services/ttsService";

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
    padding: 2px 4px;
    border-radius: 12px;
    box-shadow: 0 2px 12px var(--tts-shadow);
    display: none;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
    border: 1px solid var(--tts-border);
    z-index: 2147483647;
    cursor: move;
    user-select: none;
    -webkit-user-select: none;
    transform: ${savedPosition.transform || "none"};
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    min-height: 24px;
    min-width: 50px;
    max-width: 80px;
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
    width: 20px;
    height: 20px;
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
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5v14l11-7z" fill="currentColor"/>
    </svg>
  `;
  replayButton.title = "Play/Replay";

  // Create close button with consistent styling
  const closeButton = document.createElement("button");
  closeButton.style.cssText = replayButton.style.cssText;
  closeButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    updateStatus(isPlaying) {
      if (isPlaying) {
        replayButton.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
          </svg>
        `;
        replayButton.title = "Pause";
        container.style.background = "var(--tts-bg-secondary)";
        container.style.boxShadow = "0 6px 20px var(--tts-shadow-active)";
        container.style.borderColor = "var(--tts-text-accent)";
        container.style.borderWidth = "1.5px";
      } else {
        replayButton.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
          </svg>
        `;
        replayButton.title = "Play/Replay";
        container.style.background = "var(--tts-bg-primary)";
        container.style.boxShadow = "0 4px 16px var(--tts-shadow)";
        container.style.borderColor = "var(--tts-border)";
        container.style.borderWidth = "1px";
      }
    },
    updatePlayButton(isPlaying) {
      this.updateStatus(isPlaying);
    },
  };
}

// Initialize mini window with streaming audio player
function initAudioPlayer() {
  try {
    // Prevent multiple initializations
    if (window.ttsMiniWindow && document.getElementById("tts-mini-window")) {
      return;
    }

    const miniWindow = createMiniWindow();

    // Store miniWindow reference globally
    window.ttsMiniWindow = miniWindow;

    document.body.appendChild(miniWindow.container);

    // Replay/Play/Pause button handler
    miniWindow.replayButton.addEventListener('click', handleReplayButtonClick);

    // Close button handler
    miniWindow.closeButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const player = getStreamingAudioPlayer();
      await player.stopAudio();
      miniWindow.container.style.display = "none";
      miniWindow.updateStatus(false);
      lastPlaybackRequest = null;
    });

    return true;
  } catch (error) {
    throw error;
  }
}

// Initialize player when page loads
initAudioPlayer();


// Initialize streaming audio player for mini-window
let streamingAudioPlayer = null;
let lastPlaybackRequest = null;

function getStreamingAudioPlayer() {
  if (!streamingAudioPlayer) {
    streamingAudioPlayer = new AudioService();

    // Connect to mini-window controls
    const originalStopAudio = streamingAudioPlayer.stopAudio.bind(streamingAudioPlayer);
    streamingAudioPlayer.stopAudio = async function() {
      // Update mini-window state
      if (window.ttsMiniWindow) {
        window.ttsMiniWindow.updateStatus(false);
      }
      return await originalStopAudio();
    };
  }
  return streamingAudioPlayer;
}

// Replay button handler
async function handleReplayButtonClick(e) {
  e.stopPropagation();
  e.preventDefault();

  const player = getStreamingAudioPlayer();

  // If currently playing, pause
  if (player.currentAudio && !player.currentAudio.paused) {
    player.currentAudio.pause();
    if (window.ttsMiniWindow) {
      window.ttsMiniWindow.updateStatus(false);
    }
    return;
  }

  // If paused, resume
  if (player.currentAudio && player.currentAudio.paused && player.currentAudio.src) {
    try {
      await player.currentAudio.play();
      if (window.ttsMiniWindow) {
        window.ttsMiniWindow.updateStatus(true);
      }
    } catch (error) {
      console.error('Resume failed:', error);
    }
    return;
  }

  // If ended or no audio, replay from last request
  if (lastPlaybackRequest) {
    try {
      if (window.ttsMiniWindow) {
        window.ttsMiniWindow.updateStatus(true);
      }

      const ttsService = new TTSService();
      ttsService.setCredentials(
        lastPlaybackRequest.credentials.azureKey,
        lastPlaybackRequest.credentials.azureRegion
      );

      const streamingResponse = await ttsService.createStreamingResponse(
        lastPlaybackRequest.text,
        lastPlaybackRequest.settings
      );

      const playbackPromise = player.playStreamingResponse(
        streamingResponse,
        lastPlaybackRequest.settings.rate || 1
      );

      // Attach event listeners for UI updates
      await new Promise(resolve => setTimeout(resolve, 10));

      if (player.currentAudio) {
        const updateUI = () => {
          if (window.ttsMiniWindow && player.currentAudio) {
            const isPlaying = !player.currentAudio.paused && !player.currentAudio.ended;
            window.ttsMiniWindow.updateStatus(isPlaying);
          }
        };

        player.currentAudio.addEventListener('play', updateUI);
        player.currentAudio.addEventListener('pause', updateUI);
        player.currentAudio.addEventListener('ended', updateUI);
      }

      await playbackPromise;

      if (window.ttsMiniWindow) {
        window.ttsMiniWindow.updateStatus(false);
      }
    } catch (error) {
      console.error('Replay failed:', error);
      if (window.ttsMiniWindow) {
        window.ttsMiniWindow.updateStatus(false);
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
          let miniWindow = document.getElementById("tts-mini-window");
          if (!miniWindow) {
            initAudioPlayer();
            miniWindow = document.getElementById("tts-mini-window");
          }
          miniWindow.style.display = "flex";

          const player = getStreamingAudioPlayer();

          // Save request for replay functionality
          lastPlaybackRequest = {
            text: request.text,
            settings: request.settings,
            credentials: request.credentials
          };

          if (window.ttsMiniWindow) {
            window.ttsMiniWindow.updateStatus(true);
          }

          // Create TTS service instance
          const ttsService = new TTSService();
          ttsService.setCredentials(request.credentials.azureKey, request.credentials.azureRegion);

          // Create streaming response using TTSService
          const streamingResponse = await ttsService.createStreamingResponse(request.text, request.settings);

          try {
            // Start playback (this creates the audio element immediately)
            const playbackPromise = player.playStreamingResponse(streamingResponse, request.settings.rate || 1);

            // Attach event listeners to the audio element for UI updates
            // Wait a moment for audio element to be created
            await new Promise(resolve => setTimeout(resolve, 10));

            if (player.currentAudio) {
              const updateUI = () => {
                if (window.ttsMiniWindow && player.currentAudio) {
                  const isPlaying = !player.currentAudio.paused && !player.currentAudio.ended;
                  window.ttsMiniWindow.updateStatus(isPlaying);
                }
              };

              player.currentAudio.addEventListener('play', updateUI);
              player.currentAudio.addEventListener('pause', updateUI);
              player.currentAudio.addEventListener('ended', updateUI);
            }

            // Wait for playback to complete
            await playbackPromise;

            return { success: true };
          } catch (playError) {
            if (playError.name === 'NotAllowedError') {
              if (window.ttsMiniWindow) {
                window.ttsMiniWindow.updateStatus(false);
              }
              return { success: true, requiresUserInteraction: true };
            }
            throw playError;
          } finally {
            if (window.ttsMiniWindow) {
              window.ttsMiniWindow.updateStatus(false);
            }
          }
        } catch (error) {
          const miniWindow = document.getElementById("tts-mini-window");
          if (miniWindow) miniWindow.style.display = "none";
          return { success: false, error: error.message };
        }
      }

      case "STOP_AUDIO": {
        const player = getStreamingAudioPlayer();
        await player.stopAudio();
        const container = document.getElementById("tts-mini-window");
        if (container) container.style.display = "none";
        if (window.ttsMiniWindow) {
          window.ttsMiniWindow.updateStatus(false);
        }
        lastPlaybackRequest = null;
        break;
      }

    }
    return true;
  } catch (error) {
    throw error;
  }
});
