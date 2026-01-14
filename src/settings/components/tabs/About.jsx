import React from 'react';
import styled from 'styled-components';
import { Section } from '../common';

const Card = styled.div`
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

const CardTitle = styled.h3`
  margin: 0 0 10px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
`;

const Text = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 8px 0;
  font-size: 14px;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;

  li {
    margin: 6px 0;
    padding-left: 16px;
    position: relative;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.5;

    &:before {
      content: "-";
      position: absolute;
      left: 0;
      color: var(--text-muted);
    }
  }
`;

const Link = styled.a`
  color: var(--accent);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export function About() {
  return (
    <Section>
      <h2>About</h2>

      <Card>
        <CardTitle>Open Source</CardTitle>
        <Text>
          Simple TTS is free and open-source. Available on <Link href="https://github.com/ming2k/simple-tts" target="_blank" rel="noopener noreferrer">GitHub</Link>.
        </Text>
        <List>
          <li>Community-driven development</li>
          <li>Transparent codebase</li>
          <li>Contributions welcome</li>
        </List>
      </Card>

      <Card>
        <CardTitle>Privacy</CardTitle>
        <Text>Your privacy is our priority:</Text>
        <List>
          <li>No data collection or tracking</li>
          <li>Direct browser-to-Azure communication</li>
          <li>Settings stored locally only</li>
        </List>
      </Card>

      <Card>
        <CardTitle>Features</CardTitle>
        <List>
          <li>Convert selected text to speech</li>
          <li>Multiple languages and voices</li>
          <li>Adjustable speed and pitch</li>
          <li>Context menu integration</li>
          <li>Keyboard shortcuts</li>
        </List>
      </Card>

      <Card>
        <CardTitle>Get Involved</CardTitle>
        <Text>
          Report issues or contribute at our <Link href="https://github.com/ming2k/simple-tts" target="_blank" rel="noopener noreferrer">GitHub repository</Link>.
        </Text>
      </Card>
    </Section>
  );
}
