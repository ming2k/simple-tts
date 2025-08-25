import React from 'react';
import { Title, Description } from '../StyledComponents';

const stepContent = {
  title: 'Welcome to Simple TTS! 👋',
  content: 'Convert any text to natural-sounding speech with just a few clicks. Let\'s get you set up with Azure\'s Text-to-Speech service.',
  statement: {
    openSource: 'This is an open-source project available on ',
    privacy: 'We respect your privacy - all text-to-speech processing happens directly between your browser and Azure\'s services.'
  }
};

const InfoBox = ({ icon, children, color = 'var(--text-accent)' }) => (
  <div style={{
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    padding: '12px 16px',
    marginTop: '0.75rem',
    fontSize: '0.9em',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    boxShadow: '0 2px 4px var(--shadow-primary)',
    transition: 'box-shadow 0.2s ease-in-out',
    border: '1px solid var(--border-primary)',
    ':hover': {
      boxShadow: '0 4px 8px var(--shadow-primary)'
    }
  }}>
    <span role="img" aria-label="icon" style={{ 
      fontSize: '1.1em',
      color: color,
      minWidth: '24px',
      textAlign: 'center'
    }}>
      {icon}
    </span>
    <div style={{ flex: 1 }}>
      {children}
    </div>
  </div>
);

export function WelcomeStep() {
  return (
    <>
      <Title>{stepContent.title}</Title>
      <Description>{stepContent.content}</Description>
      <InfoBox icon="💻" color="var(--text-accent)">
        {stepContent.statement.openSource}
        <a 
          href="https://github.com/ming2k/simple-tts" 
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            color: 'var(--text-accent)', 
            textDecoration: 'none',
            borderBottom: '1px solid var(--text-accent)',
            paddingBottom: '1px'
          }}
        >
          GitHub
        </a>
      </InfoBox>
      <InfoBox icon="🔒" color="var(--text-accent)">
        {stepContent.statement.privacy}
      </InfoBox>
    </>
  );
}