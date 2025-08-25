import React, { useState, useEffect } from 'react';
import { Section, InputGroup, SaveButton } from '../common';
import styled from 'styled-components';
import { languageConfig } from '../../../utils/languageConfig.js';
import browser from 'webextension-polyfill';

// First define the base LanguageTab
const LanguageTab = styled.button`
  padding: 8px 16px;
  border: 1px solid ${props => props.$active ? 'var(--text-accent)' : 'var(--border-primary)'};
  background: ${props => props.$active ? 'var(--text-accent)' : 'var(--bg-primary)'};
  color: ${props => props.$active ? 'var(--text-white)' : 'var(--text-secondary)'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    border-color: var(--text-accent);
    color: ${props => props.$active ? 'var(--text-white)' : 'var(--text-accent)'};
  }
`;

// Then define the container components
const LanguageTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 8px;
  justify-content: space-between;
`;

const MainLanguageTabs = styled.div`
  display: flex;
  gap: 8px;
`;

// Then define components that extend LanguageTab
const OtherLanguageTab = styled(LanguageTab)`
  background: ${props => props.$active ? 'var(--text-secondary)' : 'var(--bg-primary)'};
  border-color: ${props => props.$active ? 'var(--text-secondary)' : 'var(--border-primary)'};
  
  &:hover {
    border-color: var(--text-secondary);
    color: ${props => props.$active ? 'var(--text-white)' : 'var(--text-secondary)'};
  }
`;

const DraggableLanguageTab = styled(LanguageTab)`
  cursor: move;
  touch-action: none;
  transition: all 0.2s ease;
  position: relative;
  transform: translateX(0);
  
  ${props => props.$isDragging && `
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    opacity: 0.8;
    z-index: 1;
  `}

  ${props => props.$isDragOver && `
    transform: translateX(${props.$dragDirection === 'left' ? '-8px' : '8px'});
  `}
`;

const LanguageSettings = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
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
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-secondary);

  &:focus {
    border-color: var(--text-accent);
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
`;

// Add these styled components near the top with other styled components
const PinButton = styled.button`
  padding: 4px 8px;
  background: ${props => props.$pinned ? 'var(--bg-hover)' : 'transparent'};
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  
  &:hover {
    background: ${props => props.$pinned ? 'var(--bg-hover)' : 'var(--bg-secondary)'};
  }
`;

const LanguageHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

// Modify the DEFAULT_MAIN_LANGUAGES constant to use abbreviations
const DEFAULT_MAIN_LANGUAGES = {
  en: { name: 'EN', order: 1, pinned: true },
  zh: { name: 'ZH', order: 2, pinned: true },
  ja: { name: 'JA', order: 3, pinned: true },
  other: { name: 'Other', order: 4, pinned: true }
};

// First, add this styled component for the pin button in the Other Languages section
const OtherLanguagePinButton = styled(PinButton)`
  margin-top: 16px;
  width: 100%;
  justify-content: center;
`;

// Add a function to get language abbreviation
const getLanguageAbbreviation = (langCode) => {
  return langCode.toUpperCase();
};

