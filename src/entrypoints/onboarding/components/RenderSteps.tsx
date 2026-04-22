import React from 'react';
import { StepContainer } from './StyledComponents';
import { WelcomeStep } from './steps/WelcomeStep';
import { ConfigurationStep } from './steps/ConfigurationStep';
import { CompletionStep } from './steps/CompletionStep';

export function RenderSteps({ currentStep, azureKey, azureRegion, onChange, error }) {
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