import React, { useState } from 'react';
import styled from 'styled-components';
import { Title, Description, ErrorMessage } from '../StyledComponents';
import { Eye, EyeOff } from 'react-feather';
import browser from 'webextension-polyfill';

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
  position: relative;
  width: 100%;
  box-sizing: border-box;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const StyledInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 40px 0 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
  font-family: ${props => props.$isKey ? 'monospace' : 'inherit'};
  box-sizing: border-box;
  background: var(--bg-primary);
  color: var(--text-primary);

  &:focus {
    outline: none;
    border-color: var(--text-accent);
    box-shadow: 0 0 0 3px var(--shadow-focus);
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
`;

const EyeIcon = styled.button`
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

const HelpText = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;

  a {
    color: var(--text-accent);
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const stepContent = {
  title: 'Azure Configuration 🔧',
  content: 'Please enter your Azure Speech Service credentials. You can find these in your Azure Portal.'
};

export function ConfigurationStep({ azureKey, azureRegion, onChange, error, onValidate }) {
  const [showKey, setShowKey] = useState(false);

  const handleBlur = () => {
    if (azureKey && azureRegion) {
      onValidate(azureKey, azureRegion);
    }
  };

  return (
    <>
      <Title>{stepContent.title}</Title>
      <Description>{stepContent.content}</Description>
      <InputGroup>
        <label htmlFor="azureKey">Azure Speech Key</label>
        <InputWrapper>
          <StyledInput
            type={showKey ? "text" : "password"}
            id="azureKey"
            value={azureKey}
            onChange={(e) => onChange('azureKey', e.target.value)}
            onBlur={handleBlur}
            placeholder="Enter your Azure Speech key"
            $isKey
          />
          <EyeIcon 
            onClick={() => setShowKey(!showKey)}
            type="button"
            aria-label={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? <EyeOff /> : <Eye />}
          </EyeIcon>
        </InputWrapper>
      </InputGroup>

      <InputGroup>
        <label htmlFor="azureRegion">Azure Region</label>
        <InputWrapper>
          <StyledInput
            type="text"
            id="azureRegion"
            value={azureRegion}
            onChange={(e) => onChange('azureRegion', e.target.value)}
            onBlur={handleBlur}
            placeholder="e.g., japanwest"
          />
        </InputWrapper>
      </InputGroup>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <HelpText>
        Need help finding your Azure credentials? 
        <a 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            browser.tabs.create({
              url: browser.runtime.getURL('settings.html#document')
            });
          }}
        >
          Check our detailed setup guide →
        </a>
      </HelpText>
    </>
  );
} 