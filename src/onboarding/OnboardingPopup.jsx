import React, { useState } from "react";
import styled from "styled-components";
import { ProgressBar } from "../StyledComponents";
import { RenderSteps } from "./steps/RenderSteps";
import { NavigationButtons } from "./NavigationButtons";
import { TTSService } from "../../services/TTSService";
import browser from "webextension-polyfill";

const TOTAL_STEPS = 3;

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

export function OnboardingPopup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [azureKey, setAzureKey] = useState("");
  const [azureRegion, setAzureRegion] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [progress] = useState(0);

  const handleInputChange = (field, value) => {
    if (field === "azureKey") {
      setAzureKey(value);
    } else if (field === "azureRegion") {
      setAzureRegion(value);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCredentials = async (key, region) => {
    if (!key || !region) {
      setError("Please enter both Azure key and region");
      return false;
    }

    if (isValidating) return false;

    setIsValidating(true);
    setError("");

    try {
      const ttsService = new TTSService(key, region);
      await ttsService.getVoicesList();
      return true;
    } catch (err) {
      console.error("Validation error:", err);
      setError("Invalid Azure credentials. Please check your key and region.");
      return false;
    } finally {
      setIsValidating(false);
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

      // Only save if validation succeeds
      try {
        await browser.storage.local.set({
          settings: {
            azureKey,
            azureRegion
          }
        });
        setCurrentStep(3);
      } catch (err) {
        console.error('Failed to save settings:', err);
        setError('Failed to save settings. Please try again.');
      }
      return;
    }

    if (currentStep === 3) {
      window.close();
    }
  };

  return (
    <Container>
      <ProgressBar percentage={progress} />
      <RenderSteps
        currentStep={currentStep}
        azureKey={azureKey}
        azureRegion={azureRegion}
        onChange={handleInputChange}
        error={error}
        onValidate={validateCredentials}
      />
      <NavigationButtons
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onNext={handleNext}
        isLoading={isValidating}
      />
    </Container>
  );
}
