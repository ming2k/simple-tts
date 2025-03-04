import React from 'react';
import { Section, InputGroup, SaveButton } from '../common';
import styled from 'styled-components';

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

export function VoiceSettings({ settings, selectedLocale, groupedVoices, onChange, onSave, isSaving, voicesError }) {
  const handleLocaleChange = (e) => {
    const newLocale = e.target.value;
    if (groupedVoices[newLocale]?.length > 0) {
      onChange({
        target: {
          name: 'voice',
          value: groupedVoices[newLocale][0].value
        }
      });
    }
  };

  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    onChange({
      target: {
        name,
        value: parseFloat(value)
      }
    });
  };

  return (
    <Section>
      <h2>Voice Settings</h2>
      {voicesError ? (
        <div className="error-message">{voicesError}</div>
      ) : (
        <>
          <InputGroup>
            <label htmlFor="voiceLocale">Region:</label>
            <select 
              id="voiceLocale"
              value={selectedLocale}
              onChange={handleLocaleChange}
              className="voice-select"
            >
              <option value="">Select a region</option>
              {Object.keys(groupedVoices).sort().map(locale => (
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
                value={settings.voice}
                onChange={onChange}
                className="voice-select"
              >
                <option value="">Select a voice</option>
                {groupedVoices[selectedLocale]?.map(voice => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </InputGroup>
          )}

          <SliderContainer>
            <label htmlFor="rate">Speed:</label>
            <SliderWithValue>
              <Slider
                type="range"
                id="rate"
                name="rate"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.rate}
                onChange={handleSliderChange}
              />
              <SliderValue>{settings.rate}x</SliderValue>
            </SliderWithValue>
          </SliderContainer>

          <SliderContainer>
            <label htmlFor="pitch">Pitch:</label>
            <SliderWithValue>
              <Slider
                type="range"
                id="pitch"
                name="pitch"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.pitch}
                onChange={handleSliderChange}
              />
              <SliderValue>{settings.pitch}x</SliderValue>
            </SliderWithValue>
          </SliderContainer>
        </>
      )}
      <SaveButton onClick={onSave} $saving={isSaving}>
        {isSaving ? 'Saved ✓' : 'Save Voice Settings'}
      </SaveButton>
    </Section>
  );
} 