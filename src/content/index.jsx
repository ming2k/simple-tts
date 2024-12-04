import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './content.css';

function ContentScript() {
  const [translation, setTranslation] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleSelection = (event) => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        setPosition({
          x: event.pageX,
          y: event.pageY
        });
        setIsVisible(true);
        // Add your translation logic here
        // setTranslation(translatedText);
      } else {
        setIsVisible(false);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="extension-content"
      style={{
        left: `${position.x}px`,
        top: `${position.y + 20}px`
      }}
    >
      <div className="translation-popup">
        <div className="translation-result">{translation}</div>
      </div>
    </div>
  );
}

const container = document.createElement('div');
container.id = 'chrome-extension-react-root';
document.body.appendChild(container);

const root = ReactDOM.createRoot(container);
root.render(<ContentScript />); 