import React from 'react';
import { Section } from './common';
import styled from 'styled-components';

const DocSection = styled.div`
  margin-bottom: 2rem;
`;

const StepTitle = styled.h3`
  color: #2563eb;
  font-size: 1.2rem;
  margin-bottom: 1rem;
`;

const StepContent = styled.div`
  color: #4b5563;
  line-height: 1.6;

  ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  li {
    margin: 0.5rem 0;
  }

  a {
    color: #2563eb;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ImageContainer = styled.div`
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const InfoImage = styled.img`
  width: 100%;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const KeyNote = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border-left: 4px solid #2563eb;
  border-radius: 4px;
`;

export function Document() {
  return (
    <Section>
      <h2>Azure Speech Service Setup Guide</h2>
      
      <DocSection>
        <StepTitle>1. Get Azure Speech Service</StepTitle>
        <StepContent>
          <p>To use Simple TTS, you'll need an Azure Speech Service key. Follow these steps:</p>
          <ul>
            <li>Visit the <a href="https://speech.microsoft.com/portal/voicegallery" target="_blank" rel="noopener noreferrer">Azure Voice Gallery</a></li>
            <li>Sign in with your Microsoft account (create one if needed)</li>
            <li>Once logged in, you'll be able to apply Azure Voice Gallery API key</li>
          </ul>
        </StepContent>
      </DocSection>

      <DocSection>
        <StepTitle>2. Locate Your Credentials</StepTitle>
        <StepContent>
          <p>In the Azure Voice Gallery, you can find your credentials as shown below:</p>
          <ImageContainer>
            <InfoImage 
              src="/assets/azure-api-voice-gallery-interface-info-mark.png" 
              alt="Azure Voice Gallery Interface showing key and region location" 
            />
          </ImageContainer>
          <KeyNote>
            <strong>Important:</strong>
            <ul>
              <li>The "Region" value (e.g., japanwest) is your Azure Region</li>
              <li>The "Resource key" is your Azure Speech Key</li>
              <li>Keep these credentials secure and don't share them</li>
            </ul>
          </KeyNote>
        </StepContent>
      </DocSection>

      <DocSection>
        <StepTitle>3. Configure Simple TTS</StepTitle>
        <StepContent>
          <p>After obtaining your credentials:</p>
          <ul>
            <li>Go to the API Settings tab</li>
            <li>Enter your Azure Speech Key</li>
            <li>Enter your Azure Region</li>
            <li>Click Save to apply the settings</li>
          </ul>
        </StepContent>
      </DocSection>

      <DocSection>
        <StepTitle>4. Using the Extension</StepTitle>
        <StepContent>
          <ul>
            <li>Select any text on a webpage</li>
            <li>Click the extension icon or use the right-click menu</li>
            <li>Adjust voice settings in the Voice Settings tab</li>
            <li>The selected text will be read aloud using your chosen voice</li>
          </ul>
        </StepContent>
      </DocSection>
    </Section>
  );
} 