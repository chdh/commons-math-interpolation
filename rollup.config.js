export default {
   input: "tempBuild/CommonsMathInterpolation.js",
   output: [
      {
         file: "dist/CommonsMathInterpolation.js",
         format: "cjs"
      },
      {
         file: "dist/CommonsMathInterpolation.mjs",      // for a single module this has the same effect as copying *.js to *.mjs
         format: "es"
      }
   ]
};
