// A very simple example of how to use the commons-math-interpolation package.

import {createInterpolatorWithFallback} from "commons-math-interpolation";

const InterpolationMethod = "akima";
const xVals = [0, 3, 7, 10];
const yVals = [1, 5, -3, 0];
const interpolator = createInterpolatorWithFallback(InterpolationMethod, xVals, yVals);

for (let x = 0; x <= 10; x++) {
   const y = interpolator(x);
   console.log(x, y);
}
