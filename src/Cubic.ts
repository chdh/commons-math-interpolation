import {UniFunction, checkStrictlyIncreasing, trimPoly, evaluatePolySegment} from "./Utils.js";

/**
* Returns a function that computes a natural (also known as "free", "unclamped")
* cubic spline interpolation for the dataset.
*
* Returns a polynomial spline function consisting of n cubic polynomials,
* defined over the subintervals determined by the x values,
* x[0] < x[1] < ... < x[n-1]. The x values are referred to as "knot points".
*
* The value of the polynomial spline function at a point x is computed by
* finding the segment to which x belongs and computing the value of the
* corresponding polynomial at x - x[i] where i is the index of the segment.
*
* The interpolating polynomials satisfy:
*  1. The value of the polynomial spline function at each of the input x values
*     equals the corresponding y value.
*  2. Adjacent polynomials are equal through two derivatives at the knot points
*     (i.e., adjacent polynomials "match up" at the knot points, as do their
*     first and second derivatives).
*
* The cubic spline interpolation algorithm implemented is as described in
* R.L. Burden, J.D. Faires, Numerical Analysis, 4th Ed., 1989, PWS-Kent,
* ISBN 0-53491-585-X, pp 126-131.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
* @param yVal
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
*/
export function createCubicSplineInterpolator(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   const segmentCoeffs = computeCubicPolyCoefficients(xVals, yVals);
   const xValsCopy = Float64Array.from(xVals);                       // clone to break dependency on passed values
   return (x: number) => evaluatePolySegment(xValsCopy, segmentCoeffs, x);
}

/**
* Computes the polynomial coefficients for the natural cubic spline
* interpolation of a dataset.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
* @param yVals
*    The values of the interpolation points.
* @returns
*    Polynomial coefficients of the segments.
*/
export function computeCubicPolyCoefficients(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : Float64Array[] {
   if (xVals.length != yVals.length) {
      throw new Error("Dimension mismatch.");
   }
   if (xVals.length < 3) {
      throw new Error("Number of points is too small.");
   }
   checkStrictlyIncreasing(xVals);
   const n = xVals.length - 1;                                       // number of segments

   const h = new Float64Array(n);                                    // delta x values
   for (let i = 0; i < n; i++) {
      h[i] = xVals[i + 1] - xVals[i];
   }

   const mu = new Float64Array(n);
   const z = new Float64Array(n + 1);
   mu[0] = 0;
   z[0] = 0;
   for (let i = 1; i < n; i++) {
      const g = 2 * (xVals[i + 1] - xVals[i - 1]) - h[i - 1] * mu[i - 1];
      mu[i] = h[i] / g;
      z[i] = (3 * (yVals[i + 1] * h[i - 1] - yVals[i] * (xVals[i + 1] - xVals[i - 1]) + yVals[i - 1] * h[i]) /
             (h[i - 1] * h[i]) - h[i - 1] * z[i - 1]) / g;
   }

   // cubic spline coefficients. b is linear, c quadratic, d is cubic
   const b = new Float64Array(n);
   const c = new Float64Array(n + 1);
   const d = new Float64Array(n);

   z[n] = 0;
   c[n] = 0;

   for (let i = n - 1; i >= 0; i--) {
      const dx = h[i];
      const dy = yVals[i + 1] - yVals[i];
      c[i] = z[i] - mu[i] * c[i + 1];
      b[i] = dy / dx - dx * (c[i + 1] + 2 * c[i]) / 3;
      d[i] = (c[i + 1] - c[i]) / (3 * dx);
   }

   const segmentCoeffs : Float64Array[] = new Array(n);
   for (let i = 0; i < n; i++) {
      const coeffs = new Float64Array(4);
      coeffs[0] = yVals[i];
      coeffs[1] = b[i];
      coeffs[2] = c[i];
      coeffs[3] = d[i];
      segmentCoeffs[i] = trimPoly(coeffs);
   }
   return segmentCoeffs;
}
