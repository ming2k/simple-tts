import browser from "webextension-polyfill";

// Create a context menu item when the extension is installed
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "translate-selected-text",
    title: "Translate selected text",
    contexts: ["all"],  // This makes the menu appear in all contexts (text, image, etc.)
  });
});

// Handle the context menu item click
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-selected-text") {
    // Execute custom action when the menu item is clicked
    browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        alert("Custom right-click item clicked!");
      }
    });
  }
});