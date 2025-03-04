import browser from "webextension-polyfill";
import { TTSService } from "../services/ttsService.js";

// Separate function to create context menu
async function createContextMenu() {
  try {
    await browser.contextMenus.removeAll(); // Clean up any existing menu items
    await browser.contextMenus.create({
      id: "translate-selected-text",
      title: "Read selected text",
      contexts: ["selection"],
    });
  } catch (error) {
    console.error('Failed to create context menu:', error);
  }
}

// Create context menu when extension starts
createContextMenu();

// Keep the onInstalled listener for other initialization tasks
browser.runtime.onInstalled.addListener(async (details) => {
  // Create context menu on install/update
  await createContextMenu();

  // Handle first installation
  if (details.reason === 'install') {
    // Initialize settings with environment variables
    const defaultSettings = {
      voice: 'en-US-AvaMultilingualNeural',
      rate: 1,
      pitch: 1,
      azureKey: process.env.AZURE_SPEECH_KEY || '',
      azureRegion: process.env.AZURE_REGION || '',
      showKey: false,
      onboardingCompleted: false
    };

    // Save settings to storage
    await browser.storage.local.set({ 
      settings: defaultSettings,
      onboardingCompleted: false
    });
    
    // Set badge to indicate setup needed if no Azure credentials
    if (!defaultSettings.azureKey || !defaultSettings.azureRegion) {
      browser.browserAction.setBadgeText({ text: '!' });
      browser.browserAction.setBadgeBackgroundColor({ color: '#F59E0B' });
    }

    // Check if we're in development mode
    if (process.env.NODE_ENV === 'development' && defaultSettings.azureKey && defaultSettings.azureRegion) {
      await browser.storage.local.set({ onboardingCompleted: true });
    } else {
      browser.tabs.create({
        url: browser.runtime.getURL('onboarding.html')
      });
    }
  }
});

// Listen for messages from popup to open options
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'OPEN_OPTIONS') {
    browser.tabs.create({
      url: browser.runtime.getURL('options.html')
    });
  }
});

