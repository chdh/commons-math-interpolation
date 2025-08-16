export {createAkimaSplineInterpolator, computeAkimaPolyCoefficients} from "./Akima.ts";
export {createCubicSplineInterpolator, computeCubicPolyCoefficients} from "./Cubic.ts";
export {createLinearInterpolator, computeLinearPolyCoefficients} from "./Linear.ts";
export {createNearestNeighborInterpolator} from "./NearestNeighbor.ts";
export {createLoessInterpolator} from "./Loess.ts";
export {UniFunction} from "./Utils.ts";

import {createAkimaSplineInterpolator} from "./Akima.ts";
import {createCubicSplineInterpolator} from "./Cubic.ts";
import {createLinearInterpolator} from "./Linear.ts";
import {createNearestNeighborInterpolator} from "./NearestNeighbor.ts";
import {createLoessInterpolator} from "./Loess.ts";
import {UniFunction, createDomainRestrictedUniFunction} from "./Utils.ts";

export type InterpolationMethod = "akima" | "cubic" | "linear" | "nearestNeighbor" | "loess";

export interface InterpolatorOptions {
   domainRestricted?:        boolean;                      // true = the interpolator function shall return NaN when the argument value is outside the range xMin .. xMax
}

function createInterpolator2 (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   switch (interpolationMethod) {
      case "akima":           return createAkimaSplineInterpolator(xVals, yVals);
      case "cubic":           return createCubicSplineInterpolator(xVals, yVals);
      case "linear":          return createLinearInterpolator(xVals, yVals);
      case "nearestNeighbor": return createNearestNeighborInterpolator(xVals, yVals);
      case "loess":           return createLoessInterpolator({xVals, yVals});
      default:                throw new Error(`Unknown interpolation method "${interpolationMethod}".`);
   }
}

export function createInterpolator (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>, options?: InterpolatorOptions) : UniFunction {
   const f = createInterpolator2(interpolationMethod, xVals, yVals);
   const domainRestricted = options?.domainRestricted ?? false;
   if (!domainRestricted) {
      return f;
   }
   const xMin = (xVals.length > 0) ? xVals[0] : NaN;
   const xMax = (xVals.length > 0) ? xVals[xVals.length - 1] : NaN;
   return createDomainRestrictedUniFunction(f, xMin, xMax);
}

export function createInterpolatorWithFallback (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>, options?: InterpolatorOptions) : UniFunction {
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
   return createInterpolator(method, xVals, yVals, options);
}
