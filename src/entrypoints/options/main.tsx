import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsContainer, SettingsLayout, SettingsContent } from './components/Layout';
import { Navigation } from './components/Navigation';
import { ApiSettings } from './components/ApiSettings';
import { Document } from './components/Document';
import { Sponsor } from './components/Sponsor';
import { VoiceSettings } from './components/VoiceSettings';
import { Narravo } from '../../services/ttsService';
import { useSettings } from '../../hooks/useSettings';
import { getAzureCredentials } from '../../utils/azureConfig';
import './style.css';

function Settings() {
  const { settings, updateSettings, loading } = useSettings();
  const [activeTab, setActiveTab] = useState('api');
  const [voicesError, setVoicesError] = useState('');
  const [selectedLocale, setSelectedLocale] = useState('');
  const [groupedVoices, setGroupedVoices] = useState<Record<string, any[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const validTabs = ['api', 'voice', 'document', 'sponsor'];
    const initialTab = validTabs.includes(hash) ? hash : 'api';
    setActiveTab(initialTab);
    
    if (settings.azureKey && settings.azureRegion) {
      loadVoices();
    }
  }, [loading, settings.azureKey, settings.azureRegion]);

  const loadVoices = async () => {
    try {
      const credentials = await getAzureCredentials(settings);
      const ttsService = new Narravo(credentials.azureKey, credentials.azureRegion);
      const voicesList = await ttsService.getVoicesList();
      setGroupedVoices(voicesList);
      
      const currentVoiceLocale = Object.entries(voicesList).find(([_, voices]) => 
        voices.some(voice => voice.value === settings.voice)
      );
      
      if (currentVoiceLocale) {
        setSelectedLocale(currentVoiceLocale[0]);
      }
      
      setVoicesError('');
    } catch (error) {
      console.error('Failed to load voices:', error);
      setVoicesError('Failed to load voices. Please check your API settings.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    updateSettings({ [name]: newValue });
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Settings are already updated via updateSettings hook which saves to storage
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
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

  if (loading) return null;

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

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Settings />); 
}
