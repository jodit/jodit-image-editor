# core/raster

`RasterImage` — a **DOM-free, canvas-free** RGBA pixel buffer. This is the
currency of the whole image core. Depending on a plain `Uint8ClampedArray`
(backed by `ArrayBuffer`, the shape `ImageData` wants) instead of a canvas means
every operation and filter is a pure function runnable and testable in Node.

```ts
import { createRaster, solidRaster, getPixel, cloneRaster } from '@jodit/image-editor';

const img = solidRaster(2, 2, [255, 0, 0, 255]); // 2×2 red
getPixel(img, 0, 0); // [255, 0, 0, 255]
const copy = cloneRaster(img); // independent deep copy
```

| Export                      | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `RasterImage`               | `{ width, height, data }` (RGBA, row-major). |
| `createRaster(w, h, data?)` | Allocate/validate a raster.                  |
| `solidRaster(w, h, rgba)`   | Fill with one colour.                        |
| `cloneRaster(img)`          | Deep copy (operations never mutate input).   |
| `indexOf` / `getPixel`      | Pixel addressing.                            |

Only the [`image`](../../image/README.md) adapter converts between `RasterImage`
and the DOM's `ImageData`.
