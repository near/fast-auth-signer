// webpack.test.config.js
const path = require('path');

const { merge } = require('webpack-merge');

const baseConfig = require('./webpack.development.config');

module.exports = merge(baseConfig, {
  resolve: {
    alias: {
      '@near-js/biometric-ed25519': path.resolve(__dirname, './test/mocks/@near-js/biometric-ed25519/')
    },
  },
});
