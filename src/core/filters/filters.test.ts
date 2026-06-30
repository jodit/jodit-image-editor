import { describe, expect, it } from 'vitest';
import { getPixel, solidRaster } from '../raster/raster';
import {
  applyFilter,
  getFilter,
  grayscale,
  invert,
  listFilters,
  registerFilter,
  sepia,
  solarize,
} from './filters';

describe('named filters', () => {
  it('invert flips each channel', () => {
    const img = solidRaster(1, 1, [10, 20, 30, 255]);
    expect(getPixel(invert(img), 0, 0)).toEqual([245, 235, 225, 255]);
  });

  it('grayscale equalises channels', () => {
    const [r, g, b] = getPixel(grayscale(solidRaster(1, 1, [255, 0, 0, 255])), 0, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('sepia warms a neutral grey', () => {
    const [r, , b] = getPixel(sepia(solidRaster(1, 1, [128, 128, 128, 255])), 0, 0);
    expect(r).toBeGreaterThan(b);
  });

  it('solarize inverts only bright channels', () => {
    const [r, , b] = getPixel(solarize(solidRaster(1, 1, [10, 0, 200, 255])), 0, 0);
    expect(r).toBe(10); // below midpoint -> unchanged
    expect(b).toBe(55); // 255 - 200
  });
});

describe('filter registry', () => {
  it('lists the built-in filters', () => {
    const ids = listFilters().map((f) => f.id);
    expect(ids).toEqual(
      expect.arrayContaining(['original', 'invert', 'grayscale', 'sepia', 'solarize']),
    );
  });

  it('applyFilter falls back to original for unknown ids', () => {
    const img = solidRaster(1, 1, [1, 2, 3, 255]);
    const out = applyFilter(img, 'does-not-exist');
    expect([...out.data]).toEqual([...img.data]);
  });

  it('registerFilter adds a custom filter and unregister removes it', () => {
    const unregister = registerFilter({
      id: 'red-out',
      label: 'Red Out',
      apply: (i) => solidRaster(i.width, i.height, [255, 0, 0, 255]),
    });
    expect(getFilter('red-out')).toBeDefined();
    expect(getPixel(applyFilter(solidRaster(1, 1, [0, 0, 0, 255]), 'red-out'), 0, 0)).toEqual([
      255, 0, 0, 255,
    ]);
    unregister();
    expect(getFilter('red-out')).toBeUndefined();
  });
});
