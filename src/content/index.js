import browser from "webextension-polyfill";

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
      --tts-bg-secondary: #f3f4f6;
      --tts-bg-hover: #e5e7eb;
      --tts-text-primary: #374151;
      --tts-text-accent: #3b82f6;
      --tts-border: rgba(0,0,0,0.1);
      --tts-shadow: rgba(0,0,0,0.15);
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --tts-bg-primary: #1f2937;
        --tts-bg-secondary: #374151;
        --tts-bg-hover: #4b5563;
        --tts-text-primary: #f9fafb;
        --tts-text-accent: #60a5fa;
        --tts-border: rgba(255,255,255,0.1);
        --tts-shadow: rgba(0,0,0,0.3);
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
    padding: 8px 12px;
    border-radius: 24px;
    box-shadow: 0 4px 12px var(--tts-shadow);
    display: none;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    border: 1px solid var(--tts-border);
    z-index: 999999;
    cursor: move;
    user-select: none;
    -webkit-user-select: none;
    transform: ${savedPosition.transform || "none"};
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
      container.style.cursor = "grabbing";
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;

      const transform = `translate(${currentX}px, ${currentY}px)`;
      container.style.transform = transform;

      // Save position
      try {
        localStorage.setItem(
          "tts-window-position",
          JSON.stringify({
            transform,
            xOffset: currentX,
            yOffset: currentY,
          }),
        );
      } catch (e) {
        console.error("Error saving position:", e);
      }
    }
  }

  function dragEnd() {
    isDragging = false;
    container.style.cursor = "move";
  }

  container.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

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
  `;

  // Create the extension logo to identify what this widget is
  const logoContainer = document.createElement("div");
  logoContainer.style.cssText = iconBaseStyle;

  // Extension logo SVG
  logoContainer.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="var(--tts-text-accent)"/>
      <text x="24" y="32" font-family="Arial" font-size="32" fill="white" text-anchor="middle">T</text>
      <path d="M14,16 L34,16" stroke="white" stroke-width="2"/>
      <path d="M18,36 L30,36" stroke="white" stroke-width="2"/>
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
    transition: all 0.2s ease;
    padding: 0;
    color: var(--tts-text-primary);
  `;
  replayButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5v14l11-7z" fill="currentColor"/>
    </svg>
  `;
  replayButton.title = "Play/Replay";

  // Create close button with consistent styling
  const closeButton = document.createElement("button");
  closeButton.style.cssText = replayButton.style.cssText;
  closeButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  closeButton.title = "Close";

  // Add hover effects for buttons
  [replayButton, closeButton].forEach(button => {
    button.addEventListener("mouseover", () => {
      if (!isDragging) {
        button.style.background = "var(--tts-bg-hover)";
        button.style.transform = "scale(1.1)";
      }
    });
    button.addEventListener("mouseout", () => {
      button.style.background = "transparent";
      button.style.transform = "scale(1)";
    });
    button.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Prevent dragging when clicking buttons
    });
  });

  // Assemble the widget
  container.appendChild(logoContainer);
  container.appendChild(replayButton);
  container.appendChild(closeButton);

  return {
    container,
    logoContainer,
    replayButton,
    closeButton,
    updateStatus(isPlaying) {
      if (isPlaying) {
        replayButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
          </svg>
        `;
        replayButton.title = "Pause";
        container.style.background = "var(--tts-bg-secondary)";
      } else {
        replayButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
          </svg>
        `;
        replayButton.title = "Play/Replay";
        container.style.background = "var(--tts-bg-primary)";
      }
    },
    updatePlayButton(isPlaying) {
      this.updateStatus(isPlaying);
    },
  };
}

// Initialize hidden audio player with proper state management
function initAudioPlayer() {
  if (!document.getElementById("tts-hidden-player")) {
    const audio = document.createElement("audio");
    audio.id = "tts-hidden-player";
    audio.style.display = "none";

    const miniWindow = createMiniWindow();
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
    miniWindow.replayButton.onclick = async (e) => {
      e.stopPropagation();
      
      try {
        const currentlyPlaying = getActualPlayingState();
        
        if (currentlyPlaying) {
          // Currently playing - pause it
          audio.pause();
        } else {
          // Not playing - start or resume playback
          if (audio.src) {
            // If audio has ended, reset to beginning
            if (audio.ended) {
              audio.currentTime = 0;
            }
            
            // Attempt to play
            await audio.play();
          }
        }
        
        // Update button state after action
        updateButtonState();
        
      } catch (error) {
        console.error('Audio control failed:', error);
        updateButtonState(); // Ensure button reflects actual state
      }
    };

    // Add close button event listener
    miniWindow.closeButton.onclick = (e) => {
      e.stopPropagation();
      
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
    };

    // Add global control functions with proper state management
    window.ttsPlayer = {
      async play(url, rate = 1) {
        const audio = document.getElementById("tts-hidden-player");
        if (!audio) return;

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
            
            const playHandler = async () => {
              if (resolved) return;
              
              try {
                audio.removeEventListener("canplay", playHandler);
                await audio.play();
                updateButtonState();
                resolved = true;
                resolve();
              } catch (error) {
                if (!resolved) {
                  updateButtonState();
                  resolved = true;
                  reject(error);
                }
              }
            };

            const errorHandler = (error) => {
              if (!resolved) {
                audio.removeEventListener("canplay", playHandler);
                updateButtonState();
                resolved = true;
                reject(error);
              }
            };

            audio.addEventListener("canplay", playHandler, { once: true });
            audio.addEventListener("error", errorHandler, { once: true });
            
            // Fallback timeout
            setTimeout(() => {
              if (!resolved) {
                audio.removeEventListener("canplay", playHandler);
                audio.removeEventListener("error", errorHandler);
                resolved = true;
                reject(new Error('Audio load timeout'));
              }
            }, 10000);
          });
          
        } catch (error) {
          updateButtonState();
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
  }
}

// Initialize player when page loads
initAudioPlayer();

// Listen for messages from background script
browser.runtime.onMessage.addListener(async (request, _sender, _sendResponse) => {
  try {
    switch (request.type) {
      case "STOP_AUDIO": {
        window.ttsPlayer?.stop();
        const container = document.getElementById("tts-mini-window");
        if (container) container.style.display = "none";
        break;
      }

      case "PLAY_AUDIO": {
        if (!window.ttsPlayer) {
          initAudioPlayer();
        }
        const miniWindow = document.getElementById("tts-mini-window");
        if (miniWindow) miniWindow.style.display = "flex";
        await window.ttsPlayer.play(request.url, request.rate);
        break;
      }
    }
    return true;
  } catch (error) {
    console.error("Error handling message:", error);
    throw error;
  }
});
