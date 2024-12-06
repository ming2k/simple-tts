import React from 'react';
import { StepContainer } from './StyledComponents';
import { WelcomeStep } from './WelcomeStep';
import { ConfigurationStep } from './ConfigurationStep';
import { CompletionStep } from './CompletionStep';

export function Steps({ currentStep, azureKey, azureRegion, onChange, error }) {
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return (
          <ConfigurationStep
            azureKey={azureKey}
            azureRegion={azureRegion}
            onChange={onChange}
            error={error}
          />
        );
      case 3:
        return <CompletionStep />;
      default:
        return null;
    }
  };

  return (
    <StepContainer $isActive={true}>
      {renderStep()}
    </StepContainer>
  );
} 