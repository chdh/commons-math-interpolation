"use strict";

const ChildProcess = require("child_process");
const Fs           = require("fs");
const rimrafSync   = require("rimraf").sync;

class BuildError extends Error {};

// Executes a shell command line.
// An error is thrown when the exit code is not 0.
function shell (cmdLine) {
   ChildProcess.execSync(cmdLine, {stdio: "inherit"}); }

function copyToDist (fileNames) {
   for (const fileName of fileNames) {
      Fs.copyFileSync(fileName, "dist/" + fileName); }}

function main2() {
   const argv = process.argv;
   if (argv.length > 3) {
      throw new BuildError("Extra command line parameters."); }
   let cmd = (argv.length > 2) ? argv[2] : "build";
   switch (cmd) {
      case "clean": {
         rimrafSync("dist");
         break; }
      case "build": {
         rimrafSync("dist");
         shell("tsc");
         shell("tslint");
         copyToDist([".npmignore", "LICENSE.md", "README.md", "package.json", "build.js"]);
         console.log("Build completed.");
         break; }
      case "verifyCurrentDirIsDist": {
         if (!process.cwd().endsWith("dist")) {
            console.log("Current directory is: " + process.cwd());
            throw new BuildError("*** NPM pack/publish must be run in the dist directory! ***"); }
         break; }
      default: {
         throw new BuildError(`Invalid command parameter "${cmd}".`); }}}

function main() {
   try {
      main2(); }
    catch (e) {
      if (e instanceof BuildError) {
         console.log(e.message); }
       else {
         console.log(e.toString()); }
      process.exitCode = 99;
      return; }}

main();
