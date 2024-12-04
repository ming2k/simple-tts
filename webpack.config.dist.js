import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: {
    popup: './src/popup/index.jsx',
    content: './src/content/index.jsx',
    background: './src/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
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
    new CopyPlugin({
      patterns: [
        { 
          from: 'src/manifest-firefox.json',
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
          from: 'src/_locales',
          to: '_locales'
        }
      ],
    }),
  ]
}; 