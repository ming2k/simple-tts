import React from 'react';
import styled from 'styled-components';

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
        onClick={onNext}
        disabled={isLoading}
      >
        {isLoading ? 'Validating...' : currentStep === totalSteps ? 'Get Started' : 'Next'}
      </NextButton>
    </ButtonContainer>
  );
} 