// Handle the context menu item click
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translate-selected-text" && info.selectionText) {
    try {
      const { settings } = await browser.storage.local.get('settings');
      console.log('Retrieved settings:', settings);

      if (!settings?.azureKey || !settings?.azureRegion) {
        await showNotification('Configuration Error', 'Azure credentials not configured. Please check your settings.');
        return;
      }
      
      const ttsService = new TTSService(settings.azureKey, settings.azureRegion);
      
      const audioBlobs = await ttsService.synthesizeSpeech(info.selectionText, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch
      });
      
      if (!audioBlobs || !audioBlobs.length) {
        throw new Error('Speech synthesis failed to generate audio');
      }

      // Combine all audio blobs into one
      const combinedBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
      
      // Create object URL directly from blob
      const audioUrl = URL.createObjectURL(combinedBlob);

      // Inject the audio player HTML and script
      await browser.tabs.executeScript(tab.id, {
        code: `
          (function() {
            // Remove any existing TTS players
            const existingPlayer = document.getElementById('simple-tts-player');
            if (existingPlayer) {
              existingPlayer.remove();
            }

            // Create container for the player
            const container = document.createElement('div');
            container.id = 'simple-tts-player';
            container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; \
              background: white; padding: 12px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); \
              display: flex; align-items: center; gap: 12px; font-family: system-ui, -apple-system, sans-serif; \
              border: 1px solid rgba(0,0,0,0.1); transition: all 0.2s ease;';

            // Add draggable functionality
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = 0;
            let yOffset = 0;

            container.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            function dragStart(e) {
              initialX = e.clientX - xOffset;
              initialY = e.clientY - yOffset;
              
              if (e.target === container) {
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
                
                container.style.transform = \`translate(\${currentX}px, \${currentY}px)\`;
              }
            }

            function dragEnd() {
              isDragging = false;
              container.style.cursor = 'grab';
            }

            // Create audio element
            const audio = document.createElement('audio');
            audio.id = 'simple-tts-audio';
            audio.style.display = 'none';
            
            // Set audio source directly from URL
            audio.src = '${audioUrl}';
            audio.playbackRate = ${settings.rate || 1};

            // Create status icon
            const statusIcon = document.createElement('div');
            statusIcon.style.cssText = 'width: 24px; height: 24px; border-radius: 50%; \
              background: #3b82f6; display: flex; align-items: center; justify-content: center; \
              color: white; font-size: 14px; flex-shrink: 0;';
            statusIcon.innerHTML = '🔊';

            // Create status text
            const statusText = document.createElement('span');
            statusText.style.cssText = 'font-size: 14px; color: #374151; font-weight: 500;';
            statusText.textContent = 'Playing...';

            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: 8px; align-items: center;';

            // Create pause/play button
            const toggleButton = document.createElement('button');
            toggleButton.style.cssText = 'width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; \
              background: #f3f4f6; cursor: pointer; display: flex; align-items: center; justify-content: center; \
              color: #374151; font-size: 16px; transition: all 0.2s ease; padding: 0;';
            toggleButton.innerHTML = '⏸️';
            toggleButton.title = 'Pause';

            // Create close button
            const closeButton = document.createElement('button');
            closeButton.style.cssText = 'width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; \
              background: #f3f4f6; cursor: pointer; display: flex; align-items: center; justify-content: center; \
              color: #374151; font-size: 16px; transition: all 0.2s ease; padding: 0;';
            closeButton.innerHTML = '✕';
            closeButton.title = 'Close';

            // Add hover effects
            [toggleButton, closeButton].forEach(button => {
              button.addEventListener('mouseover', () => {
                button.style.background = '#e5e7eb';
              });
              button.addEventListener('mouseout', () => {
                button.style.background = '#f3f4f6';
              });
            });

            // Add event listeners
            let isPlaying = true;
            
            audio.onended = () => {
              container.remove();
              URL.revokeObjectURL('${audioUrl}');
            };

            toggleButton.onclick = () => {
              if (isPlaying) {
                audio.pause();
                toggleButton.innerHTML = '▶️';
                toggleButton.title = 'Play';
                statusText.textContent = 'Paused';
              } else {
                audio.play();
                toggleButton.innerHTML = '⏸️';
                toggleButton.title = 'Pause';
                statusText.textContent = 'Playing...';
              }
              isPlaying = !isPlaying;
            };

            closeButton.onclick = () => {
              audio.pause();
              container.remove();
              URL.revokeObjectURL('${audioUrl}');
            };

            // Assemble the player
            container.appendChild(statusIcon);
            container.appendChild(statusText);
            buttonContainer.appendChild(toggleButton);
            buttonContainer.appendChild(closeButton);
            container.appendChild(buttonContainer);
            container.appendChild(audio);
            document.body.appendChild(container);

            // Start playback
            audio.play().catch(console.error);
          })();
        `
      });

    } catch (error) {
      console.error('TTS error:', error);
      await showNotification('Text-to-Speech Error', `Failed to convert text to speech: ${error.message}`);
    }
  }
});

// Update the message listener for stopping audio
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STOP_ALL_AUDIO') {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        browser.tabs.executeScript(tabs[0].id, {
          code: `
            const player = document.getElementById('simple-tts-player');
            if (player) {
              const audio = player.querySelector('audio');
              if (audio) {
                audio.pause();
                URL.revokeObjectURL(audio.src);
              }
              player.remove();
            }
          `
        });
      }
      sendResponse({ success: true });
    });
    return true;
  }
});

// Helper function to show notifications
async function showNotification(title, message) {
  try {
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icon-48.png'),
      title,
      message
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
    // Fallback to alert if notifications aren't available
    alert(`${title}: ${message}`);
  }
}