// Add this function to debounce state updates
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function VoiceSettings({ 
  settings,  // Now only contains API settings
  selectedLocale, 
  groupedVoices, 
  onSave, 
  isSaving, 
  voicesError,
  onFetchVoices,
  setSelectedLocale
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

  // Initialize internalLocale with selectedLocale prop
  const [internalLocale, setInternalLocale] = useState(selectedLocale || '');

  const [pinnedLanguages, setPinnedLanguages] = useState({});
  const [mainLanguages, setMainLanguages] = useState(DEFAULT_MAIN_LANGUAGES);

  // Add drag and drop functionality
  const [draggedLang, setDraggedLang] = useState(null);
  const [dragOverLang, setDragOverLang] = useState(null);
  const [dragDirection, setDragDirection] = useState(null);

  // In the VoiceSettings component, add this state
  const [orderedLanguages, setOrderedLanguages] = useState([]);

  useEffect(() => {
    // Load saved voice settings for all languages
    browser.storage.local.get('voiceSettings').then(result => {
      if (result.voiceSettings) {
        setVoiceSettings(result.voiceSettings);
        // Set current settings based on active language if available
        if (activeLanguage && result.voiceSettings[activeLanguage]) {
          const savedSettings = result.voiceSettings[activeLanguage];
          setCurrentSettings(savedSettings);
          
          // Restore the locale from the saved voice
          if (savedSettings.voice) {
            const locale = Object.keys(groupedVoices).find(locale => 
              groupedVoices[locale]?.some(voice => voice.value === savedSettings.voice)
            );
            if (locale) {
              setInternalLocale(locale);
              setSelectedLocale(locale);
            }
          }
        }
      }
    });
  }, [activeLanguage, groupedVoices, setSelectedLocale]); // Add dependencies

  // Add effect to sync internalLocale with selectedLocale prop
  useEffect(() => {
    if (selectedLocale) {
      setInternalLocale(selectedLocale);
    }
  }, [selectedLocale]);

  // Load pinned languages on component mount
  useEffect(() => {
    browser.storage.local.get('pinnedLanguages').then(result => {
      if (result.pinnedLanguages) {
        setPinnedLanguages(result.pinnedLanguages);
        // Update mainLanguages with saved pinned states
        setMainLanguages(prev => ({
          ...prev,
          ...Object.keys(result.pinnedLanguages).reduce((acc, lang) => ({
            ...acc,
            [lang]: {
              ...prev[lang],
              pinned: result.pinnedLanguages[lang]
            }
          }), {})
        }));
      }
    });
  }, []);

  // Add this effect to maintain ordered languages
  useEffect(() => {
    const ordered = Object.entries(mainLanguages)
      .filter(([code, lang]) => lang.pinned && code !== 'other')
      .sort((a, b) => a[1].order - b[1].order);
    setOrderedLanguages(ordered);
  }, [mainLanguages]);

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
    
    // Add unpinned main languages
    Object.entries(mainLanguages).forEach(([langCode, lang]) => {
      if (langCode !== 'other' && !lang.pinned) {
        languages.add(langCode);
      }
    });

    // Add other available languages
    Object.keys(groupedVoices).forEach(locale => {
      const langCode = locale.split('-')[0];
      if (!MAIN_LANGUAGES[langCode] || !mainLanguages[langCode]?.pinned) {
        languages.add(langCode);
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
          // Include both non-main languages and unpinned main languages
          return !mainLanguages[localeLang]?.pinned;
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
      // Restore the locale from the saved voice
      if (savedSettings.voice) {
        const locale = Object.keys(groupedVoices).find(locale => 
          groupedVoices[locale]?.some(voice => voice.value === savedSettings.voice)
        );
        if (locale) {
          setInternalLocale(locale);
          setSelectedLocale(locale);
        }
      }
    } else {
      // Reset settings if no saved settings exist
      setCurrentSettings({
        voice: '',
        rate: 1,
        pitch: 1
      });
      setInternalLocale('');
      setSelectedLocale('');
    }
  };

  // Modify the handleLocaleChange function to use proper abbreviation
  const handleLocaleChange = async (e) => {
    const newLocale = e.target.value;
    setInternalLocale(newLocale);
    
    if (newLocale) {
      try {
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

          // Add the new language to mainLanguages if it doesn't exist
          if (!mainLanguages[langCode]) {
            const newLang = {
              name: getLanguageAbbreviation(langCode),
              order: Object.keys(mainLanguages).length + 1,
              pinned: false
            };
            const updatedMainLanguages = {
              ...mainLanguages,
              [langCode]: newLang
            };
            setMainLanguages(updatedMainLanguages);
            // Save to storage immediately
            await browser.storage.local.set({ mainLanguages: updatedMainLanguages });
          }
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

  // Add this function to handle pinning/unpinning languages
  const handlePinLanguage = async (langCode) => {
    const newPinnedState = !mainLanguages[langCode]?.pinned;
    
    // Update local state
    setMainLanguages(prev => {
      const updated = { ...prev };
      updated[langCode] = {
        ...updated[langCode],
        pinned: newPinnedState
      };

      // If unpinning, adjust orders of remaining pinned languages
      if (!newPinnedState) {
        const pinnedLangs = Object.entries(updated)
          .filter(([code, lang]) => lang.pinned && code !== 'other')
          .sort((a, b) => a[1].order - b[1].order);
        
        // Reorder remaining pinned languages
        pinnedLangs.forEach((lang, index) => {
          updated[lang[0]].order = index + 1;
        });
      }

      return updated;
    });

    // Save to storage
    const newPinnedLanguages = {
      ...pinnedLanguages,
      [langCode]: newPinnedState
    };
    setPinnedLanguages(newPinnedLanguages);
    
    // Save both states
    await browser.storage.local.set({ 
      pinnedLanguages: newPinnedLanguages,
      mainLanguages: mainLanguages 
    });
  };

  // Update the drag handlers
  const handleDragStart = (langCode, e) => {
    setDraggedLang(langCode);
    // Set custom drag image (optional)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  // Update the handleDragOver function
  const handleDragOver = (e, langCode) => {
    e.preventDefault();
    if (draggedLang && draggedLang !== langCode) {
      const draggedOrder = mainLanguages[draggedLang].order;
      const targetOrder = mainLanguages[langCode].order;
      
      // Determine drag direction
      setDragDirection(draggedOrder < targetOrder ? 'right' : 'left');
      setDragOverLang(langCode);

      // Debounce the order update
      debounce(() => {
        setMainLanguages(prev => {
          const updated = { ...prev };
          // Update orders
          Object.keys(updated).forEach(key => {
            const lang = updated[key];
            if (draggedOrder < targetOrder) {
              if (lang.order > draggedOrder && lang.order <= targetOrder) {
                lang.order--;
              }
            } else {
              if (lang.order >= targetOrder && lang.order < draggedOrder) {
                lang.order++;
              }
            }
          });
          updated[draggedLang].order = targetOrder;
          return updated;
        });
      }, 50)();
    }
  };

  const handleDragEnd = async () => {
    setDraggedLang(null);
    setDragOverLang(null);
    setDragDirection(null);
    // Save both mainLanguages and pinnedLanguages to storage
    await browser.storage.local.set({ 
      mainLanguages: mainLanguages,
      pinnedLanguages: pinnedLanguages 
    });
  };

  // Add drag leave handler
  const handleDragLeave = () => {
    setDragOverLang(null);
    setDragDirection(null);
  };

  // Add an effect to load mainLanguages from storage on mount
  useEffect(() => {
    browser.storage.local.get(['mainLanguages', 'pinnedLanguages']).then(result => {
      if (result.mainLanguages) {
        // Ensure all languages have proper abbreviations
        const updatedMainLanguages = Object.entries(result.mainLanguages).reduce((acc, [code, lang]) => {
          acc[code] = {
            ...lang,
            name: code === 'other' ? 'Other' : getLanguageAbbreviation(code)
          };
          return acc;
        }, {});
        setMainLanguages(updatedMainLanguages);
      }
      if (result.pinnedLanguages) {
        setPinnedLanguages(result.pinnedLanguages);
      }
    });
  }, []);

  return (
    <Section>
      <h2>Voice Settings</h2>
      {voicesError ? (
        <div className="error-message">{voicesError}</div>
      ) : (
        <>
          <LanguageTabs>
            <MainLanguageTabs>
              {orderedLanguages.map(([langCode, lang]) => (
                <DraggableLanguageTab
                  key={langCode}
                  $active={activeLanguage === langCode}
                  $isDragging={draggedLang === langCode}
                  $isDragOver={dragOverLang === langCode}
                  $dragDirection={dragDirection}
                  onClick={() => handleLanguageChange(langCode)}
                  draggable
                  onDragStart={(e) => handleDragStart(langCode, e)}
                  onDragOver={(e) => handleDragOver(e, langCode)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={handleDragLeave}
                >
                  {lang.name}
                </DraggableLanguageTab>
              ))}
            </MainLanguageTabs>
            <OtherLanguageTab
              $active={activeLanguage === 'other'}
              onClick={() => handleLanguageChange('other')}
            >
              {mainLanguages.other.name}
            </OtherLanguageTab>
          </LanguageTabs>

          <LanguageSettings>
            <LanguageHeader>
              <h3>
                {activeLanguage === 'other' 
                  ? 'Other Languages'
                  : `${mainLanguages[activeLanguage]?.name} - ${languageConfig[activeLanguage]?.name || activeLanguage.toUpperCase()}`}
              </h3>
              {activeLanguage !== 'other' && (
                <PinButton
                  $pinned={mainLanguages[activeLanguage]?.pinned}
                  onClick={() => handlePinLanguage(activeLanguage)}
                >
                  {mainLanguages[activeLanguage]?.pinned ? '📌 Pinned' : '📍 Pin'}
                </PinButton>
              )}
            </LanguageHeader>

            {activeLanguage === 'other' && (
              <>
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

                {/* Add pin button for selected other language */}
                {selectedLocale && currentSettings.voice && (
                  <OtherLanguagePinButton
                    $pinned={mainLanguages[selectedLocale.split('-')[0]]?.pinned}
                    onClick={() => handlePinLanguage(selectedLocale.split('-')[0])}
                  >
                    {mainLanguages[selectedLocale.split('-')[0]]?.pinned 
                      ? '📌 Remove from Quick Access' 
                      : '📍 Add to Quick Access'}
                  </OtherLanguagePinButton>
                )}
              </>
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