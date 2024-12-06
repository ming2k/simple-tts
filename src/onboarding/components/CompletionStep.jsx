import React from 'react';
import styled from 'styled-components';
import { Title, Description } from './StyledComponents';

const SuccessContainer = styled.div`
  text-align: center;
  padding: 1rem;
`;

const SuccessIcon = styled.div`
  margin: 1rem auto;
  width: 64px;
  height: 64px;
  background: #ecfdf5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
  font-size: 32px;
`;

const FeatureList = styled.div`
  margin-top: 1.5rem;
  text-align: left;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin: 1rem 0;
    padding-left: 2rem;
    position: relative;
    color: #4b5563;

    &:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #059669;
      font-weight: bold;
    }
  }
`;

const stepContent = {
  title: 'All Set! 🎉',
  content: 'Great! Your Azure credentials have been saved. You can now start using Simple TTS.'
};

export function CompletionStep() {
  return (
    <>
      <Title>{stepContent.title}</Title>
      <Description>{stepContent.content}</Description>
      <SuccessContainer>
        <SuccessIcon>✓</SuccessIcon>
        <Description>
          Your Azure credentials have been saved successfully. Here's what you can do now:
        </Description>
        <FeatureList>
          <ul>
            <li>Select any text on a webpage and right-click to convert it to speech</li>
            <li>Use the extension popup to type or paste text for conversion</li>
            <li>Adjust voice settings anytime from the extension settings</li>
            <li>Access multiple language voices for natural-sounding speech</li>
          </ul>
        </FeatureList>
      </SuccessContainer>
    </>
  );
}