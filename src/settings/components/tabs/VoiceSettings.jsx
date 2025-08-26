import React, { useState, useEffect } from 'react';
import { Section, InputGroup, SaveButton } from '../common';
import styled from 'styled-components';
import { languageConfig } from '../../../utils/languageConfig.js';
import browser from 'webextension-polyfill';

const LanguageRowContainer = styled.div`
  margin-bottom: 20px;
`;

const LanguageRow = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr 1fr 80px 80px 40px;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  margin-bottom: 12px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const LanguageLabel = styled.div`
  font-weight: 500;
  color: var(--text-primary);
  text-transform: uppercase;
  font-size: 13px;
  letter-spacing: 0.5px;
`;

const DefaultLabel = styled(LanguageLabel)`
  color: var(--text-accent);
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:after {
    content: "⭐";
    font-size: 12px;
  }
`;

const SelectField = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  
  &:focus {
    border-color: var(--text-accent);
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
  
  &:disabled {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
  }
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  text-align: center;
  
  &:focus {
    border-color: var(--text-accent);
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
  
  &:disabled {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
  }
`;

const RemoveButton = styled.button`
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: var(--bg-hover);
    border-color: #dc2626;
    color: #dc2626;
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const AddLanguageRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border: 1px dashed var(--border-primary);
  margin-top: 16px;
`;

const AddButton = styled.button`
  padding: 8px 16px;
  background: var(--text-accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr 1fr 80px 80px 40px;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-primary);
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const HeaderLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DEFAULT_LANGUAGES = {
  default: { name: 'Default', code: 'default' },
  en: { name: 'EN', code: 'en' },
  zh: { name: 'ZH', code: 'zh' },
  ja: { name: 'JA', code: 'ja' }
};

const getAvailableLanguagesFromVoices = (groupedVoices) => {
  const languages = new Set();
  Object.keys(groupedVoices || {}).forEach(locale => {
    const langCode = locale.split('-')[0];
    languages.add(langCode);
  });
  return Array.from(languages).sort();
};

export function VoiceSettings({ 
  settings,
  selectedLocale, 
  groupedVoices, 
  onSave, 
  isSaving, 
  voicesError,
  onFetchVoices,
  setSelectedLocale
}) {
  const [languageRows, setLanguageRows] = useState([]);
  const [availableLanguages, setAvailableLanguages] = useState([]);

  // Initialize with default language
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const result = await browser.storage.local.get(['languageVoiceSettings']);
        const saved = result.languageVoiceSettings || {};
        
        // Always include default language
        const rows = [{
          id: 'default',
          language: 'default',
          region: '',
          voice: '',
          rate: 1,
          pitch: 1,
          ...saved.default
        }];
        
        // Add other saved languages
        Object.entries(saved).forEach(([langCode, settings]) => {
          if (langCode !== 'default') {
            rows.push({
              id: langCode,
              language: langCode,
              region: settings.region || '',
              voice: settings.voice || '',
              rate: settings.rate || 1,
              pitch: settings.pitch || 1
            });
          }
        });
        
        setLanguageRows(rows);
      } catch (error) {
        console.error('Failed to load voice settings:', error);
      }
    };
    
    loadSavedSettings();
  }, []);

  // Update available languages when voices change
  useEffect(() => {
    if (groupedVoices) {
      const available = getAvailableLanguagesFromVoices(groupedVoices);
      setAvailableLanguages(available);
    }
  }, [groupedVoices]);

  const saveSettings = async () => {
    const settingsToSave = {};
    languageRows.forEach(row => {
      settingsToSave[row.language] = {
        region: row.region,
        voice: row.voice,
        rate: row.rate,
        pitch: row.pitch
      };
    });
    
    await browser.storage.local.set({ languageVoiceSettings: settingsToSave });
    onSave();
  };

  const updateRow = (rowId, field, value) => {
    setLanguageRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  const addLanguageRow = () => {
    const unusedLanguages = availableLanguages.filter(lang => 
      !languageRows.some(row => row.language === lang) && 
      !DEFAULT_LANGUAGES[lang]
    );
    
    if (unusedLanguages.length > 0) {
      const newLang = unusedLanguages[0];
      const newRow = {
        id: newLang,
        language: newLang,
        region: '',
        voice: '',
        rate: 1,
        pitch: 1
      };
      setLanguageRows(prev => [...prev, newRow]);
    }
  };

  const removeLanguageRow = (rowId) => {
    if (rowId !== 'default') {
      setLanguageRows(prev => prev.filter(row => row.id !== rowId));
    }
  };

  const getRegionsForLanguage = (langCode) => {
    if (!groupedVoices) return {};
    
    if (langCode === 'default') {
      return groupedVoices;
    }
    
    return Object.entries(groupedVoices)
      .filter(([locale]) => locale.toLowerCase().startsWith(langCode.toLowerCase()))
      .reduce((acc, [locale, voices]) => {
        acc[locale] = voices;
        return acc;
      }, {});
  };

  const handleRegionChange = async (rowId, newRegion) => {
    updateRow(rowId, 'region', newRegion);
    
    if (newRegion && groupedVoices[newRegion]?.length > 0) {
      updateRow(rowId, 'voice', groupedVoices[newRegion][0].value);
      
      if (!groupedVoices[newRegion] || groupedVoices[newRegion].length === 0) {
        try {
          await onFetchVoices(settings);
        } catch (error) {
          console.error('Failed to fetch voices:', error);
        }
      }
    } else {
      updateRow(rowId, 'voice', '');
    }
  };

  return (
    <Section>
      <h2>Voice Settings</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Configure voice settings for each language. The extension will automatically detect the language and use the appropriate settings. The default row is used when no specific language is configured.
      </p>
      
      {voicesError ? (
        <div className="error-message">{voicesError}</div>
      ) : (
        <LanguageRowContainer>
          <HeaderRow>
            <HeaderLabel>Language</HeaderLabel>
            <HeaderLabel>Region</HeaderLabel>
            <HeaderLabel>Voice</HeaderLabel>
            <HeaderLabel>Speed</HeaderLabel>
            <HeaderLabel>Pitch</HeaderLabel>
            <HeaderLabel>Actions</HeaderLabel>
          </HeaderRow>
          
          {languageRows.map((row) => {
            const regions = getRegionsForLanguage(row.language);
            const isDefault = row.language === 'default';
            
            return (
              <LanguageRow key={row.id}>
                <div>
                  {isDefault ? (
                    <DefaultLabel>Default</DefaultLabel>
                  ) : (
                    <LanguageLabel>
                      {DEFAULT_LANGUAGES[row.language]?.name || row.language.toUpperCase()}
                    </LanguageLabel>
                  )}
                </div>
                
                <SelectField
                  value={row.region}
                  onChange={(e) => handleRegionChange(row.id, e.target.value)}
                >
                  <option value="">Select region</option>
                  {Object.keys(regions).sort().map(region => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </SelectField>
                
                <SelectField
                  value={row.voice}
                  onChange={(e) => updateRow(row.id, 'voice', e.target.value)}
                  disabled={!row.region}
                >
                  <option value="">Select voice</option>
                  {row.region && regions[row.region]?.map(voice => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </SelectField>
                
                <NumberInput
                  type="number"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={row.rate}
                  onChange={(e) => updateRow(row.id, 'rate', parseFloat(e.target.value) || 1)}
                />
                
                <NumberInput
                  type="number"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={row.pitch}
                  onChange={(e) => updateRow(row.id, 'pitch', parseFloat(e.target.value) || 1)}
                />
                
                <RemoveButton
                  onClick={() => removeLanguageRow(row.id)}
                  disabled={isDefault}
                  title={isDefault ? 'Default row cannot be removed' : 'Remove this language'}
                >
                  {isDefault ? '⭐' : '×'}
                </RemoveButton>
              </LanguageRow>
            );
          })}
          
          {availableLanguages.some(lang => 
            !languageRows.some(row => row.language === lang) && 
            !DEFAULT_LANGUAGES[lang]
          ) && (
            <AddLanguageRow>
              <SelectField
                onChange={(e) => {
                  if (e.target.value) {
                    const newRow = {
                      id: e.target.value,
                      language: e.target.value,
                      region: '',
                      voice: '',
                      rate: 1,
                      pitch: 1
                    };
                    setLanguageRows(prev => [...prev, newRow]);
                    e.target.value = '';
                  }
                }}
                style={{ flex: 1 }}
              >
                <option value="">Select language to add</option>
                {availableLanguages
                  .filter(lang => 
                    !languageRows.some(row => row.language === lang) && 
                    !DEFAULT_LANGUAGES[lang]
                  )
                  .map(lang => (
                    <option key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </option>
                  ))
                }
              </SelectField>
            </AddLanguageRow>
          )}
        </LanguageRowContainer>
      )}
      
      <SaveButton onClick={saveSettings} $saving={isSaving}>
        {isSaving ? 'Saved' : 'Save Voice Settings'}
      </SaveButton>
    </Section>
  );
} 