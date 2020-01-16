const path = require('path')

module.exports = function(config) {
  config.resolve.alias = {
    lib: path.resolve(__dirname, '../src/lib'),
    src: path.resolve(__dirname, '../src/'),
  }
  return config
}
