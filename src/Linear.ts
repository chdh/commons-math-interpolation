/**
* Linear interpolation.
*
* The interpolating function is piecewise linear, i.e. the interpolation points are connected by straight lines.
*
* @module
*/

import {UniFunction, assert, checkStrictlyIncreasing, trimPoly, evaluatePolySegment} from "./Utils.ts";

/**
* Returns a linear interpolating function for a dataset.
*
* Arguments outside the range of the interpolation points are extrapolated with the straight line
* of the first or last segment. If the argument is `NaN`, the function returns `NaN`.
*
* The passed arrays are not referenced by the returned function.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If `xVals` and `yVals` have different lengths, if there are fewer than 2 points,
*    or if `xVals` contains non-finite values or is not strictly increasing.
*/
export function createLinearInterpolator(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   const segmentCoeffs = computeLinearPolyCoefficients(xVals, yVals);
   const xValsCopy = Float64Array.from(xVals);                       // clone to break dependency on passed values
   return (x: number) => evaluatePolySegment(xValsCopy, segmentCoeffs, x);
}

/**
* Computes the polynomial coefficients for the linear interpolation of a dataset.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    The polynomial coefficients of the `xVals.length - 1` segments.
*    Element `i` contains the coefficients of the segment from `xVals[i]` to `xVals[i + 1]`,
*    in ascending order (`[yVals[i], slope]`) and relative to `xVals[i]`.
*    A zero slope is trimmed, so a segment may contain only one coefficient.
*    The result can be evaluated with {@link evaluatePolySegment}.
* @throws Error
*    If `xVals` and `yVals` have different lengths, if there are fewer than 2 points,
*    or if `xVals` contains non-finite values or is not strictly increasing.
*/
export function computeLinearPolyCoefficients(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : Float64Array[] {
   assert(xVals.length == yVals.length, "Dimension mismatch for xVals and yVals.");
   assert(xVals.length >= 2, "Number of points is too small.");
   checkStrictlyIncreasing(xVals);
   const n = xVals.length - 1;                                       // number of segments
   const segmentCoeffs : Float64Array[] = new Array(n);
   for (let i = 0; i < n; i++) {
      const dx = xVals[i + 1] - xVals[i];
      const dy = yVals[i + 1] - yVals[i];
      const m = dy / dx;                                             // slope of the line between two data points
      const c = new Float64Array(2);
      c[0] = yVals[i];
      c[1] = m;
      segmentCoeffs[i] = trimPoly(c);
   }
   return segmentCoeffs;
}
