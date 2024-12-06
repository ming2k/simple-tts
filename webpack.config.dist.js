import { getOutput, getCopyPlugins } from './webpack.utils.js';
import webpack from 'webpack';

// Get target browser from environment variable
const browsers = process.env.BROWSERS ? process.env.BROWSERS.split(',') : ['firefox'];

const configs = browsers.map(browser => ({
  mode: 'production',
  devtool: 'source-map',
  entry: {
    popup: './src/popup/index.jsx',
    settings: './src/settings/index.jsx',
    onboarding: './src/onboarding/index.js',
    background: './src/background/index.js'
  },
  output: getOutput(browser, 'production'),
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
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.AZURE_SPEECH_KEY': JSON.stringify(''),
      'process.env.AZURE_REGION': JSON.stringify('')
    }),
    getCopyPlugins(browser)
  ]
}));

export default configs.length === 1 ? configs[0] : configs;