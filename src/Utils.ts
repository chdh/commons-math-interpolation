/**
* An univariate numeric function.
*/
export type UniFunction = (x: number) => number;

// Evaluates the polynomial of the segment corresponding to the specified x value.
export function evaluatePolySegment(xVals: ArrayLike<number>, segmentCoeffs: ArrayLike<number>[], x: number) : number {
   let i = binarySearch(xVals, x);
   if (i < 0) {
      i = -i - 2;
   }
   i = Math.max(0, Math.min(i, segmentCoeffs.length - 1));
   return evaluatePoly(segmentCoeffs[i], x - xVals[i]);
}

// Evaluates the value of a polynomial.
// c contains the polynomial coefficients in ascending order.
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

// Trims top order polynomial coefficients which are zero.
export function trimPoly(c: Float64Array) : Float64Array {
   let n = c.length;
   while (n > 1 && c[n - 1] == 0) {
      n--;
   }
   return (n == c.length) ? c : c.subarray(0, n);
}

// Checks that a number sequence is monotonically increasing and all values are finite.
export function checkMonotonicallyIncreasing(a: ArrayLike<number>) {
   for (let i = 0; i < a.length; i++) {
      if (!isFinite(a[i])) {
         throw new Error("Non-finite number detected.");
      }
      if (i > 0 && a[i] < a[i - 1]) {
         throw new Error("Number sequence is not monotonically increasing.");
      }
   }
}

// Checks that a number sequence is strictly increasing and all values are finite.
export function checkStrictlyIncreasing(a: ArrayLike<number>) {
   for (let i = 0; i < a.length; i++) {
      if (!isFinite(a[i])) {
         throw new Error("Non-finite number detected.");
      }
      if (i > 0 && a[i] <= a[i - 1]) {
         throw new Error("Number sequence is not strictly increasing.");
      }
   }
}

// Checks that all values in the passed array are finite.
export function checkFinite(a: ArrayLike<number>) {
   for (let i = 0; i < a.length; i++) {
      if (!isFinite(a[i])) {
         throw new Error("Non-finite number detected.");
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
export function binarySearch(a: ArrayLike<number>, key: number) : number {
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

// Returns the median value of an array of numbers.
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
