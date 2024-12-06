import React from 'react';
import { Section, InputGroup, SaveButton } from './common';

export function VoiceSettings({ settings, selectedLocale, groupedVoices, onChange, onSave, isSaving, voicesError }) {
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
              onChange={(e) => setSelectedLocale(e.target.value)}
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
        </>
      )}
      <SaveButton onClick={onSave} $saving={isSaving}>
        {isSaving ? 'Saved ✓' : 'Save Voice Settings'}
      </SaveButton>
    </Section>
  );
} 