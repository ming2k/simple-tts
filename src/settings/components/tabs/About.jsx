import React from 'react';
import styled from 'styled-components';
import { Section } from '../common';

const AboutSection = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
`;

const Title = styled.h3`
  color: var(--text-primary);
  font-size: 1.2rem;
  margin: 0 0 1rem 0;
`;

const Description = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0.75rem 0;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0;

  li {
    margin: 0.75rem 0;
    padding-left: 1.75rem;
    position: relative;
    color: var(--text-secondary);
    line-height: 1.5;

    &:before {
      content: "•";
      position: absolute;
      left: 0.5rem;
      color: var(--text-accent);
      font-weight: bold;
    }
  }
`;

const Link = styled.a`
  color: var(--text-accent);
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

export function About() {
  return (
    <Section>
      <h2>About Simple TTS</h2>

      <AboutSection>
        <Title>Open Source Project</Title>
        <Description>
          Simple TTS is an open-source browser extension that makes text-to-speech accessible and easy to use. 
          The project is available on <Link href="https://github.com/ming2k/simple-tts" target="_blank" rel="noopener noreferrer">GitHub</Link>.
        </Description>
        <FeatureList>
          <li>Free and open source software (FOSS)</li>
          <li>Community-driven development</li>
          <li>Transparent codebase</li>
          <li>Welcome contributions and feedback</li>
        </FeatureList>
      </AboutSection>

      <AboutSection>
        <Title>Privacy First</Title>
        <Description>
          We prioritize your privacy and data security:
        </Description>
        <FeatureList>
          <li>No data collection or tracking</li>
          <li>Direct browser-to-Azure communication</li>
          <li>Local storage only for your settings</li>
          <li>No external services except Azure TTS</li>
        </FeatureList>
      </AboutSection>

      <AboutSection>
        <Title>Features</Title>
        <FeatureList>
          <li>Convert selected text to speech with one click</li>
          <li>Support for multiple languages and voices</li>
          <li>Customizable speech rate and pitch</li>
          <li>Easy-to-use browser extension interface</li>
          <li>Context menu integration</li>
          <li>Keyboard shortcuts support</li>
        </FeatureList>
      </AboutSection>

      <AboutSection>
        <Title>Get Involved</Title>
        <Description>
          Want to contribute or report issues? Visit our <Link href="https://github.com/ming2k/simple-tts" target="_blank" rel="noopener noreferrer">GitHub repository</Link>.
        </Description>
        <Description>
          For support or questions, please open an issue on GitHub or contact us through the repository.
        </Description>
      </AboutSection>
    </Section>
  );
} 