// Implements the LOESS/LOVESS algorithm for local regression.
// see https://en.wikipedia.org/wiki/Local_regression

import {checkMonotonicallyIncreasing, checkFinite, getMedian} from "./Utils";

export interface DiagInfo {                                // diagnostics info
   robustnessIters:                    number;             // number of performed additional robustness iterations
   secondLastMedianResidual?:          number;             // median residual of second last iteration round
   lastMedianResidual?:                number;             // median residual of last iteration round, which resulted in the stop of the iteration
   robustnessWeights?:                 Float64Array;       // reobustness weights used in last iteration round
}

export interface SmoothParms {
   xVals:                              ArrayLike<number>;  // x values of the points, sorted in ascending order
   yVals:                              ArrayLike<number>;  // y values of the points
   weights?:                           ArrayLike<number>;  // point weights. If undefined, 1 is assumed for all points.
   bandwidthFraction?:                 number;             // fraction of points to be used for computing the local regression
   robustnessIters?:                   number;             // maximum number of (additional) robustness iterations. 0 for only a single iteration.
   accuracy?:                          number;             // acceptable accuracy. If the median residual at a certain robustness iteration is less than this amount, no more iterations are done.
   outlierDistanceFactor?:             number;             // outlier distance relative to the median residual
   diagInfo?:                          DiagInfo;           // optional object to return diagnostics info
}

/**
* Computes the weighted LOESS linear fit on a sequence of points.
* Returns the regression function values (smoothed y values) for each of the x values.
*
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

   let fitVals: Float64Array | undefined = undefined;
   for (let iter = 0; iter <= robustnessIters; iter++) {
      let robustnessWeights: Float64Array | undefined = undefined;
      if (iter > 0) {
         const residuals = absDiff(fitVals!, yVals);
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
      fitVals = calculateSequenceRegression(xVals, yVals, combinedWeights, bandwidthFraction, accuracy, iter);
   }
   return fitVals!;
}

function calculateSequenceRegression(xVals: ArrayLike<number>, yVals: ArrayLike<number>, weights: ArrayLike<number> | undefined, bandwidthFraction: number, accuracy: number, iter: number) : Float64Array {
   const n = xVals.length;
   const n2 = weights ? countNonZeros(weights) : n;
   if (n2 < 2) {
      throw new Error(`Not enough relevant points in iteration ${iter}.`);
   }
   const bandwidthInPoints = Math.max(2, Math.min(n2, Math.round(n2 * bandwidthFraction)));
   const bw = findInitialBandwidthInterval(weights, bandwidthInPoints, n);
   const fitVals = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      const x = xVals[i];
      moveBandwidthInterval(bw, x, xVals, weights);
      fitVals[i] = calculateLocalLinearRegression(xVals, yVals, weights, x, bw.iLeft, bw.iRight, accuracy);
   }
   return fitVals;
}

// Calculates the least-squares linear fit at position x with the bandwidth iLeft .. iRight
// weighted by the product of the passed weights and the tri-cube weight function.
export function calculateLocalLinearRegression(xVals: ArrayLike<number>, yVals: ArrayLike<number>, weights: ArrayLike<number> | undefined, x: number, iLeft: number, iRight: number, accuracy: number) : number {
   let maxDist = Math.max(x - xVals[iLeft], xVals[iRight] - x);
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

   const meanX = sumX / sumWeights;
   const meanY = sumY / sumWeights;
   const meanXY = sumXY / sumWeights;
   const meanXSquared = sumXSquared / sumWeights;

   let beta: number;
   if (Math.sqrt(Math.abs(meanXSquared - meanX * meanX)) < accuracy) {
      beta = 0;
   } else {
      beta = (meanXY - meanX * meanY) / (meanXSquared - meanX * meanX);
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
      return w1 || w2; }
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
