import browser from "webextension-polyfill";
import { getSettings, saveSettings } from "../utils/settingsStorage";
import { defaultSettings } from "../types/storage";

console.log("[Simple TTS] Background script loaded/reloaded");

// Separate function to create context menu
async function createContextMenu() {
  try {
    await browser.contextMenus.removeAll();
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
  await createContextMenu();

  if (details.reason === "install") {
    const initialSettings = {
      ...defaultSettings,
      azureKey: process.env.AZURE_SPEECH_KEY || "",
      azureRegion: process.env.AZURE_REGION || "",
    };

    await browser.storage.local.set({
      settings: initialSettings,
      onboardingCompleted: false,
    });

    // Set badge to indicate setup needed if no Azure credentials
    if (!initialSettings.azureKey || !initialSettings.azureRegion) {
      try {
        const actionAPI = browser.action || browser.browserAction;
        if (actionAPI) {
          actionAPI.setBadgeText({ text: "!" });
          actionAPI.setBadgeBackgroundColor({ color: "#F59E0B" });
        }
      } catch (error) {
        console.log("Could not set badge:", error.message);
      }
    }

    const isDevelopmentWithCreds = (
      typeof process !== 'undefined' &&
      process.env &&
      process.env.NODE_ENV === "development" &&
      initialSettings.azureKey &&
      initialSettings.azureRegion
    );

    if (isDevelopmentWithCreds) {
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

// Context menu click handler
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translate-selected-text" && info.selectionText) {
    console.log("Processing TTS for selected text");

    let activeTab;
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      activeTab = tabs[0];
    } catch (tabError) {
      await showNotification('TTS Error', 'Could not find active tab.');
      return;
    }

    if (!activeTab || !activeTab.id || activeTab.id < 0) {
      await showNotification('TTS Error', 'Invalid active tab.');
      return;
    }

    try {
      const currentTab = await browser.tabs.get(activeTab.id);
      if (!currentTab || currentTab.discarded) {
        throw new Error('Tab is no longer valid');
      }
    } catch (tabError) {
      await showNotification('TTS Error', 'Active tab is no longer valid.');
      return;
    }

    try {
      const settings = await getSettings();

      if (!settings.azureKey || !settings.azureRegion) {
        await showNotification(
          "Configuration Error",
          "Azure credentials not configured. Please check your settings.",
        );
        return;
      }

      // Stop previous audio
      try {
        await browser.tabs.sendMessage(activeTab.id, { type: "STOP_AUDIO" });
      } catch (err) {
        console.log("Could not send STOP_AUDIO:", err.message);
        await ensureContentScriptLoaded(activeTab.id);
      }

      // Send TTS request
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
        console.error("Failed to send message:", error);

        if (error.message.includes('No tab with id') || error.message.includes('Invalid tab ID')) {
          return;
        }

        if (error.message.includes('Extension context invalidated')) {
          await showNotification("Extension Error", "Please refresh the page.");
          return;
        }

        // Retry with content script injection
        try {
          await browser.tabs.get(activeTab.id);
          await ensureContentScriptLoaded(activeTab.id);
          await new Promise(resolve => setTimeout(resolve, 100));

          await browser.tabs.sendMessage(activeTab.id, {
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
        } catch (retryError) {
          if (retryError.message.includes('No tab with id') || retryError.message.includes('Invalid tab ID')) {
            return;
          }

          let errorMessage = "Could not communicate with content script.";
          if (retryError.message.includes('Could not establish connection')) {
            errorMessage = "Please refresh the page and try again.";
          } else if (retryError.message.includes('Cannot inject into system pages')) {
            errorMessage = "TTS cannot be used on this page.";
          }

          await showNotification("TTS Error", errorMessage);
        }
      }
    } catch (error) {
      console.error("TTS error:", error);

      if (error.message.includes('No tab with id') || error.message.includes('Invalid tab ID')) {
        return;
      }

      await showNotification("TTS Error", error.message);
      try {
        await browser.tabs.get(activeTab.id);
        await browser.tabs.sendMessage(activeTab.id, { type: "STOP_AUDIO" });
      } catch (err) {
        // Ignore
      }
    }
  }
});

async function showNotification(title, message) {
  try {
    await browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("assets/icons/icon-48.png"),
      title,
      message,
    });
  } catch (error) {
    console.log(`Notification: ${title}: ${message}`);
  }
}

async function ensureContentScriptLoaded(tabId) {
  try {
    try {
      const response = await browser.tabs.sendMessage(tabId, { type: "PING" });
      if (response && response.pong) {
        return true;
      }
    } catch (pingError) {
      // Content script not loaded
    }

    let tab;
    try {
      tab = await browser.tabs.get(tabId);
    } catch (tabError) {
      throw new Error(`Tab ${tabId} no longer exists.`);
    }

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
      throw new Error('Cannot inject into system pages');
    }

    if (tab.discarded) {
      throw new Error('Tab is discarded');
    }

    try {
      if (browser.scripting?.executeScript) {
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
      } else if (browser.tabs?.executeScript) {
        await browser.tabs.executeScript(tabId, {
          file: 'content.js'
        });
      } else {
        throw new Error('No script injection API available');
      }
    } catch (scriptError) {
      if (scriptError.message.includes('No tab with id') || scriptError.message.includes('Invalid tab ID')) {
        throw new Error(`Tab ${tabId} was closed.`);
      }
      throw scriptError;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const response = await browser.tabs.sendMessage(tabId, { type: "PING" });
      if (response && response.pong) {
        return true;
      }
      throw new Error('Content script not responding');
    } catch (verifyError) {
      throw new Error(`Injection failed: ${verifyError.message}`);
    }
  } catch (error) {
    console.error("Content script load error:", error.message);
    throw error;
  }
}

// Debug
browser.storage.local.get(["settings"]).then((result) => {
  console.log("Current settings:", result.settings);
});
