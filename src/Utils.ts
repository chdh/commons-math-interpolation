/**
* Utility functions and types used by the other modules of this package.
*
* @module
*/

/**
* A univariate numeric function, i.e. a function that maps a number to a number.
*
* This is the type of the interpolating functions returned by the `create*Interpolator()` functions
* of this package.
*/
export type UniFunction = (x: number) => number;

/**
* Throws an exception if the passed condition is not `true`.
*
* This is a TypeScript assertion function. After a call, the compiler narrows `cond` to `true`.
*
* @param cond
*    The condition to be checked.
* @param msg
*    An optional message for the exception.
* @throws Error
*    If `cond` is not `true`.
*/
export function assert (cond: boolean, msg?: string) : asserts cond {
   if (!cond) {
      throw new Error(msg ?? "Assertion failed."); }}

/**
* Evaluates a piecewise polynomial function (e.g. a spline) at the specified argument value.
*
* The segment is selected by the position of `x` within the knots `xVals`:
* segment `i` is used for `xVals[i] <= x < xVals[i + 1]`.
* Arguments below `xVals[0]` are evaluated with the first segment and arguments at or above
* the start of the last segment are evaluated with the last segment (extrapolation).
*
* @param xVals
*    The x values of the knots, in strictly increasing order.
*    `xVals[i]` is the start point of segment `i`.
*    Normally it contains one element more than `segmentCoeffs` (the end point of the last segment).
* @param segmentCoeffs
*    The polynomial coefficients of the segments, in ascending order (constant term first).
*    The polynomials are relative to the segment start, i.e. segment `i` is evaluated as a polynomial
*    of `x - xVals[i]`.
*    Must contain at least one segment.
* @param x
*    The argument value.
* @returns
*    The value of the piecewise polynomial function at `x`, or `NaN` if `x` is `NaN`.
*/
export function evaluatePolySegment(xVals: ArrayLike<number>, segmentCoeffs: ArrayLike<number>[], x: number) : number {
   if (Number.isNaN(x)) {
      return NaN;
   }
   assert(segmentCoeffs.length > 0, "No polynomial segments.");
   let i = binarySearch(xVals, x);
   if (i < 0) {
      i = -i - 2;
   }
   i = Math.max(0, Math.min(i, segmentCoeffs.length - 1));
   return evaluatePoly(segmentCoeffs[i], x - xVals[i]);
}

/**
* Evaluates a polynomial, using Horner's method.
*
* @param c
*    The polynomial coefficients in ascending order,
*    i.e. the polynomial is `c[0] + c[1] * x + c[2] * x^2 + ...`.
* @param x
*    The argument value.
* @returns
*    The value of the polynomial at `x`, or 0 if `c` is empty.
*/
export function evaluatePoly(c: ArrayLike<number>, x: number) : number {
   const n = c.length;
   if (n == 0) {
      return 0;
   }
   let v = c[n - 1];
   for (let i = n - 2; i >= 0; i--) {
      v = x * v + c[i];
   }
   return v;
}

/**
* Removes the zero-valued coefficients of the highest orders from a polynomial.
*
* At least one coefficient is kept, so a zero polynomial is returned as `[0]`.
*
* @param c
*    The polynomial coefficients in ascending order.
* @returns
*    `c` itself if its highest-order coefficient is not zero (or if `c` is empty).
*    Otherwise a `subarray()` view of `c`, which shares the same buffer.
*/
export function trimPoly(c: Float64Array) : Float64Array {
   let n = c.length;
   while (n > 1 && c[n - 1] == 0) {
      n--;
   }
   return (n == c.length) ? c : c.subarray(0, n);
}

/**
* Checks that all values of a number sequence are finite and that the sequence is monotonically
* increasing (non-decreasing). Adjacent values may be equal.
*
* @param a
*    The number sequence to be checked.
* @throws Error
*    If a value is not finite or if the sequence is not monotonically increasing.
*/
export function checkMonotonicallyIncreasing(a: ArrayLike<number>) : void {
   checkFinite(a);
   for (let i = 1; i < a.length; i++) {
      assert(a[i] >= a[i - 1], "Number sequence is not monotonically increasing.");
   }
}

/**
* Checks that all values of a number sequence are finite and that the sequence is strictly increasing.
* Adjacent values must not be equal.
*
* @param a
*    The number sequence to be checked.
* @throws Error
*    If a value is not finite or if the sequence is not strictly increasing.
*/
export function checkStrictlyIncreasing(a: ArrayLike<number>) : void {
   checkFinite(a);
   for (let i = 1; i < a.length; i++) {
      assert(a[i] > a[i - 1], "Number sequence is not strictly increasing.");
   }
}

/**
* Checks that all values of a number sequence are finite.
*
* @param a
*    The number sequence to be checked.
* @throws Error
*    If a value is not a finite number (e.g. `NaN`, `Infinity`, `-Infinity` or a non-number).
*/
export function checkFinite(a: ArrayLike<number>) : void {
   for (let i = 0; i < a.length; i++) {
      assert(Number.isFinite(a[i]), "Non-finite number detected.");
   }
}

/**
* Searches a sorted array for a value, using the binary search algorithm.
*
* This function corresponds to `java.util.Arrays.binarySearch()`.
* Unlike the Java function, it throws an exception when it encounters a `NaN` value,
* and it does not distinguish between `-0` and `+0`.
*
* @param a
*    The array to be searched. It must be sorted in ascending order, otherwise the result is unspecified.
*    If the array contains multiple elements equal to `key`, it is unspecified which one is found.
* @param key
*    The value to be searched for.
* @returns
*    The index of `key`, if it is contained in the array.
*    Otherwise `-(insertionPoint + 1)`.
*    The insertion point is the index at which `key` would be inserted into the array:
*    the index of the first element greater than `key`, or `a.length` if all elements
*    are less than `key`.
*    The return value is >= 0 if and only if `key` is found.
* @throws Error
*    If `key` or an array element that is compared with it is `NaN`.
*/
export function binarySearch(a: ArrayLike<number>, key: number) : number {
   let low = 0;
   let high = a.length - 1;
   while (low <= high) {
      const mid = (low + high) >>> 1;
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

/**
* Returns the median of an array of numbers.
*
* If the number of values is even, the mean of the two middle values is returned.
* The passed array is not modified.
*
* @param a
*    The values. They should not contain `NaN`, otherwise the result is meaningless.
* @returns
*    The median, or `NaN` if the array is empty.
*/
export function getMedian(a: ArrayLike<number>) : number {
   const n = a.length;
   if (n < 1) {
      return NaN;
   }
   const a2 = new Float64Array(a);
   a2.sort();
   const m = Math.floor(n / 2);
   if (n % 2 == 0) {
      return (a2[m - 1] + a2[m]) / 2;
   } else {
      return a2[m];
   }
}

/**
* Wraps a function in another function that returns `NaN` when the argument is outside
* the domain `xMin ... xMax`.
*
* @param f
*    The function to be wrapped.
* @param xMin
*    The lower bound of the domain (inclusive).
* @param xMax
*    The upper bound of the domain (inclusive).
* @returns
*    A function that returns `f(x)` for `xMin <= x <= xMax` and otherwise `NaN`,
*    including when `x` is `NaN`.
*/
export function createDomainRestrictedUniFunction(f: UniFunction, xMin: number, xMax: number) : UniFunction {
   return (x: number) => (x >= xMin && x <= xMax) ? f(x) : NaN;
}
