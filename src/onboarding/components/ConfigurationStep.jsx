import React from 'react';
import styled from 'styled-components';
import { Title, Description, ErrorMessage } from './StyledComponents';
import { TTSService } from '../../services/ttsService';

const InputGroup = styled.div`
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #4b5563;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
  }
`;

const HelpText = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 6px;
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.5;

  a {
    color: #2563eb;
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

export function ConfigurationStep({ azureKey, azureRegion, onChange, error }) {
  const handleBlur = async () => {
    if (azureKey && azureRegion) {
      try {
        const ttsService = new TTSService(azureKey, azureRegion);
        await ttsService.getVoicesList();
        onChange('error', '');
      } catch (error) {
        onChange('error', 'Invalid Azure credentials. Please check your key and region.');
      }
    }
  };

  return (
    <>
      <Title>{stepContent.title}</Title>
      <Description>{stepContent.content}</Description>
      <InputGroup>
        <label htmlFor="azureKey">Azure Speech Key</label>
        <input
          type="password"
          id="azureKey"
          value={azureKey}
          onChange={(e) => onChange('azureKey', e.target.value)}
          onBlur={handleBlur}
          placeholder="Enter your Azure Speech key"
        />
      </InputGroup>

      <InputGroup>
        <label htmlFor="azureRegion">Azure Region</label>
        <input
          type="text"
          id="azureRegion"
          value={azureRegion}
          onChange={(e) => onChange('azureRegion', e.target.value)}
          onBlur={handleBlur}
          placeholder="e.g., japanwest"
        />
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