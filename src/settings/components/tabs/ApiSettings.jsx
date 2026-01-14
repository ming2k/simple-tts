import React, { useState } from 'react';
import styled from 'styled-components';
import { Section, InputGroup, SaveButton } from '../common';
import { SimpleTTS } from '../../../services/ttsService';

const EyeIcon = ({ isVisible }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {isVisible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  max-width: ${props => props.$short ? '180px' : '320px'};
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  padding-right: ${props => props.$hasEye ? '40px' : '12px'};
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  background: var(--bg);
  color: var(--text);
  font-family: ${props => props.$isKey ? 'monospace' : 'inherit'};

  &:focus {
    border-color: var(--accent);
    outline: none;
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const EyeButton = styled.button`
  position: absolute;
  right: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  border-radius: var(--radius);
  transition: color 0.15s;

  &:hover {
    color: var(--text);
  }
`;

const ButtonContainer = styled.div`
  max-width: 320px;
  margin-top: 20px;
`;

const Message = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  background: ${props => props.$error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'};
  color: ${props => props.$error ? 'var(--error)' : 'var(--success)'};
  border: 1px solid ${props => props.$error ? 'var(--error)' : 'var(--success)'};
`;

function ApiInput({ label, id, type = 'text', value, onChange, placeholder, hasEye, isKey, isShort, showKey, onToggleVisibility }) {
  return (
    <InputGroup>
      <label htmlFor={id}>{label}</label>
      <InputWrapper $short={isShort}>
        <StyledInput
          type={type}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          $hasEye={hasEye}
          $isKey={isKey}
        />
        {hasEye && (
          <EyeButton type="button" onClick={onToggleVisibility} aria-label={showKey ? "Hide key" : "Show key"}>
            <EyeIcon isVisible={showKey} />
          </EyeButton>
        )}
      </InputWrapper>
    </InputGroup>
  );
}

export function ApiSettings({ settings, onChange, onSave, isSaving }) {
  const [isValidating, setIsValidating] = useState(false);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const validateCredentials = async (credentials) => {
    try {
      setIsValidating(true);
      setMessage('Validating...');
      setIsError(false);

      const ttsService = new SimpleTTS(credentials.azureKey, credentials.azureRegion);
      await ttsService.getVoicesList();

      setMessage('Credentials validated');
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      setMessage('Invalid credentials');
      setIsError(true);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setMessage(null);
    setIsError(false);

    if (!settings.azureKey || !settings.azureRegion) {
      setMessage('Please fill in both fields');
      setIsError(true);
      return;
    }

    const isValid = await validateCredentials(settings);

    if (isValid) {
      await onSave();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleVisibility = () => {
    onChange({
      target: { name: 'showKey', type: 'checkbox', checked: !settings.showKey }
    });
  };

  return (
    <Section>
      <h2>API Settings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Configure your Azure Speech Service credentials.
      </p>

      <ApiInput
        label="Azure Speech Key"
        id="azureKey"
        type={settings.showKey ? "text" : "password"}
        value={settings.azureKey}
        onChange={onChange}
        placeholder="Enter your Azure Speech Service key"
        hasEye
        isKey
        showKey={settings.showKey}
        onToggleVisibility={handleToggleVisibility}
      />

      <ApiInput
        label="Azure Region"
        id="azureRegion"
        value={settings.azureRegion}
        onChange={onChange}
        placeholder="e.g., japanwest"
        isShort
      />

      {message && <Message $error={isError}>{message}</Message>}

      <ButtonContainer>
        <SaveButton onClick={handleSave} $saving={isSaving || isValidating} disabled={isValidating}>
          {isValidating ? 'Validating...' : isSaving ? 'Saved' : 'Save'}
        </SaveButton>
      </ButtonContainer>
    </Section>
  );
}
