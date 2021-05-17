import resolve from "@rollup/plugin-node-resolve";

export default {
   input: "example1.js",
   output: {
      file: "dist/example1Pack.js",
      format: "iife"
   },
   plugins: [
      resolve(),
   ]
};
