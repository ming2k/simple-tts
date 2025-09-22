import React, { useState } from 'react';
import styled from 'styled-components';
import { Section, InputGroup, SaveButton } from '../common';
import { SimpleTTS } from '../../../services/index.js';

// Icons
const EyeIcon = ({ isVisible }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
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

// Styled Components
const Container = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const HeaderTitle = styled.h2`
  margin: 0 0 8px 0;
`;

const HeaderDescription = styled.p`
  color: var(--text-tertiary);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const DocumentLink = styled.a`
  color: var(--text-accent);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const InfoBox = styled.div`
  background: var(--bg-secondary);
  border-left: 4px solid var(--text-accent);
  padding: 12px 16px;
  margin: 24px 0;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: ${props => props.$short ? '200px' : '320px'};
`;

const StyledInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 ${props => props.$hasEye ? '40px' : '12px'} 0 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
  font-family: ${props => props.$isKey ? 'monospace' : 'inherit'};
  box-sizing: border-box;
  text-overflow: ellipsis;
  background: var(--bg-primary);
  color: var(--text-primary);
  
  &[type="password"] {
    font-family: text-security-disc;
    letter-spacing: 1px;
  }

  &:focus {
    outline: none;
    border-color: var(--text-accent);
    box-shadow: 0 0 0 3px var(--shadow-focus);
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
`;

const EyeButton = styled.button`
  position: absolute;
  right: 6px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0;
  z-index: 1;

  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  &:focus {
    outline: none;
    background-color: var(--bg-hover);
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2px;
  }
`;

const ButtonContainer = styled.div`
  max-width: 320px;
  margin-top: 24px;
`;

const ValidationMessage = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  ${props => props.$isError ? `
    background-color: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
  ` : `
    background-color: #dcfce7;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  `}
`;

// ApiInput Component
function ApiInput({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  hasEye,
  isKey,
  isShort,
  showKey,
  onToggleVisibility
}) {
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
          <EyeButton
            type="button"
            onClick={onToggleVisibility}
            aria-label={showKey ? "Hide key" : "Show key"}
          >
            <EyeIcon isVisible={showKey} />
          </EyeButton>
        )}
      </InputWrapper>
    </InputGroup>
  );
}

// Main Component
export function ApiSettings({ settings, onChange, onSave, isSaving }) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const validateCredentials = async (credentials) => {
    try {
      setIsValidating(true);
      setValidationMessage('Validating credentials...');
      setValidationError(null);

      const ttsService = new SimpleTTS(credentials.azureKey, credentials.azureRegion);
      await ttsService.getVoicesList(); // This will throw if credentials are invalid

      setValidationMessage('Credentials validated successfully');
      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationError('Invalid credentials. Please check your Azure key and region.');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    // Clear previous messages
    setValidationMessage(null);
    setValidationError(null);

    // Validate required fields
    if (!settings.azureKey || !settings.azureRegion) {
      setValidationError('Please fill in both Azure Key and Region');
      return;
    }

    // Validate credentials
    const isValid = await validateCredentials(settings);
    
    if (isValid) {
      await onSave();
      // Keep success message visible for a moment
      setTimeout(() => {
        setValidationMessage(null);
      }, 3000);
    }
  };

  const handleToggleVisibility = () => {
    onChange({
      target: {
        name: 'showKey',
        type: 'checkbox',
        checked: !settings.showKey
      }
    });
  };

  return (
    <Section>
      <Container>
        <Header>
          <HeaderTitle>API Settings</HeaderTitle>
        </Header>

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

        {validationError && (
          <ValidationMessage $isError>
            {validationError}
          </ValidationMessage>
        )}

        {validationMessage && (
          <ValidationMessage>
            {validationMessage}
          </ValidationMessage>
        )}

        <ButtonContainer>
          <SaveButton 
            onClick={handleSave} 
            $saving={isSaving || isValidating}
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : 
             isSaving ? 'Saved ✓' : 
             'Save API Settings'}
          </SaveButton>
        </ButtonContainer>
      </Container>
    </Section>
  );
} 