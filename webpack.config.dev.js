import { getOutput, getCopyPlugins } from './webpack.utils.js';

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
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: [
              ['babel-plugin-styled-components', {
                displayName: true,
                fileName: false
              }]
            ]
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