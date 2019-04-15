// @ts-ignore: Number.EPSILON is not defined in ES5.
const EPSILON = Number.EPSILON || 2.2204460492503130808472633361816E-16;

/**
* An univariate numeric function.
*/
export type UniFunction = (x: number) => number;

//--- Akima --------------------------------------------------------------------

/**
* Returns a function that computes a cubic spline interpolation for the data
* set using the Akima algorithm, as originally formulated by Hiroshi Akima in
* his 1970 paper "A New Method of Interpolation and Smooth Curve Fitting Based
* on Local Procedures."
* J. ACM 17, 4 (October 1970), 589-602. DOI=10.1145/321607.321609
* http://doi.acm.org/10.1145/321607.321609
*
* This implementation is based on the Akima implementation in the CubicSpline
* class in the Math.NET Numerics library. The method referenced is
* CubicSpline.InterpolateAkimaSorted.
*
* Returns a polynomial spline function consisting of n cubic polynomials,
* defined over the subintervals determined by the x values,
* x[0] < x[1] < ... < x[n-1].
* The Akima algorithm requires that n >= 5.
*
* @param xVals
*    The arguments of the interpolation points.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
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
*    The arguments of the interpolation points.
* @param yVals
*    The values of the interpolation points.
* @returns
*    Polynomial coefficients of the segments.
*/
export function computeAkimaPolyCoefficients(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : Float64Array[] {
   if (xVals.length != yVals.length) {
      throw new Error("Dimension mismatch for xVals and yVals.");
   }
   if (xVals.length < 5) {
      throw new Error("Number of points is too small.");
   }
   MathArrays_checkOrder(xVals);
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
      if (Math.abs(wP) < EPSILON && Math.abs(wM) < EPSILON) {
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
*    Index of the elemnt we are calculating the derivative around.
* @param indexOfFirstSample
*    Index of the first element to sample for the three point method.
* @param indexOfSecondsample
*    index of the second element to sample for the three point method.
* @param indexOfThirdSample
*    Index of the third element to sample for the three point method.
* @returns
*    The derivative.
*/
function differentiateThreePoint(xVals: ArrayLike<number>, yVals: ArrayLike<number>,
      indexOfDifferentiation: number, indexOfFirstSample: number,
      indexOfSecondsample: number, indexOfThirdSample: number) : number {

   const x0 = yVals[indexOfFirstSample];
   const x1 = yVals[indexOfSecondsample];
   const x2 = yVals[indexOfThirdSample];

   const t  = xVals[indexOfDifferentiation] - xVals[indexOfFirstSample];
   const t1 = xVals[indexOfSecondsample]    - xVals[indexOfFirstSample];
   const t2 = xVals[indexOfThirdSample]     - xVals[indexOfFirstSample];

   const a = (x2 - x0 - (t2 / t1 * (x1 - x0))) / (t2 * t2 - t1 * t2);
   const b = (x1 - x0 - a * t1 * t1) / t1;

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
   if (xVals.length != yVals.length || xVals.length != firstDerivatives.length) {
      throw new Error("Dimension mismatch");
   }
   if (xVals.length < 2) {
      throw new Error("Not enough points.");
   }
   const n = xVals.length - 1;                                       // number of segments

   const segmentCoeffs = new Array(n);
   for (let i = 0; i < n; i++) {
      const w = xVals[i + 1] - xVals[i];
      const w2 = w * w;

      const yv  = yVals[i];
      const yvP = yVals[i + 1];

      const fd  = firstDerivatives[i];
      const fdP = firstDerivatives[i + 1];

      const coeffs = new Float64Array(4);
      coeffs[0] = yv;
      coeffs[1] = firstDerivatives[i];
      coeffs[2] = (3 * (yvP - yv) / w - 2 * fd - fdP) / w;
      coeffs[3] = (2 * (yv - yvP) / w + fd + fdP) / w2;
      segmentCoeffs[i] = trimPoly(coeffs);
   }
   return segmentCoeffs;
}

//--- Cubic --------------------------------------------------------------------

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
*    The arguments of the interpolation points.
* @param yVals
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
*    The arguments of the interpolation points.
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
   MathArrays_checkOrder(xVals);
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

   const segmentCoeffs = new Array(n);
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

//--- Linear -------------------------------------------------------------------

/**
* Returns a linear interpolating function for a dataset.
*
* @param xVals
*    The arguments of the interpolation points.
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
*    The arguments of the interpolation points.
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
   MathArrays_checkOrder(xVals);
   const n = xVals.length - 1;                                       // number of segments
   const segmentCoeffs = new Array(n);
   for (let i = 0; i < n; i++) {
      const dx = xVals[i + 1] - xVals[i];
      const dy = yVals[i + 1] - yVals[i];
      const m = dy / dx;                                             // slope of the line between two data points
      const c = new Float64Array(2);
      c[0] = yVals[i];
      c[1] = m;
      segmentCoeffs[i] = trimPoly(c); }
   return segmentCoeffs;
}

//--- Nearest neighbor ---------------------------------------------------------

/**
* Returns a nearest neighbor interpolating function for a dataset.
*
* @param xVals
*    The arguments of the interpolation points.
* @param yVals
*    The values of the interpolation points.
* @returns
*    A function which interpolates the dataset.
*/
export function createNearestNeighborInterpolator(xVals: ArrayLike<number>, yVals: ArrayLike<number>) : UniFunction {

   const xVals2 = Float64Array.from(xVals);                          // clone to break dependency passed value
   const yVals2 = Float64Array.from(yVals);                          // clone to break dependency passed value

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

   MathArrays_checkOrder(xVals2);

   return function(x: number) : number {                             // nearest neighbor interpolator for n >= 2
      let i = Arrays_binarySearch(xVals2, x);
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

//--- Polynomial routines ------------------------------------------------------

// Evaluates the polynomial of the segment corresponding to the specified x value.
function evaluatePolySegment(xVals: ArrayLike<number>, segmentCoeffs: ArrayLike<number>[], x: number) : number {
   let i = Arrays_binarySearch(xVals, x);
   if (i < 0) {
      i = -i - 2;
   }
   i = Math.max(0, Math.min(i, segmentCoeffs.length - 1));
   return evaluatePoly(segmentCoeffs[i], x - xVals[i]);
}

// Evaluates the value of a polynomial.
// c contains the polynomial coefficients in ascending order.
function evaluatePoly(c: ArrayLike<number>, x: number) : number {
   const n = c.length;
   if (n == 0) {
      return 0; }
   let v = c[n - 1];
   for (let i = n - 2; i >= 0; i--) {
      v = x * v + c[i];
   }
   return v;
}

// Trims top order polynomial coefficients which are zero.
function trimPoly(c: Float64Array) : Float64Array {
   let n = c.length;
   while (n > 1 && c[n - 1] == 0) {
      n--;
   }
   return (n == c.length) ? c : c.subarray(0, n);
}

//--- Utility functions --------------------------------------------------------

// Checks that the given array is sorted in strictly increasing order.
// Corresponds to org.apache.commons.math3.util.MathArrays.checkOrder().
function MathArrays_checkOrder(a: ArrayLike<number>) {
   for (let i = 1; i < a.length; i++) {
      if (a[i] <= a[i - 1]) {
         throw new Error("Non-monotonic sequence exception.");
      }
   }
}

// Corresponds to java.util.Arrays.binarySearch().
// Returns the index of the search key, if it is contained in the array.
// Otherwise it returns -(insertionPoint + 1).
// The insertion point is defined as the point at which the key would be
// inserted into the array: the index of the first element greater than
// the key, or a.length if all elements in the array are less than the
// specified key.
function Arrays_binarySearch(a: ArrayLike<number>, key: number) : number {
   let low = 0;
   let high = a.length - 1;
   while (low <= high) {
      const mid = (low + high) >>> 1;                                // tslint:disable-line:no-bitwise
      const midVal = a[mid];
      if (midVal < key) {
         low = mid + 1;
      } else if (midVal > key) {
         high = mid - 1;
      } else if (midVal == key) {
         return mid;
      } else {                                                       // values might be NaN
         throw new Error("Invalid number encountered in binary search.");
      }
   }
   return -(low + 1);                                                // key not found
}
