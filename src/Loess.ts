// Implements the LOESS/LOVESS algorithm for local regression.
// see https://en.wikipedia.org/wiki/Local_regression

import {UniFunction, checkMonotonicallyIncreasing, checkFinite, getMedian} from "./Utils.js";
import {InterpolationMethod, createInterpolatorWithFallback} from "./Index.js";

export interface SmoothDiagInfo {                                    // diagnostics info for smooth()
   robustnessIters:                    number;                       // number of performed additional robustness iterations
   secondLastMedianResidual?:          number;                       // median residual of second last iteration round
   lastMedianResidual?:                number;                       // median residual of last iteration round, which resulted in the stop of the iteration
   robustnessWeights?:                 Float64Array;                 // reobustness weights used in last iteration round
}

export interface LoessInterpolatorDiagInfo extends SmoothDiagInfo {  // diagnostics info for createLoessInterpolator()
   fitYVals:                           Float64Array;                 // smoothed y values of the points
   knotFilter:                         boolean[];                    // true=point is used as a knot, false=point is ignored for interpolation
   knotXVals:                          Float64Array;                 // x values of the knots
   knotYVals:                          Float64Array;                 // y values of the knots
}

export interface SmoothParms {                                       // parameters for smooth()
   xVals:                              ArrayLike<number>;            // x values of the points, sorted in ascending order
   yVals:                              ArrayLike<number>;            // y values of the points
   weights?:                           ArrayLike<number>;            // point weights. If undefined, 1 is assumed for all points.
   bandwidthFraction?:                 number;                       // fraction of points to be used for computing the local regression
   robustnessIters?:                   number;                       // maximum number of (additional) robustness iterations. 0 for only a single iteration.
   accuracy?:                          number;                       // acceptable accuracy. If the median residual at a certain robustness iteration is less than this amount, no more iterations are done.
   outlierDistanceFactor?:             number;                       // outlier distance relative to the median residual
   diagInfo?:                          SmoothDiagInfo;               // optional object to return diagnostics info
}

export interface LoessInterpolatorParms extends SmoothParms {        // parameters for createLoessInterpolator()
   interpolationMethod?:               InterpolationMethod;          // interpolation method for connecting the smoothed points
   minXDistance?:                      number;                       // minimum point distance in x-direction
   diagInfo?:                          LoessInterpolatorDiagInfo;    // optional object to return diagnostics info
}

export function createLoessInterpolator(parms: LoessInterpolatorParms) : UniFunction {
   const {interpolationMethod = "akima", minXDistance = getDefaultMinXDistance(parms.xVals), diagInfo} = parms;
   const fitYVals = smooth(parms);
   const knotFilter = createKnotFilter(parms.xVals, fitYVals, minXDistance);
   const knotXVals = filterNumberArray(parms.xVals, knotFilter);
   const knotYVals = filterNumberArray(fitYVals, knotFilter);
   if (diagInfo) {
      diagInfo.fitYVals   = fitYVals;
      diagInfo.knotFilter = knotFilter;
      diagInfo.knotXVals  = knotXVals;
      diagInfo.knotYVals  = knotYVals;
   }
   return createInterpolatorWithFallback(interpolationMethod, knotXVals, knotYVals);
}

function createKnotFilter(xVals: ArrayLike<number>, fitYVals: ArrayLike<number>, minXDistance: number) : boolean[] {
   const n = xVals.length;
   const filter: boolean[] = Array(n);
   let prevX = -Infinity;
   for (let i = 0; i < n; i++) {
      const x = xVals[i];
      const y = fitYVals[i];
      if (x - prevX >= minXDistance && !isNaN(y)) {
         filter[i] = true;
         prevX = x;
      } else {
         filter[i] = false;
      }
   }
   return filter;
}

function filterNumberArray(a: ArrayLike<number>, filter: boolean[]) : Float64Array {
   const n = a.length;
   const a2 = new Float64Array(n);
   let n2 = 0;
   for (let i = 0; i < n; i++) {
      if (filter[i]) {
         a2[n2++] = a[i];
      }
   }
   return a2.subarray(0, n2);
}

