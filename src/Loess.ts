/**
* LOESS/LOWESS local regression.
*
* This module implements the LOESS/LOWESS algorithm for local regression
* (see [Local regression](https://en.wikipedia.org/wiki/Local_regression)).
* For each point, a weighted linear least-squares fit is computed over the neighboring points.
* Optional robustness iterations reduce the influence of outliers.
*
* {@link smooth} computes the smoothed y values of the points.
* {@link createLoessInterpolator} additionally connects the smoothed points with an interpolation method
* and returns a function.
*
* @module
*/

import {UniFunction, assert, checkMonotonicallyIncreasing, checkFinite, getMedian} from "./Utils.ts";
import {BasicInterpolationMethod, createBasicInterpolatorWithFallback} from "./BasicInterpolators.ts";

/**
* Diagnostics info returned by {@link smooth}.
*
* To receive it, pass an object (e.g. `{}`) in {@link SmoothParms.diagInfo}. The fields are set by `smooth()`.
*/
export interface SmoothDiagInfo {

   /**
   * The number of robustness iterations actually performed.
   */
   robustnessIters: number;

   /**
   * The median residual from which the robustness weights of the last performed robustness iteration
   * were computed. `undefined` if no robustness iteration was performed.
   */
   secondLastMedianResidual?: number;

   /**
   * The median residual that stopped the iteration early because it was less than
   * or equal to {@link SmoothParms.accuracy}. `undefined` if the iteration was not stopped early.
   */
   lastMedianResidual?: number;

   /**
   * The robustness weights of the points that were used in the last iteration.
   * `undefined` if no robustness iteration was performed.
   */
   robustnessWeights?: Float64Array;
}

/**
* Diagnostics info returned by {@link createLoessInterpolator}.
*
* To receive it, pass an object (e.g. `{}`) in {@link LoessInterpolatorParms.diagInfo}.
* The fields are set by `createLoessInterpolator()`.
*/
export interface LoessInterpolatorDiagInfo extends SmoothDiagInfo {

   /**
   * The smoothed y values of all points, as returned by {@link smooth}.
   */
   fitYVals: Float64Array;

   /**
   * For each point, `true` if the point is used as a knot for the interpolation, `false` if it is skipped.
   */
   knotFilter: boolean[];

   /**
   * The x values of the knots.
   */
   knotXVals: Float64Array;

   /**
   * The y values (smoothed) of the knots.
   */
   knotYVals: Float64Array;
}

/**
* Parameters for {@link smooth}.
*/
export interface SmoothParms {

   /**
   * The x values of the points, in monotonically increasing order. Equal values are allowed.
   * The values must be finite.
   */
   xVals: ArrayLike<number>;

   /**
   * The y values of the points. The values must be finite.
   */
   yVals: ArrayLike<number>;

   /**
   * Optional weights of the points. The values must be finite and should not be negative.
   * Points with weight 0 are ignored for the local regressions, but a smoothed y value is computed for them.
   * If `undefined`, all points have the weight 1.
   */
   weights?: ArrayLike<number>;

   /**
   * The fraction of the points (with a non-zero weight) that is used for each local regression.
   * Must be greater than 0 and not greater than 1.
   * The resulting number of points is limited to at least 2 and at most all points.
   * @defaultValue 0.3
   */
   bandwidthFraction?: number;

   /**
   * The maximum number of additional robustness iterations. 0 for a single regression pass without robustness
   * weighting. Must be an integer >= 0.
   * @defaultValue 2
   */
   robustnessIters?: number;

   /**
   * The accuracy threshold. Must be finite and >= 0.
   * If the median residual is less than or equal to this value, no more robustness iterations are performed.
   * Additionally, if the weighted standard deviation of the x values within a local regression is less than
   * this value, the slope of the local regression line is assumed to be 0.
   * @defaultValue 1E-12
   */
   accuracy?: number;

   /**
   * The outlier distance, relative to the median residual. Must be finite and > 0.
   * In robustness iterations, points with a residual of at least `outlierDistanceFactor * medianResidual`
   * get the robustness weight 0. The other points are weighted with the bisquare function
   * `(1 - (residual / (outlierDistanceFactor * medianResidual))^2)^2`.
   * The median residual is computed over the points with a non-zero weight and a non-`NaN` smoothed value.
   * Points with a `NaN` smoothed value get the robustness weight 0.
   * @defaultValue 6
   */
   outlierDistanceFactor?: number;

