import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getManifestPath = (browser) => {
  return `src/manifest-${browser}.json`;
};

export const getCopyPlugins = (browser) => {
  return new CopyPlugin({
    patterns: [
      {
        from: 'public',
        to: `dist/${browser}`,
      },
      { 
        from: getManifestPath(browser),
        to: 'manifest.json'
      },
      { 
        from: 'src/assets',
        to: 'assets'
      },
      { 
        from: 'src/popup/popup.html',
        to: 'popup.html'
      },
      { 
        from: 'src/onboarding/onboarding.html',
        to: 'onboarding.html'
      },
      {
        from: 'src/settings/settings.html',
        to: 'settings.html'
      },
      {
        from: 'src/_locales',
        to: '_locales',
        globOptions: {
          ignore: ['**/.DS_Store']
        }
      }
    ],
  });
};

export const getOutput = (browser, mode) => {
  const outputPath = mode === 'development' ? 'dev' : 'dist';
  return {
    path: path.resolve(__dirname, outputPath, browser),
    filename: '[name].js',
    clean: true
  };
};