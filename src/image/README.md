# image

The **only** part of the codebase that touches a canvas. It bridges the pure
pixel core to the platform image APIs.

- **`codec.ts`** — `ImageCodec` (`decode`/`encode`) and the canvas-backed
  `CanvasImageCodec`. Decodes via `createImageBitmap` (with an `<img>` fallback)
  and encodes via `toBlob`. The `CanvasFactory` is injectable for headless/test use.
- **`image-data.ts`** — `toImageData(raster)`: the single `RasterImage` ⇄
  `ImageData` conversion point.
- **`annotate.ts`** — `compositeAnnotations(...)` draws text labels over a raster;
  `resolveText(...)` (the normalised-coords → pixels math) is pure and tested.
- **`processor.ts`** — `ImageProcessor` composes the pure pipeline with the impure
  codec/annotation steps: `decode`, `render(source, design)`, `toBlob(...)`.

```ts
import { createDefaultProcessor } from '@jodit/image-editor';

const processor = createDefaultProcessor();
const raster = await processor.decode(blob);
const blob2 = await processor.toBlob(raster, design, { type: 'image/png', quality: 0.92 });
```

Inject a custom `ImageProcessor`/`CanvasFactory` into `ImageEditor` to run in a
worker or with a non-DOM canvas.
