// Demo program for the AkimaSplineInterpolator class.

import * as FunctionCurveEditor from "function-curve-editor";

var widget: FunctionCurveEditor.Widget;

const initialKnots: FunctionCurveEditor.Point[] = [
   {x:  50, y: 150},
   {x: 100, y: 170},
   {x: 150, y: 250},
   {x: 200, y: 400},
   {x: 300, y: 350},
   {x: 400, y: 250},
   {x: 500, y:  50},
   {x: 600, y: 250},
   {x: 650, y: 200},
   {x: 700, y: 180},
   {x: 750, y:  90} ];

const initialEditorState = <FunctionCurveEditor.EditorState>{
   knots:          initialKnots,
   xMin:           0,
   xMax:           800,
   yMin:           0,
   yMax:           500,
   extendedDomain: false,
   gridEnabled:    false };

function toggleHelp() {
   const t = document.getElementById("helpText")!;
   if (t.classList.contains("hidden")) {
      t.classList.remove("hidden");
      t.innerHTML = widget.getFormattedHelpText(); }
    else {
      t.classList.add("hidden"); }}

function startup() {
   const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("functionCurveEditor");
   widget = new FunctionCurveEditor.Widget(canvas);
   widget.setEditorState(initialEditorState);
   document.getElementById("helpButton")!.addEventListener("click", toggleHelp); }

document.addEventListener("DOMContentLoaded", startup);
