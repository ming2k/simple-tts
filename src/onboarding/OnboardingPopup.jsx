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

const InputGroup = styled.div`
  margin: 1rem 0;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #4b5563;
  }

  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }
  }
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 14px;
  margin-top: 0.5rem;
`;

const steps = [
  {
    title: 'Welcome to Simple TTS! 👋',
    content: "Convert any text to natural-sounding speech with just a few clicks. Let's get you set up with Azure's Text-to-Speech service."
  },
  {
    title: 'Get Azure Key 🔑',
    content: 'Enter your Azure Speech key and region below. You can get these from Azure Portal.'
  },
  {
    title: 'Using Simple TTS 🎯',
    content: 'Simply paste or type your text, then click the Speak button. You can adjust voice, speed, and pitch in the settings.'
  },
  {
    title: "You're Ready! 🎉",
    content: "That's it! You can now start converting text to speech. Click Get Started to begin using Simple TTS."
  }
];

export function OnboardingPopup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [azureKey, setAzureKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('');
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (currentStep === 2) {
      // Validate Azure credentials before proceeding
      if (!azureKey || !azureRegion) {
        setError('Please enter both Azure key and region');
        return;
      }

      try {
        // Save Azure credentials
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

        // Clear any badge
        browser.browserAction.setBadgeText({ text: '' });
        
        setCurrentStep(prev => prev + 1);
      } catch (error) {
        setError('Failed to save settings. Please try again.');
        console.error('Error saving settings:', error);
      }
      return;
    }

    if (currentStep === steps.length) {
      window.close();
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
  };

  const handleDocsClick = () => {
    browser.tabs.create({
      url: browser.runtime.getURL('settings.html#guide')
    });
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
        >
          <h1>{step.title}</h1>
          <p>{step.content}</p>
          
          {currentStep === 2 && (
            <>
              <InputGroup>
                <label htmlFor="azureKey">Azure Speech Key:</label>
                <input
                  type="password"
                  id="azureKey"
                  value={azureKey}
                  onChange={(e) => setAzureKey(e.target.value)}
                  placeholder="Enter your Azure Speech key"
                />
              </InputGroup>
              
              <InputGroup>
                <label htmlFor="azureRegion">Azure Region:</label>
                <input
                  type="text"
                  id="azureRegion"
                  value={azureRegion}
                  onChange={(e) => setAzureRegion(e.target.value)}
                  placeholder="e.g., japanwest"
                />
              </InputGroup>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <p>
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDocsClick();
                  }}
                >
                  Need help? Check our setup guide →
                </a>
              </p>
            </>
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