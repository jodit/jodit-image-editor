import type { Focus } from '../state/types';
import type { RasterImage } from '../raster/raster';
import { CHANNELS, createRaster, indexOf } from '../raster/raster';
import { blur } from './adjustments';

/**
 * Selective ("tilt-shift") blur: keep a region sharp and blur the rest, blending
 * between them with a soft falloff. Pure `(raster, focus) => raster` — the blur
 * and the mask are computed in the DOM-free pixel domain, so it is unit-tested
 * in Node like every other operation.
 *
 * - **radial**: sharp inside a circle of `radius` around `(x, y)`.
 * - **linear**: sharp inside a band through `(x, y)` at `angle`.
 */
export function createDefaultFocus(): Focus {
  return { shape: 'radial', x: 0.5, y: 0.5, radius: 0.28, angle: 0, amount: 60 };
}

export function selectiveBlur(img: RasterImage, focus: Focus): RasterImage {
  if (focus.amount <= 0)
    return createRaster(img.width, img.height, new Uint8ClampedArray(img.data));

  const blurred = blur(img, focus.amount, 32);
  const { width: w, height: h } = img;
  const out = createRaster(w, h);

  const minDim = Math.min(w, h);
  const cx = focus.x * w;
  const cy = focus.y * h;
  const sharpR = focus.radius * minDim;
  const feather = Math.max(minDim * 0.06, sharpR * 0.9);
  const rad = (focus.angle * Math.PI) / 180;
  // unit vector perpendicular to the (linear) sharp band
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = focus.shape === 'radial' ? Math.hypot(dx, dy) : Math.abs(dx * nx + dy * ny);
      const t = smoothstep(sharpR, sharpR + feather, dist); // 0 sharp → 1 blurred
      const i = indexOf(out, x, y);
      for (let c = 0; c < CHANNELS; c++) {
        out.data[i + c] = img.data[i + c]! + (blurred.data[i + c]! - img.data[i + c]!) * t;
      }
    }
  }
  return out;
}

/** Smooth 0→1 ramp between edges `e0` and `e1`. */
export function smoothstep(e0: number, e1: number, v: number): number {
  if (e1 <= e0) return v >= e1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
