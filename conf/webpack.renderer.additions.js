const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = function(config) {
  config.module.rules[5].test = /\.(png|jpe?g|gif)(\?.*)?$/ //remove svg
  config.module.rules.push({
    test: /(\.svg)$/,
    use: [
      'babel-loader',
      {
        loader: 'react-svg-loader',
        options: {
          svgo: {
            plugins: [{ removeViewBox: false }],
            floatPrecision: 2,
          },
        },
      },
    ],
    exclude: /node_modules/,
  })
  config.resolve.alias = {
    lib: path.resolve(__dirname, '../src/lib'),
    src: path.resolve(__dirname, '../src/'),
    render: path.resolve(__dirname, '../src/render'),
  }
  config.plugins = config.plugins.concat([
    new CopyPlugin([{ from: './conf/build/splash.html', to: 'splash.html' }]),
  ])

  return config
}
