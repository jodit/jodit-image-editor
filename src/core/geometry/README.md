# core/geometry

Pure number-only geometry — rectangles, aspect ratios, fit/zoom and interactive
crop math. No pixels, no DOM, so cropping logic is reasoned about and tested in
isolation from rendering.

- **`geometry.ts`** — `clamp`, `roundRect`, `clampRectToBounds`,
  `applyAspectRatio`, `fitScale`, `fitInViewport`, `lockedResize`, `centerRect`.
- **`crop-interaction.ts`** — `moveCrop` and `resizeCrop(rect, handle, dx, dy, bounds, ratio?)`:
  the component layer converts pointer pixels to deltas; all the box math lives here.

```ts
import { fitInViewport, resizeCrop, lockedResize } from '@jodit/image-editor';

// Map a 1600×2000 image into an 800×1000 viewport (contain + centre):
fitInViewport({ width: 1600, height: 2000 }, { width: 800, height: 1000 });
// → { scale: 0.5, width: 800, height: 1000, offsetX: 0, offsetY: 0 }

resizeCrop({ x: 20, y: 20, width: 40, height: 40 }, 'se', 10, 20, { width: 100, height: 100 });
lockedResize({ width: 200, height: 100 }, { width: 100 }, true); // → { width: 100, height: 50 }
```
