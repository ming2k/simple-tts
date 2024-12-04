import { getOutput, getCopyPlugins } from './webpack.utils.js';

export default ['chrome', 'firefox'].map(browser => ({
  mode: 'production',
  entry: {
    popup: './src/popup/index.jsx',
    content: './src/content/index.jsx',
    options: './src/options/index.jsx',
    background: './src/background/menus.js'
  },
  output: getOutput(browser, 'production'),
  stats: {
    warnings: true,
    errors: true
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
    getCopyPlugins(browser)
  ]
})); 