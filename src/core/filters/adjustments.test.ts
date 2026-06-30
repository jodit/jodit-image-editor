import { describe, expect, it } from 'vitest';
import { createRaster, getPixel, solidRaster } from '../raster/raster';
import { IDENTITY_FINETUNE } from '../state/initial';
import { applyFinetune, blur, brightness, contrast, saturation, warmth } from './adjustments';

describe('finetune adjustments', () => {
  it('brightness is a no-op at 0 and brightens at positive values', () => {
    const img = solidRaster(1, 1, [100, 100, 100, 255]);
    expect(getPixel(brightness(img, 0), 0, 0)).toEqual([100, 100, 100, 255]);
    const up = getPixel(brightness(img, 50), 0, 0);
    expect(up[0]).toBeGreaterThan(100);
    expect(up[3]).toBe(255); // alpha untouched
  });

  it('brightness clamps to the 0..255 range', () => {
    const img = solidRaster(1, 1, [250, 250, 250, 255]);
    expect(getPixel(brightness(img, 100), 0, 0)[0]).toBe(255);
  });

  it('contrast pushes values away from mid-grey', () => {
    const img = solidRaster(1, 1, [200, 200, 200, 255]);
    expect(getPixel(contrast(img, 50), 0, 0)[0]).toBeGreaterThan(200);
    const dark = solidRaster(1, 1, [50, 50, 50, 255]);
    expect(getPixel(contrast(dark, 50), 0, 0)[0]).toBeLessThan(50);
  });

  it('saturation at -100 collapses to grey (all channels equal)', () => {
    const img = solidRaster(1, 1, [200, 50, 10, 255]);
    const [r, g, b] = getPixel(saturation(img, -100), 0, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('warmth raises red and lowers blue', () => {
    const img = solidRaster(1, 1, [100, 100, 100, 255]);
    const [r, , b] = getPixel(warmth(img, 100), 0, 0);
    expect(r).toBeGreaterThan(100);
    expect(b).toBeLessThan(100);
  });

  it('blur at 0 is a no-op clone', () => {
    const img = solidRaster(3, 3, [10, 20, 30, 255]);
    const out = blur(img, 0);
    expect(out).not.toBe(img);
    expect([...out.data]).toEqual([...img.data]);
  });

  it('blur on a solid image keeps the colour (averaging flats is identity)', () => {
    const img = solidRaster(5, 5, [80, 80, 80, 255]);
    const out = blur(img, 100);
    expect([...out.data].every((v) => v === 80 || v === 255)).toBe(true);
  });

  it('blur smooths a hard edge (centre moves toward the mean)', () => {
    const img = createRaster(3, 1);
    img.data.set([0, 0, 0, 255], 0);
    img.data.set([255, 255, 255, 255], 4);
    img.data.set([0, 0, 0, 255], 8);
    const out = blur(img, 50);
    expect(getPixel(out, 1, 0)[0]).toBeLessThan(255);
    expect(getPixel(out, 1, 0)[0]).toBeGreaterThan(0);
  });

  it('applyFinetune with the identity state returns an equal image', () => {
    const img = solidRaster(2, 2, [12, 34, 56, 255]);
    const out = applyFinetune(img, IDENTITY_FINETUNE);
    expect([...out.data]).toEqual([...img.data]);
  });
});
