import React from 'react';
import styled from 'styled-components';
import browser from 'webextension-polyfill';

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BackButton = styled(Button)`
  background: #f3f4f6;
  color: #4b5563;
  visibility: ${props => props.$show ? 'visible' : 'hidden'};

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

const NextButton = styled(Button)`
  background: #2563eb;
  color: white;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
`;

export function NavigationButtons({ currentStep, totalSteps, onBack, onNext, isLoading }) {
  const handleNext = async () => {
    if (currentStep === totalSteps) {
      // Close the current tab
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await browser.tabs.remove(tabs[0].id);
        }
      } catch (error) {
        console.error('Failed to close tab:', error);
        // Fallback to window.close()
        window.close();
      }
    } else {
      onNext();
    }
  };

  return (
    <ButtonContainer>
      <BackButton 
        $show={currentStep > 1} 
        onClick={onBack}
        disabled={currentStep === 1 || isLoading}
      >
        Back
      </BackButton>
      <NextButton 
        onClick={handleNext}
        disabled={isLoading}
      >
        {isLoading ? 'Validating...' : currentStep === totalSteps ? 'Get Started' : 'Next'}
      </NextButton>
    </ButtonContainer>
  );
} 