import type { Rect, Size } from '../state/types';
import type { RasterImage } from '../raster/raster';
import { CHANNELS, createRaster, indexOf } from '../raster/raster';
import { clampRectToBounds, roundRect } from '../geometry/geometry';

/**
 * Geometric operations on a {@link RasterImage}. Each is a pure
 * input → output function that allocates a fresh buffer; none mutate the
 * source. Pixels are moved by index arithmetic only — no canvas involved.
 */

export type FlipAxis = 'horizontal' | 'vertical';

/** Mirror across the given axis. */
export function flip(img: RasterImage, axis: FlipAxis): RasterImage {
  const out = createRaster(img.width, img.height);
  const { width, height } = img;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = axis === 'horizontal' ? width - 1 - x : x;
      const sy = axis === 'vertical' ? height - 1 - y : y;
      copyPixel(img, indexOf(img, sx, sy), out, indexOf(out, x, y));
    }
  }
  return out;
}

/**
 * Rotate clockwise by a multiple of 90°. Any angle is snapped to the nearest
 * quarter turn; 0° returns a clone.
 */
export function rotate90(img: RasterImage, degrees: number): RasterImage {
  const turns = (((Math.round(degrees / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  if (turns === 0) return createRaster(img.width, img.height, new Uint8ClampedArray(img.data));

  const { width: w, height: h } = img;
  const swap = turns === 1 || turns === 3;
  const out = createRaster(swap ? h : w, swap ? w : h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx: number;
      let dy: number;
      if (turns === 1) {
        dx = h - 1 - y;
        dy = x;
      } else if (turns === 2) {
        dx = w - 1 - x;
        dy = h - 1 - y;
      } else {
        dx = y;
        dy = w - 1 - x;
      }
      copyPixel(img, indexOf(img, x, y), out, indexOf(out, dx, dy));
    }
  }
  return out;
}

/** Extract a sub-rectangle. The rect is rounded and clamped into bounds. */
export function crop(img: RasterImage, rect: Rect): RasterImage {
  const safe = clampRectToBounds(roundRect(rect), img);
  const out = createRaster(safe.width, safe.height);
  for (let y = 0; y < safe.height; y++) {
    const srcStart = indexOf(img, safe.x, safe.y + y);
    const dstStart = indexOf(out, 0, y);
    out.data.set(img.data.subarray(srcStart, srcStart + safe.width * CHANNELS), dstStart);
  }
  return out;
}

/**
 * Resize using bilinear interpolation — smooth enough for previews and exports
 * without pulling in a canvas. Identity size returns a clone.
 */
export function resize(img: RasterImage, size: Size): RasterImage {
  const width = Math.max(1, Math.round(size.width));
  const height = Math.max(1, Math.round(size.height));
  if (width === img.width && height === img.height) {
    return createRaster(width, height, new Uint8ClampedArray(img.data));
  }

  const out = createRaster(width, height);
  const sx = img.width / width;
  const sy = img.height / height;

  for (let y = 0; y < height; y++) {
    const fy = (y + 0.5) * sy - 0.5;
    const y0 = Math.floor(fy);
    const wy = fy - y0;
    const y0c = clampIndex(y0, img.height);
    const y1c = clampIndex(y0 + 1, img.height);

    for (let x = 0; x < width; x++) {
      const fx = (x + 0.5) * sx - 0.5;
      const x0 = Math.floor(fx);
      const wx = fx - x0;
      const x0c = clampIndex(x0, img.width);
      const x1c = clampIndex(x0 + 1, img.width);

      const i00 = indexOf(img, x0c, y0c);
      const i10 = indexOf(img, x1c, y0c);
      const i01 = indexOf(img, x0c, y1c);
      const i11 = indexOf(img, x1c, y1c);
      const di = indexOf(out, x, y);

      for (let c = 0; c < CHANNELS; c++) {
        const top = lerp(img.data[i00 + c]!, img.data[i10 + c]!, wx);
        const bottom = lerp(img.data[i01 + c]!, img.data[i11 + c]!, wx);
        out.data[di + c] = lerp(top, bottom, wy);
      }
    }
  }
  return out;
}

/**
 * Sample a *rotated* rectangle out of `img` into an upright raster.
 *
 * The rect's footprint (`width × height`, centred at the rect centre) is rotated
 * clockwise by `angleDeg` about that centre; for every output pixel we map back
 * into the source and bilinearly sample. Pixels that fall outside the source are
 * transparent. This powers free-angle crop ("straighten"); `angleDeg === 0`
 * is equivalent to {@link crop} (minus the bounds clamp).
 */
export function sampleRotatedRect(img: RasterImage, rect: Rect, angleDeg: number): RasterImage {
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const out = createRaster(w, h);

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  for (let oy = 0; oy < h; oy++) {
    const ly = oy + 0.5 - h / 2;
    for (let ox = 0; ox < w; ox++) {
      const lx = ox + 0.5 - w / 2;
      const sx = cx + lx * cos - ly * sin - 0.5;
      const sy = cy + lx * sin + ly * cos - 0.5;
      sampleBilinear(img, sx, sy, out, indexOf(out, ox, oy));
    }
  }
  return out;
}

/** Bilinear sample at (fx, fy); fully outside the source → transparent. */
function sampleBilinear(
  img: RasterImage,
  fx: number,
  fy: number,
  out: RasterImage,
  di: number,
): void {
  if (fx <= -1 || fy <= -1 || fx >= img.width || fy >= img.height) {
    out.data[di] = 0;
    out.data[di + 1] = 0;
    out.data[di + 2] = 0;
    out.data[di + 3] = 0;
    return;
  }
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const wx = fx - x0;
  const wy = fy - y0;
  const x0c = clampIndex(x0, img.width);
  const x1c = clampIndex(x0 + 1, img.width);
  const y0c = clampIndex(y0, img.height);
  const y1c = clampIndex(y0 + 1, img.height);

  const i00 = indexOf(img, x0c, y0c);
  const i10 = indexOf(img, x1c, y0c);
  const i01 = indexOf(img, x0c, y1c);
  const i11 = indexOf(img, x1c, y1c);

  for (let c = 0; c < CHANNELS; c++) {
    const top = lerp(img.data[i00 + c]!, img.data[i10 + c]!, wx);
    const bottom = lerp(img.data[i01 + c]!, img.data[i11 + c]!, wx);
    out.data[di + c] = lerp(top, bottom, wy);
  }
}

function copyPixel(src: RasterImage, si: number, dst: RasterImage, di: number): void {
  dst.data[di] = src.data[si]!;
  dst.data[di + 1] = src.data[si + 1]!;
  dst.data[di + 2] = src.data[si + 2]!;
  dst.data[di + 3] = src.data[si + 3]!;
}

function clampIndex(value: number, length: number): number {
  return value < 0 ? 0 : value >= length ? length - 1 : value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
