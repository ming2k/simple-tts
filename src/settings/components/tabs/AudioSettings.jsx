import React, { useState, useEffect } from 'react';
import { Section, SaveButton } from '../common';
import styled from 'styled-components';
import browser from 'webextension-polyfill';
import { AudioService } from '../../../services/audioService';
import { testVoice } from '../../../utils/audioPlayer';

const AudioContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 700px;
`;

const VoiceSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-secondary);
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionDescription = styled.p`
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
`;

const ControlRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (min-width: 640px) {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 20px;
    align-items: center;
  }

  @media (max-width: 480px) {
    gap: 6px;
  }
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
  margin-bottom: 4px;

  @media (min-width: 640px) {
    margin-bottom: 0;
  }
`;

const SelectField = styled.select`
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:focus {
    border-color: var(--text-accent);
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &:hover:not(:disabled) {
    border-color: var(--border-accent);
  }

  &:disabled {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
    opacity: 0.7;
  }

  option {
    padding: 8px;
  }
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 0;
`;

const Slider = styled.input`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &::-webkit-slider-track {
    height: 8px;
    border-radius: 4px;
    background: var(--bg-tertiary);
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--text-accent);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
    }
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--text-accent);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-track {
    height: 8px;
    border-radius: 4px;
    background: var(--bg-tertiary);
    border: none;
  }

  &:focus {
    &::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2), 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
`;

const SliderValue = styled.span`
  min-width: 45px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-accent);
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-secondary);
`;

