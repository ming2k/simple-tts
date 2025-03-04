import browser from "webextension-polyfill";

console.log("Page loaded, script executing!");

// Create floating mini window
function createMiniWindow() {
  // Try to get saved position from storage
  let savedPosition = {};
  try {
    const saved = localStorage.getItem('tts-window-position');
    if (saved) {
      savedPosition = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading saved position:', e);
  }

  const container = document.createElement('div');
  container.id = 'tts-mini-window';
  container.style.cssText = `
    position: fixed;
    bottom: ${savedPosition.bottom || '20px'};
    right: ${savedPosition.right || '20px'};
    background: white;
    padding: 12px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    border: 1px solid rgba(0,0,0,0.1);
    z-index: 999999;
    transition: none;
    cursor: move;
    user-select: none;
    -webkit-user-select: none;
    transform: ${savedPosition.transform || 'none'};
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
    if (e.target === container || e.target === statusText || e.target === statusIcon) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
      container.style.cursor = 'grabbing';
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
        localStorage.setItem('tts-window-position', JSON.stringify({
          transform,
          xOffset: currentX,
          yOffset: currentY
        }));
      } catch (e) {
        console.error('Error saving position:', e);
      }
    }
  }

  function dragEnd() {
    isDragging = false;
    container.style.cursor = 'move';
  }

  container.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // Create status icon with non-selectable text
  const statusIcon = document.createElement('div');
  statusIcon.style.cssText = `
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-select: none;
  `;
  statusIcon.innerHTML = '🔊';

  // Create status text with non-selectable text
  const statusText = document.createElement('span');
  statusText.style.cssText = `
    font-size: 14px;
    color: #374151;
    font-weight: 500;
    user-select: none;
    -webkit-user-select: none;
  `;
  statusText.textContent = 'Ready';

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  // Create play/pause button
  const toggleButton = document.createElement('button');
  toggleButton.style.cssText = `
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background: #f3f4f6;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #374151;
    font-size: 16px;
    transition: all 0.2s ease;
    padding: 0;
    user-select: none;
    -webkit-user-select: none;
  `;
  toggleButton.innerHTML = '⏸️';
  toggleButton.title = 'Pause';

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.style.cssText = toggleButton.style.cssText;
  closeButton.innerHTML = '✕';
  closeButton.title = 'Close';

  // Add hover effects
  [toggleButton, closeButton].forEach(button => {
    button.addEventListener('mouseover', () => {
      if (!isDragging) {
        button.style.background = '#e5e7eb';
      }
    });
    button.addEventListener('mouseout', () => {
      button.style.background = '#f3f4f6';
    });
  });

  // Prevent text selection when clicking buttons
  [toggleButton, closeButton].forEach(button => {
    button.addEventListener('mousedown', (e) => {
      e.stopPropagation(); // Prevent dragging when clicking buttons
    });
  });

  // Assemble the mini window
  buttonContainer.appendChild(toggleButton);
  buttonContainer.appendChild(closeButton);
  container.appendChild(statusIcon);
  container.appendChild(statusText);
  container.appendChild(buttonContainer);

  return {
    container,
    statusText,
    toggleButton,
    closeButton,
    updateStatus(text) {
      statusText.textContent = text;
    },
    updatePlayButton(isPlaying) {
      toggleButton.innerHTML = isPlaying ? '⏸️' : '▶️';
      toggleButton.title = isPlaying ? 'Pause' : 'Play';
    }
  };
}

// Initialize hidden audio player with better initialization handling
function initAudioPlayer() {
  if (!document.getElementById('tts-hidden-player')) {
    const audio = document.createElement('audio');
    audio.id = 'tts-hidden-player';
    audio.style.display = 'none';
    
    const miniWindow = createMiniWindow();
    let isPlaying = false;
    let currentAudioUrl = null;

    // Add event listeners for better initialization
    audio.addEventListener('canplay', () => {
      console.log('Audio ready to play');
      miniWindow.updateStatus('Ready to play');
    });

    audio.addEventListener('play', () => {
      isPlaying = true;
      miniWindow.updateStatus('Playing...');
      miniWindow.updatePlayButton(true);
    });

    audio.addEventListener('pause', () => {
      isPlaying = false;
      miniWindow.updateStatus('Paused');
      miniWindow.updatePlayButton(false);
    });

    audio.addEventListener('ended', () => {
      isPlaying = false;
      miniWindow.updateStatus('Click play to replay');
      miniWindow.updatePlayButton(false);
      // Don't remove the window or revoke URL here
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      miniWindow.updateStatus('Error playing audio');
    });

    document.body.appendChild(audio);
    document.body.appendChild(miniWindow.container);

    // Add button event listeners
    miniWindow.toggleButton.onclick = () => {
      if (isPlaying) {
        audio.pause();
      } else {
        // If audio has ended, reset currentTime before playing
        if (audio.ended) {
          audio.currentTime = 0;
        }
        audio.play();
      }
    };

    miniWindow.closeButton.onclick = () => {
      audio.pause();
      miniWindow.container.remove();
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }
      audio.src = '';
      currentAudioUrl = null;
    };

    // Add global control functions with initialization check
    window.ttsPlayer = {
      async play(url, rate = 1) {
        const audio = document.getElementById('tts-hidden-player');
        if (audio) {
          // Stop any current playback
          this.stop();
          
          // Store new URL and revoke old one if exists
          if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
          }
          currentAudioUrl = url;
          
          // Set new audio source and rate
          audio.src = url;
          audio.playbackRate = rate;

          // Wait for audio to be loaded before playing
          return new Promise((resolve, reject) => {
            const playHandler = () => {
              audio.removeEventListener('canplay', playHandler);
              audio.play()
                .then(resolve)
                .catch(reject);
            };
            
            audio.addEventListener('canplay', playHandler);
          });
        }
      },
      stop() {
        const audio = document.getElementById('tts-hidden-player');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
            currentAudioUrl = null;
          }
          audio.src = '';
        }
      }
    };
  }
}

// Initialize player when page loads
initAudioPlayer();

// Listen for messages from background script
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    switch (request.type) {
      case 'STOP_AUDIO':
        window.ttsPlayer?.stop();
        break;
      
      case 'PLAY_AUDIO':
        if (!window.ttsPlayer) {
          initAudioPlayer();
        }
        await window.ttsPlayer.play(request.url, request.rate);
        break;
    }
    return true;
  } catch (error) {
    console.error('Error handling message:', error);
    throw error;
  }
});
