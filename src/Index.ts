export {createAkimaSplineInterpolator, computeAkimaPolyCoefficients} from "./Akima.js";
export {createCubicSplineInterpolator, computeCubicPolyCoefficients} from "./Cubic.js";
export {createLinearInterpolator, computeLinearPolyCoefficients} from "./Linear.js";
export {createNearestNeighborInterpolator} from "./NearestNeighbor.js";
export {createLoessInterpolator} from "./Loess.js";
export {UniFunction} from "./Utils.js";

import {createAkimaSplineInterpolator} from "./Akima.js";
import {createCubicSplineInterpolator} from "./Cubic.js";
import {createLinearInterpolator} from "./Linear.js";
import {createNearestNeighborInterpolator} from "./NearestNeighbor.js";
import {createLoessInterpolator} from "./Loess.js";
import {UniFunction} from "./Utils.js";

export type InterpolationMethod = "akima" | "cubic" | "linear" | "nearestNeighbor" | "loess";

export function createInterpolator (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   switch (interpolationMethod) {
      case "akima":           return createAkimaSplineInterpolator(xVals, yVals);
      case "cubic":           return createCubicSplineInterpolator(xVals, yVals);
      case "linear":          return createLinearInterpolator(xVals, yVals);
      case "nearestNeighbor": return createNearestNeighborInterpolator(xVals, yVals);
      case "loess":           return createLoessInterpolator({xVals, yVals});
      default:                throw new Error(`Unknown interpolation method "${interpolationMethod}".`);
   }
}

export function createInterpolatorWithFallback (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   const n = xVals.length;
   let method = interpolationMethod;
   if (n < 5 && method == "akima") {
      method = "cubic";
   }
   if (n < 3 && method == "cubic") {
      method = "linear";
   }
   if (n < 2) {
      const c = (n == 1) ? yVals[0] : 0;
      return (_x: number) => c;
   }
   return createInterpolator(method, xVals, yVals);
}
