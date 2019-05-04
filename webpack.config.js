var HtmlWebpackPlugin = require('html-webpack-plugin')
var path = require('path')

module.exports = {
  entry: {
    app: './src/index',
  },
  mode: 'development',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].bundle.js',
  },
  resolve: {
    extensions: ['.html', '.ts', '.tsx', '.js', '.json'],
    alias: {
      src: path.resolve(__dirname, '.src/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.worklet\.js$/,
        use: ['worklet-loader', 'babel-loader' ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Phased Vocoder',
      template: './template.html',
      excludeChunks: ['audio'],
    }),
  ],
}
