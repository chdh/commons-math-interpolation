# Commons Math Interpolation – Akima, Cubic Spline and LOESS for TypeScript

This package is a partial TypeScript port of the interpolation classes of the
[Apache Commons Math library](https://commons.apache.org/proper/commons-math/), with some extensions.

The following forms of interpolation are implemented:

- [Akima cubic spline interpolation](https://en.wikipedia.org/wiki/Akima_spline)
- [Natural cubic spline interpolation](https://en.wikipedia.org/wiki/Spline_interpolation)
- [Linear interpolation](https://en.wikipedia.org/wiki/Linear_interpolation)
- [Nearest neighbor interpolation](https://en.wikipedia.org/wiki/Nearest-neighbor_interpolation)

The interpolators work on a dataset of x/y points (knots) and return a function `f(x)`.

Additionally, a local regression algorithm is implemented that can be used in conjunction with the above interpolators.

- [LOESS/LOWESS local regression](https://en.wikipedia.org/wiki/Local_regression)

Interpolation demo: [www.source-code.biz/snippets/typescript/akima](https://www.source-code.biz/snippets/typescript/akima)<br>
LOESS demo: [www.source-code.biz/snippets/typescript/loess](https://www.source-code.biz/snippets/typescript/loess)<br>
NPM package: [commons-math-interpolation](https://www.npmjs.com/package/commons-math-interpolation)

## Usage

An example program is in the [examples](examples) directory.

Example for Akima interpolation:

```js
import {createAkimaSplineInterpolator} from "commons-math-interpolation";

const f = createAkimaSplineInterpolator([0, 1, 3, 4], [2, 5, 4, 1]);
console.log(f(2.5));
```

The LOESS functions and types are imported from the `Loess` module:

```js
import {createLoessInterpolator} from "commons-math-interpolation/Loess";

const f = createLoessInterpolator({xVals, yVals, bandwidthFraction: 0.3});
```

## Modules

<!-- API-MODULES:START -->

| Module | Description |
| ------ | ------ |
| [Akima](https://github.com/chdh/commons-math-interpolation/wiki/Akima) | Akima cubic spline interpolation. |
| [BasicInterpolators](https://github.com/chdh/commons-math-interpolation/wiki/BasicInterpolators) | Dispatcher for the basic interpolation methods (without LOESS). |
| [Cubic](https://github.com/chdh/commons-math-interpolation/wiki/Cubic) | Natural cubic spline interpolation. |
| [Index](https://github.com/chdh/commons-math-interpolation/wiki/Index) | Main entry point of the package. |
| [Linear](https://github.com/chdh/commons-math-interpolation/wiki/Linear) | Linear interpolation. |
| [Loess](https://github.com/chdh/commons-math-interpolation/wiki/Loess) | LOESS/LOWESS local regression. |
| [NearestNeighbor](https://github.com/chdh/commons-math-interpolation/wiki/NearestNeighbor) | Nearest neighbor interpolation. |
| [Utils](https://github.com/chdh/commons-math-interpolation/wiki/Utils) | Utility functions and types used by the other modules of this package. |

<!-- API-MODULES:END -->
