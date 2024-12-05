import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
`;

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
    content: "Convert any text to natural-sounding speech with just a few clicks. Let's get you set up!"
  },
  {
    title: 'Azure Configuration ⚙️',
    content: 'To use Quick TTS, you\'ll need to configure your Azure credentials. Click the Settings button to enter your Azure key and region.'
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

function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (currentStep === steps.length) {
      // Save onboarding completion status
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
    if (currentStep === 2) { // Azure Configuration step
      browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
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
          onClick={currentStep === 2 ? handleOpenOptions : undefined}
        >
          <h1>{step.title}</h1>
          <p>{step.content}</p>
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

function OnboardingApp() {
  return (
    <>
      <GlobalStyle />
      <Onboarding />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OnboardingApp />);
