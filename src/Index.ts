/**
* Main entry point of the package.
*
* Re-exports the main functions and types of the other modules, and provides {@link createInterpolator}
* and {@link createInterpolatorWithFallback}, which select the interpolation method by name.
*
* @module
*/

export {createAkimaSplineInterpolator, computeAkimaPolyCoefficients} from "./Akima.ts";
export {createCubicSplineInterpolator, computeCubicPolyCoefficients} from "./Cubic.ts";
export {createLinearInterpolator, computeLinearPolyCoefficients} from "./Linear.ts";
export {createNearestNeighborInterpolator} from "./NearestNeighbor.ts";
export type {UniFunction} from "./Utils.ts";
export type {BasicInterpolationMethod} from "./BasicInterpolators.ts";

import {createLoessInterpolator} from "./Loess.ts";
import {BasicInterpolationMethod, createBasicInterpolator, createBasicInterpolatorWithFallback} from "./BasicInterpolators.ts";
import {UniFunction, createDomainRestrictedUniFunction} from "./Utils.ts";

/**
* The names of all interpolation methods.
*
* In addition to the {@link BasicInterpolationMethod} names, `"loess"` selects LOESS/LOWESS local regression
* with default parameters (see {@link createLoessInterpolator}).
*/
export type InterpolationMethod = BasicInterpolationMethod | "loess";

/**
* Options for {@link createInterpolator} and {@link createInterpolatorWithFallback}.
*/
export interface InterpolatorOptions {

   /**
   * `true` if the returned function should return `NaN` when its argument is outside the range
   * `xVals[0] ... xVals[xVals.length - 1]`.
   * `false` if arguments outside that range should be extrapolated.
   * @defaultValue false
   */
   domainRestricted?: boolean;
}

// Wraps the interpolator function according to the options.
function applyInterpolatorOptions (f: UniFunction, xVals: ArrayLike<number>, options: InterpolatorOptions | undefined) : UniFunction {
   const domainRestricted = options?.domainRestricted ?? false;
   if (!domainRestricted) {
      return f;
   }
   const xMin = (xVals.length > 0) ? xVals[0] : NaN;
   const xMax = (xVals.length > 0) ? xVals[xVals.length - 1] : NaN;
   return createDomainRestrictedUniFunction(f, xMin, xMax);
}

/**
* Returns an interpolating function for a dataset, using the interpolation method with the specified name.
*
* To specify LOESS parameters, use {@link createLoessInterpolator} directly.
*
* @param interpolationMethod
*    The interpolation method.
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order
*    (for `"loess"`: in monotonically increasing order). The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @param options
*    Optional options.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If the interpolation method is unknown, or for the invalid input conditions of the
*    `create*Interpolator()` function of the method (e.g. too few points for the method).
*/
export function createInterpolator (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>, options?: InterpolatorOptions) : UniFunction {
   const f = (interpolationMethod == "loess") ? createLoessInterpolator({xVals, yVals}) : createBasicInterpolator(interpolationMethod, xVals, yVals);
   return applyInterpolatorOptions(f, xVals, options);
}

/**
* Returns an interpolating function for a dataset, using the interpolation method with the specified name
* or a simpler method if there are too few points (see {@link createBasicInterpolatorWithFallback}).
*
* LOESS does not need a fallback here, because {@link createLoessInterpolator} already applies the fallback
* when connecting the smoothed points.
*
* @param interpolationMethod
*    The requested interpolation method.
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order
*    (for `"loess"`: in monotonically increasing order). The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @param options
*    Optional options.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If `xVals` and `yVals` have different lengths, if the interpolation method is unknown,
*    or if `xVals` contains non-finite values or is not in the required order.
*/
export function createInterpolatorWithFallback (interpolationMethod: InterpolationMethod, xVals: ArrayLike<number>, yVals: ArrayLike<number>, options?: InterpolatorOptions) : UniFunction {
   const f = (interpolationMethod == "loess") ? createLoessInterpolator({xVals, yVals}) : createBasicInterpolatorWithFallback(interpolationMethod, xVals, yVals);
   return applyInterpolatorOptions(f, xVals, options);
}
