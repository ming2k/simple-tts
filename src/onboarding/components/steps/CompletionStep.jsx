import React from 'react';
import styled from 'styled-components';
import { Title, Description } from '../StyledComponents';

const SuccessContainer = styled.div`
  padding: 0.5rem;
`;

const SuccessIcon = styled.div`
  margin: 2rem auto;
  width: 72px;
  height: 72px;
  background: var(--bg-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-accent);
  font-size: 36px;
  box-shadow: 0 4px 12px var(--shadow-primary);
`;

const FeatureList = styled.div`
  text-align: left;
  background: var(--bg-secondary);
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid var(--border-primary);

  h3 {
    color: var(--text-primary);
    font-size: 1rem;
    margin: 0 0 0.75rem 0;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin: 0.75rem 0;
    padding-left: 1.75rem;
    position: relative;
    color: var(--text-secondary);
    line-height: 1.4;

    &:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: var(--text-accent);
      font-weight: bold;
    }

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const Highlight = styled.span`
  color: var(--text-primary);
  font-weight: 500;
`;

export function CompletionStep() {
  return (
    <>
      <Title>Setup Complete! 🎉</Title>
      <Description style={{ marginBottom: '0.75rem' }}>
        Your Azure Text-to-Speech service is now configured and ready to use.
      </Description>
      <SuccessContainer>
        <FeatureList>
          <h3>What you can do now:</h3>
          <ul>
            <li>
              <Highlight>Convert selected text:</Highlight> Right-click any text and choose "Read with Simple TTS"
            </li>
            <li>
              <Highlight>Quick access:</Highlight> Click extension icon for direct text input
            </li>
            <li>
              <Highlight>Customize voices:</Highlight> Change languages and settings in menu
            </li>
            <li>
              <Highlight>Keyboard shortcuts:</Highlight> Use hotkeys for faster conversion
            </li>
          </ul>
        </FeatureList>
      </SuccessContainer>
    </>
  );
}