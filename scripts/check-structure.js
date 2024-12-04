import fs from 'fs';
import path from 'path';

const requiredFiles = [
  'src/_locales/en/messages.json',
  'src/manifest-firefox.json',
  'src/manifest-chrome.json',
  'src/popup/popup.html',
  'src/popup/popup.css',
  'src/popup/index.jsx',
  'src/options/options.html',
  'src/options/options.css',
  'src/options/index.jsx'
];

const checkFiles = () => {
  const missing = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.resolve(file))) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    console.error('Missing required files:');
    missing.forEach(file => console.error(`- ${file}`));
    process.exit(1);
  }

  console.log('All required files present');
};

checkFiles(); 