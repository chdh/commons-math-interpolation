/**
* Natural cubic spline interpolation.
*
* @module
*/

import {UniFunction, assert, checkStrictlyIncreasing, trimPoly, evaluatePolySegment} from "./Utils.ts";

/**
* Returns a natural (also known as "free" or "unclamped") cubic spline interpolating function for a dataset.
*
* For `n` interpolation points with x values `x[0] < x[1] < ... < x[n-1]` (the "knot points"),
* the spline function consists of `n - 1` cubic polynomials, one for each segment `x[i] ... x[i+1]`.
* The value of the spline function at a point `x` is computed by finding the segment `i` to which `x` belongs
* and evaluating the polynomial of that segment at `x - x[i]`.
*
* The interpolating polynomials satisfy:
*  1. The value of the spline function at each of the input x values equals the corresponding y value.
*  2. Adjacent polynomials are equal through two derivatives at the knot points
*     (i.e., adjacent polynomials "match up" at the knot points, as do their
*     first and second derivatives).
*  3. The second derivative is zero at the first and the last knot point ("natural" boundary condition).
*
* Arguments outside the range of the knot points are extrapolated with the cubic polynomial
* of the first or last segment. If the argument is `NaN`, the function returns `NaN`.
*
* The passed arrays are not referenced by the returned function.
*
* The cubic spline interpolation algorithm implemented is as described in
* R.L. Burden, J.D. Faires, Numerical Analysis, 4th Ed., 1989, PWS-Kent,
* ISBN 0-53491-585-X, pp 126-131.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If `xVals` and `yVals` have different lengths, if there are fewer than 3 points,
*    or if `xVals` contains non-finite values or is not strictly increasing.
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
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    The polynomial coefficients of the `xVals.length - 1` segments.
*    Element `i` contains the coefficients of the segment from `xVals[i]` to `xVals[i + 1]`,
*    in ascending order (up to 4 coefficients) and relative to `xVals[i]`.
*    Zero coefficients of the highest orders are trimmed.
*    The result can be evaluated with {@link evaluatePolySegment}.
* @throws Error
*    If `xVals` and `yVals` have different lengths, if there are fewer than 3 points,
*    or if `xVals` contains non-finite values or is not strictly increasing.
*/
export function computeCubicPolyCoefficients(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : Float64Array[] {
   assert(xVals.length == yVals.length, "Dimension mismatch for xVals and yVals.");
   assert(xVals.length >= 3, "Number of points is too small.");
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
