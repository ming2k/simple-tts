// Default settings
const defaultSettings = {
  targetLang: 'en',
  popupPosition: 'below',
  showIcon: true,
  enableKeyboard: false
};

// Load settings
async function loadSettings() {
  try {
    const result = await browser.storage.sync.get(defaultSettings);
    document.getElementById('targetLang').value = result.targetLang;
    document.getElementById('popupPosition').value = result.popupPosition;
    document.getElementById('showIcon').checked = result.showIcon;
    document.getElementById('enableKeyboard').checked = result.enableKeyboard;
  } catch (error) {
    showStatus('Error loading settings', false);
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    targetLang: document.getElementById('targetLang').value,
    popupPosition: document.getElementById('popupPosition').value,
    showIcon: document.getElementById('showIcon').checked,
    enableKeyboard: document.getElementById('enableKeyboard').checked
  };

  try {
    await browser.storage.sync.set(settings);
    showStatus('Settings saved successfully!', true);
  } catch (error) {
    showStatus('Error saving settings', false);
  }
}

// Reset settings
async function resetSettings() {
  try {
    await browser.storage.sync.set(defaultSettings);
    loadSettings();
    showStatus('Settings reset to defaults', true);
  } catch (error) {
    showStatus('Error resetting settings', false);
  }
}

// Show status message
function showStatus(message, success) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status-message ' + (success ? 'success' : 'error');
  setTimeout(() => {
    status.className = 'status-message';
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('reset').addEventListener('click', resetSettings); 