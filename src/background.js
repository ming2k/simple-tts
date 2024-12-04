// Create context menu item
chrome.contextMenus.create({
  id: 'speak-selection',
  title: 'Speak selected text',
  contexts: ['selection']
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'speak-selection') {
    // Get the selected text
    const selectedText = info.selectionText;
    
    // Store the selected text and a flag to auto-speak
    chrome.storage.local.set({ 
      lastInput: selectedText,
      shouldAutoSpeak: true
    }, () => {
      chrome.action.openPopup();
    });
  }
}); 