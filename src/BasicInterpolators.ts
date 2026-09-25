/**
* Dispatcher for the basic interpolation methods (without LOESS).
*
* This module is separate from `Index.ts` so that `Loess.ts` can use it without creating a circular dependency.
*
* @module
*/

import {createAkimaSplineInterpolator} from "./Akima.ts";
import {createCubicSplineInterpolator} from "./Cubic.ts";
import {createLinearInterpolator} from "./Linear.ts";
import {createNearestNeighborInterpolator} from "./NearestNeighbor.ts";
import {UniFunction, assert} from "./Utils.ts";

/**
* The names of the basic interpolation methods (all methods except LOESS).
*
* - `"akima"`: Akima cubic spline interpolation, requires at least 5 points.
* - `"cubic"`: Natural cubic spline interpolation, requires at least 3 points.
* - `"linear"`: Linear interpolation, requires at least 2 points.
* - `"nearestNeighbor"`: Nearest neighbor interpolation, also accepts 0 or 1 points.
*/
export type BasicInterpolationMethod = "akima" | "cubic" | "linear" | "nearestNeighbor";

/**
* Returns an interpolating function for a dataset, using the specified basic interpolation method.
*
* @param interpolationMethod
*    The interpolation method.
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If the interpolation method is unknown, or for the invalid input conditions of the
*    `create*Interpolator()` function of the method (e.g. too few points for the method).
*/
export function createBasicInterpolator (interpolationMethod: BasicInterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   switch (interpolationMethod) {
      case "akima":           return createAkimaSplineInterpolator(xVals, yVals);
      case "cubic":           return createCubicSplineInterpolator(xVals, yVals);
      case "linear":          return createLinearInterpolator(xVals, yVals);
      case "nearestNeighbor": return createNearestNeighborInterpolator(xVals, yVals);
      default:                throw new Error(`Unknown interpolation method "${interpolationMethod}".`);
   }
}

/**
* Degrades an interpolation method when there are too few points for it.
*
* - `"akima"` with fewer than 5 points is replaced by `"cubic"`.
* - `"cubic"` with fewer than 3 points is replaced by `"linear"`.
* - Any method with fewer than 2 points is replaced by `"nearestNeighbor"`.
*   The resulting function returns the y value of the single point, or `NaN` if there are no points.
*
* The rules are applied one after the other, so e.g. `"akima"` with 2 points results in `"linear"`.
*
* @param interpolationMethod
*    The requested interpolation method.
* @param n
*    The number of points.
* @returns
*    The interpolation method that can be used for `n` points.
*/
export function getFallbackInterpolationMethod (interpolationMethod: BasicInterpolationMethod, n: number) : BasicInterpolationMethod {
   let method = interpolationMethod;
   if (n < 5 && method == "akima") {
      method = "cubic";
   }
   if (n < 3 && method == "cubic") {
      method = "linear";
   }
   if (n < 2) {
      method = "nearestNeighbor";
   }
   return method;
}

/**
* Returns an interpolating function for a dataset, using the specified basic interpolation method
* or a simpler method if there are too few points (see {@link getFallbackInterpolationMethod}).
*
* @param interpolationMethod
*    The requested interpolation method.
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If `xVals` and `yVals` have different lengths, if the interpolation method is unknown,
*    or if `xVals` contains non-finite values or is not strictly increasing.
*/
export function createBasicInterpolatorWithFallback (interpolationMethod: BasicInterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   assert(xVals.length == yVals.length, "Dimension mismatch for xVals and yVals.");
   const n = xVals.length;
   const method2 = getFallbackInterpolationMethod(interpolationMethod, n);
   return createBasicInterpolator(method2, xVals, yVals);
}
