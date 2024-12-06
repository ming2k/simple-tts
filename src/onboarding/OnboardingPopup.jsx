import React, { useState, useEffect } from 'react';
import { Container } from './components/StyledComponents';
import { ProgressBar } from './components/ProgressBar';
import { Steps } from './components/Steps';
import { NavigationButtons } from './components/NavigationButtons';
import { steps } from './constants/steps';
import { TTSService } from '../services/ttsService';

export function OnboardingPopup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [azureKey, setAzureKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('');
  const [error, setError] = useState('');
  const [existingSettings, setExistingSettings] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    browser.storage.local.get('settings').then((result) => {
      if (result.settings) {
        setExistingSettings(result.settings);
        setAzureKey(result.settings.azureKey || '');
        setAzureRegion(result.settings.azureRegion || '');
      }
    });
  }, []);

  const handleInputChange = (field, value) => {
    setError('');
    if (field === 'azureKey') setAzureKey(value);
    if (field === 'azureRegion') setAzureRegion(value);
  };

  const validateCredentials = async (key, region) => {
    if (!key || !region) {
      setError('Please enter both Azure key and region');
      return false;
    }

    if (isValidating) return false;

    setIsValidating(true);
    setError('');

    try {
      const ttsService = new TTSService(key, region);
      await ttsService.getVoicesList();
      return true;
    } catch (err) {
      console.error('Validation error:', err);
      setError('Invalid Azure credentials. Please check your key and region.');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const saveSettings = async () => {
    try {
      const newSettings = {
        ...(existingSettings || {}),
        voice: existingSettings?.voice || 'zh-CN-XiaoxiaoNeural',
        rate: existingSettings?.rate || 1,
        pitch: existingSettings?.pitch || 1,
        azureKey,
        azureRegion,
        showKey: false,
        onboardingCompleted: true
      };

      await browser.storage.local.set({ settings: newSettings });
      return true;
    } catch (err) {
      console.error('Settings save error:', err);
      setError('Failed to save settings. Please try again.');
      return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      const isValid = await validateCredentials(azureKey, azureRegion);
      if (!isValid) return;

      const saved = await saveSettings();
      if (saved) {
        setCurrentStep(3);
      }
      return;
    }

    if (currentStep === 3) {
      window.close();
    }
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
        isLoading={isValidating}
      />
    </Container>
  );
} 