import browser from "webextension-polyfill";
import { AudioPlayer } from "../services/audioPlayer.js";

console.log("Page loaded, script executing!");

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
    console.error("Error loading saved position:", e);
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

      // Throttled save position (only save every 100ms to improve performance)
      if (!window.ttsPositionSaveTimeout) {
        window.ttsPositionSaveTimeout = setTimeout(() => {
          try {
            localStorage.setItem(
              "tts-window-position",
              JSON.stringify({
                transform: `translate(${currentX}px, ${currentY}px)`,
                xOffset: currentX,
                yOffset: currentY,
              }),
            );
          } catch (e) {
            console.error("Error saving position:", e);
          }
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

      // Force final position save
      if (window.ttsPositionSaveTimeout) {
        clearTimeout(window.ttsPositionSaveTimeout);
        window.ttsPositionSaveTimeout = null;
      }

      try {
        localStorage.setItem(
          "tts-window-position",
          JSON.stringify({
            transform: `translate(${xOffset}px, ${yOffset}px)`,
            xOffset: xOffset,
            yOffset: yOffset,
          }),
        );
      } catch (e) {
        console.error("Error saving final position:", e);
      }
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

// Initialize hidden audio player with proper state management
function initAudioPlayer() {
  try {
    console.log("[INIT] Starting audio player initialization...");

    // Prevent multiple initializations
    if (window.ttsPlayer && document.getElementById("tts-hidden-player")) {
      console.log("[INIT] Audio player already initialized");
      return;
    }

    console.log("[INIT] Checking for existing audio element...");
    const existingAudio = document.getElementById("tts-hidden-player");
    console.log("[INIT] Existing audio element:", existingAudio);

    if (!existingAudio) {
      console.log("[INIT] Creating new audio element...");
      const audio = document.createElement("audio");
      if (!audio) {
        throw new Error("Failed to create audio element");
      }

      audio.id = "tts-hidden-player";
      audio.style.display = "none";
      console.log("[INIT] Audio element created:", audio);

      console.log("[INIT] Creating mini window...");
      const miniWindow = createMiniWindow();
      if (!miniWindow) {
        throw new Error("createMiniWindow returned null/undefined");
      }
      console.log("[INIT] Mini window created:", miniWindow);
    let currentAudioUrl = null;

    // Store miniWindow reference globally
    window.ttsMiniWindow = miniWindow;

    // Centralized state management - always check audio element directly
    const getActualPlayingState = () => {
      return !audio.paused && !audio.ended && audio.readyState >= 2;
    };

    const updateButtonState = () => {
      const actuallyPlaying = getActualPlayingState();
      miniWindow.updateStatus(actuallyPlaying);
    };

    // Add audio event listeners with consistent state updates
    audio.addEventListener("loadstart", () => {
      updateButtonState();
    });

    audio.addEventListener("canplay", () => {
      console.log("Audio ready to play");
      updateButtonState();
    });

    audio.addEventListener("play", () => {
      updateButtonState();
    });

    audio.addEventListener("pause", () => {
      updateButtonState();
    });

    audio.addEventListener("ended", () => {
      updateButtonState();
    });

    audio.addEventListener("error", (e) => {
      console.error("Audio error:", e);
      updateButtonState();
    });

    // Sync state when widget becomes visible
    const syncStateWhenVisible = () => {
      updateButtonState();
    };
    
    // Create a mutation observer to detect when widget becomes visible
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (miniWindow.container.style.display === 'flex') {
            // Small delay to ensure DOM is settled
            setTimeout(syncStateWhenVisible, 50);
          }
        }
      });
    });
    
    observer.observe(miniWindow.container, { attributes: true });

    document.body.appendChild(audio);
    document.body.appendChild(miniWindow.container);

    // Add replay button event listener with improved logic
    miniWindow.replayButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      console.log('Replay button clicked'); // Debug log

      try {
        const currentlyPlaying = getActualPlayingState();
        console.log('Currently playing:', currentlyPlaying); // Debug log

        if (currentlyPlaying) {
          // Currently playing - pause it
          console.log('Pausing audio');
          audio.pause();
        } else {
          // Not playing - start or resume playback
          if (audio.src) {
            console.log('Resuming/restarting audio');
            // If audio has ended, reset to beginning
            if (audio.ended) {
              audio.currentTime = 0;
            }

            // Attempt to play
            await audio.play();
          } else {
            console.log('No audio source available');
          }
        }

        // Update button state after action
        updateButtonState();

      } catch (error) {
        console.error('Audio control failed:', error);
        updateButtonState(); // Ensure button reflects actual state
      }
    });

    // Add close button event listener
    miniWindow.closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      console.log('Close button clicked'); // Debug log

      // Stop playback and clean up
      audio.pause();
      audio.currentTime = 0;

      // Hide the mini window
      miniWindow.container.style.display = "none";

      // Clean up URL and audio source
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
      }
      audio.src = "";

      // Update button state
      updateButtonState();
    });

    // Add global control functions with proper state management
    window.ttsPlayer = {
      async play(url, rate = 1) {
        const audio = document.getElementById("tts-hidden-player");
        if (!audio) {
          throw new Error("Audio element not found");
        }

        try {
          // Stop any current playback
          this.stop();

          // Clean up old URL and set new one
          if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
          }
          currentAudioUrl = url;

          // Configure audio
          audio.src = url;
          audio.playbackRate = rate;
          audio.currentTime = 0;

          // Show the mini window
          miniWindow.container.style.display = "flex";

          // Update initial state (loading/ready state)
          updateButtonState();

          // Wait for audio to be ready and then play
          return new Promise((resolve, reject) => {
            let resolved = false;
            let playAttempted = false;

            const cleanup = () => {
              if (!resolved) {
                audio.removeEventListener("canplay", playHandler);
                audio.removeEventListener("canplaythrough", playHandler);
                audio.removeEventListener("error", errorHandler);
                audio.removeEventListener("loadeddata", dataHandler);
                resolved = true;
              }
            };

            const playHandler = async () => {
              if (resolved || playAttempted) return;
              playAttempted = true;

              try {
                await audio.play();
                updateButtonState();
                cleanup();
                resolve();
              } catch (playError) {
                console.error('Play failed:', playError);
                cleanup();
                reject(new Error(`Playback failed: ${playError.message}`));
              }
            };

            const dataHandler = () => {
              // Try to play when we have loaded data
              if (!playAttempted && audio.readyState >= 2) {
                playHandler();
              }
            };

            const errorHandler = (error) => {
              console.error('Audio loading error:', error);
              const errorMsg = audio.error ?
                `Media error (code: ${audio.error.code}): ${audio.error.message || 'Unknown error'}` :
                'Audio loading failed';
              cleanup();
              reject(new Error(errorMsg));
            };

            // Add multiple event listeners for better compatibility
            audio.addEventListener("canplay", playHandler, { once: true });
            audio.addEventListener("canplaythrough", playHandler, { once: true });
            audio.addEventListener("loadeddata", dataHandler);
            audio.addEventListener("error", errorHandler, { once: true });

            // Fallback timeout
            setTimeout(() => {
              if (!resolved) {
                cleanup();
                reject(new Error('Audio load timeout after 15 seconds'));
              }
            }, 15000);
          });

        } catch (error) {
          updateButtonState();
          console.error('TTS Player error:', error);
          throw error;
        }
      },
      
      stop() {
        const audio = document.getElementById("tts-hidden-player");
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          
          if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
            currentAudioUrl = null;
          }
          audio.src = "";
          
          updateButtonState();
        }
      },
      
      // Helper method to get current state
      isPlaying() {
        const audio = document.getElementById("tts-hidden-player");
        return audio ? getActualPlayingState() : false;
      }
    };

    console.log("[INIT] Setting window.ttsPlayer...");
    if (!window.ttsPlayer) {
      throw new Error("window.ttsPlayer was not set properly");
    }

    console.log("[INIT] Audio player initialized successfully");
    return true;
  }
  } catch (error) {
    console.error("[INIT] Failed to initialize audio player:", error);
    console.error("[INIT] Error stack:", error.stack);
    throw error;
  }
}

