import type { FinetuneState } from '../state/types';
import type { RasterImage } from '../raster/raster';
import { CHANNELS, createRaster } from '../raster/raster';

/**
 * Parametric "finetune" adjustments — each a pure `(raster, amount) => raster`.
 * Sliders are neutral at 0 so the identity finetune is a no-op clone.
 */

const REC_601 = { r: 0.299, g: 0.587, b: 0.114 } as const;

/** Per-channel map helper — keeps the alpha channel untouched. */
function mapRgb(img: RasterImage, fn: (value: number, channel: 0 | 1 | 2) => number): RasterImage {
  const out = createRaster(img.width, img.height, new Uint8ClampedArray(img.data));
  for (let i = 0; i < out.data.length; i += CHANNELS) {
    out.data[i] = fn(out.data[i]!, 0);
    out.data[i + 1] = fn(out.data[i + 1]!, 1);
    out.data[i + 2] = fn(out.data[i + 2]!, 2);
  }
  return out;
}

/** Additive brightness; `amount` in -100..100 maps to ±255. */
export function brightness(img: RasterImage, amount: number): RasterImage {
  if (amount === 0) return clone(img);
  const delta = (amount / 100) * 255;
  return mapRgb(img, (v) => v + delta);
}

/** Standard contrast curve about mid-grey; `amount` in -100..100. */
export function contrast(img: RasterImage, amount: number): RasterImage {
  if (amount === 0) return clone(img);
  const c = (amount / 100) * 255;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  return mapRgb(img, (v) => factor * (v - 128) + 128);
}

/** Saturation as a mix toward luminance; `amount` in -100..100. */
export function saturation(img: RasterImage, amount: number): RasterImage {
  if (amount === 0) return clone(img);
  const s = 1 + amount / 100;
  const out = createRaster(img.width, img.height, new Uint8ClampedArray(img.data));
  for (let i = 0; i < out.data.length; i += CHANNELS) {
    const r = out.data[i]!;
    const g = out.data[i + 1]!;
    const b = out.data[i + 2]!;
    const lum = REC_601.r * r + REC_601.g * g + REC_601.b * b;
    out.data[i] = lum + (r - lum) * s;
    out.data[i + 1] = lum + (g - lum) * s;
    out.data[i + 2] = lum + (b - lum) * s;
  }
  return out;
}

/** Warmth: push red up and blue down (or vice-versa); `amount` in -100..100. */
export function warmth(img: RasterImage, amount: number): RasterImage {
  if (amount === 0) return clone(img);
  const delta = (amount / 100) * 40;
  return mapRgb(img, (v, ch) => (ch === 0 ? v + delta : ch === 2 ? v - delta : v));
}

/**
 * Separable box blur. `amount` (0..100) maps to a pixel radius; the kernel runs
 * once horizontally then vertically for O(n) cost regardless of radius.
 */
export function blur(img: RasterImage, amount: number, maxRadius = 20): RasterImage {
  const radius = Math.round((Math.max(0, Math.min(100, amount)) / 100) * maxRadius);
  if (radius <= 0) return clone(img);
  return boxBlurPass(boxBlurPass(img, radius, 'horizontal'), radius, 'vertical');
}

/** Apply the full finetune state in a fixed, stable order. */
export function applyFinetune(img: RasterImage, finetune: FinetuneState): RasterImage {
  let out = img;
  out = brightness(out, finetune.brightness);
  out = contrast(out, finetune.contrast);
  out = saturation(out, finetune.saturation);
  out = warmth(out, finetune.warmth);
  out = blur(out, finetune.blur);
  return out;
}

function boxBlurPass(
  img: RasterImage,
  radius: number,
  axis: 'horizontal' | 'vertical',
): RasterImage {
  const out = createRaster(img.width, img.height);
  const { width, height, data } = img;
  const horizontal = axis === 'horizontal';
  const outer = horizontal ? height : width;
  const inner = horizontal ? width : height;
  const window = radius * 2 + 1;

  for (let o = 0; o < outer; o++) {
    for (let c = 0; c < CHANNELS; c++) {
      let sum = 0;
      // prime the sliding window using clamped edge samples
      for (let k = -radius; k <= radius; k++) {
        sum += sampleChannel(data, width, height, horizontal, o, k, c);
      }
      for (let i = 0; i < inner; i++) {
        const di = (horizontal ? o * width + i : i * width + o) * CHANNELS + c;
        out.data[di] = sum / window;
        const leaving = sampleChannel(data, width, height, horizontal, o, i - radius, c);
        const entering = sampleChannel(data, width, height, horizontal, o, i + radius + 1, c);
        sum += entering - leaving;
      }
    }
  }
  return out;
}

function sampleChannel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  horizontal: boolean,
  outer: number,
  inner: number,
  channel: number,
): number {
  const limit = (horizontal ? width : height) - 1;
  const i = inner < 0 ? 0 : inner > limit ? limit : inner;
  const idx = (horizontal ? outer * width + i : i * width + outer) * CHANNELS + channel;
  return data[idx]!;
}

function clone(img: RasterImage): RasterImage {
  return createRaster(img.width, img.height, new Uint8ClampedArray(img.data));
}
