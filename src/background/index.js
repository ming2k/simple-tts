import browser from "webextension-polyfill";
import { SimpleTTS } from "../services/index.js";

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
    console.error("Failed to create context menu:", error);
  }
}

// Create context menu when extension starts
createContextMenu();

// Keep the onInstalled listener for other initialization tasks
browser.runtime.onInstalled.addListener(async (details) => {
  // Create context menu on install/update
  await createContextMenu();

  // Handle first installation
  if (details.reason === "install") {
    // Initialize settings with environment variables
    const defaultSettings = {
      voice: "en-US-AvaMultilingualNeural",
      rate: 1,
      pitch: 1,
      azureKey: process.env.AZURE_SPEECH_KEY || "",
      azureRegion: process.env.AZURE_REGION || "",
      showKey: false,
      onboardingCompleted: false,
    };

    // Save settings to storage
    await browser.storage.local.set({
      settings: defaultSettings,
      onboardingCompleted: false,
    });

    // Set badge to indicate setup needed if no Azure credentials
    if (!defaultSettings.azureKey || !defaultSettings.azureRegion) {
      browser.browserAction.setBadgeText({ text: "!" });
      browser.browserAction.setBadgeBackgroundColor({ color: "#F59E0B" });
    }

    // Check if we're in development mode
    if (
      process.env.NODE_ENV === "development" &&
      defaultSettings.azureKey &&
      defaultSettings.azureRegion
    ) {
      await browser.storage.local.set({ onboardingCompleted: true });
    } else {
      browser.tabs.create({
        url: browser.runtime.getURL("onboarding.html"),
      });
    }
  }
});

// Listen for messages from popup to open options
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "OPEN_OPTIONS") {
    browser.tabs.create({
      url: browser.runtime.getURL("options.html"),
    });
  }
});

// Modify the context menu click handler
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translate-selected-text" && info.selectionText) {
    try {
      const { settings } = await browser.storage.local.get("settings");
      console.log("Retrieved settings:", settings);

      if (!settings?.azureKey || !settings?.azureRegion) {
        await showNotification(
          "Configuration Error",
          "Azure credentials not configured. Please check your settings.",
        );
        return;
      }

      const ttsService = new SimpleTTS(
        settings.azureKey,
        settings.azureRegion,
      );
      
      // Stop any currently playing audio first
      await browser.tabs.sendMessage(tab.id, { type: "STOP_AUDIO" });
      
      // Use sequential processing with concatenated playback for context menu
      const audioSegments = await ttsService.synthesizeWithSequentialProcessing(info.selectionText, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch,
      });

      if (!audioSegments || !audioSegments.length) {
        throw new Error("Speech synthesis failed to generate audio");
      }

      // Concatenate all segments into one blob for web playback
      const audioBlobs = audioSegments.map(segment => segment.blob);
      const combinedBlob = new Blob(audioBlobs, { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(combinedBlob);

      // Play using the injected player through messaging
      await browser.tabs
        .sendMessage(tab.id, {
          type: "PLAY_AUDIO",
          url: audioUrl,
          rate: settings.rate || 1,
        })
        .catch((error) => {
          console.error("Playback error:", error);
          URL.revokeObjectURL(audioUrl);
        });
    } catch (error) {
      console.error("TTS error:", error);
      await showNotification(
        "Text-to-Speech Error",
        `Failed to convert text to speech: ${error.message}`,
      );
      // Hide the window if there's an error
      await browser.tabs.sendMessage(tab.id, { type: "STOP_AUDIO" });
    }
  }
});

// Update the message listener for stopping audio
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "STOP_ALL_AUDIO") {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
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
          `,
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
      type: "basic",
      iconUrl: browser.runtime.getURL("icon-48.png"),
      title,
      message,
    });
  } catch (error) {
    console.error("Failed to show notification:", error);
    // Fallback to alert if notifications aren't available
    alert(`${title}: ${message}`);
  }
}

// Debug voice settings in storage
browser.storage.local.get(["languageVoiceSettings"]).then((result) => {
  console.log("Current language voice settings in storage:", result.languageVoiceSettings);
});