// Initialize player when page loads
console.log("Simple TTS content script loaded");
initAudioPlayer();
console.log("TTS audio player initialized");

// Initialize streaming audio player for mini-window
let streamingAudioPlayer = null;

function getStreamingAudioPlayer() {
  if (!streamingAudioPlayer) {
    streamingAudioPlayer = new AudioPlayer();

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

// Listen for messages from background script
browser.runtime.onMessage.addListener(async (request, _sender, _sendResponse) => {
  console.log("Content script received message:", request);

  try {
    switch (request.type) {
      case "STOP_AUDIO": {
        console.log("Stopping audio...");
        window.ttsPlayer?.stop();

        // Also stop streaming audio player
        const player = getStreamingAudioPlayer();
        await player.stopAudio();

        const container = document.getElementById("tts-mini-window");
        if (container) container.style.display = "none";
        break;
      }

      case "PLAY_STREAMING_AUDIO": {
        console.log("Processing PLAY_STREAMING_AUDIO message...");
        try {
          // Ensure mini window exists
          let miniWindow = document.getElementById("tts-mini-window");
          console.log("Mini window found:", !!miniWindow);

          if (!miniWindow) {
            console.log("Mini window not found, initializing...");
            initAudioPlayer();
            miniWindow = document.getElementById("tts-mini-window");
            console.log("Mini window after init:", !!miniWindow);
          }

          if (miniWindow) {
            console.log("Setting mini window display to flex");
            miniWindow.style.display = "flex";
            console.log("Mini window display style:", miniWindow.style.display);
            console.log("Mini window computed style:", window.getComputedStyle(miniWindow).display);
            console.log("Mini window visibility:", window.getComputedStyle(miniWindow).visibility);
            console.log("Mini window opacity:", window.getComputedStyle(miniWindow).opacity);
            console.log("Mini window position:", window.getComputedStyle(miniWindow).position);
            console.log("Mini window z-index:", window.getComputedStyle(miniWindow).zIndex);
          } else {
            console.error("Failed to create or find mini window!");
          }

          // Convert array back to blob
          const uint8Array = new Uint8Array(request.audioData);
          const blob = new Blob([uint8Array], { type: request.mimeType || 'audio/webm; codecs="opus"' });

          // Use streaming audio player and update mini-window
          const player = getStreamingAudioPlayer();

          // Update mini-window state to show playing
          if (window.ttsMiniWindow) {
            window.ttsMiniWindow.updateStatus(true);
          }

          // Create object URL for fallback mini-window controls
          const audioUrl = URL.createObjectURL(blob);
          if (window.ttsPlayer) {
            const audio = document.getElementById("tts-hidden-player");
            if (audio) {
              audio.src = audioUrl;
              audio.playbackRate = request.rate || 1;
            }
          }

          try {
            // Start streaming playback
            if (window.MediaSource) {
              // Create proper mock response for streaming
              const mockResponse = {
                body: {
                  getReader() {
                    let sent = false;
                    return {
                      async read() {
                        if (sent) {
                          return { done: true };
                        }
                        sent = true;
                        return { done: false, value: uint8Array };
                      }
                    };
                  }
                },
                headers: {
                  get(name) {
                    if (name === 'content-length') {
                      return uint8Array.length.toString();
                    }
                    return null;
                  }
                }
              };

              await player.playStreamingResponse(mockResponse, request.rate || 1);
            } else {
              // Fallback to blob approach
              const mockResponse = {
                async arrayBuffer() {
                  return blob.arrayBuffer();
                },
                headers: {
                  get(name) {
                    if (name === 'content-length') {
                      return blob.size.toString();
                    }
                    return null;
                  }
                }
              };

              await player.playBlobFallback(mockResponse, request.rate || 1);
            }
          } finally {
            // Always update mini-window state after playback ends
            if (window.ttsMiniWindow) {
              window.ttsMiniWindow.updateStatus(false);
            }

            // Clean up
            setTimeout(() => {
              URL.revokeObjectURL(audioUrl);
            }, 1000);
          }

          console.log("Streaming audio playback started successfully");
          return { success: true };

        } catch (error) {
          console.error("PLAY_STREAMING_AUDIO error:", error);
          console.log("Attempting fallback to simple blob playback...");

          // Don't hide mini-window, try fallback playback instead
          try {
            // Fallback: Use simple blob audio playback
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio();
            audio.src = audioUrl;
            audio.playbackRate = request.rate || 1;

            // Update mini-window state
            if (window.ttsMiniWindow) {
              window.ttsMiniWindow.updateStatus(true);
            }

            // Play the audio
            await audio.play();

            // Wait for audio to end
            await new Promise((resolve) => {
              audio.onended = resolve;
              audio.onerror = resolve;
            });

            // Update mini-window state
            if (window.ttsMiniWindow) {
              window.ttsMiniWindow.updateStatus(false);
            }

            // Clean up
            URL.revokeObjectURL(audioUrl);

            console.log("Fallback audio playback completed successfully");
            return { success: true };

          } catch (fallbackError) {
            console.error("Fallback playback also failed:", fallbackError);

            // Only hide mini-window if both streaming and fallback fail
            const miniWindow = document.getElementById("tts-mini-window");
            if (miniWindow) {
              miniWindow.style.display = "none";
            }

            return { success: false, error: `Streaming failed: ${error.message}, Fallback failed: ${fallbackError.message}` };
          }
        }
      }

    }
    return true;
  } catch (error) {
    console.error("Error handling message:", error);
    throw error;
  }
});
