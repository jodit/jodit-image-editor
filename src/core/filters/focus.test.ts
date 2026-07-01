import { describe, expect, it } from 'vitest';
import { createRaster, getPixel } from '../raster/raster';
import type { RasterImage } from '../raster/raster';
import type { Focus } from '../state/types';
import { createDefaultFocus, selectiveBlur, smoothstep } from './focus';

/** Vertical 1px black/white stripes — a high-frequency pattern the blur flattens. */
function stripes(size: number): RasterImage {
  const img = createRaster(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = x % 2 === 0 ? 0 : 255;
      img.data.set([v, v, v, 255], (y * size + x) * 4);
    }
  }
  return img;
}

const focus = (o: Partial<Focus> = {}): Focus => ({ ...createDefaultFocus(), ...o });

describe('smoothstep', () => {
  it('clamps and ramps 0→1', () => {
    expect(smoothstep(0, 10, -5)).toBe(0);
    expect(smoothstep(0, 10, 15)).toBe(1);
    expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5);
  });
});

describe('selectiveBlur', () => {
  it('returns an equal clone when intensity is 0', () => {
    const img = stripes(9);
    const out = selectiveBlur(img, focus({ amount: 0 }));
    expect(out).not.toBe(img);
    expect([...out.data]).toEqual([...img.data]);
  });

  it('radial: keeps the centre sharp and blurs the periphery', () => {
    const img = stripes(21);
    const out = selectiveBlur(img, focus({ shape: 'radial', radius: 0.12, amount: 100 }));
    // centre pixel is inside the sharp zone → unchanged
    expect(getPixel(out, 10, 10)).toEqual(getPixel(img, 10, 10));
    // a corner is blurred → its channel moved toward the grey average
    const corner = getPixel(out, 0, 0)[0];
    const original = getPixel(img, 0, 0)[0];
    expect(corner).not.toBe(original);
    // blurred toward a mid value, no longer a hard 0/255 stripe
    expect(corner).toBeGreaterThan(10);
    expect(corner).toBeLessThan(245);
  });

  it('linear: keeps the central band sharp and blurs far rows', () => {
    const img = stripes(21);
    // horizontal band (angle 0) → sharpness depends on vertical distance
    const out = selectiveBlur(img, focus({ shape: 'linear', angle: 0, radius: 0.1, amount: 100 }));
    // a pixel on the central band is unchanged
    expect(getPixel(out, 6, 10)).toEqual(getPixel(img, 6, 10));
    // a pixel far above the band is blurred
    expect(getPixel(out, 6, 0)[0]).not.toBe(getPixel(img, 6, 0)[0]);
  });
});
