import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Section, SaveButton } from '../common';
import styled from 'styled-components';
import { AudioService } from '../../../services/audioService';
import { testVoice } from '../../../utils/audioPlayer';
import { getVoiceSettingsWithDefaults, saveVoiceSettings } from '../../../utils/voiceSettingsStorage';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Card = styled.div`
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const CardTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  @media (min-width: 640px) {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 12px;
    align-items: center;
  }
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;

  &:focus {
    border-color: var(--accent);
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Slider = styled.input`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: none;
  }
`;

const SliderValue = styled.span`
  min-width: 40px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  font-family: monospace;
`;

const FilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
`;

const SearchRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;

  &:focus {
    border-color: var(--accent);
    outline: none;
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const VoiceCount = styled.span`
  font-size: 12px;
  color: var(--text-muted);
  min-width: 60px;
  text-align: right;
  font-family: monospace;
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 12px;
  justify-content: start;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FilterLabel = styled.span`
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
`;

const FilterSelect = styled.select`
  width: 90px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;

  &:focus {
    border-color: var(--accent);
    outline: none;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const TestButton = styled.button`
  padding: 10px 16px;
  background: var(--bg-secondary);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export function AudioSettings({ groupedVoices, onSave, isSaving, voicesError }) {
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

  useEffect(() => {
    getVoiceSettingsWithDefaults()
      .then(saved => {
        setVoiceSettings({
          voice: saved.voice || 'en-US-JennyNeural',
          speed: saved.rate ?? 1.0,
          pitch: saved.pitch ?? 1.0
        });
      })
      .catch(err => console.error('Failed to load voice settings:', err));
  }, []);

  useEffect(() => {
    return () => {
      audioService.stopAudio().catch(() => {});
    };
  }, [audioService]);

  const allVoices = useMemo(() => {
    if (!groupedVoices) return [];
    return Object.values(groupedVoices)
      .flat()
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [groupedVoices]);

  const uniqueLocales = useMemo(() => {
    return [...new Set(allVoices.map(v => v.locale))].sort();
  }, [allVoices]);

  const filteredVoices = useMemo(() => {
    let voices = allVoices;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      voices = voices.filter(v =>
        v.label.toLowerCase().includes(term) ||
        v.value.toLowerCase().includes(term) ||
        v.locale.toLowerCase().includes(term)
      );
    }

    if (filterGender !== 'all') {
      voices = voices.filter(v => v.gender === filterGender);
    }

    if (filterMultilingual === 'yes') {
      voices = voices.filter(v => v.isMultilingual);
    } else if (filterMultilingual === 'no') {
      voices = voices.filter(v => !v.isMultilingual);
    }

    if (filterLocale !== 'all') {
      voices = voices.filter(v => v.locale === filterLocale);
    }

    return voices;
  }, [allVoices, searchTerm, filterGender, filterMultilingual, filterLocale]);

  const updateSetting = useCallback((field, value) => {
    setVoiceSettings(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    await saveVoiceSettings({
      voice: voiceSettings.voice,
      rate: voiceSettings.speed,
      pitch: voiceSettings.pitch
    });
    onSave();
  }, [voiceSettings, onSave]);

  const handleTestVoice = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await testVoice(audioService, {
        voice: voiceSettings.voice,
        rate: voiceSettings.speed,
        pitch: voiceSettings.pitch
      });
    } catch (err) {
      console.error('Test voice failed:', err);
      alert('Voice test failed. Check your API settings.');
    } finally {
      setIsPlaying(false);
    }
  }, [isPlaying, audioService, voiceSettings]);

  if (voicesError) {
    return (
      <Section>
        <h2>Audio Settings</h2>
        <p style={{ color: 'var(--error)' }}>{voicesError}</p>
      </Section>
    );
  }

  return (
    <Section>
      <h2>Audio Settings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Configure voice and playback settings.
      </p>

      <Container>
        <Card>
          <CardTitle>Voice Selection</CardTitle>

          <FilterContainer>
            <SearchRow>
              <SearchInput
                type="text"
                placeholder="Search voices..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <VoiceCount>{filteredVoices.length}/{allVoices.length}</VoiceCount>
            </SearchRow>

            <FilterRow>
              <FilterGroup>
                <FilterLabel>Gender:</FilterLabel>
                <FilterSelect value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                  <option value="all">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </FilterSelect>
              </FilterGroup>
              <FilterGroup>
                <FilterLabel>Multilingual:</FilterLabel>
                <FilterSelect value={filterMultilingual} onChange={e => setFilterMultilingual(e.target.value)}>
                  <option value="all">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </FilterSelect>
              </FilterGroup>
              <FilterGroup>
                <FilterLabel>Locale:</FilterLabel>
                <FilterSelect value={filterLocale} onChange={e => setFilterLocale(e.target.value)}>
                  <option value="all">All</option>
                  {uniqueLocales.map(locale => (
                    <option key={locale} value={locale}>{locale}</option>
                  ))}
                </FilterSelect>
              </FilterGroup>
            </FilterRow>
          </FilterContainer>

          <Row>
            <Label>Voice:</Label>
            <Select
              value={voiceSettings.voice}
              onChange={e => updateSetting('voice', e.target.value)}
            >
              {filteredVoices.length === 0 ? (
                <option value="">No voices match filters</option>
              ) : (
                filteredVoices.map(voice => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label} ({voice.locale}){voice.isMultilingual ? ' [ML]' : ''}
                  </option>
                ))
              )}
            </Select>
          </Row>
        </Card>

        <Card>
          <CardTitle>Playback Settings</CardTitle>

          <Row>
            <Label>Speed:</Label>
            <SliderRow>
              <Slider
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSettings.speed}
                onChange={e => updateSetting('speed', parseFloat(e.target.value))}
              />
              <SliderValue>{voiceSettings.speed.toFixed(1)}x</SliderValue>
            </SliderRow>
          </Row>

          <Row>
            <Label>Pitch:</Label>
            <SliderRow>
              <Slider
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSettings.pitch}
                onChange={e => updateSetting('pitch', parseFloat(e.target.value))}
              />
              <SliderValue>{voiceSettings.pitch.toFixed(1)}x</SliderValue>
            </SliderRow>
          </Row>
        </Card>
      </Container>

      <ButtonRow>
        <TestButton onClick={handleTestVoice} disabled={isPlaying || filteredVoices.length === 0}>
          {isPlaying ? 'Playing...' : 'Test'}
        </TestButton>
        <SaveButton onClick={handleSave} $saving={isSaving}>
          {isSaving ? 'Saved' : 'Save'}
        </SaveButton>
      </ButtonRow>
    </Section>
  );
}
