import resolve from "@rollup/plugin-node-resolve";

export default {
   input: "tempBuild/Main.js",
   output: {
      file: "app.js",
      format: "iife"
   },
   plugins: [
      resolve()
   ]
};
