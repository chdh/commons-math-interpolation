module.exports = {
  mode: "development",
  entry: "./example1.js",
  output: {
    filename: "example1Pack.js"
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
};
