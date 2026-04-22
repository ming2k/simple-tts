import React from 'react';
import styled from 'styled-components';
import { Section, InputGroup, SaveButton } from './common';

export function ApiSettings({ settings, onChange, onSave, isSaving }) {
  return (
    <Section>
      <h2>API Settings</h2>
      <InputGroup>
        <label htmlFor="azureKey">Azure Speech Key:</label>
        <div className="password-input-container">
          <input
            type={settings.showKey ? "text" : "password"}
            id="azureKey"
            name="azureKey"
            value={settings.azureKey}
            onChange={onChange}
            placeholder="Enter your Azure Speech key"
          />
          {/* ... password toggle button */}
        </div>
      </InputGroup>

      <InputGroup>
        <label htmlFor="azureRegion">Azure Region:</label>
        <input
          type="text"
          id="azureRegion"
          name="azureRegion"
          value={settings.azureRegion}
          onChange={onChange}
          placeholder="e.g., japanwest"
        />
      </InputGroup>

      <SaveButton onClick={onSave} $saving={isSaving}>
        {isSaving ? 'Saved ✓' : 'Save API Settings'}
      </SaveButton>
    </Section>
  );
} 