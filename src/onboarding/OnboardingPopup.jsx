import React, { useState } from 'react';
import { Container } from './components/StyledComponents';
import { ProgressBar } from './components/ProgressBar';
import { Steps, steps } from './components/Steps';
import { NavigationButtons } from './components/NavigationButtons';

export function OnboardingPopup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [azureKey, setAzureKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setError('');
    if (field === 'azureKey') setAzureKey(value);
    if (field === 'azureRegion') setAzureRegion(value);
  };

  const handleNext = async () => {
    if (currentStep === 2) {
      if (!azureKey || !azureRegion) {
        setError('Please enter both Azure key and region');
        return;
      }

      try {
        await browser.storage.local.set({
          settings: {
            voice: 'zh-CN-XiaoxiaoNeural',
            rate: 1,
            pitch: 1,
            azureKey,
            azureRegion,
            showKey: false,
            onboardingCompleted: true
          }
        });
        setCurrentStep(3);
      } catch (error) {
        setError('Failed to save settings. Please try again.');
        console.error('Error saving settings:', error);
        return;
      }
    } else if (currentStep === 3) {
      window.close();
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
  };

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <Container>
      <ProgressBar percentage={progress} />
      <Steps
        currentStep={currentStep}
        azureKey={azureKey}
        azureRegion={azureRegion}
        onChange={handleInputChange}
        error={error}
      />
      <NavigationButtons
        currentStep={currentStep}
        totalSteps={steps.length}
        onBack={handleBack}
        onNext={handleNext}
      />
    </Container>
  );
} 