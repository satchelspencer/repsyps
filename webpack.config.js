var HtmlWebpackPlugin = require("html-webpack-plugin");
var path = require("path");

module.exports = {
  entry: "./src/index",
  mode: 'development',
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "bundle.js"
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
          loader: "babel-loader"
        }
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader"
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Phased Vocoder",
      template: './template.html'
    })
  ]
};
