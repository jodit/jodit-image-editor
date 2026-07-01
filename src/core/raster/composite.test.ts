import { describe, expect, it } from 'vitest';
import { getPixel, solidRaster } from './raster';
import { flattenOnBackground, parseHexColor } from './composite';

describe('flattenOnBackground', () => {
  it('leaves an opaque image unchanged', () => {
    const img = solidRaster(2, 2, [10, 20, 30, 255]);
    expect(getPixel(flattenOnBackground(img, [0, 0, 0]), 0, 0)).toEqual([10, 20, 30, 255]);
  });

  it('a fully transparent image becomes the background, opaque', () => {
    const img = solidRaster(2, 2, [123, 45, 6, 0]);
    expect(getPixel(flattenOnBackground(img, [255, 255, 255]), 1, 1)).toEqual([255, 255, 255, 255]);
  });

  it('blends semi-transparent pixels over the background', () => {
    const img = solidRaster(1, 1, [255, 0, 0, 128]); // ~50% red
    const [r, g, b, a] = getPixel(flattenOnBackground(img, [255, 255, 255]), 0, 0);
    expect(r).toBe(255); // red over white stays 255
    expect(g).toBeGreaterThan(120); // ~127
    expect(g).toBeLessThan(135);
    expect(b).toBe(g);
    expect(a).toBe(255);
  });
});

describe('parseHexColor', () => {
  it('parses #rrggbb', () => {
    expect(parseHexColor('#ff8800')).toEqual([255, 136, 0]);
  });
  it('parses shorthand #rgb', () => {
    expect(parseHexColor('#f80')).toEqual([255, 136, 0]);
  });
  it('tolerates a missing hash and whitespace', () => {
    expect(parseHexColor('  00ff00 ')).toEqual([0, 255, 0]);
  });
  it('falls back to white on invalid input', () => {
    expect(parseHexColor('not-a-color')).toEqual([255, 255, 255]);
  });
});