const TestButton = styled.button`
  padding: 12px 24px;
  background: var(--text-accent);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: var(--text-accent);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 10px 14px;
  border: 1.5px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--text-accent);
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;

const FilterLabel = styled.span`
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
`;

const FilterSelect = styled.select`
  padding: 8px 10px;
  border: 1.5px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;

  &:focus {
    border-color: var(--text-accent);
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const VoiceCount = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-left: auto;
  white-space: nowrap;
`;

export function AudioSettings({
  groupedVoices,
  onSave,
  isSaving,
  voicesError
}) {
  const [voiceSettings, setVoiceSettings] = useState({
    voice: 'en-US-JennyNeural',
    speed: 1.0,
    pitch: 1.0
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioService] = useState(() => new AudioService());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterMultilingual, setFilterMultilingual] = useState('all');
  const [filterLocale, setFilterLocale] = useState('all');

  // Load saved settings
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const result = await browser.storage.local.get(['languageVoiceSettings']);
        const saved = result.languageVoiceSettings?.default || {};

        setVoiceSettings({
          voice: saved.voice || 'en-US-JennyNeural',
          speed: saved.rate || 1.0,
          pitch: saved.pitch || 1.0
        });
      } catch (error) {
        console.error('Failed to load voice settings:', error);
      }
    };

    loadSavedSettings();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioService.stopAudio().catch(() => {
        // Ignore cleanup errors
      });
    };
  }, [audioService]);

  const saveSettings = async () => {
    const settingsToSave = {
      default: {
        voice: voiceSettings.voice,
        rate: voiceSettings.speed,
        pitch: voiceSettings.pitch
      }
    };

    await browser.storage.local.set({ languageVoiceSettings: settingsToSave });
    onSave();
  };

  const updateSetting = (field, value) => {
    setVoiceSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestVoice = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const testSettings = {
        voice: voiceSettings.voice,
        rate: voiceSettings.speed,
        pitch: voiceSettings.pitch
      };

      await testVoice(audioService, testSettings);
    } catch (error) {
      console.error('Test voice failed:', error);
      alert('Voice test failed. Please check your API settings and internet connection.');
    } finally {
      setIsPlaying(false);
    }
  };

  // Get all available voices as a flat list
  const getAllVoices = () => {
    if (!groupedVoices) return [];

    const allVoices = [];
    Object.values(groupedVoices).forEach(localeVoices => {
      allVoices.push(...localeVoices);
    });

    return allVoices.sort((a, b) => a.label.localeCompare(b.label));
  };

  // Get unique locales for filter dropdown
  const getUniqueLocales = () => {
    const allVoices = getAllVoices();
    const locales = [...new Set(allVoices.map(v => v.locale))];
    return locales.sort();
  };

  // Filter voices based on search term and filters
  const getFilteredVoices = () => {
    let voices = getAllVoices();

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      voices = voices.filter(voice =>
        voice.label.toLowerCase().includes(term) ||
        voice.value.toLowerCase().includes(term) ||
        voice.locale.toLowerCase().includes(term)
      );
    }

    // Apply gender filter
    if (filterGender !== 'all') {
      voices = voices.filter(voice => voice.gender === filterGender);
    }

    // Apply multilingual filter
    if (filterMultilingual === 'yes') {
      voices = voices.filter(voice => voice.isMultilingual);
    } else if (filterMultilingual === 'no') {
      voices = voices.filter(voice => !voice.isMultilingual);
    }

    // Apply locale filter
    if (filterLocale !== 'all') {
      voices = voices.filter(voice => voice.locale === filterLocale);
    }

    return voices;
  };

  const allVoices = getAllVoices();
  const filteredVoices = getFilteredVoices();
  const uniqueLocales = getUniqueLocales();

  return (
    <Section>
      <h2>Audio Settings</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Configure your preferred voice and playback settings. These settings will apply to all text-to-speech operations.
      </p>

      {voicesError ? (
        <div className="error-message">{voicesError}</div>
      ) : (
        <AudioContainer>
          <VoiceSection>
            <SectionTitle>
              Voice Selection
            </SectionTitle>
            <SectionDescription>
              Choose your preferred voice from the available options. Different voices may have unique characteristics and language support.
            </SectionDescription>

            <FilterSection>
              <FilterRow>
                <SearchInput
                  type="text"
                  placeholder="Search voices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FilterGroup>
                  <FilterLabel>Gender:</FilterLabel>
                  <FilterSelect
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </FilterSelect>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Multilingual:</FilterLabel>
                  <FilterSelect
                    value={filterMultilingual}
                    onChange={(e) => setFilterMultilingual(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </FilterSelect>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Locale:</FilterLabel>
                  <FilterSelect
                    value={filterLocale}
                    onChange={(e) => setFilterLocale(e.target.value)}
                  >
                    <option value="all">All</option>
                    {uniqueLocales.map(locale => (
                      <option key={locale} value={locale}>{locale}</option>
                    ))}
                  </FilterSelect>
                </FilterGroup>

                <VoiceCount>
                  {filteredVoices.length}/{allVoices.length}
                </VoiceCount>
              </FilterRow>
            </FilterSection>

            <ControlRow>
              <Label>Voice:</Label>
              <SelectField
                value={voiceSettings.voice}
                onChange={(e) => updateSetting('voice', e.target.value)}
              >
                {filteredVoices.length === 0 ? (
                  <option value="">No voices match your filters</option>
                ) : (
                  filteredVoices.map(voice => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label} ({voice.locale}){voice.isMultilingual ? ' 🌐' : ''}
                    </option>
                  ))
                )}
              </SelectField>
            </ControlRow>
          </VoiceSection>

          <VoiceSection>
            <SectionTitle>
              Playback Settings
            </SectionTitle>
            <SectionDescription>
              Adjust the speed and pitch to customize how the voice sounds. Use the sliders to find your perfect settings.
            </SectionDescription>

            <ControlRow>
              <Label>Speed:</Label>
              <SliderContainer>
                <Slider
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSettings.speed}
                  onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
                />
                <SliderValue>{voiceSettings.speed.toFixed(1)}x</SliderValue>
              </SliderContainer>
            </ControlRow>

            <ControlRow>
              <Label>Pitch:</Label>
              <SliderContainer>
                <Slider
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSettings.pitch}
                  onChange={(e) => updateSetting('pitch', parseFloat(e.target.value))}
                />
                <SliderValue>{voiceSettings.pitch.toFixed(1)}x</SliderValue>
              </SliderContainer>
            </ControlRow>
          </VoiceSection>
        </AudioContainer>
      )}

      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginTop: '24px'
      }}>
        <TestButton
          onClick={handleTestVoice}
          disabled={isPlaying || filteredVoices.length === 0}
        >
          {isPlaying ? 'Playing...' : 'Test'}
        </TestButton>
        <SaveButton onClick={saveSettings} $saving={isSaving}>
          {isSaving ? 'Saved' : 'Save'}
        </SaveButton>
      </div>
    </Section>
  );
}