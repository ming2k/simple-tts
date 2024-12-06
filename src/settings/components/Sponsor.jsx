import React from 'react';
import { Section } from './common';

export function Sponsor() {
  return (
    <Section>
      <h2>Support the Project</h2>
      <div className="sponsor-content">
        <p>If you find this extension helpful, consider supporting its development!</p>
        
        <div className="sponsor-options">
          <a 
            href="https://github.com/sponsors/ming2k" 
            target="_blank" 
            rel="noopener noreferrer"
            className="sponsor-button github"
          >
            ❤️ Sponsor on GitHub
          </a>
          
          <a 
            href="https://buymeacoffee.com/mingmillenx"
            target="_blank" 
            rel="noopener noreferrer"
            className="sponsor-button coffee"
          >
            ☕ Buy me a coffee
          </a>
        </div>
      </div>
    </Section>
  );
} 