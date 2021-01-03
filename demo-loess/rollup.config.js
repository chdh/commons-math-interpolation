import * as Path from "path";
import resolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";

export default {
   input: "tempBuild/Main.js",
   output: {
      file: "app.js",
      format: "iife"
   },
   plugins: [
      resolve(),
      alias({
         entries: {
            "commons-math-interpolation": Path.resolve("../dist")
         }
      })
   ]
};
