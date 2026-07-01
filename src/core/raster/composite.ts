import type { RasterImage } from './raster';
import { CHANNELS, createRaster } from './raster';

/**
 * Alpha-compositing helpers used when exporting to a format without an alpha
 * channel (JPEG/BMP): without flattening, transparent pixels would come out
 * black. `flattenOnBackground` paints the image over a solid colour so the
 * result is fully opaque.
 */
export type RGB = readonly [number, number, number];

/** Composite `img` over a solid `[r, g, b]` background; output alpha is 255. */
export function flattenOnBackground(img: RasterImage, [br, bg, bb]: RGB): RasterImage {
  const out = createRaster(img.width, img.height);
  for (let i = 0; i < img.data.length; i += CHANNELS) {
    const a = img.data[i + 3]! / 255;
    const ia = 1 - a;
    out.data[i] = img.data[i]! * a + br * ia;
    out.data[i + 1] = img.data[i + 1]! * a + bg * ia;
    out.data[i + 2] = img.data[i + 2]! * a + bb * ia;
    out.data[i + 3] = 255;
  }
  return out;
}

/** Parse `#rgb` / `#rrggbb` into an `[r, g, b]` tuple; invalid input → white. */
export function parseHexColor(css: string): RGB {
  const hex = css.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [expand(hex[0]!), expand(hex[1]!), expand(hex[2]!)];
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [byte(hex, 0), byte(hex, 2), byte(hex, 4)];
  }
  return [255, 255, 255];
}

function expand(nibble: string): number {
  return parseInt(nibble + nibble, 16);
}

function byte(hex: string, at: number): number {
  return parseInt(hex.slice(at, at + 2), 16);
}
