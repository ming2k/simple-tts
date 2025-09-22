import React, { useState, useEffect } from 'react';
import { Section, InputGroup, SaveButton } from '../common';
import styled from 'styled-components';
import browser from 'webextension-polyfill';

const VoiceContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
`;

const ControlRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
`;

const SelectField = styled.select`
  width: 100%;
  padding: 10px 12px;
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

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Slider = styled.input`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--text-accent);
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--text-accent);
    cursor: pointer;
    border: none;
  }
`;

const SliderValue = styled.span`
  min-width: 40px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  font-family: monospace;
`;

const TestButton = styled.button`
  padding: 8px 16px;
  background: var(--text-accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-left: auto;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export function VoiceSettings({
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
      // Simple test using browser's speech synthesis
      const utterance = new SpeechSynthesisUtterance('Hello! This is a test of the selected voice settings.');
      utterance.rate = voiceSettings.speed;
      utterance.pitch = voiceSettings.pitch;

      // Try to find a matching voice
      const voices = speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => v.name.includes(voiceSettings.voice.split('-')[2]?.replace('Neural', '')));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      speechSynthesis.speak(utterance);
    } catch (error) {
      setIsPlaying(false);
      console.error('Test voice failed:', error);
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
        <VoiceContainer>
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

          <ControlRow>
            <div></div>
            <TestButton
              onClick={testVoice}
              disabled={isPlaying || allVoices.length === 0}
            >
              {isPlaying ? 'Playing...' : 'Test Voice'}
            </TestButton>
          </ControlRow>
        </VoiceContainer>
      )}

      <SaveButton onClick={saveSettings} $saving={isSaving}>
        {isSaving ? 'Saved' : 'Save Audio Settings'}
      </SaveButton>
    </Section>
  );
}