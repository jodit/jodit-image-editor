# core/operations

Pure geometric transforms on a `RasterImage`. Each is an input → output function
that allocates a fresh buffer and never mutates its argument. Pixels move by
index arithmetic — no canvas involved.

```ts
import { flip, rotate90, crop, resize } from '@jodit/image-editor';

flip(img, 'horizontal');
rotate90(img, 90); // clockwise quarter turns; any angle snaps to 0/90/180/270
crop(img, { x: 10, y: 10, width: 100, height: 80 }); // rounded + clamped to bounds
resize(img, { width: 320, height: 240 }); // bilinear
```

| Function             | Notes                                            |
| -------------------- | ------------------------------------------------ |
| `flip(img, axis)`    | `'horizontal'` \| `'vertical'`; self-inverse.    |
| `rotate90(img, deg)` | Swaps dimensions for 90/270; 0° returns a clone. |
| `crop(img, rect)`    | Rect is rounded and clamped, never < 1×1.        |
| `resize(img, size)`  | Bilinear; identity size returns a clone.         |
