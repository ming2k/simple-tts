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
      try {
        // Use the appropriate API for the browser version
        const actionAPI = browser.action || browser.browserAction;
        if (actionAPI) {
          actionAPI.setBadgeText({ text: "!" });
          actionAPI.setBadgeBackgroundColor({ color: "#F59E0B" });
        }
      } catch (error) {
        console.log("Could not set badge:", error.message);
      }
    }

    // Always show onboarding for new installations
    // Only skip if we have pre-configured credentials (development builds)
    const isDevelopmentWithCreds = (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV === "development" &&
      defaultSettings.azureKey &&
      defaultSettings.azureRegion
    );

    if (isDevelopmentWithCreds) {
      await browser.storage.local.set({ onboardingCompleted: true });
    } else {
      // Always show onboarding for production builds and new users
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
  console.log("Context menu clicked:", info);

  if (info.menuItemId === "translate-selected-text" && info.selectionText) {
    console.log("Processing TTS for selected text:", info.selectionText);
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
      try {
        await browser.tabs.sendMessage(tab.id, { type: "STOP_AUDIO" });
      } catch (err) {
        console.log("Could not send STOP_AUDIO message to tab:", err.message);
        // Try to inject content script if it's not loaded
        await ensureContentScriptLoaded(tab.id);
      }
      
      // Use streaming synthesis for context menu - create streaming response
      const streamingResponse = await ttsService.ttsService.createStreamingResponse(info.selectionText, {
        voice: settings.voice,
        rate: settings.rate,
        pitch: settings.pitch,
      });

      if (!streamingResponse) {
        throw new Error("Speech synthesis failed to generate audio");
      }

      // Get the response as array buffer for transfer
      const arrayBuffer = await streamingResponse.arrayBuffer();

      // Play using streaming approach through messaging
      console.log("Sending PLAY_STREAMING_AUDIO message to tab:", tab.id);
      console.log("Audio data size:", arrayBuffer.byteLength, "bytes");
      try {
        const response = await browser.tabs.sendMessage(tab.id, {
          type: "PLAY_STREAMING_AUDIO",
          audioData: Array.from(new Uint8Array(arrayBuffer)),
          mimeType: 'audio/webm; codecs="opus"',
          rate: settings.rate || 1,
        });
        console.log("PLAY_STREAMING_AUDIO response:", response);
      } catch (error) {
        console.error("Failed to send PLAY_STREAMING_AUDIO message:", error);

        // Try to inject content script and retry
        try {
          await ensureContentScriptLoaded(tab.id);
          const response = await browser.tabs.sendMessage(tab.id, {
            type: "PLAY_STREAMING_AUDIO",
            audioData: Array.from(new Uint8Array(arrayBuffer)),
            mimeType: 'audio/webm; codecs="opus"',
            rate: settings.rate || 1,
          });
          console.log("PLAY_STREAMING_AUDIO response after injection:", response);
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          // Try to show a notification about the error
          await showNotification(
            "TTS Playback Error",
            "Could not communicate with content script. Please refresh the page and try again."
          );
        }
      }
    } catch (error) {
      console.error("TTS error:", error);
      await showNotification(
        "Text-to-Speech Error",
        `Failed to convert text to speech: ${error.message}`,
      );
      // Hide the window if there's an error
      try {
        await browser.tabs.sendMessage(tab.id, { type: "STOP_AUDIO" });
      } catch (err) {
        console.log("Could not send STOP_AUDIO message to tab:", err.message);
      }
    }
  }
});


// Helper function to show notifications
async function showNotification(title, message) {
  try {
    await browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("assets/icons/icon-48.png"),
      title,
      message,
    });
  } catch (error) {
    console.error("Failed to show notification:", error);
    // Service workers can't use alert, just log the error
    console.log(`Notification fallback: ${title}: ${message}`);
  }
}

// Helper function to ensure content script is loaded (for Chrome compatibility)
async function ensureContentScriptLoaded(tabId) {
  try {
    // For Chrome/Chromium, try to inject the content script if not already loaded
    if (typeof browser.scripting !== 'undefined') {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      console.log("Content script injected for tab:", tabId);
    }
  } catch (error) {
    console.log("Could not inject content script:", error.message);
  }
}

// Debug voice settings in storage
browser.storage.local.get(["languageVoiceSettings"]).then((result) => {
  console.log("Current language voice settings in storage:", result.languageVoiceSettings);
});
