/**
* Akima cubic spline interpolation.
*
* @module
*/

import {UniFunction, assert, checkStrictlyIncreasing, trimPoly, evaluatePolySegment} from "./Utils.ts";

/**
* Returns a cubic spline interpolating function for a dataset, using the Akima algorithm.
*
* The Akima spline is a piecewise cubic Hermite spline. The first derivative at each interior knot point
* is determined locally from the slopes of the neighboring segments, which reduces the overshooting
* that other cubic splines show near outliers and abrupt changes. Only the first derivative is continuous
* at the knot points. The first derivatives at the first two and the last two knot points are
* computed by fitting a parabola through the first three or the last three points.
*
* For `n` interpolation points with x values `x[0] < x[1] < ... < x[n-1]` (the "knot points"),
* the spline function consists of `n - 1` cubic polynomials, one for each segment `x[i] ... x[i+1]`.
* The Akima algorithm requires that `n >= 5`.
*
* Arguments outside the range of the knot points are extrapolated with the cubic polynomial
* of the first or last segment. If the argument is `NaN`, the function returns `NaN`.
*
* The passed arrays are not referenced by the returned function.
*
* The Akima algorithm was originally formulated by Hiroshi Akima in
* his 1970 paper "A New Method of Interpolation and Smooth Curve Fitting Based
* on Local Procedures", J. ACM 17, 4 (October 1970), 589-602,
* [DOI 10.1145/321607.321609](https://doi.org/10.1145/321607.321609).
*
* This implementation is a port of the `AkimaSplineInterpolator` class of Apache Commons Math,
* which is based on the method `CubicSpline.InterpolateAkimaSorted` of the Math.NET Numerics library.
*
* @param xVals
*    The arguments of the interpolation points, in strictly increasing order.
*    The values must be finite.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
* @throws Error
*    If `xVals` and `yVals` have different lengths, if there are fewer than 5 points,
*    or if `xVals` contains non-finite values or is not strictly increasing.
*/
export function createAkimaSplineInterpolator(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {
   const segmentCoeffs = computeAkimaPolyCoefficients(xVals, yVals);
   const xValsCopy = Float64Array.from(xVals);                       // clone to break dependency on passed values
   return (x: number) => evaluatePolySegment(xValsCopy, segmentCoeffs, x);
}

/**
* Computes the polynomial coefficients for the Akima cubic spline
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
*    If `xVals` and `yVals` have different lengths, if there are fewer than 5 points,
*    or if `xVals` contains non-finite values or is not strictly increasing.
*/
export function computeAkimaPolyCoefficients(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : Float64Array[] {
   assert(xVals.length == yVals.length, "Dimension mismatch for xVals and yVals.");
   assert(xVals.length >= 5, "Number of points is too small.");
   checkStrictlyIncreasing(xVals);
   const n = xVals.length - 1;                                       // number of segments

   const differences = new Float64Array(n);
   const weights = new Float64Array(n);

   for (let i = 0; i < n; i++) {
      differences[i] = (yVals[i + 1] - yVals[i]) / (xVals[i + 1] - xVals[i]);
   }

   for (let i = 1; i < n; i++) {
      weights[i] = Math.abs(differences[i] - differences[i - 1]);
   }

   // Prepare Hermite interpolation scheme.
   const firstDerivatives = new Float64Array(n + 1);

   for (let i = 2; i < n - 1; i++) {
      const wP = weights[i + 1];
      const wM = weights[i - 1];
      if (wP == 0 && wM == 0) {
         const xv  = xVals[i];
         const xvP = xVals[i + 1];
         const xvM = xVals[i - 1];
         firstDerivatives[i] = (((xvP - xv) * differences[i - 1]) + ((xv - xvM) * differences[i])) / (xvP - xvM);
      } else {
         firstDerivatives[i] = ((wP * differences[i - 1]) + (wM * differences[i])) / (wP + wM);
      }
   }

   firstDerivatives[0]     = differentiateThreePoint(xVals, yVals, 0, 0, 1, 2);
   firstDerivatives[1]     = differentiateThreePoint(xVals, yVals, 1, 0, 1, 2);
   firstDerivatives[n - 1] = differentiateThreePoint(xVals, yVals, n - 1, n - 2, n - 1, n);
   firstDerivatives[n]     = differentiateThreePoint(xVals, yVals, n    , n - 2, n - 1, n);

   return computeHermitePolyCoefficients(xVals, yVals, firstDerivatives);
}

/**
* Three point differentiation helper, modeled off of the same method in the
* Math.NET CubicSpline class.
*
* @param xVals
*    x values to calculate the numerical derivative with.
* @param yVals
*    y values to calculate the numerical derivative with.
* @param indexOfDifferentiation
*    Index of the element we are calculating the derivative around.
* @param indexOfFirstSample
*    Index of the first element to sample for the three point method.
* @param indexOfSecondSample
*    Index of the second element to sample for the three point method.
* @param indexOfThirdSample
*    Index of the third element to sample for the three point method.
* @returns
*    The derivative.
*/
function differentiateThreePoint(xVals: ArrayLike<number>, yVals: ArrayLike<number>,
      indexOfDifferentiation: number, indexOfFirstSample: number,
      indexOfSecondSample: number, indexOfThirdSample: number) : number {

   const y0 = yVals[indexOfFirstSample];
   const y1 = yVals[indexOfSecondSample];
   const y2 = yVals[indexOfThirdSample];

   const t  = xVals[indexOfDifferentiation] - xVals[indexOfFirstSample];
   const t1 = xVals[indexOfSecondSample]    - xVals[indexOfFirstSample];
   const t2 = xVals[indexOfThirdSample]     - xVals[indexOfFirstSample];

   const a = (y2 - y0 - (t2 / t1 * (y1 - y0))) / (t2 * t2 - t1 * t2);
   const b = (y1 - y0 - a * t1 * t1) / t1;

   return (2 * a * t) + b;
}

/**
* Computes the polynomial coefficients for the Hermite cubic spline interpolation
* for a set of (x,y) value pairs and their derivatives. This is modeled off of
* the InterpolateHermiteSorted method in the Math.NET CubicSpline class.
*
* @param xVals
*    x values for interpolation.
* @param yVals
*    y values for interpolation.
* @param firstDerivatives
*    First derivative values of the function.
* @returns
*    Polynomial coefficients of the segments.
*/
function computeHermitePolyCoefficients(xVals: ArrayLike<number>, yVals: ArrayLike<number>, firstDerivatives: ArrayLike<number>) : Float64Array[] {
   assert(xVals.length == yVals.length && xVals.length == firstDerivatives.length, "Dimension mismatch for xVals, yVals and firstDerivatives.");
   assert(xVals.length >= 2, "Not enough points.");
   const n = xVals.length - 1;                                       // number of segments

   const segmentCoeffs : Float64Array[] = new Array(n);
   for (let i = 0; i < n; i++) {
      const w = xVals[i + 1] - xVals[i];
      const w2 = w * w;

      const yv  = yVals[i];
      const yvP = yVals[i + 1];

      const fd  = firstDerivatives[i];
      const fdP = firstDerivatives[i + 1];

      const coeffs = new Float64Array(4);
      coeffs[0] = yv;
      coeffs[1] = fd;
      coeffs[2] = (3 * (yvP - yv) / w - 2 * fd - fdP) / w;
      coeffs[3] = (2 * (yv - yvP) / w + fd + fdP) / w2;
      segmentCoeffs[i] = trimPoly(coeffs);
   }
   return segmentCoeffs;
}
