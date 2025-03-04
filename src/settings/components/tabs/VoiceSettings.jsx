import React, { useState, useEffect } from 'react';
import { Section, InputGroup, SaveButton } from '../common';
import styled from 'styled-components';
import { languageConfig } from '../../../utils/languageConfig.js';
import browser from 'webextension-polyfill';

// Styled components for language tabs
const LanguageTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 8px;
`;

const LanguageTab = styled.button`
  padding: 8px 16px;
  border: 1px solid ${props => props.$active ? '#2563eb' : '#e5e7eb'};
  background: ${props => props.$active ? '#2563eb' : 'white'};
  color: ${props => props.$active ? 'white' : '#374151'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    border-color: #2563eb;
    color: ${props => props.$active ? 'white' : '#2563eb'};
  }
`;

const LanguageSettings = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const SliderContainer = styled.div`
  margin: 16px 0;
`;

const SliderWithValue = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SliderValue = styled.span`
  min-width: 40px;
  text-align: right;
`;

const Slider = styled.input`
  flex: 1;
  width: 100%;
`;

// Add a constant for default languages and other languages
const MAIN_LANGUAGES = {
  en: { name: 'English', order: 1 },
  zh: { name: 'Chinese', order: 2 },
  ja: { name: 'Japanese', order: 3 },
  other: { name: 'Other Languages', order: 4 }
};

// Add styled component for language groups
const OtherLanguagesSelect = styled.select`
  width: 100%;
  padding: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;

  &:focus {
    border-color: #2563eb;
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
`;

export function VoiceSettings({ 
  settings,  // Now only contains API settings
  selectedLocale, 
  groupedVoices, 
  onSave, 
  isSaving, 
  voicesError,
  onFetchVoices,
  setSelectedLocale  // Add this prop
}) {
  const [activeLanguage, setActiveLanguage] = useState(() => {
    if (settings.voice) {
      const langCode = settings.voice.split('-')[0];
      return langCode in MAIN_LANGUAGES ? langCode : 'other';
    }
    return 'en';
  });

  const [voiceSettings, setVoiceSettings] = useState({});
  const [currentSettings, setCurrentSettings] = useState({
    voice: '',
    rate: 1,
    pitch: 1
  });

  useEffect(() => {
    // Load saved voice settings for all languages
    browser.storage.local.get('voiceSettings').then(result => {
      if (result.voiceSettings) {
        setVoiceSettings(result.voiceSettings);
        // Set current settings based on active language if available
        if (activeLanguage && result.voiceSettings[activeLanguage]) {
          setCurrentSettings(result.voiceSettings[activeLanguage]);
        }
      }
    });
  }, []);

  // Save language-specific settings
  const saveVoiceSettings = async (langCode, settings) => {
    const newVoiceSettings = {
      ...voiceSettings,
      [langCode]: settings
    };
    
    await browser.storage.local.set({ voiceSettings: newVoiceSettings });
    setVoiceSettings(newVoiceSettings);
  };

  // Get all available language codes from voices
  const getAvailableLanguages = () => {
    const languages = new Set();
    Object.keys(groupedVoices).forEach(locale => {
      const langCode = locale.split('-')[0];
      if (!MAIN_LANGUAGES[langCode]) {
        languages.add(locale.split('-')[0]);
      }
    });
    return Array.from(languages).sort();
  };

  // Filter voices by language
  const getVoicesForLanguage = (langCode) => {
    if (langCode === 'other') {
      return Object.entries(groupedVoices)
        .filter(([locale]) => {
          const localeLang = locale.split('-')[0];
          return !MAIN_LANGUAGES[localeLang];
        })
        .reduce((acc, [locale, voices]) => {
          acc[locale] = voices;
          return acc;
        }, {});
    }

    return Object.entries(groupedVoices)
      .filter(([locale]) => locale.toLowerCase().startsWith(langCode.toLowerCase()))
      .reduce((acc, [locale, voices]) => {
        acc[locale] = voices;
        return acc;
      }, {});
  };

  const handleLanguageChange = async (langCode) => {
    setActiveLanguage(langCode);
    
    // Load saved settings for this language if they exist
    const savedSettings = voiceSettings[langCode];
    if (savedSettings) {
      setCurrentSettings(savedSettings);
    }
  };

  const handleLocaleChange = async (e) => {
    const newLocale = e.target.value;
    
    if (newLocale) {
      try {
        // First update the selected locale
        setSelectedLocale(newLocale);

        if (!groupedVoices[newLocale] || groupedVoices[newLocale].length === 0) {
          await onFetchVoices(settings);
        }

        if (groupedVoices[newLocale]?.length > 0) {
          const langCode = newLocale.split('-')[0];
          const newSettings = {
            voice: groupedVoices[newLocale][0].value,
            rate: currentSettings.rate,
            pitch: currentSettings.pitch
          };
          
          await saveVoiceSettings(langCode, newSettings);
          setCurrentSettings(newSettings);
        }
      } catch (error) {
        console.error('Failed to load voices for locale:', error);
      }
    }
  };

  // Modified save handler
  const handleSave = async () => {
    const langCode = currentSettings.voice.split('-')[0];
    await saveVoiceSettings(langCode, currentSettings);
    onSave();
  };

  const filteredVoices = getVoicesForLanguage(activeLanguage);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = name === 'rate' || name === 'pitch' ? parseFloat(value) : value;
    setCurrentSettings(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  return (
    <Section>
      <h2>Voice Settings</h2>
      {voicesError ? (
        <div className="error-message">{voicesError}</div>
      ) : (
        <>
          <LanguageTabs>
            {Object.entries(MAIN_LANGUAGES).map(([langCode, lang]) => (
              <LanguageTab
                key={langCode}
                $active={activeLanguage === langCode}
                onClick={() => handleLanguageChange(langCode)}
              >
                {lang.name}
              </LanguageTab>
            ))}
          </LanguageTabs>

          <LanguageSettings>
            {activeLanguage === 'other' && (
              <InputGroup>
                <label htmlFor="otherLanguages">Select Language:</label>
                <OtherLanguagesSelect
                  id="otherLanguages"
                  value={selectedLocale?.split('-')[0] || ''}
                  onChange={(e) => {
                    const langCode = e.target.value;
                    const firstLocale = Object.keys(filteredVoices).find(
                      locale => locale.startsWith(langCode)
                    );
                    if (firstLocale) {
                      handleLocaleChange({ target: { value: firstLocale } });
                    }
                  }}
                >
                  <option value="">Select a language</option>
                  {getAvailableLanguages().map(lang => (
                    <option key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </option>
                  ))}
                </OtherLanguagesSelect>
              </InputGroup>
            )}

            <InputGroup>
              <label htmlFor="voiceLocale">Region:</label>
              <select 
                id="voiceLocale"
                value={selectedLocale || ''}
                onChange={handleLocaleChange}
                className="voice-select"
              >
                <option value="">Select a region</option>
                {Object.keys(filteredVoices).sort().map(locale => (
                  <option key={locale} value={locale}>
                    {locale}
                  </option>
                ))}
              </select>
            </InputGroup>

            {selectedLocale && (
              <InputGroup>
                <label htmlFor="voice">Voice:</label>
                <select 
                  id="voice"
                  name="voice"
                  value={currentSettings.voice}
                  onChange={handleChange}
                  className="voice-select"
                >
                  <option value="">Select a voice</option>
                  {filteredVoices[selectedLocale]?.map(voice => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </InputGroup>
            )}
          </LanguageSettings>

          <SliderContainer>
            <label htmlFor="rate">Speed:</label>
            <SliderWithValue>
              <Slider
                type="range"
                id="rate"
                name="rate"
                min={0.5}
                max={2}
                step={0.1}
                value={currentSettings.rate || 1}
                onChange={handleChange}
              />
              <SliderValue>{currentSettings.rate || 1}x</SliderValue>
            </SliderWithValue>
          </SliderContainer>

          <SliderContainer>
            <label htmlFor="pitch">Pitch:</label>
            <SliderWithValue>
              <Slider
                type="range"
                id="pitch"
                name="pitch"
                min={0.5}
                max={2}
                step={0.1}
                value={currentSettings.pitch || 1}
                onChange={handleChange}
              />
              <SliderValue>{currentSettings.pitch || 1}x</SliderValue>
            </SliderWithValue>
          </SliderContainer>
        </>
      )}
      <SaveButton onClick={handleSave} $saving={isSaving}>
        {isSaving ? 'Saved ✓' : 'Save Voice Settings'}
      </SaveButton>
    </Section>
  );
} 