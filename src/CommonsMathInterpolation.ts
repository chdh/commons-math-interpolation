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
* @param xvals
*    The arguments for the interpolation points.
* @param yvals
*    The values for the interpolation points.
* @return
*    A function which interpolates the data set.
*/
export function createAkimaSplineInterpolator(xvals: Float64Array, yvals: Float64Array) : UniFunction {

   const MINIMUM_NUMBER_POINTS = 5;                        // The minimum number of points that are needed to compute the function.
   const n = xvals.length;

   if (n != yvals.length) {
      throw new Error("Dimension mismatch for xvals and yvals.");
   }

   if (n < MINIMUM_NUMBER_POINTS) {
      throw new Error("Number of points is too small.");
   }

   MathArrays_checkOrder(xvals);

   const numberOfDiffAndWeightElements = n - 1;

   const differences = new Float64Array(numberOfDiffAndWeightElements);
   const weights = new Float64Array(numberOfDiffAndWeightElements);

   for (let i = 0; i < differences.length; i++) {
      differences[i] = (yvals[i + 1] - yvals[i]) / (xvals[i + 1] - xvals[i]);
   }

   for (let i = 1; i < weights.length; i++) {
      weights[i] = Math.abs(differences[i] - differences[i - 1]);
   }

   // Prepare Hermite interpolation scheme.
   const firstDerivatives = new Float64Array(n);

   for (let i = 2; i < n - 2; i++) {
      const wP = weights[i + 1];
      const wM = weights[i - 1];
      if (Math.abs(wP) < EPSILON && Math.abs(wM) < EPSILON) {
         const xv  = xvals[i];
         const xvP = xvals[i + 1];
         const xvM = xvals[i - 1];
         firstDerivatives[i] = (((xvP - xv) * differences[i - 1]) + ((xv - xvM) * differences[i])) / (xvP - xvM);
      } else {
         firstDerivatives[i] = ((wP * differences[i - 1]) + (wM * differences[i])) / (wP + wM);
      }
   }

   firstDerivatives[0]     = differentiateThreePoint(xvals, yvals, 0, 0, 1, 2);
   firstDerivatives[1]     = differentiateThreePoint(xvals, yvals, 1, 0, 1, 2);
   firstDerivatives[n - 2] = differentiateThreePoint(xvals, yvals, n - 2, n - 3, n - 2, n - 1);
   firstDerivatives[n - 1] = differentiateThreePoint(xvals, yvals, n - 1, n - 3, n - 2, n - 1);

   return interpolateHermiteSorted(xvals, yvals, firstDerivatives);
}

/**
* Three point differentiation helper, modeled off of the same method in the
* Math.NET CubicSpline class. This is used by both the Apache Math and the
* Math.NET Akima Cubic Spline algorithms.
*
* @param xvals
*    x values to calculate the numerical derivative with.
* @param yvals
*    y values to calculate the numerical derivative with.
* @param indexOfDifferentiation
*    Index of the elemnt we are calculating the derivative around.
* @param indexOfFirstSample
*    Index of the first element to sample for the three point method.
* @param indexOfSecondsample
*    index of the second element to sample for the three point method.
* @param indexOfThirdSample
*    Index of the third element to sample for the three point method.
* @return
*    The derivative.
*/
function differentiateThreePoint(xvals: Float64Array, yvals: Float64Array,
      indexOfDifferentiation: number, indexOfFirstSample: number,
      indexOfSecondsample: number, indexOfThirdSample: number) : number {

   const x0 = yvals[indexOfFirstSample];
   const x1 = yvals[indexOfSecondsample];
   const x2 = yvals[indexOfThirdSample];

   const t  = xvals[indexOfDifferentiation] - xvals[indexOfFirstSample];
   const t1 = xvals[indexOfSecondsample]    - xvals[indexOfFirstSample];
   const t2 = xvals[indexOfThirdSample]     - xvals[indexOfFirstSample];

   const a = (x2 - x0 - (t2 / t1 * (x1 - x0))) / (t2 * t2 - t1 * t2);
   const b = (x1 - x0 - a * t1 * t1) / t1;

   return (2 * a * t) + b;
}

