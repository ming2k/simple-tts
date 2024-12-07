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
        throw new Error('Azure credentials not configured in settings');
      }
      
      const ttsService = new TTSService(settings.azureKey, settings.azureRegion);
      
      let audioBlob;
      try {
        audioBlob = await ttsService.synthesizeSpeech(info.selectionText, {
          voice: settings.voice,
          rate: settings.rate,
          pitch: settings.pitch
        });
        
        if (!audioBlob) {
          throw new Error('Speech synthesis returned null or undefined');
        }
      } catch (synthError) {
        console.error('Speech synthesis failed:', synthError);
        throw synthError;
      }
      
      // Store the audio element reference globally so we can stop it later
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Add a message listener to handle stop requests
      const messageListener = (request) => {
        if (request.type === 'STOP_AUDIO') {
          browser.tabs.executeScript(tab.id, {
            code: `
              const audioElements = document.querySelectorAll('audio[data-tts-audio="true"]');
              audioElements.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
                URL.revokeObjectURL(audio.src);
                audio.remove();
              });
            `
          });
          browser.runtime.onMessage.removeListener(messageListener);
        }
      };
      
      browser.runtime.onMessage.addListener(messageListener);
      
      // Inject code to create and play audio
      await browser.tabs.executeScript(tab.id, {
        code: `
          (async () => {
            try {
              const uint8Array = new Uint8Array([${uint8Array.toString()}]);
              const blob = new Blob([uint8Array], { type: 'audio/mp3' });
              const audioUrl = URL.createObjectURL(blob);
              const audio = new Audio(audioUrl);
              audio.setAttribute('data-tts-audio', 'true');
              audio.playbackRate = ${settings.rate || 1};
              audio.style.display = 'none';
              document.body.appendChild(audio);
              await audio.play();
              audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                audio.remove();
              };
            } catch (error) {
              console.error('Error playing audio:', error);
            }
          })();
        `
      });
    } catch (error) {
      console.error('TTS error:', error);
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icon-48.png'),
        title: 'Text-to-Speech Error',
        message: `Failed to convert text to speech: ${error.message}`
      });
    }
  }
});

// Add a message listener for stopping audio from any source
browser.runtime.onMessage.addListener((request) => {
  if (request.type === 'STOP_ALL_AUDIO') {
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        browser.tabs.executeScript(tab.id, {
          code: `
            const audioElements = document.querySelectorAll('audio[data-tts-audio="true"]');
            audioElements.forEach(audio => {
              audio.pause();
              audio.currentTime = 0;
              URL.revokeObjectURL(audio.src);
              audio.remove();
            });
          `
        }).catch(err => console.error('Failed to stop audio in tab:', err));
      });
    });
  }
});