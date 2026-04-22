import React from 'react';
import { Section } from '../common';
import styled from 'styled-components';

const Step = styled.div`
  margin-bottom: 20px;
`;

const StepTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
  margin: 0 0 10px 0;
`;

const StepContent = styled.div`
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;

  ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  a {
    color: var(--accent);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ImageContainer = styled.div`
  margin: 12px 0;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const Image = styled.img`
  width: 100%;
  border-radius: var(--radius);
`;

const Note = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 13px;
`;

export function Document() {
  return (
    <Section>
      <h2>Setup Guide</h2>

      <Step>
        <StepTitle>1. Get Azure Speech Service</StepTitle>
        <StepContent>
          <p>To use Narravo, you need an Azure Speech Service key:</p>
          <ul>
            <li>Visit the <a href="https://speech.microsoft.com/portal/voicegallery" target="_blank" rel="noopener noreferrer">Azure Voice Gallery</a></li>
            <li>Sign in with your Microsoft account</li>
            <li>Apply for an API key</li>
          </ul>
        </StepContent>
      </Step>

      <Step>
        <StepTitle>2. Locate Your Credentials</StepTitle>
        <StepContent>
          <p>Find your credentials in the Azure Voice Gallery:</p>
          <ImageContainer>
            <Image
              src="/assets/azure-api-voice-gallery-interface-info-mark.png"
              alt="Azure Voice Gallery credentials"
            />
          </ImageContainer>
          <Note>
            <strong>Note:</strong> The "Region" (e.g., japanwest) is your Azure Region. The "Resource key" is your Azure Speech Key. Keep these secure.
          </Note>
        </StepContent>
      </Step>

      <Step>
        <StepTitle>3. Configure Extension</StepTitle>
        <StepContent>
          <ul>
            <li>Go to the API tab</li>
            <li>Enter your Azure Speech Key</li>
            <li>Enter your Azure Region</li>
            <li>Click Save</li>
          </ul>
        </StepContent>
      </Step>

      <Step>
        <StepTitle>4. Using the Extension</StepTitle>
        <StepContent>
          <ul>
            <li>Select text on any webpage</li>
            <li>Click the extension icon or right-click menu</li>
            <li>Adjust voice settings in the Audio tab</li>
          </ul>
        </StepContent>
      </Step>
    </Section>
  );
}
