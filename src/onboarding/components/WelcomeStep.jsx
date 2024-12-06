import React from 'react';
import { Title, Description } from './StyledComponents';

const stepContent = {
  title: 'Welcome to Simple TTS! 👋',
  content: 'Convert any text to natural-sounding speech with just a few clicks. Let\'s get you set up with Azure\'s Text-to-Speech service.'
};

export function WelcomeStep() {
  return (
    <>
      <Title>{stepContent.title}</Title>
      <Description>{stepContent.content}</Description>
    </>
  );
}