   /**
   * An optional object to receive diagnostics info.
   */
   diagInfo?: SmoothDiagInfo;
}

/**
* Parameters for {@link createLoessInterpolator}.
*/
export interface LoessInterpolatorParms extends SmoothParms {

   /**
   * The interpolation method used to connect the smoothed points (knots).
   * If there are too few knots for the method, a simpler method is used
   * (akima → cubic → linear → nearestNeighbor).
   * If no knots remain, the returned function always returns `NaN`.
   * @defaultValue "akima"
   */
   interpolationMethod?: BasicInterpolationMethod;

   /**
   * The minimum distance in x direction between the knots.
   * Points with an x value that is closer than this to the previous knot are skipped.
   * Points with the same x value as the previous knot are always skipped.
   * The default is 1/100 of the x range of the points.
   */
   minXDistance?: number;

   /**
   * An optional object to receive diagnostics info.
   */
   diagInfo?: LoessInterpolatorDiagInfo;
}

/**
* Returns a function that interpolates the LOESS-smoothed values of a dataset.
*
* First, the smoothed y values of the points are computed with {@link smooth}.
* Then the knots for the interpolation are selected from the points:
* points that are closer than `minXDistance` to the previous knot and points with a `NaN` smoothed value are skipped.
* Finally, the knots are connected with the specified interpolation method.
*
* @param parms
*    The parameters.
* @returns
*    A function which interpolates the smoothed dataset.
* @throws Error
*    For the invalid input conditions described for {@link smooth}.
*/
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
   return createBasicInterpolatorWithFallback(interpolationMethod, knotXVals, knotYVals);
}

