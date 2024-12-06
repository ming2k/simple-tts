import React from 'react';
import ReactDOM from 'react-dom/client';
import { OnboardingPopup } from './OnboardingPopup.jsx';
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
`;

function OnboardingApp() {
  return (
    <>
      <GlobalStyle />
      <OnboardingPopup />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OnboardingApp />);
