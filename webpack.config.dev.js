import { getOutput, getCopyPlugins } from './webpack.utils.js';
import webpack from 'webpack';
import dotenv from 'dotenv';

// Load environment variables from .env file
const env = dotenv.config().parsed || {};

// Get target browser from environment variable
const browsers = process.env.BROWSERS ? process.env.BROWSERS.split(',') : ['firefox'];

const configs = browsers.map(browser => ({
  mode: 'development',
  devtool: 'source-map',
  entry: {
    popup: './src/popup/index.jsx',
    settings: './src/settings/index.jsx',
    onboarding: './src/onboarding/index.js',
    background: './src/background/index.js',
    content: './src/content/index.js'
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
        },
        resolve: {
          fullySpecified: false
        }
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts']
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.AZURE_SPEECH_KEY': JSON.stringify(env.AZURE_SPEECH_KEY || ''),
      'process.env.AZURE_REGION': JSON.stringify(env.AZURE_REGION || '')
    }),
    getCopyPlugins(browser)
  ]
}));

export default configs.length === 1 ? configs[0] : configs;