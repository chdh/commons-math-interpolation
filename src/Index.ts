export {createAkimaSplineInterpolator, computeAkimaPolyCoefficients} from "./Akima";
export {createCubicSplineInterpolator, computeCubicPolyCoefficients} from "./Cubic";
export {createLinearInterpolator, computeLinearPolyCoefficients} from "./Linear";
export {createNearestNeighborInterpolator} from "./NearestNeighbor";
export {UniFunction} from "./Utils";

import {createAkimaSplineInterpolator} from "./Akima";
import {createCubicSplineInterpolator} from "./Cubic";
import {createLinearInterpolator} from "./Linear";
import {createNearestNeighborInterpolator} from "./NearestNeighbor";
import {UniFunction} from "./Utils";

export type InterpolationMethod = "akima" | "cubic" | "linear" | "nearestNeighbor";

export function createInterpolator (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   switch (interpolationMethod) {
      case "akima":           return createAkimaSplineInterpolator(xVals, yVals);
      case "cubic":           return createCubicSplineInterpolator(xVals, yVals);
      case "linear":          return createLinearInterpolator(xVals, yVals);
      case "nearestNeighbor": return createNearestNeighborInterpolator(xVals, yVals);
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
