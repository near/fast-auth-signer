const { merge } = require('webpack-merge');

const baseConfig = require('./webpack.common.config');

module.exports = merge(baseConfig, {
  devtool: 'source-map',
});