function getDefaultMinXDistance(xVals: ArrayLike<number>) : number {
   const n = xVals.length;
   if (n == 0) {
      return NaN;
   }
   const xRange = xVals[n - 1] - xVals[0];
   if (xRange == 0) {
      return 1;
   }
   return xRange / 100;
}

/**
* Computes the weighted LOESS linear fit on a sequence of points.
* Returns the regression function values (smoothed y values) for each of the x values.
*/
export function smooth(parms: SmoothParms) : Float64Array {

   const {xVals, yVals, weights, bandwidthFraction = 0.3, robustnessIters = 2, accuracy = 1E-12, outlierDistanceFactor = 6, diagInfo} = parms;

   checkMonotonicallyIncreasing(xVals);
   checkFinite(yVals);
   if (weights) {
      checkFinite(weights);
   }
   const n = xVals.length;
   if (yVals.length != n || weights && weights.length != n) {
      throw new Error("Dimension mismatch.");
   }
   if (diagInfo) {
      diagInfo.robustnessIters          = 0;
      diagInfo.secondLastMedianResidual = undefined;
      diagInfo.lastMedianResidual       = undefined;
      diagInfo.robustnessWeights        = undefined;
   }
   if (n <= 2) {
      return Float64Array.from(yVals);
   }

   let fitYVals: Float64Array | undefined = undefined;
   for (let iter = 0; iter <= robustnessIters; iter++) {
      let robustnessWeights: Float64Array | undefined = undefined;
      if (iter > 0) {
         const residuals = absDiff(fitYVals!, yVals);
         const medianResidual = getMedian(residuals);
         if (medianResidual < accuracy) {
            if (diagInfo) {
               diagInfo.lastMedianResidual = medianResidual;
            }
            break;
         }
         const outlierDistance = medianResidual * outlierDistanceFactor;
         robustnessWeights = calculateRobustnessWeights(residuals, outlierDistance);
         if (diagInfo) {
            diagInfo.robustnessIters          = iter;
            diagInfo.secondLastMedianResidual = medianResidual;
            diagInfo.robustnessWeights        = robustnessWeights;
         }
      }
      const combinedWeights = combineWeights(weights, robustnessWeights);
      fitYVals = calculateSequenceRegression(xVals, yVals, combinedWeights, bandwidthFraction, accuracy, iter);
   }
   return fitYVals!;
}

function calculateSequenceRegression(xVals: ArrayLike<number>, yVals: ArrayLike<number>, weights: ArrayLike<number> | undefined, bandwidthFraction: number, accuracy: number, iter: number) : Float64Array {
   const n = xVals.length;
   const n2 = weights ? countNonZeros(weights) : n;
   if (n2 < 2) {
      throw new Error(`Not enough relevant points in iteration ${iter}.`);
   }
   const bandwidthInPoints = Math.max(2, Math.min(n2, Math.round(n2 * bandwidthFraction)));
   const bw = findInitialBandwidthInterval(weights, bandwidthInPoints, n);
   const fitYVals = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      const x = xVals[i];
      moveBandwidthInterval(bw, x, xVals, weights);
      fitYVals[i] = calculateLocalLinearRegression(xVals, yVals, weights, x, bw.iLeft, bw.iRight, accuracy);
   }
   return fitYVals;
}

