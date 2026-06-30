import { describe, expect, it } from 'vitest';
import { createRaster, getPixel } from '../raster/raster';
import { crop, flip, resize, rotate90 } from './transform';
import type { RasterImage } from '../raster/raster';

/**
 * Build a tiny image where each pixel's red channel encodes its position
 * (`y*width + x`), making geometric moves easy to assert exactly.
 */
function ramp(width: number, height: number): RasterImage {
  const img = createRaster(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      img.data[i] = y * width + x;
      img.data[i + 3] = 255;
    }
  }
  return img;
}

const red = (img: RasterImage, x: number, y: number) => getPixel(img, x, y)[0];

describe('flip', () => {
  it('mirrors horizontally', () => {
    const img = ramp(2, 1); // [0, 1]
    const out = flip(img, 'horizontal');
    expect(red(out, 0, 0)).toBe(1);
    expect(red(out, 1, 0)).toBe(0);
  });

  it('mirrors vertically', () => {
    const img = ramp(1, 2); // column [0; 1]
    const out = flip(img, 'vertical');
    expect(red(out, 0, 0)).toBe(1);
    expect(red(out, 0, 1)).toBe(0);
  });

  it('is its own inverse', () => {
    const img = ramp(3, 2);
    const back = flip(flip(img, 'horizontal'), 'horizontal');
    expect([...back.data]).toEqual([...img.data]);
  });
});

describe('rotate90', () => {
  it('swaps dimensions for a quarter turn', () => {
    const img = ramp(3, 2);
    const out = rotate90(img, 90);
    expect(out.width).toBe(2);
    expect(out.height).toBe(3);
  });

  it('rotates clockwise: [[0,1],[2,3]] -> [[2,0],[3,1]]', () => {
    const img = ramp(2, 2); // [[0,1],[2,3]]
    const out = rotate90(img, 90);
    expect(red(out, 0, 0)).toBe(2);
    expect(red(out, 1, 0)).toBe(0); // pixel (0,0) moved to top-right
    expect(red(out, 0, 1)).toBe(3);
    expect(red(out, 1, 1)).toBe(1);
  });

  it('four quarter turns return the original', () => {
    const img = ramp(3, 2);
    let out = img;
    for (let i = 0; i < 4; i++) out = rotate90(out, 90);
    expect([...out.data]).toEqual([...img.data]);
  });

  it('0 degrees returns an equal clone (not the same reference)', () => {
    const img = ramp(2, 2);
    const out = rotate90(img, 0);
    expect(out).not.toBe(img);
    expect([...out.data]).toEqual([...img.data]);
  });
});

describe('crop', () => {
  it('extracts a sub-rectangle', () => {
    const img = ramp(3, 3);
    const out = crop(img, { x: 1, y: 1, width: 2, height: 2 });
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(red(out, 0, 0)).toBe(4); // (1,1) => 1*3+1
    expect(red(out, 1, 1)).toBe(8); // (2,2) => 2*3+2
  });

  it('clamps out-of-bounds rects', () => {
    const img = ramp(2, 2);
    const out = crop(img, { x: -1, y: -1, width: 10, height: 10 });
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
  });
});

describe('resize', () => {
  it('returns a clone at identical size', () => {
    const img = ramp(2, 2);
    const out = resize(img, { width: 2, height: 2 });
    expect(out).not.toBe(img);
    expect([...out.data]).toEqual([...img.data]);
  });

  it('changes dimensions', () => {
    const img = ramp(4, 4);
    const out = resize(img, { width: 2, height: 2 });
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
  });

  it('upscales a solid image preserving the colour (bilinear is exact on flats)', () => {
    const img = createRaster(2, 2);
    img.data.fill(120);
    const out = resize(img, { width: 5, height: 5 });
    expect([...out.data].every((v) => v === 120)).toBe(true);
  });
});
