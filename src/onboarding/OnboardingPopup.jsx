import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  width: 400px;
  padding: 1rem;
`;

const StepContainer = styled.div`
  display: ${props => props.isActive ? 'block' : 'none'};
  animation: fadeIn 0.5s;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  p {
    white-space: pre-line;
    line-height: 1.5;
  }

  a {
    color: #007bff;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ProgressContainer = styled.div`
  width: 100%;
  height: 4px;
  background: #eee;
  margin: 2rem 0;
  border-radius: 2px;
`;

const Progress = styled.div`
  height: 100%;
  background: #007bff;
  border-radius: 2px;
  transition: width 0.3s ease;
  width: ${props => props.percentage}%;
`;

const NavContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
`;

const NextButton = styled(Button)`
  background: #007bff;
  color: white;
`;

const BackButton = styled(Button)`
  background: #f8f9fa;
  color: #212529;
  display: ${props => props.show ? 'block' : 'none'};
`;

const steps = [
  {
    title: 'Welcome to Quick TTS! 👋',
    content: "Convert any text to natural-sounding speech with just a few clicks. Let's get you set up with Azure's Text-to-Speech service."
  },
  {
    title: 'Get Azure Key 🔑',
    content: '1. Visit the Azure Voice Gallery at speech.microsoft.com/portal/voicegallery\n2. Sign in or create a free Microsoft account\n3. Once logged in, you\'ll get your API key and region'
  },
  {
    title: 'Configure Azure ⚙️',
    content: 'Click here to open settings. Enter your Azure API key and region from the previous step to enable text-to-speech functionality.'
  },
  {
    title: 'Using Quick TTS 🎯',
    content: 'Simply paste or type your text, then click the Speak button. You can adjust voice, speed, and pitch in the settings.'
  },
  {
    title: "You're Ready! 🎉",
    content: "That's it! You can now start converting text to speech. Click Get Started to begin using Quick TTS."
  }
];

export function OnboardingPopup() {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (currentStep === steps.length) {
      browser.storage.local.set({ onboardingCompleted: true });
      window.close();
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleOpenOptions = () => {
    if (currentStep === 3) { // Azure Configuration step
      browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    }
  };

  const handleVoiceGalleryClick = () => {
    if (currentStep === 2) { // Get Azure Key step
      browser.tabs.create({
        url: 'https://speech.microsoft.com/portal/voicegallery'
      });
    }
  };

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <Container>
      <ProgressContainer>
        <Progress percentage={progress} />
      </ProgressContainer>
      
      {steps.map((step, index) => (
        <StepContainer 
          key={index + 1}
          isActive={currentStep === index + 1}
          onClick={
            currentStep === 2 ? handleVoiceGalleryClick :
            currentStep === 3 ? handleOpenOptions :
            undefined
          }
          style={{ cursor: (currentStep === 2 || currentStep === 3) ? 'pointer' : 'default' }}
        >
          <h1>{step.title}</h1>
          <p>{step.content}</p>
          {currentStep === 2 && (
            <p>
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleVoiceGalleryClick();
                }}
              >
                Click here to open Azure Voice Gallery →
              </a>
            </p>
          )}
        </StepContainer>
      ))}

      <NavContainer>
        <BackButton 
          show={currentStep !== 1} 
          onClick={handleBack}
        >
          Back
        </BackButton>
        <NextButton onClick={handleNext}>
          {currentStep === steps.length ? 'Get Started' : 'Next'}
        </NextButton>
      </NavContainer>
    </Container>
  );
} 