import React from 'react';
import styled from 'styled-components';
import { Section, InputGroup, SaveButton } from '../common';

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
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
  font-family: ${props => props.$isKey ? 'monospace' : 'inherit'};
  box-sizing: border-box;
  text-overflow: ellipsis;
  
  &[type="password"] {
    font-family: text-security-disc;
    letter-spacing: 1px;
  }

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
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
  color: #6b7280;
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0;
  z-index: 1;

  &:hover {
    color: #374151;
    background-color: rgba(0, 0, 0, 0.04);
  }

  &:focus {
    outline: none;
    background-color: rgba(0, 0, 0, 0.04);
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
        <h2>API Settings</h2>
        <ApiInput
          label="Azure Speech Key:"
          id="azureKey"
          type={settings.showKey ? "text" : "password"}
          value={settings.azureKey}
          onChange={onChange}
          placeholder="Enter your Azure Speech key"
          hasEye
          isKey
          showKey={settings.showKey}
          onToggleVisibility={handleToggleVisibility}
        />

        <ApiInput
          label="Azure Region:"
          id="azureRegion"
          value={settings.azureRegion}
          onChange={onChange}
          placeholder="e.g., japanwest"
          isShort
        />

        <ButtonContainer>
          <SaveButton onClick={onSave} $saving={isSaving}>
            {isSaving ? 'Saved ✓' : 'Save API Settings'}
          </SaveButton>
        </ButtonContainer>
      </Container>
    </Section>
  );
} 