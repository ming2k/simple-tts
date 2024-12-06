import React from 'react';
import { StepContainer, Title, Description } from './StyledComponents';
import { AzureForm } from './AzureForm';

export const steps = [
  {
    title: 'Welcome to Simple TTS! 👋',
    content: 'Convert any text to natural-sounding speech with just a few clicks. Let\'s get you set up with Azure\'s Text-to-Speech service.'
  },
  {
    title: 'Azure Configuration 🔧',
    content: 'Please enter your Azure Speech Service credentials. You can find these in your Azure Portal.'
  },
  {
    title: 'All Set! 🎉',
    content: 'You\'re ready to start using Simple TTS. Click any text on a webpage and convert it to speech instantly.'
  }
];

export function Steps({ currentStep, azureKey, azureRegion, onChange, error }) {
  return (
    <>
      {steps.map((step, index) => (
        <StepContainer key={index + 1} isActive={currentStep === index + 1}>
          <Title>{step.title}</Title>
          <Description>{step.content}</Description>

          {currentStep === 2 && (
            <AzureForm
              azureKey={azureKey}
              azureRegion={azureRegion}
              onChange={onChange}
              error={error}
            />
          )}
        </StepContainer>
      ))}
    </>
  );
} 