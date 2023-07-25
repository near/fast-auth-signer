const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry:  './src/index.tsx',
  output: {
    filename: 'main.js',
    path:     path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html'),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer:  ['buffer', 'Buffer']
    }),
    new webpack.EnvironmentPlugin({ DEBUG: true })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3000,
  },
  module: {
    // exclude node_modules
    rules: [
      {
        test:    /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        use:     ['ts-loader'],
      },
      {
        test: /\.css$/i,
        use:  ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource',
      },
    ],
  },
  // pass all js files through Babel
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback:   {
      https:             require.resolve('https-browserify'),
      http:              require.resolve('stream-http'),
      // crypto:   require.resolve('crypto-browserify'),
      crypto:            false,
      stream:            require.resolve('stream-browserify'),
      process:           require.resolve('process/browser'),
      'process/browser': require.resolve('process/browser'),
      url:               require.resolve('url/')
    }
  }
};
