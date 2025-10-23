import { rspack } from '@rspack/core'

export default {
  entry: './example/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        use: ['postcss-loader'],
        type: 'css/auto',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './example/index.html',
    }),
  ],
  devServer: {
    hot: false,
  },
  experiments: {
    css: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
}
