// Save options to storage
function saveOptions(e) {
  e.preventDefault();
  const status = document.getElementById('status');
  
  browser.storage.sync.set({
    apiKey: document.getElementById('apiKey').value,
    speechRegion: document.getElementById('speechRegion').value,
    speechKey: document.getElementById('speechKey').value
  }).then(() => {
    status.textContent = 'Options saved.';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
}

// Restore options from storage
function restoreOptions() {
  browser.storage.sync.get({
    apiKey: '',
    speechRegion: '',
    speechKey: ''
  }).then((result) => {
    document.getElementById('apiKey').value = result.apiKey;
    document.getElementById('speechRegion').value = result.speechRegion;
    document.getElementById('speechKey').value = result.speechKey;
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  document.getElementById('saveBtn').addEventListener('click', saveOptions);
}); 