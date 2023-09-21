const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry:  './src/index.tsx',
  output: {
    filename:   'main.js',
    path:       path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html'),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer:  ['buffer', 'Buffer']
    }),
    new webpack.EnvironmentPlugin({ 
      DEBUG:                                true,
      REACT_APP_BASE_PATH:                  '',
      NETWORK_ID:                           'mainnet',
      RELAYER_URL:                          'https://near-relayer-mainnet.api.pagoda.co/relay',
      FIREBASE_API_KEY:                     'AIzaSyDhxTQVeoWdnbpYTocBAABbLULGf6H5khQ',
      FIREBASE_AUTH_DOMAIN:                 'near-fastauth-prod.firebaseapp.com',
      FIREBASE_PROJECT_ID:                  'near-fastauth-prod',
      FIREBASE_STORAGE_BUCKET:              'near-fastauth-prod.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID:         '829449955812',
      FIREBASE_APP_ID:                      '1:829449955812:web:532436aa35572be60abff1',
      FIREBASE_MEASUREMENT_ID:              'G-T2PPJ8QRYY',
      RELAYER_URL_TESTNET:                  'http://34.70.226.83:3030/relay',
      FIREBASE_API_KEY_TESTNET:             'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU',
      FIREBASE_AUTH_DOMAIN_TESTNET:         'pagoda-oboarding-dev.firebaseapp.com',
      FIREBASE_PROJECT_ID_TESTNET:          'pagoda-oboarding-dev',
      FIREBASE_STORAGE_BUCKET_TESTNET:      'pagoda-oboarding-dev.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID_TESTNET: '116526963563',
      FIREBASE_APP_ID_TESTNET:              '1:116526963563:web:053cb0c425bf514007ca2e',
      FIREBASE_MEASUREMENT_ID_TESTNET:      'G-HF2NBGE60S'
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3000,
  },
  devtool: 'eval-source-map',
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
    extensions: ['.ts', '.tsx', '.js', '.css'],
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
