import browser from "webextension-polyfill";
import { SimpleTTS } from "../services/index.js";

console.log("[Simple TTS] Background script loaded/reloaded");

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

    // Get the current active tab instead of relying on the tab parameter
    let activeTab;
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      activeTab = tabs[0];
    } catch (tabError) {
      await showNotification('TTS Error', 'Could not find active tab. Please try again.');
      return;
    }

    // Validate the active tab
    if (!activeTab || !activeTab.id || activeTab.id < 0) {
      await showNotification('TTS Error', 'Invalid active tab. Please try again.');
      return;
    }

    // Double-check the tab still exists
    try {
      const currentTab = await browser.tabs.get(activeTab.id);
      if (!currentTab || currentTab.discarded) {
        throw new Error('Tab is no longer valid or has been discarded');
      }
    } catch (tabError) {
      await showNotification('TTS Error', `Active tab is no longer valid: ${tabError.message}`);
      return;
    }

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
        await browser.tabs.sendMessage(activeTab.id, { type: "STOP_AUDIO" });
      } catch (err) {
        console.log("Could not send STOP_AUDIO message to tab:", err.message);
        // Try to inject content script if it's not loaded
        await ensureContentScriptLoaded(activeTab.id);
      }

      // Use true streaming synthesis for context menu like popup does
      console.log("Sending PLAY_STREAMING_TTS message to tab:", activeTab.id);

      try {
        const response = await browser.tabs.sendMessage(activeTab.id, {
          type: "PLAY_STREAMING_TTS",
          text: info.selectionText,
          settings: {
            voice: settings.voice,
            rate: settings.rate,
            pitch: settings.pitch,
          },
          credentials: {
            azureKey: settings.azureKey,
            azureRegion: settings.azureRegion,
          }
        });
        console.log("PLAY_STREAMING_TTS response:", response);
      } catch (error) {
        console.error("Failed to send PLAY_STREAMING_AUDIO message:", error);

        // Handle specific error cases
        if (error.message.includes('Could not establish connection')) {
          console.log("Connection failed, attempting content script injection...");
        } else if (error.message.includes('Extension context invalidated')) {
          await showNotification(
            "Extension Error",
            "Extension context was invalidated. Please refresh the page."
          );
          return;
        }

        // Try to inject content script and retry
        try {
          await ensureContentScriptLoaded(activeTab.id);
          const response = await browser.tabs.sendMessage(activeTab.id, {
            type: "PLAY_STREAMING_TTS",
            text: info.selectionText,
            settings: {
              voice: settings.voice,
              rate: settings.rate,
              pitch: settings.pitch,
            },
            credentials: {
              azureKey: settings.azureKey,
              azureRegion: settings.azureRegion,
            }
          });
          console.log("PLAY_STREAMING_TTS response after injection:", response);
        } catch (retryError) {
          console.error("Retry failed:", retryError);

          // More specific error messages based on error type
          let errorMessage = "Could not communicate with content script.";
          let errorTitle = "TTS Playback Error";

          if (retryError.message.includes('Could not establish connection')) {
            errorMessage = "Content script not loaded. Please refresh the page and try again.";
          } else if (retryError.message.includes('Cannot inject into system pages')) {
            errorMessage = "TTS cannot be used on this page. Try selecting text on a regular webpage.";
            errorTitle = "TTS Not Available";
          } else if (retryError.message.includes('Extension context invalidated')) {
            errorMessage = "Extension needs to be reloaded. Please refresh the page.";
          }

          await showNotification(errorTitle, errorMessage);
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
        await browser.tabs.sendMessage(activeTab.id, { type: "STOP_AUDIO" });
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
    // First check if content script is already loaded by sending a ping
    try {
      const response = await browser.tabs.sendMessage(tabId, { type: "PING" });
      if (response && response.pong) {
        console.log("Content script already loaded for tab:", tabId);
        return true;
      }
    } catch (pingError) {
      console.log("Content script not responsive, attempting injection...");
    }

    // Get tab info to check if injection is allowed
    let tab;
    try {
      tab = await browser.tabs.get(tabId);
    } catch (tabError) {
      // More specific error handling
      if (tabError.message.includes('No tab with id')) {
        throw new Error(`Tab ${tabId} was closed or no longer exists.`);
      } else if (tabError.message.includes('Invalid tab ID')) {
        throw new Error(`Invalid tab ID: ${tabId}. Tab may have been closed.`);
      } else {
        throw new Error(`Could not access tab ${tabId}: ${tabError.message}`);
      }
    }

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
      throw new Error('Cannot inject into system pages');
    }

    // Check if tab is still active and not discarded
    if (tab.discarded) {
      throw new Error('Tab is discarded and cannot receive scripts');
    }

    // For Chrome/Chromium, try to inject the content script if not already loaded
    if (typeof browser.scripting !== 'undefined') {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      console.log("Content script injected for tab:", tabId);

      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify injection worked
      try {
        const response = await browser.tabs.sendMessage(tabId, { type: "PING" });
        if (response && response.pong) {
          console.log("Content script injection verified for tab:", tabId);
          return true;
        } else {
          throw new Error('Content script not responding after injection');
        }
      } catch (verifyError) {
        throw new Error(`Content script injection failed verification: ${verifyError.message}`);
      }
    } else {
      throw new Error('Scripting API not available');
    }
  } catch (error) {
    console.error("Could not ensure content script loaded:", error.message);
    throw error;
  }
}

// Debug voice settings in storage
browser.storage.local.get(["languageVoiceSettings"]).then((result) => {
  console.log("Current language voice settings in storage:", result.languageVoiceSettings);
});
