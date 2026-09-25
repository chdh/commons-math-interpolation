"use strict";

import * as ChildProcess from "node:child_process";
import * as Fs from "node:fs";

//--- Update module table in README.md -----------------------------------------

function readModuleTable (fileName) {
   const lines1 = Fs.readFileSync(fileName, "utf8").split("\n");
   const lines2 = lines1.filter((s) => s.length > 0 && s[0] != "#");
   return lines2;
}

function replaceFileContent (fileName, startMarker, endMarker, newContent) {
   const text1 = Fs.readFileSync(fileName, "utf8");
   const regionRegEx = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
   if (!regionRegEx.test(text1)) {
      throw new Error(`Markers not found in ${fileName}.`);
   }
   const text2 = text1.replace(regionRegEx, `${startMarker}\n\n${newContent}\n\n${endMarker}`);
   Fs.writeFileSync(fileName, text2);
}

function updateModuleTableInReadme() {
   const wikiUrl = "https://github.com/chdh/commons-math-interpolation/wiki";
   const lines1 = readModuleTable("wiki/Home.md");
   const lines2 = lines1.map((s) => s.replace("../wiki", wikiUrl));
   const tableText = lines2.join("\n");
   replaceFileContent("README.md", "<!-- API-MODULES:START -->", "<!-- API-MODULES:END -->", tableText);
}

//------------------------------------------------------------------------------

class BuildError extends Error {};

// Executes a shell command line.
// An error is thrown when the exit code of the command is not 0.
function shell (cmdLine) {
   ChildProcess.execSync(cmdLine, {stdio: "inherit"});
}

function delDir (dirName) {
   Fs.rmSync(dirName, {recursive: true, force: true});
}

function delFiles (globPattern) {
   for (const fileName of Fs.globSync(globPattern)) {
      Fs.unlinkSync(fileName);
   }
}

function main2() {
   const argv = process.argv;
   if (argv.length > 3) {
      throw new BuildError("Extra command line parameters.");
   }
   let cmd = (argv.length > 2) ? argv[2] : "build";
   switch (cmd) {
      case "clean": {
         delDir("dist");
         break;
      }
      case "build": {
         delDir("dist");
         shell("tsc");
         shell("eslint \"src/**/*.ts\"");
         console.log("Build completed.");
         break;
      }
     case "doc": {
         process.env["typeDoc_outputFormat"] = "md";
         shell("typedoc");
         break;
      }
      case "updateWiki": {
         delFiles("wiki/*.md");
         process.env["typeDoc_outputFormat"] = "wiki";
         shell("typedoc");
         updateModuleTableInReadme();
         break;
      }
      default: {
         throw new BuildError(`Invalid command parameter "${cmd}".`);
      }
   }
}

function main() {
   try {
      main2();
   } catch (e) {
      if (e instanceof BuildError) {
         console.log(e.message);
      } else {
         console.log(e.toString());
      }
      process.exitCode = 99;
      return;
   }
}

main();