// Calculates the least-squares linear fit at position x with the bandwidth iLeft .. iRight
// weighted by the product of the passed weights and the tri-cube weight function.
export function calculateLocalLinearRegression(xVals: ArrayLike<number>, yVals: ArrayLike<number>, weights: ArrayLike<number> | undefined, x: number, iLeft: number, iRight: number, accuracy: number) : number {
   let maxDist = Math.max(x - xVals[iLeft], xVals[iRight] - x) * 1.001;
      // Multiplication with 1.001 is done to include the outermost point(s).
   if (maxDist < 0) {
      throw new Error("Inconsistent bandwidth parameters.");
   }
   if (maxDist == 0) {                                               // all points have the same x value
      maxDist = 1;
   }

   let sumWeights  = 0;
   let sumX        = 0;
   let sumXSquared = 0;
   let sumY        = 0;
   let sumXY       = 0;

   for (let k = iLeft; k <= iRight; ++k) {
      const xk   = xVals[k];
      const yk   = yVals[k];
      const dist = Math.abs(xk - x);
      const w1   = weights ? weights[k] : 1;
      const w2   = triCube(dist / maxDist);
      const w    = w1 * w2;
      const xkw  = xk * w;
      sumWeights  += w;
      sumX        += xkw;
      sumXSquared += xk * xkw;
      sumY        += yk * w;
      sumXY       += yk * xkw;
   }

   if (sumWeights < 1E-12) {
      return NaN;
   }

   const meanX = sumX / sumWeights;
   const meanY = sumY / sumWeights;
   const meanXY = sumXY / sumWeights;
   const meanXSquared = sumXSquared / sumWeights;

   const meanXSqrDiff = meanXSquared - meanX * meanX;
   let beta: number;
   if (Math.abs(meanXSqrDiff) < accuracy ** 2) {
      beta = 0;
   } else {
      beta = (meanXY - meanX * meanY) / meanXSqrDiff;
   }
   return meanY + beta * x - beta * meanX;
}

function findInitialBandwidthInterval(weights: ArrayLike<number> | undefined, bandwidthInPoints: number, n: number) {
   const iLeft = findNonZero(weights, 0);
   if (iLeft >= n) {
      throw new Error("Initial bandwidth start point not found.");
   }
   let iRight = iLeft;
   for (let i = 0; i < bandwidthInPoints - 1; i++) {
      iRight = findNonZero(weights, iRight + 1);
      if (iRight >= n) {
         throw new Error("Initial bandwidth end point not found.");
      }
   }
   return {iLeft, iRight};
}

function moveBandwidthInterval(bw: {iLeft: number; iRight: number}, x: number, xVals: ArrayLike<number>, weights: ArrayLike<number> | undefined) {
   const n = xVals.length;
   while (true) {
      const nextRight = findNonZero(weights, bw.iRight + 1);
      if (nextRight >= n || xVals[nextRight] - x >= x - xVals[bw.iLeft]) {
         return;
      }
      bw.iLeft = findNonZero(weights, bw.iLeft + 1);
      bw.iRight = nextRight;
   }
}

function calculateRobustnessWeights(residuals: Float64Array, outlierDistance: number) : Float64Array {
   const n = residuals.length;
   const robustnessWeights = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      robustnessWeights[i] = biWeight(residuals[i] / outlierDistance);
   }
   return robustnessWeights;
}

function combineWeights(w1: ArrayLike<number> | undefined, w2: ArrayLike<number> | undefined) : ArrayLike<number> | undefined {
   if (!w1 || !w2) {
      return w1 ?? w2; }
   const n = w1.length;
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = w1[i] * w2[i];
   }
   return a;
}

function findNonZero(a: ArrayLike<number> | undefined, startPos: number) : number {
   if (!a) {
      return startPos;
   }
   const n = a.length;
   let i = startPos;
   while (i < n && a[i] == 0) {
      i++;
   }
   return i;
}

function countNonZeros(a: ArrayLike<number>) : number {
   let cnt = 0;
   for (let i = 0; i < a.length; i++) {
      if (a[i] != 0) {
         cnt++;
      }
   }
   return cnt;
}

function absDiff(a1: ArrayLike<number>, a2: ArrayLike<number>) : Float64Array {
   const n = a1.length;
   const a3 = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a3[i] = Math.abs(a1[i] - a2[i]);
   }
   return a3;
}

// Calculates the tri-cube weight function.
// see http://en.wikipedia.org/wiki/Local_regression#Weight_function
function triCube(x: number) : number {
   const absX = Math.abs(x);
   if (absX >= 1) {
      return 0;
   }
   const tmp = 1 - absX * absX * absX;                     // (three multiplications are much faster in V8 than **3)
   return tmp * tmp * tmp;
}

function biWeight(x: number) : number {
   const absX = Math.abs(x);
   if (absX >= 1) {
      return 0;
   }
   const tmp = 1 - absX * absX;
   return tmp * tmp;
}
