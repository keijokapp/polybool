polybool
========

Polygon clipping library.

# Features

1. Handles gracefully any kind of input without needing an epsilon value
1. Polygon clipping operations - `union`, `intersect`, `difference`, `differenceRev`, `xor`
2. Removes unnecessary vertices with an optional epsilon
3. Provides an API for constructing efficient sequences of operations
4. Outputs exterior paths as counter-clockwise, and holes as clockwise (right-hand rule)
5. Outputs are guaranteed to not self-intersect, though they may self-touch at some corners.
5. No runtime dependencies or NodeJS-specifics, so works in any JavaScript environment that supports
bigint.

# Installing

`npm install @arbendium/polybool`

# Documentation

## Simplified API

These utilities internally convert the input polygons to segments, combine them, filter the segments
according to the given operation and convert the segment list back to the resulting polygon.

```typescript
import polybool from '@velipso/polybool';

const poly = polybool.union(poly1, poly2);
const poly = polybool.intersect(poly1, poly2);
const poly = polybool.difference(poly1, poly2); // poly1 - poly2
const poly = polybool.differenceRev(poly1, poly2); // poly2 - poly1
const poly = polybool.xor(poly1, poly2);
const poly = polybool.normalize(poly1, epsilon); // see granular API
```

Where `poly1`, `poly2`, are lists of rings:

```typescript
[
  [[50,50], [150,150], [190,50]],
  [[130,50], [290,150], [290,50]],
}
```

## Granular API

Granular API let's you avoid redundant conversions when combining multiple operations. Polygons
could be converted to segment list only once, and segment list would also be converted to polygons
only once.

```typescript
const segments = polybool.segments(polygon);
const combined = polybool.combine(segments1, segments2);
const segments = polybool.select.union(combined);
const segments = polybool.select.intersect(combined);
const segments = polybool.select.difference(combined);
const segments = polybool.select.differenceRev(combined);
const segments = polybool.select.xor(combined);
const polygon  = polybool.polygon(segments);
```

Each step is pure, ie they don't mutate the input data.

An example computing `polygon1 + polygon2 - polygon3`:

```typescript
const segments1 = polybool.segments(polygon1);
const segments2 = polybool.segments(polygon2);
const segments3 = polybool.segments(polygon3);
const segments = polybool.select.difference(polybool.combine(
  polybool.select.union(polybool.combine(
    segments1,
    segments2
  )),
  segments3
));
const polygon = polybool.polygon(segments);
```


## Cleaning up polygons

Converting polygon to segments and back efficiently performs a simplfication, removing
intersections and renduntant vertices and correcting the ring windings.

```typescript
const cleaned = polybool.normalize(polygon); // simple API
const cleaned = polybool.polygon(polybool.segments(polygon)); // granular API
```

The above example preserves the mathematical accuracy to the highest possible degree, rounding only
the intersection points to their closest representable floating point values. To simplify the
polygon further, ie remove vertices that almost but not really collinear with their neighbors, use
the `epsilon` parameter:

```typescript
const cleaned = polybool.normalize(polygon, 2 ** 12);
const cleaned = polybool.polygon(polybool.segments(polygon), 2 ** 12);
```

# Notes on numerical accuracy

This libary aims for deterministic and mathematically perfect behavior and results, ie no excess
rounding errors or glitching out on non-conventaionl polygon inputs.

Normally polygon clipping libraries suffer from a myriad of issues related to numerical accuracy of
IEEE754 floating point calculations. They try to overcome it by using a user-provided _epsilon_
value when comparing values (coordinates and determinants). The fundamental problem with this
approach is that a single epsilon value (the largest possbile error, exclusive) is really only
applicable to a specific number (depending on its scale) or calculation (depending on the operation
and epsilons of its inputs). Finding an epsilon for each input and keeping track of them during
calculations is too difficult so libraries typically use only the one that user provided. This
results in thom being prone to throwing errors and outputting garbage (disconnected or missing
segments), sometimes even on simple-looking input polygons.

This library does only exact math on rational numbers composed of bigints. That trades the numerical
accuracy problem for somewhat higher memory and compute usage. The optional `epsilon` parameter is
used only for output simplification.

However, since the inputs and outputs are still floats, a few specifics need to be clear:

1. The library treats inputs vertices as exact values. The binary representation of those is used
as the source of truth, rather than decimal representation (which is what many bignumber libraries
do).
2. Non-intersection output vertices match their input counterparts.
3. Intersection vertices are rounded for output to their closest floating point representation. This
may cause their segments or rings to shrink to zero. These zero-area segments and rings are not
included in the output.
4. The library outputs outline rings as CCW and holes as CW. However, when doing naive floating
point calculations on the output rings (like calculating an area), the results may be a bit
unexpected. For example:

```javascript
function ringArea(vertices) {
  let area = 0;

  for (let i = 0, l = vertices.length; i < l; i++) {
    const v0 = vertices[i];
    const v1 = vertices[i === l - 1 ? 0 : i + 1];

    area += v0[0] * v1[1] - v1[0] * v0[1];
  }

  return area;
}

const poly = [
  [591214.8958173788, 6482371.659311935], // A
  [591200.6463796443, 6482373.063060548], // B
  [591147.8506046718, 6482374.0560854785], // C
  [591200.6463796222, 6482373.063061498], // D
];

ringArea(poly); // 0.00048828125; >0 => CCW

const normalized = polybool.normalize(poly); // DCBA => semingly CW?

ringArea(normalized); // -0.00048828125; <0 => CW
```

The input is not actually CCW and the output is not actually CW. The floating point calculations in
the `ringArea` accumulate enough to flip the sign. There are [several methods](https://en.wikipedia.org/wiki/Floating-point_error_mitigation)
for floating point error mitigation. Alternatively, these errors are expected to be small enough
that they can be ignored for many real-world applications.
