import resolve from "rollup-plugin-node-resolve";

export default {
   input: "tempBuild/app.js",
   output: {
      file: "tempBuild/appBundle.js",
      format: "iife"
   },
   plugins: [
      resolve()
   ]
};
