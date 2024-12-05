import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './settings.css';
import { TTSService } from '../services/ttsService';

function EyeIcon({ isVisible }) {
  return (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {isVisible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg 
      width="18" 
      height="18" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="checkmark-icon"
    >
      <path d="M20 6L9 17L4 12" />
    </svg>
  );
}

function Options() {
  const [activeTab, setActiveTab] = useState('api');
  const [voicesError, setVoicesError] = useState('');
  const [settings, setSettings] = useState({
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: 1,
    pitch: 1,
    azureKey: '',
    azureRegion: '',
    showKey: false
  });
  const [selectedLocale, setSelectedLocale] = useState('');
  const [groupedVoices, setGroupedVoices] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    browser.storage.local.get(['settings', 'optionsActiveTab']).then(async (result) => {
      if (result.settings) {
        setSettings(result.settings);
        
        if (result.settings.azureKey && result.settings.azureRegion) {
          try {
            const ttsService = new TTSService(result.settings.azureKey, result.settings.azureRegion);
            const voicesList = await ttsService.getVoicesList();
            setGroupedVoices(voicesList);
            
            const currentVoiceLocale = Object.entries(voicesList).find(([locale, voices]) => 
              voices.some(voice => voice.value === result.settings.voice)
            );
            
            if (currentVoiceLocale) {
              setSelectedLocale(currentVoiceLocale[0]);
            }
            
            setVoicesError('');
          } catch (error) {
            console.error('Failed to load voices:', error);
            setVoicesError('Failed to load voices. Please check your API settings.');
          }
        }
      }
      if (result.optionsActiveTab) {
        setActiveTab(result.optionsActiveTab);
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

  const toggleKeyVisibility = () => {
    setSettings(prev => ({
      ...prev,
      showKey: !prev.showKey
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await browser.storage.local.set({ settings });
      console.log('Saved settings:', settings);
      const result = await browser.storage.local.get('settings');
      console.log('Retrieved settings:', result.settings);
      
      // Reset saving state after a short delay
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    } catch (error) {
      setIsSaving(false);
      alert('Error saving settings');
      console.error(error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    browser.storage.local.set({ optionsActiveTab: tab });
  };

  const renderApiSettings = () => (
    <div className="settings-section">
      <h2>API Settings</h2>
      <div className="setting-item">
        <label htmlFor="azureKey">Azure Speech Key:</label>
        <div className="password-input-container">
          <input
            type={settings.showKey ? "text" : "password"}
            id="azureKey"
            name="azureKey"
            value={settings.azureKey}
            onChange={handleChange}
            placeholder="Enter your Azure Speech key"
            className="azure-input"
          />
          <button 
            onClick={toggleKeyVisibility}
            className="toggle-visibility"
            type="button"
            title={settings.showKey ? "Hide key" : "Show key"}
          >
            <EyeIcon isVisible={settings.showKey} />
          </button>
        </div>
      </div>

      <div className="setting-item">
        <label htmlFor="azureRegion">Azure Region:</label>
        <div className="region-input">
          <input
            type="text"
            id="azureRegion"
            name="azureRegion"
            value={settings.azureRegion}
            onChange={handleChange}
            placeholder="e.g., japanwest"
            className="azure-input"
            list="azure-regions"
          />
        </div>
      </div>

      <div className="button-container">
        <button 
          onClick={handleSave} 
          className={`save-button ${isSaving ? 'saving' : ''}`}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="save-success">
              Saved <CheckmarkIcon />
            </span>
          ) : 'Save API Settings'}
        </button>
      </div>
    </div>
  );

  const renderVoiceSettings = () => (
    <div className="settings-section">
      <h2>Azure Voice Settings</h2>
      <div className="setting-item">
        <label htmlFor="voiceLocale">Region:</label>
        {voicesError ? (
          <div className="error-message">{voicesError}</div>
        ) : (
          <select 
            id="voiceLocale"
            value={selectedLocale}
            onChange={(e) => setSelectedLocale(e.target.value)}
            className="voice-select"
          >
            <option value="">Select a region</option>
            {Object.keys(groupedVoices).sort().map(locale => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedLocale && (
        <div className="setting-item">
          <label htmlFor="voice">Voice:</label>
          <select 
            id="voice"
            name="voice"
            value={settings.voice}
            onChange={handleChange}
            className="voice-select"
          >
            <option value="">Select a voice</option>
            {groupedVoices[selectedLocale].map(voice => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
                {voice.isMultilingual ? ' (Multilingual)' : ''}
                {voice.styles.length > 0 ? ' (Styles available)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="setting-item slider-container">
        <label htmlFor="rate">Speed:</label>
        <div className="slider-with-value">
          <input
            type="range"
            id="rate"
            name="rate"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.rate}
            onChange={handleChange}
          />
          <span className="slider-value">{settings.rate}x</span>
        </div>
      </div>

      <div className="setting-item slider-container">
        <label htmlFor="pitch">Pitch:</label>
        <div className="slider-with-value">
          <input
            type="range"
            id="pitch"
            name="pitch"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.pitch}
            onChange={handleChange}
          />
          <span className="slider-value">{settings.pitch}x</span>
        </div>
      </div>

      <div className="button-container">
        <button 
          onClick={handleSave} 
          className={`save-button ${isSaving ? 'saving' : ''}`}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="save-success">
              Saved <CheckmarkIcon />
            </span>
          ) : 'Save Voice Settings'}
        </button>
      </div>
    </div>
  );

  const renderGuide = () => (
    <div className="settings-section">
      <h2>How to Use</h2>
      <div className="guide-content">
        <div className="guide-step">
          <h3>1. Setup Azure Speech Service</h3>
          <ul>
            <li>Create an Azure account if you don't have one</li>
            <li>Create a Speech Service resource in Azure Portal</li>
            <li>Copy your API key and region from the resource</li>
          </ul>
        </div>
        
        <div className="guide-step">
          <h3>2. Configure Extension</h3>
          <ul>
            <li>Enter your Azure API key and region in the API Settings tab</li>
            <li>Select your preferred voice in the Voice Settings tab</li>
            <li>Adjust speech rate and pitch to your liking</li>
          </ul>
        </div>

        <div className="guide-step">
          <h3>3. Using the Extension</h3>
          <ul>
            <li>Select any text on a webpage</li>
            <li>Click the extension icon or use right-click menu</li>
            <li>The selected text will be read aloud</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSponsor = () => (
    <div className="settings-section">
      <h2>Support the Project</h2>
      <div className="sponsor-content">
        <p>If you find this extension helpful, consider supporting its development!</p>
        
        <div className="sponsor-options">
          <a 
            href="https://github.com/sponsors/ming2k" 
            target="_blank" 
            rel="noopener noreferrer"
            className="sponsor-button github"
          >
            ❤️ Sponsor on GitHub
          </a>
          
          <a 
            href="https://buymeacoffee.com/mingmillenx"
            target="_blank" 
            rel="noopener noreferrer"
            className="sponsor-button coffee"
          >
            ☕ Buy me a coffee
          </a>
        </div>

        <div className="chinese-payment">
          <h3>中国用户赞助方式</h3>
          <div className="qr-codes">
            <div className="qr-code-container">
              <img 
                src="https://cdn.jsdelivr.net/gh/ming2k/img-hosting/mings-wechat-payment-pure-qrcode.png" 
                alt="WeChat Pay QR Code" 
                className="qr-code"
              />
              <span>微信支付</span>
            </div>
            <div className="qr-code-container">
              <img 
                src="https://cdn.jsdelivr.net/gh/ming2k/img-hosting/mings-alipay-payment-pure-qrcode.png" 
                alt="Alipay QR Code" 
                className="qr-code"
              />
              <span>支付宝</span>
            </div>
          </div>
        </div>

        <div className="project-links">
          <a 
            href="https://github.com/ming2k/simple-tts" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            📦 GitHub Repository
          </a>
          <a 
            href="https://github.com/ming2k/simple-tts/issues" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            🐛 Report Issues
          </a>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'api':
        return renderApiSettings();
      case 'voice':
        return renderVoiceSettings();
      case 'guide':
        return renderGuide();
      case 'sponsor':
        return renderSponsor();
      default:
        return renderApiSettings();
    }
  };

  return (
    <div className="options-container">
      <h1>{browser.i18n.getMessage('settingsTitle')}</h1>
      
      <div className="settings-layout">
        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => handleTabChange('api')}
          >
            API Settings
          </button>
          <button 
            className={`tab-button ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => handleTabChange('voice')}
          >
            Voice Settings
          </button>
          <button 
            className={`tab-button ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => handleTabChange('guide')}
          >
            Guide
          </button>
          <button 
            className={`tab-button ${activeTab === 'sponsor' ? 'active' : ''}`}
            onClick={() => handleTabChange('sponsor')}
          >
            Sponsor
          </button>
        </div>

        <div className="settings-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Options />); 