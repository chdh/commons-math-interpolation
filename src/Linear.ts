import {UniFunction, checkStrictlyIncreasing, trimPoly, evaluatePolySegment} from "./Utils.js";

/**
* Returns a linear interpolating function for a dataset.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
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
* @param yVals
*    The values of the interpolation points.
* @returns
*    Polynomial coefficients of the segments.
*/
export function computeLinearPolyCoefficients(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : Float64Array[] {
   if (xVals.length != yVals.length) {
      throw new Error("Dimension mismatch.");
   }
   if (xVals.length < 2) {
      throw new Error("Number of points is too small.");
   }
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
