import browser from "webextension-polyfill";
import { TTSService } from "../services/ttsService.js";

// Create a context menu item when the extension is installed
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "translate-selected-text",
    title: "Read selected text",
    contexts: ["selection"],
  });
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
      // Get settings from storage
      const { settings } = await browser.storage.local.get('settings');
      console.log('Retrieved settings:', settings);

      if (!settings?.azureKey || !settings?.azureRegion) {
        throw new Error('Azure credentials not configured in settings');
      }
      
      const ttsService = new TTSService(settings.azureKey, settings.azureRegion);
      const audioBlob = await ttsService.synthesizeSpeech(info.selectionText, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch
      });
      
      // Convert blob to array buffer for transfer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Inject code to create and play audio
      browser.tabs.executeScript(tab.id, {
        code: `
          (async () => {
            const uint8Array = new Uint8Array([${uint8Array.toString()}]);
            const blob = new Blob([uint8Array], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.playbackRate = ${settings.rate || 1};
            audio.style.display = 'none';
            document.body.appendChild(audio);
            await audio.play();
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              audio.remove();
            };
          })();
        `
      });
    } catch (error) {
      console.error('TTS error:', error);
    }
  }
});