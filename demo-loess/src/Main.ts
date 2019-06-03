// Demo program for the LOESS module.

import * as DomUtils from "./DomUtils";
import * as Utils from "./Utils";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as Loess from "commons-math-interpolation/Loess";
import * as Interpolation from "commons-math-interpolation/Index";

var curveViewerWidget:                 FunctionCurveViewer.Widget;
var updateRegressionButtonElement:     HTMLButtonElement;
var pointXVals:                        Float64Array;
var pointYVals:                        Float64Array;
var fitYVals:                          Float64Array;
var robustnessWeights:                 Float64Array | undefined;
var knotFilter:                        boolean[];
var xMin:                              number;
var xMax:                              number;
var xJitter:                           number;
var yJitter:                           number;
var curveFunction:                     (x: number) => number;

// Sorts multiple arrays by the contents of the first array.
function sortMulti(a: Float64Array[]) : Float64Array[] {
   const a0 = a[0];
   const n = a0.length;
   const index = new Int32Array(n);
   for (let i = 0; i < n; i++) {
      index[i] = i;
   }
   index.sort((i1: number, i2: number) => a0[i1] - a0[i2]);
   const r: Float64Array[] = Array(a.length);
   for (let i = 0; i < a.length; i++) {
      const a1 = a[i];
      const a2 = new Float64Array(n);
      for (let j = 0; j < n; j++) {
         a2[j] = a1[index[j]];
      }
      r[i] = a2;
   }
   return r;
}

function getGaussianNoiseExp(exp: number) {
   const v = Utils.getGaussianNoise();
   if (Math.abs(v) <= 1) {
      return v; }
   return Math.sign(v) * Math.pow(Math.abs(v), exp);
}

function createPoints() {
   const n = DomUtils.getValueNum("pointCount");
   xMin    = DomUtils.getValueNum("xMin");
   xMax    = DomUtils.getValueNum("xMax");
   xJitter = DomUtils.getValueNum("xJitter");
   yJitter = DomUtils.getValueNum("yJitter");
   const yJitterExp = DomUtils.getValueNum("yJitterExp");
   const xVals = new Float64Array(n);
   const yVals = new Float64Array(n);
   const incr = (xMax - xMin) / Math.max(n - 1, 1);
   for (let i = 0; i < n; i++) {
      xVals[i] = xMin + i * incr + Utils.getGaussianNoise() * xJitter;
      yVals[i] = Math.sin(xVals[i]) + getGaussianNoiseExp(yJitterExp) * yJitter;
   }
   [pointXVals, pointYVals] = sortMulti([xVals, yVals]);
}

function formatDiagInfo (diagInfo: Loess.LoessInterpolatorDiagInfo) : string {
   return `
      Robustness iterations: ${diagInfo.robustnessIters},
      second last median residual: ${fmt(diagInfo.secondLastMedianResidual)},
      last median residual: ${fmt(diagInfo.lastMedianResidual)}`;
   function fmt(x: number | undefined) {
      return (x == undefined) ? "-" : x.toPrecision(3);
   }
}

function calculateRegression() {
   const diagInfo = <Loess.LoessInterpolatorDiagInfo>{};
   const parms: Loess.LoessInterpolatorParms = {
      xVals:                 pointXVals,
      yVals:                 pointYVals,
      bandwidthFraction:     DomUtils.getValueNum("bandwidthFraction"),
      robustnessIters:       DomUtils.getValueNum("robustnessIters"),
      accuracy:              DomUtils.getValueNum("accuracy"),
      outlierDistanceFactor: DomUtils.getValueNum("outlierDistanceFactor"),
      interpolationMethod:   <Interpolation.InterpolationMethod>DomUtils.getValue("interpolationMethod"),
      minXDistance:          DomUtils.getValueNum("minXDistance"),
      diagInfo
   };
   curveFunction = Loess.createLoessInterpolator(parms);
   document.getElementById("diagInfo")!.textContent = formatDiagInfo(diagInfo);
   robustnessWeights = diagInfo.robustnessWeights;
   fitYVals          = diagInfo.fitYVals;
   knotFilter        = diagInfo.knotFilter;
}

function drawPoint (pctx: FunctionCurveViewer.CustomPaintContext, x: number, y: number, r: number, color: string) {
   const ctx = pctx.ctx;
   const cx = pctx.mapLogicalToCanvasXCoordinate(x);
   const cy = pctx.mapLogicalToCanvasYCoordinate(y);
   ctx.save();
   ctx.beginPath();
   ctx.arc(cx, cy, r, 0, 2 * Math.PI);
   ctx.lineWidth = 1;
   ctx.strokeStyle = color;
   ctx.stroke();
   ctx.restore();
}

function updateCurveViewer() {
   function customPaintFunction (pctx: FunctionCurveViewer.CustomPaintContext) {
      const n = pointXVals.length;
      for (let i = 0; i < n; i++) {
         const robustnessWeight = robustnessWeights ? robustnessWeights[i] : 1;
         drawPoint(pctx, pointXVals[i], pointYVals[i], 4, (robustnessWeight == 0) ? "#9900CC" : "#0066FF");
      }
      for (let i = 0; i < n; i++) {
         if (!isNaN(fitYVals[i])) {
            drawPoint(pctx, pointXVals[i], fitYVals[i], 2.5, knotFilter[i] ? "#00AA00" : "#CC5500");
         }
      }
   }
   const viewerState: FunctionCurveViewer.ViewerState = {
      viewerFunction:        curveFunction,
      xMin:                  xMin - xJitter * 2 - 0.1,
      xMax:                  xMax + xJitter * 2 + 0.1,
      yMin:                  -1 - yJitter * 2.5 - 0.1,
      yMax:                  1 + yJitter * 2.5 + 0.1,
      gridEnabled:           false,
      customPaintFunction
   };
   curveViewerWidget.setViewerState(viewerState);
}

function updateAll() {
   createPoints();
   updateRegression();
   updateRegressionButtonElement.disabled = false;
}

function updateRegression() {
   calculateRegression();
   updateCurveViewer();
}

function init() {
   const curveViewerCanvas = <HTMLCanvasElement>document.getElementById("curveViewer")!;
   curveViewerWidget = new FunctionCurveViewer.Widget(curveViewerCanvas);
   const updateButtonElement = <HTMLButtonElement>document.getElementById("updateButton")!;
   updateButtonElement.addEventListener("click", () => Utils.catchError(updateAll));
   updateRegressionButtonElement = <HTMLButtonElement>document.getElementById("updateRegressionButton")!;
   updateRegressionButtonElement.addEventListener("click", () => Utils.catchError(updateRegression));
   updateAll();
}

function startup() {
   try {
      init();
   } catch (e) {
      console.log(e);
      alert("Error: " + e);
   }
}

document.addEventListener("DOMContentLoaded", startup);
