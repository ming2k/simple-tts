import { getOutput, getCopyPlugins } from './webpack.utils.js';
import TerserPlugin from 'terser-webpack-plugin';

export default ['chrome', 'firefox'].map(browser => ({
  mode: 'production',
  entry: {
    popup: './src/popup/index.jsx',
    settings: './src/settings/index.jsx',
    onboarding: './src/onboarding/index.js',
    background: './src/background/index.js'
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
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: [
              ['babel-plugin-styled-components', {
                displayName: false,
                fileName: false,
                minify: true,
                pure: true
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
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            pure_funcs: ['console.log', 'console.info']
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ],
    splitChunks: {
      chunks: 'all'
    }
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  devtool: false
})); 