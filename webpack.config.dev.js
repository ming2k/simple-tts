import { getOutput, getCopyPlugins } from './webpack.utils.js';
import webpack from 'webpack';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const env = dotenv.config().parsed || {};

export default ['chrome', 'firefox'].map(browser => ({
  mode: 'development',
  devtool: 'source-map',
  entry: {
    popup: './src/popup/index.jsx',
    settings: './src/settings/index.jsx',
    onboarding: './src/onboarding/index.js',
    background: './src/background/index.js'
  },
  output: getOutput(browser, 'development'),
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.AZURE_SPEECH_KEY': JSON.stringify(env.AZURE_SPEECH_KEY || ''),
      'process.env.AZURE_REGION': JSON.stringify(env.AZURE_REGION || '')
    }),
    getCopyPlugins(browser)
  ]
}));