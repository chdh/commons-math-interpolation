import {UniFunction, checkStrictlyIncreasing, binarySearch} from "./Utils.js";

/**
* Returns a nearest neighbor interpolating function for a dataset.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
*/
export function createNearestNeighborInterpolator(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {

   const xVals2 = Float64Array.from(xVals);                          // clone to break dependency on passed value
   const yVals2 = Float64Array.from(yVals);                          // clone to break dependency on passed value

   const n = xVals2.length;

   if (n != yVals2.length) {
      throw new Error("Dimension mismatch for xVals and yVals.");
   }

   if (n == 0) {
      return function(_x: number) : number {
         return NaN;
      };
   }

   if (n == 1) {
      return function(_x: number) : number {
         return yVals2[0];
      };
   }

   checkStrictlyIncreasing(xVals2);

   return function(x: number) : number {                             // nearest neighbor interpolator for n >= 2
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
