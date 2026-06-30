import { describe, expect, it } from 'vitest';
import { CHANNELS, cloneRaster, createRaster, getPixel, indexOf, solidRaster } from './raster';

describe('raster', () => {
  it('allocates a zeroed RGBA buffer of the right length', () => {
    const img = createRaster(2, 3);
    expect(img.width).toBe(2);
    expect(img.height).toBe(3);
    expect(img.data.length).toBe(2 * 3 * CHANNELS);
    expect([...img.data].every((v) => v === 0)).toBe(true);
  });

  it('rejects non-positive or non-integer dimensions', () => {
    expect(() => createRaster(0, 1)).toThrow(RangeError);
    expect(() => createRaster(1.5, 1)).toThrow(RangeError);
    expect(() => createRaster(1, -2)).toThrow(RangeError);
  });

  it('rejects data whose length does not match the dimensions', () => {
    expect(() => createRaster(2, 2, new Uint8ClampedArray(3))).toThrow(RangeError);
  });

  it('solidRaster fills every pixel with the colour', () => {
    const img = solidRaster(2, 2, [10, 20, 30, 40]);
    expect(getPixel(img, 0, 0)).toEqual([10, 20, 30, 40]);
    expect(getPixel(img, 1, 1)).toEqual([10, 20, 30, 40]);
  });

  it('indexOf computes row-major RGBA offsets', () => {
    const img = createRaster(3, 2);
    expect(indexOf(img, 0, 0)).toBe(0);
    expect(indexOf(img, 1, 0)).toBe(CHANNELS);
    expect(indexOf(img, 0, 1)).toBe(3 * CHANNELS);
  });

  it('cloneRaster makes an independent copy', () => {
    const img = solidRaster(1, 1, [1, 2, 3, 4]);
    const copy = cloneRaster(img);
    copy.data[0] = 99;
    expect(img.data[0]).toBe(1);
    expect(copy.data[0]).toBe(99);
  });
});