function createKnotFilter(xVals: ArrayLike<number>, fitYVals: ArrayLike<number>, minXDistance: number) : boolean[] {
   const n = xVals.length;
   const filter: boolean[] = Array(n);
   let prevX = -Infinity;
   for (let i = 0; i < n; i++) {
      const x = xVals[i];
      const y = fitYVals[i];
      if (x > prevX && x - prevX >= minXDistance && !isNaN(y)) {
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
*
* For each point, a local linear regression is computed over the `bandwidthFraction` part of the points
* (with a non-zero weight) that are nearest to it. The points are weighted by the product of their weights
* and the tri-cube function of their x distance.
* In each robustness iteration, the robustness weights of the points are computed from the residuals
* of the previous pass (see {@link SmoothParms.outlierDistanceFactor}) and the regression is repeated.
*
* If there are no more than 2 points, a copy of `yVals` is returned.
*
* @param parms
*    The parameters.
* @returns
*    The smoothed y values of the points. An element is `NaN` if the sum of the weights
*    within its local regression is 0.
* @throws Error
*    If the array lengths do not match, if `xVals` contains non-finite values or is not monotonically
*    increasing, if `yVals` or `weights` contain non-finite values, if a numeric parameter is invalid,
*    or if fewer than 2 points have a non-zero weight.
*/
export function smooth(parms: SmoothParms) : Float64Array {

   const {xVals, yVals, weights, bandwidthFraction = 0.3, robustnessIters = 2, accuracy = 1E-12, outlierDistanceFactor = 6, diagInfo} = parms;

   const n = xVals.length;
   assert(yVals.length == n, "Dimension mismatch for xVals and yVals.");
   assert(!weights || weights.length == n, "Dimension mismatch for xVals and weights.");
   assert(bandwidthFraction > 0 && bandwidthFraction <= 1, "Invalid bandwidthFraction.");
   assert(Number.isInteger(robustnessIters) && robustnessIters >= 0, "Invalid robustnessIters.");
   assert(Number.isFinite(accuracy) && accuracy >= 0, "Invalid accuracy.");
   assert(Number.isFinite(outlierDistanceFactor) && outlierDistanceFactor > 0, "Invalid outlierDistanceFactor.");
   checkMonotonicallyIncreasing(xVals);
   checkFinite(yVals);
   if (weights) {
      checkFinite(weights);
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
         const medianResidual = getMedianResidual(residuals, weights);
         if (medianResidual <= accuracy) {
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

// Returns the median of the residuals, ignoring NaN residuals and points with a zero weight.
function getMedianResidual(residuals: Float64Array, weights: ArrayLike<number> | undefined) : number {
   const a: number[] = [];
   for (let i = 0; i < residuals.length; i++) {
      if (!isNaN(residuals[i]) && weights?.[i] != 0) {
         a.push(residuals[i]);
      }
   }
   return getMedian(a);
}

function calculateSequenceRegression(xVals: ArrayLike<number>, yVals: ArrayLike<number>, weights: ArrayLike<number> | undefined, bandwidthFraction: number, accuracy: number, iter: number) : Float64Array {
   const n = xVals.length;
   const n2 = weights ? countNonZeros(weights) : n;
   assert(n2 >= 2, `Not enough relevant points in iteration ${iter}.`);
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

/**
* Calculates the weighted least-squares linear fit at position `x` over the points `iLeft ... iRight`.
*
* The points are weighted by the product of the passed weights and the tri-cube function
* of their x distance from `x`, relative to the largest x distance within the interval.
*
* @param xVals
*    The x values of the points, in monotonically increasing order.
* @param yVals
*    The y values of the points.
* @param weights
*    The weights of the points, or `undefined` for the weight 1 for all points.
* @param x
*    The x position at which the regression line is evaluated.
* @param iLeft
*    The index of the first point of the bandwidth interval.
* @param iRight
*    The index of the last point of the bandwidth interval (inclusive).
* @param accuracy
*    If the weighted standard deviation of the x values is less than this value,
*    the slope of the regression line is assumed to be 0.
* @returns
*    The value of the regression line at `x`, or `NaN` if the sum of the weights is 0.
* @throws Error
*    If the interval `iLeft ... iRight` is inconsistent.
*/
export function calculateLocalLinearRegression(xVals: ArrayLike<number>, yVals: ArrayLike<number>, weights: ArrayLike<number> | undefined, x: number, iLeft: number, iRight: number, accuracy: number) : number {
   let maxDist = Math.max(x - xVals[iLeft], xVals[iRight] - x) * 1.001;
      // Multiplication with 1.001 is done to include the outermost point(s).
   assert(maxDist >= 0, "Inconsistent bandwidth parameters.");
   if (maxDist == 0) {                                               // all points have the same x value
      maxDist = 1;
   }

   // The x values are used relative to x (dx = xk - x), to avoid a loss of precision with large x values.
   let sumWeights   = 0;
   let sumDx        = 0;
   let sumDxSquared = 0;
   let sumY         = 0;
   let sumDxY       = 0;

   for (let k = iLeft; k <= iRight; ++k) {
      const dx   = xVals[k] - x;
      const yk   = yVals[k];
      const w1   = weights ? weights[k] : 1;
      const w2   = triCube(Math.abs(dx) / maxDist);
      const w    = w1 * w2;
      const dxw  = dx * w;
      sumWeights   += w;
      sumDx        += dxw;
      sumDxSquared += dx * dxw;
      sumY         += yk * w;
      sumDxY       += yk * dxw;
   }

   if (!(sumWeights > 0)) {
      return NaN;
   }

   const meanDx = sumDx / sumWeights;
   const meanY = sumY / sumWeights;
   const meanDxY = sumDxY / sumWeights;
   const meanDxSquared = sumDxSquared / sumWeights;

   const meanDxSqrDiff = meanDxSquared - meanDx * meanDx;            // weighted variance of the x values
   let beta: number;
   if (Math.abs(meanDxSqrDiff) < accuracy ** 2) {
      beta = 0;
   } else {
      beta = (meanDxY - meanDx * meanY) / meanDxSqrDiff;
   }
   return meanY - beta * meanDx;                                     // value of the regression line at dx = 0
}

function findInitialBandwidthInterval(weights: ArrayLike<number> | undefined, bandwidthInPoints: number, n: number) {
   const iLeft = findNonZero(weights, 0);
   assert(iLeft < n, "Initial bandwidth start point not found.");
   let iRight = iLeft;
   for (let i = 0; i < bandwidthInPoints - 1; i++) {
      iRight = findNonZero(weights, iRight + 1);
      assert(iRight < n, "Initial bandwidth end point not found.");
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
      const r = residuals[i];
      robustnessWeights[i] = isNaN(r) ? 0 : biWeight(r / outlierDistance);
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
