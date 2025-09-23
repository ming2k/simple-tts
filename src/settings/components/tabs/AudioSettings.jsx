import React, { useState, useEffect } from 'react';
import { Section, InputGroup, SaveButton } from '../common';
import styled from 'styled-components';
import browser from 'webextension-polyfill';
import { SimpleTTS } from '../../../services/index.js';

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

export function AudioSettings({
  settings,
  groupedVoices,
  onSave,
  isSaving,
  voicesError,
  onFetchVoices
}) {
  const [voiceSettings, setVoiceSettings] = useState({
    voice: 'en-US-JennyNeural',
    speed: 1.0,
    pitch: 1.0
  });
  const [isPlaying, setIsPlaying] = useState(false);

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

  const testVoice = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      // Get the current API settings for TTS service
      const result = await browser.storage.local.get(['settings']);
      const apiSettings = result.settings;

      if (!apiSettings?.azureKey || !apiSettings?.azureRegion) {
        alert('Please configure your API settings first.');
        setIsPlaying(false);
        return;
      }

      // Create TTS service with current settings
      const ttsService = new SimpleTTS(apiSettings.azureKey, apiSettings.azureRegion);

      // Test voice with current settings
      const testText = 'Hello! This is a test of your selected voice settings.';
      const testSettings = {
        voice: voiceSettings.voice,
        rate: voiceSettings.speed,
        pitch: voiceSettings.pitch
      };

      await ttsService.playTextSequential(testText, testSettings);
      setIsPlaying(false);
    } catch (error) {
      setIsPlaying(false);
      console.error('Test voice failed:', error);
      alert('Voice test failed. Please check your API settings and internet connection.');
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

  const allVoices = getAllVoices();

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

            <ControlRow>
              <Label>Voice:</Label>
              <SelectField
                value={voiceSettings.voice}
                onChange={(e) => updateSetting('voice', e.target.value)}
              >
                {allVoices.length === 0 ? (
                  <option value="">No voices available</option>
                ) : (
                  allVoices.map(voice => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label} ({voice.locale})
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

            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-secondary)'
            }}>
              <TestButton
                onClick={testVoice}
                disabled={isPlaying || allVoices.length === 0}
              >
                {isPlaying ? 'Playing...' : 'Test Voice'}
              </TestButton>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {isPlaying ? 'Playing test audio...' : 'Click to hear a sample with current settings'}
              </div>
            </div>
          </VoiceSection>
        </AudioContainer>
      )}

      <SaveButton onClick={saveSettings} $saving={isSaving}>
        {isSaving ? 'Saved' : 'Save Audio Settings'}
      </SaveButton>
    </Section>
  );
}