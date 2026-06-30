# 4. Pixel core & pipeline

> How a `Design` becomes real pixels, and where the boundary with the canvas
> lies.

## The core idea: pixels live without the DOM

At the base is `RasterImage` (`src/core/raster/raster.ts`): just an RGBA buffer,
no canvas:

```ts
interface RasterImage {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>; // RGBA, row-major, length = width*height*4
}
```

Why this and not `ImageData`/`canvas`? Because a plain byte array can be processed
by **pure functions in Node, without a browser**. As a result every operation and
filter is a unit test on a simple array, not "open the page and eyeball it". The
`Uint8ClampedArray<ArrayBuffer>` type is chosen so it drops into `ImageData`
without a copy at the edge of the system.

Alongside are small helpers: `createRaster`, `solidRaster` (fill with a colour —
handy in tests), `cloneRaster`, `getPixel`, `indexOf`.

## Operations — pure `RasterImage → RasterImage` (`src/core/operations/transform.ts`)

```ts
flip(img, 'horizontal' | 'vertical'); // mirror; its own inverse
rotate90(img, degrees); // quarter-turn rotation by pixel reindexing
crop(img, rect); // cut-out; rect is rounded and clamped to bounds
resize(img, size); // bilinear interpolation
```

All of them **allocate a new buffer and never mutate the input** — so they
compose freely. Pixels move by simple index arithmetic, no canvas. For example
`flip(flip(img, 'horizontal'), 'horizontal')` yields a byte-for-byte copy of the
source (a test checks this), and four `rotate90(…, 90)` in a row return the
original.

## Filters — two groups (`src/core/filters/`)

**`adjustments.ts`** — parametric "finetune", each neutral at zero:

```ts
brightness(img, amount); // -100..100, additive
contrast(img, amount); // standard contrast curve about mid-grey
saturation(img, amount); // mix toward luminance
warmth(img, amount); // red up / blue down
blur(img, amount); // separable box blur (horizontal pass + vertical)
applyFinetune(img, state); // apply everything in a fixed order
```

The blur is separable (rows first, then columns), making it O(n) regardless of
radius.

**`filters.ts`** — named filters (`invert`, `grayscale`, `sepia`, `solarize`,
`clarendon`, `gingham`) and, crucially, an **open registry**:

```ts
registerFilter({ id, label, apply }); // returns an "unregister" function
applyFilter(img, id); // unknown id → falls back to 'original'
listFilters(); // built-ins + anything added by a plugin
```

The Filters panel is built from `listFilters()`, so a plugin-registered filter
**appears in the UI by itself** — the Open/Closed principle in action.

## `pipeline` — assembling the image from a `Design` (`src/core/pipeline/pipeline.ts`)

This is where everything comes together. `execute(source, design)` is a pure
function that applies operations in a **fixed order**:

```ts
function execute(source, design) {
  let img = source;
  if (design.flip.horizontal) img = flip(img, 'horizontal');
  if (design.flip.vertical) img = flip(img, 'vertical');
  if (design.rotate !== 0) img = rotate90(img, design.rotate);
  if (design.crop) img = crop(img, design.crop);
  if (design.resize) img = resize(img, design.resize);
  img = applyFinetune(img, design.finetune);
  img = applyFilter(img, design.filter);
  return img;
}
```

Fixed order = determinism: the same `Design` always yields the same pixels. The
tests rely on this.

**Important detail:** annotations (text) are _not_ applied here. Text needs a
font-shaping engine (canvas), and the pipeline must stay 100% pure. So labels are
composited later, on the canvas side.

## The canvas boundary — the only "impure" place (`src/image/`)

This is the only code that touches a canvas at all:

- **`codec.ts`** — `CanvasImageCodec`:
  - `decode(blob)`: `createImageBitmap` → draw to canvas → `getImageData` →
    `RasterImage`.
  - `encode(raster, opts)`: `putImageData` → `canvas.toBlob`.
  - The canvas factory (`CanvasFactory`) is injectable — you can supply your own
    for headless/test use.
- **`annotate.ts`** — `compositeAnnotations`: draws text over a raster via
  `fillText`. The _geometry_ (`resolveText`: turning normalised 0..1 coordinates
  into pixels) is pure and tested separately.
- **`image-data.ts`** — the single `RasterImage` ⇄ `ImageData` conversion point.
- **`processor.ts`** — `ImageProcessor` glues the pure and impure together:

```ts
render(source, design) {
  const pixels = execute(source, design);                                     // pure pipeline
  return compositeAnnotations(this.createCanvas, pixels, design.annotations); // + text
}
toBlob(source, design, opts) {
  return this.codec.encode(this.render(source, design), opts);
}
```

So the editor's input/output is:
`Blob → decode → RasterImage → render(design) → RasterImage → encode → Blob`.

## How the editor uses it: full-res vs. preview

`ImageEditor` keeps **three** rasters:

- `source` — the full-resolution original. `toBlob()` **export** runs on this —
  the final result is always full quality.
- `previewSource` — a downscaled copy (longest edge ≤ 1600) for the **live
  preview**, so every frame recomputes quickly.
- `thumbSource` — a tiny copy (≤ 160) for the filter-strip thumbnails.

## The cache that fixed crop smoothness

Cropping with a filter active used to feel janky. The root cause was here.
`paint()` draws the preview like this:

```ts
const design = selectPreviewDesign(state); // while cropping, crop = null!
const rasterKey = `${thumbVersion}:${JSON.stringify(design)}`;
if (rasterKey !== this.cachedRasterKey) {
  this.cachedRaster = this.processor.render(this.previewSource, design); // expensive: filter over the whole image
  this.cachedRasterKey = rasterKey;
}
const paintKey = `${rasterKey}@${viewport}…:${fit.scale}:${fit.offset}`;
if (paintKey === this.lastPaintKey) return; // nothing visual changed — skip the blit
paintPreview(canvas, this.cachedRaster, viewport, fit);
```

The trick: **while cropping, `selectPreviewDesign` drops the `crop`** (we show the
whole image under the frame). So while dragging the crop frame the preview
`design` doesn't change → `rasterKey` is stable → the expensive filter runs
**once per gesture**, not per frame. The crop frame itself is plain DOM on top of
the canvas; it moves separately and smoothly. The result is precisely a "throttle
on effect application that doesn't touch the crop UI".

## Takeaways

- A pure core computes pixels in memory and is fully testable.
- The canvas is touched only at the very edges (decode / encode / text).
- The editor separates full-res export from a fast preview, and a raster cache
  removes redundant recomputation (which is what made cropping smooth).

← Back to the [docs index](./README.md).
