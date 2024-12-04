import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './options.css';

function Options() {
  const [settings, setSettings] = useState({
    defaultVoice: 'en-US',
    defaultRate: 1,
    defaultPitch: 1,
    autoPlay: false,
    azureKey: '',
    azureRegion: ''
  });

  useEffect(() => {
    // Load saved settings
    browser.storage.local.get('settings').then((result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSave = async () => {
    try {
      await browser.storage.local.set({ settings });
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Error saving settings');
      console.error(error);
    }
  };

  return (
    <div className="options-container">
      <h1>{browser.i18n.getMessage('settingsTitle')}</h1>
      
      <div className="settings-section">
        <h2>Voice Settings</h2>
        
        <div className="setting-item">
          <label htmlFor="defaultVoice">Default Voice:</label>
          <select 
            id="defaultVoice"
            name="defaultVoice"
            value={settings.defaultVoice}
            onChange={handleChange}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="zh-CN">Chinese</option>
            <option value="ja-JP">Japanese</option>
          </select>
        </div>

        <div className="setting-item">
          <label htmlFor="defaultRate">Speech Rate:</label>
          <input
            type="range"
            id="defaultRate"
            name="defaultRate"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.defaultRate}
            onChange={handleChange}
          />
          <span>{settings.defaultRate}x</span>
        </div>

        <div className="setting-item">
          <label htmlFor="defaultPitch">Speech Pitch:</label>
          <input
            type="range"
            id="defaultPitch"
            name="defaultPitch"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.defaultPitch}
            onChange={handleChange}
          />
          <span>{settings.defaultPitch}</span>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              name="autoPlay"
              checked={settings.autoPlay}
              onChange={handleChange}
            />
            Auto-play on text selection
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Azure Speech Service Settings</h2>
        <div className="setting-item">
          <label htmlFor="azureKey">Azure Speech Key:</label>
          <input
            type="password"
            id="azureKey"
            name="azureKey"
            value={settings.azureKey}
            onChange={handleChange}
            placeholder="Enter your Azure Speech key"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="azureRegion">Azure Region:</label>
          <input
            type="text"
            id="azureRegion"
            name="azureRegion"
            value={settings.azureRegion}
            onChange={handleChange}
            placeholder="e.g., eastus"
          />
        </div>
      </div>

      <div className="settings-section">
        <h2>About</h2>
        <p>Version: 1.0.0</p>
        <p>
          <a href="https://github.com/ming2k/simple-tts" target="_blank" rel="noopener noreferrer">
            GitHub Repository
          </a>
        </p>
      </div>

      <div className="button-container">
        <button onClick={handleSave} className="save-button">
          Save Settings
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Options />); 