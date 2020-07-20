# Example

How to run the example program with Node:

1. Install [Node](https://nodejs.org) (latest version).
2. Download the files `example1.js` and `package.json` from here.
3. Run `npm install` at the command line to download the `commons-math-interpolation` package.
4. Run `node --experimental-specifier-resolution=node example1.js` at the command line to execute the example.

The flag [`--experimental-specifier-resolution=node`](https://nodejs.org/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm)
is necessary as long as there is no better solution for the
[problem](https://github.com/microsoft/TypeScript/issues/16577) that TypeScript does not generate file extensions
in the import statements.
Another solution would be to use [Rollup](https://rollupjs.org) or a similar tool.
Using Rollup is recommended for using the `commons-math-interpolation` package in a client-side web application.
