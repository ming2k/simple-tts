// WXT provides browser global
import { getAzureCredentials } from "../../utils/azureConfig";

// Separate function to create context menu
async function createContextMenu() {
  try {
    await browser.contextMenus.removeAll(); // Clean up any existing menu items
    await browser.contextMenus.create({
      id: "translate-selected-text",
      title: browser.i18n.getMessage("contextMenuTitle"),
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
      if (browser.action) {
        browser.action.setBadgeText({ text: "!" });
        browser.action.setBadgeBackgroundColor({ color: "#F59E0B" });
      } else if (browser.browserAction) {
        browser.browserAction.setBadgeText({ text: "!" });
        browser.browserAction.setBadgeBackgroundColor({ color: "#F59E0B" });
      }
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

// Handle the context menu item click
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translate-selected-text" && info.selectionText) {
    try {
      const { settings } = await browser.storage.local.get("settings");
      const credentials = await getAzureCredentials(settings);

      if (!credentials?.azureKey || !credentials?.azureRegion) {
        await showNotification(
          "Configuration Error",
          "Azure credentials not configured. Please check your settings.",
        );
        return;
      }

      // Send message to content script to play audio
      try {
        const response = await browser.tabs.sendMessage(tab.id, {
          type: "PLAY_STREAMING_TTS",
          text: info.selectionText,
          settings: {
            voice: settings.voice,
            rate: settings.rate,
            pitch: settings.pitch,
          },
          credentials,
        });

        if (!response || !response.success) {
          throw new Error(
            response?.error ||
              "Failed to communicate with the page. Try refreshing the tab.",
          );
        }
      } catch (err) {
        console.error("Failed to send message to content script:", err);
        await showNotification(
          "Error",
          "Could not communicate with the page. Please refresh and try again.",
        );
      }
    } catch (error) {
      console.error("TTS error:", error);
      await showNotification(
        "Text-to-Speech Error",
        `Failed to convert text to speech: ${error.message}`,
      );
    }
  }
});

// Update the message listener for stopping audio
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "STOP_ALL_AUDIO") {
    // Execute the stop audio operation
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        browser.tabs
          .sendMessage(tabs[0].id, { type: "STOP_AUDIO" })
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });

    // Return true to indicate we will send a response asynchronously
    return true;
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
  }
}
