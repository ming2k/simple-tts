import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsContainer, SettingsLayout, SettingsContent } from './components/Layout';
import { Navigation } from './components/Navigation';
import { ApiSettings } from './components/ApiSettings';
import { Document } from './components/Document';
import { Sponsor } from './components/Sponsor';
import './settings.css';
import { TTSService } from '../services/ttsService';
import { VoiceSettings } from './components/VoiceSettings';

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

function Settings() {
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
    // Get initial tab from URL hash or storage
    const hash = window.location.hash.slice(1);
    const validTabs = ['api', 'voice', 'document', 'sponsor'];
    const initialTab = validTabs.includes(hash) ? hash : 'api';
    
    browser.storage.local.get(['settings', 'optionsActiveTab']).then(async (result) => {
      setActiveTab(initialTab);
      
      // Initialize settings with environment variables if no stored settings
      if (!result.settings) {
        const defaultSettings = {
          voice: 'zh-CN-XiaoxiaoNeural',
          rate: 1,
          pitch: 1,
          azureKey: process.env.AZURE_SPEECH_KEY || '',
          azureRegion: process.env.AZURE_REGION || '',
          showKey: false
        };
        setSettings(defaultSettings);
      } else {
        setSettings(result.settings);
      }
      
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
    // Update URL hash when tab changes
    window.location.hash = tab;
    browser.storage.local.set({ optionsActiveTab: tab });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'api':
        return (
          <ApiSettings 
            settings={settings}
            onChange={handleChange}
            onSave={handleSave}
            isSaving={isSaving}
          />
        );
      case 'voice':
        return (
          <VoiceSettings 
            settings={settings}
            selectedLocale={selectedLocale}
            groupedVoices={groupedVoices}
            onChange={handleChange}
            onSave={handleSave}
            isSaving={isSaving}
            voicesError={voicesError}
          />
        );
      case 'document':
        return <Document />;
      case 'sponsor':
        return <Sponsor />;
      default:
        return null;
    }
  };

  return (
    <SettingsContainer>
      <h1>{browser.i18n.getMessage('settingsTitle')}</h1>
      <SettingsLayout>
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
        <SettingsContent>
          {renderContent()}
        </SettingsContent>
      </SettingsLayout>
    </SettingsContainer>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Settings />); 