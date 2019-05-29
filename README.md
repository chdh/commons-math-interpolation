# commons-math-interpolation

This package is a partial TypeScript port of some Java classes of the [Apache Commons Math library](http://commons.apache.org/math).

The following forms of interpolation are implemented:

- [Akima cubic spline interpolation](https://en.wikipedia.org/wiki/Akima_spline)
- [Natural cubic spline interpolation](https://en.wikipedia.org/wiki/Spline_interpolation)
- [Linear interpolation](https://en.wikipedia.org/wiki/Linear_interpolation)
- [Nearest neighbor interpolation](https://en.wikipedia.org/wiki/Nearest-neighbor_interpolation)

The interpolators work on a dataset of x/y points (knots).

Additionally, a local regression algorithm is implemented that can be used in conjunction with the above interpolators.

- [LOESS/LOWESS local regression](https://en.wikipedia.org/wiki/Local_regression)

Interpolation demo: [www.source-code.biz/snippets/typescript/akima](http://www.source-code.biz/snippets/typescript/akima)<br>
LOESS demo: [www.source-code.biz/snippets/typescript/loess](http://www.source-code.biz/snippets/typescript/loess)<br>
NPM package: [commons-math-interpolation](https://www.npmjs.com/package/commons-math-interpolation)