/**
* Creates a Hermite cubic spline interpolation from the set of (x,y) value
* pairs and their derivatives. This is modeled off of the
* InterpolateHermiteSorted method in the Math.NET CubicSpline class.
*
* @param xvals
*    x values for interpolation.
* @param yvals
*    y values for interpolation.
* @param firstDerivatives
*    First derivative values of the function.
* @return
*    A polynomial function that fits the function.
*/
function interpolateHermiteSorted(xvals: Float64Array, yvals: Float64Array, firstDerivatives: Float64Array) : UniFunction {

   const minimumLength = 2;
   const n = xvals.length;

   if (n != yvals.length || n != firstDerivatives.length) {
      throw new Error("Dimension mismatch");
   }

   if (n < minimumLength) {
      throw new Error("Not enough points.");
   }

   const polynomials: UniFunction[] = Array(n - 1);
   const coefficients = new Float64Array(4);

   for (let i = 0; i < n - 1; i++) {
       const w = xvals[i + 1] - xvals[i];
       const w2 = w * w;

       const yv  = yvals[i];
       const yvP = yvals[i + 1];

       const fd  = firstDerivatives[i];
       const fdP = firstDerivatives[i + 1];

       coefficients[0] = yv;
       coefficients[1] = firstDerivatives[i];
       coefficients[2] = (3 * (yvP - yv) / w - 2 * fd - fdP) / w;
       coefficients[3] = (2 * (yv - yvP) / w + fd + fdP) / w2;
       polynomials[i] = createPolynomialFunction(coefficients);
   }

   return createPolynomialSplineFunction(xvals, polynomials);
}

//--- Cubic --------------------------------------------------------------------

