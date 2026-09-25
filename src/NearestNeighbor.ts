/**
* Nearest neighbor interpolation.
*
* The interpolating function is a step function that returns the y value of the interpolation point
* whose x value is nearest to the argument.
*
* @module
*/

import {UniFunction, assert, checkStrictlyIncreasing, binarySearch} from "./Utils.ts";

/**
* Returns a nearest neighbor interpolating function for a dataset.
*
* The returned function returns the y value of the interpolation point nearest to its argument.
* If the argument is exactly in the middle between two points, the y value of the right point is returned.
* Arguments below the first point return the y value of the first point, and arguments above the last point
* return the y value of the last point. If the argument is `NaN`, `NaN` is returned.
*
* Unlike the other interpolation methods, this method also accepts fewer than two points:
* With no points, the returned function always returns `NaN`.
* With a single point, it returns the y value of that point for all arguments except `NaN`.
*
* The passed arrays are copied, so the returned function does not depend on them.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If `xVals` and `yVals` have different lengths, or if `xVals` contains non-finite values
*    or is not strictly increasing.
*/
export function createNearestNeighborInterpolator(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {

   const xVals2 = Float64Array.from(xVals);                          // clone to break dependency on passed value
   const yVals2 = Float64Array.from(yVals);                          // clone to break dependency on passed value

   const n = xVals2.length;
   assert(n == yVals2.length, "Dimension mismatch for xVals and yVals.");

   if (n == 0) {
      return function(_x: number) : number {
         return NaN;
      };
   }

   checkStrictlyIncreasing(xVals2);

   return function(x: number) : number {                             // nearest neighbor interpolator for n >= 1
      if (Number.isNaN(x)) {
         return NaN;
      }
      let i = binarySearch(xVals2, x);
      if (i >= 0) {                                                  // exact knot x found
         return yVals2[i];                                           // return y value of that knot
      }
      i = -i - 1;                                                    // logical position of x in xVals array
      if (i == 0) {                                                  // x is lower than x value of first knot
         return yVals2[0];                                           // return y value of first knot
      }
      if (i >= n) {                                                  // x is higher than x value of last knot
         return yVals2[n - 1];                                       // return y value of last knot
      }
      const d = x - xVals2[i - 1];                                   // distance of x from left knot
      const w = xVals2[i] - xVals2[i - 1];                           // x distance between neighboring knots
      return (d + d < w) ? yVals2[i - 1] : yVals2[i];                // return y value of left or right knot
   };
}