/**
* Returns a function that computes a natural (also known as "free", "unclamped")
* cubic spline interpolation for the data set.
*
* Returns a polynomial spline function consisting of n cubic polynomials,
* defined over the subintervals determined by the x values,
* x[0] < x[1] < ... < x[n-1]. The x values are referred to as "knot points".
*
* The value of the polynomial spline function at a point x that is greater
* than or equal to the smallest knot point and strictly less than the largest
* knot point is computed by finding the subinterval to which x belongs and
* computing the value of the corresponding polynomial at x - x[i] where
* i is the index of the subinterval.
* See createPolynomialSplineFunction() for more details.
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
* @param x
*    The arguments for the interpolation points.
* @param y
*    The values for the interpolation points.
* @return
*    A function which interpolates the data set.
*/
export function createCubicSplineInterpolator(x: Float64Array, y: Float64Array) : UniFunction {

   if (x.length != y.length) {
      throw new Error("Dimension mismatch.");
   }

   if (x.length < 3) {
      throw new Error("Number of points is too small.");
   }

   // Number of intervals. The number of data points is n + 1.
   const n = x.length - 1;

   MathArrays_checkOrder(x);

   // Differences between knot points
   const h = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      h[i] = x[i + 1] - x[i];
   }

   const mu = new Float64Array(n);
   const z = new Float64Array(n + 1);
   mu[0] = 0;
   z[0] = 0;
   let g = 0;
   for (let i = 1; i < n; i++) {
      g = 2 * (x[i+1] - x[i - 1]) - h[i - 1] * mu[i -1];
      mu[i] = h[i] / g;
      z[i] = (3 * (y[i + 1] * h[i - 1] - y[i] * (x[i + 1] - x[i - 1])+ y[i - 1] * h[i]) /
             (h[i - 1] * h[i]) - h[i - 1] * z[i - 1]) / g;
   }

   // cubic spline coefficients. b is linear, c quadratic, d is cubic (original y's are constants)
   const b = new Float64Array(n);
   const c = new Float64Array(n + 1);
   const d = new Float64Array(n);

   z[n] = 0;
   c[n] = 0;

   for (let j = n - 1; j >= 0; j--) {
      c[j] = z[j] - mu[j] * c[j + 1];
      b[j] = (y[j + 1] - y[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
      d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
   }

   const polynomials: UniFunction[] = Array(n);
   const coefficients = new Float64Array(4);
   for (let i = 0; i < n; i++) {
      coefficients[0] = y[i];
      coefficients[1] = b[i];
      coefficients[2] = c[i];
      coefficients[3] = d[i];
      polynomials[i] = createPolynomialFunction(coefficients);
   }

   return createPolynomialSplineFunction(x, polynomials);
}

//--- Linear -------------------------------------------------------------------

/**
* Returns a linear interpolating function for a data set.
*
* @param x
*    The arguments for the interpolation points.
* @param y
*    The values for the interpolation points.
* @return
*    A function which interpolates the data set.
*/
export function createLinearInterpolator(x: Float64Array, y: Float64Array) : UniFunction {

   if (x.length != y.length) {
      throw new Error("Dimension msmatch.");
   }

   if (x.length < 2) {
      throw new Error("Number of points is too small.");
   }

   // Number of intervals. The number of data points is n + 1.
   const n = x.length - 1;

   MathArrays_checkOrder(x);

   // Slope of the lines between the datapoints.
   const m = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      m[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
   }

   const polynomials: UniFunction[] = Array(n);
   const coefficients = new Float64Array(2);
   for (let i = 0; i < n; i++) {
      coefficients[0] = y[i];
      coefficients[1] = m[i];
      polynomials[i] = createPolynomialFunction(coefficients);
   }

   return createPolynomialSplineFunction(x, polynomials);
}

//------------------------------------------------------------------------------

/**
* Constructs and returns a polynomial spline function from given segment
* delimiters and interpolating polynomials.
*
* A polynomial spline function consists of a set of interpolating polynomials
* and an ascending array of domain knot points, determining the intervals
* over which the spline function is defined by the constituent polynomials.
* The polynomials are assumed to have been computed to match the values of
* another function at the knot points. The value consistency constraints are
* not currently enforced, but are assumed to hold among the polynomials and
* knot points passed.
*
* N.B.: The polynomials must be centered on the knot points to compute the
* spline function values.
* See below.
*
* The regular domain of the polynomial spline function is
* [smallest knot, largest knot], but attempts to evaluate the function at
* values outside of this range are allowed.
*
* The value of the polynomial spline function for an argument x is computed as
* follows:
*
*  1. The knot array is searched to find the segment to which x belongs.
*     If x is less than the smallest knot point or greater than the largest
*     one, the nearest knot is used.
*  2. Let i be the index of the largest knot point that is less than or equal
*     to x. The value returned is:
*     polynomials[i](x - knot[i])
*
* @param knots
*    Spline segment interval delimiters.
*    The values are copied to break any dependency on the original array
*    passed to this module.
* @param polynomials
*    The polynomial functions that make up the spline. The first element
*    determines the value of the spline over the first subinterval, the
*    second over the second, etc. Spline function values are determined by
*    evaluating these functions at (x - knot[i]), where i is the knot segment
*    to which x belongs.
* @return
*    The polynomial spline function.
*/
function createPolynomialSplineFunction(knots: Float64Array, polynomials: UniFunction[]) : UniFunction {
   const knots2 = knots.slice();                           // clone to break dependency on values passed from outside of this module
   if (knots2.length < 2) {
      throw new Error("Not enough knots.");
   }
   if (knots2.length - 1 != polynomials.length) {
      throw new Error("Dimension mismatch.");
   }
   MathArrays_checkOrder(knots2);
   return function(x: number) : number {
      let i = Arrays_binarySearch(knots2, x);
      if (i < 0) {
         i = -i - 2;
      }
      i = Math.max(0, Math.min(i, polynomials.length - 1));
      return polynomials[i](x - knots2[i]);
   };
}

//------------------------------------------------------------------------------

/**
* Construct and returns a polynomial function with the given coefficients.
*
* The first element of the coefficients array is the constant term. Higher
* degree coefficients follow in sequence. The degree of the resulting
* polynomial is the index of the last non-zero element of the array, or 0 if
* all elements are zero.
*
* The returned function uses Horner's Method evaluate the polynomial.
* The computed value is: c[n] * x^n + ... + c[1] * x + c[0]
*
* @param c
*    The coefficients of the polynomial, ordered by degree.
*    c[0] is the constant term and c[i] is the coefficient of x^i.
* @return
*    The polynomial function.
*/
function createPolynomialFunction(c: Float64Array) : UniFunction {
   const c2 = c.slice();                                   // clone to break dependency on passed array
   let n = c2.length;
   if (n == 0) {
      throw new Error("Empty polynomials coefficients array");
   }
   while (n > 1 && c2[n - 1] == 0) {
      n--;
   }
   return function (x: number) : number {
      let v = c2[n - 1];
      for (let i = n - 2; i >= 0; i--) {
         v = x * v + c2[i];
      }
      return v;
   };
}

//--- Utility functions --------------------------------------------------------

// Checks that the given array is sorted in strictly increasing order.
// Corresponds to org.apache.commons.math3.util.MathArrays.checkOrder().
function MathArrays_checkOrder(val: Float64Array) {
   let previous = val[0];
   const max = val.length;
   for (let index = 1; index < max; index++) {
      if (val[index] <= previous) {
         throw new Error("Non-monotonic sequence exception.");
      }
      previous = val[index];
   }
}

// Corresponds to java.util.Arrays.binarySearch().
function Arrays_binarySearch(a: Float64Array, key: number) : number {
   let low = 0;
   let high = a.length - 1;
   while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = a[mid];
      if (midVal < key) {
         low = mid + 1;
      }
      else if (midVal > key) {
         high = mid - 1;
      }
      else if (midVal == key) {
         return mid;
      }
      else {                                               // values might be NaN
         throw new Error("Invalid number encountered in binary search.");
      }
   }
   return -(low + 1);                                      // key not found.
}
