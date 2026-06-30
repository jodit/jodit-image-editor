import { describe, expect, it } from 'vitest';
import { createRaster, solidRaster } from '../raster/raster';
import { createIdentityDesign } from '../state/initial';
import type { Design } from '../state/types';
import { execute, isIdentity } from './pipeline';

function ramp(width: number, height: number) {
  const img = createRaster(width, height);
  for (let i = 0; i < width * height; i++) {
    img.data[i * 4] = i;
    img.data[i * 4 + 3] = 255;
  }
  return img;
}

describe('pipeline', () => {
  it('the identity design returns equal pixels', () => {
    const img = solidRaster(4, 3, [1, 2, 3, 255]);
    const out = execute(img, createIdentityDesign());
    expect([...out.data]).toEqual([...img.data]);
  });

  it('rotate then crop changes the dimensions predictably', () => {
    const img = ramp(4, 2);
    const design: Design = {
      ...createIdentityDesign(),
      rotate: 90,
      crop: { x: 0, y: 0, width: 2, height: 3 },
    };
    const out = execute(img, design);
    expect(out.width).toBe(2);
    expect(out.height).toBe(3);
  });

  it('resize wins over source dimensions', () => {
    const img = ramp(4, 4);
    const out = execute(img, { ...createIdentityDesign(), resize: { width: 8, height: 2 } });
    expect(out.width).toBe(8);
    expect(out.height).toBe(2);
  });

  it('applies filter and finetune (grayscale equalises channels)', () => {
    const img = solidRaster(2, 2, [200, 10, 10, 255]);
    const out = execute(img, { ...createIdentityDesign(), filter: 'grayscale' });
    expect(out.data[0]).toBe(out.data[1]);
    expect(out.data[1]).toBe(out.data[2]);
  });

  it('isIdentity detects no-op vs edited designs', () => {
    expect(isIdentity(createIdentityDesign())).toBe(true);
    expect(isIdentity({ ...createIdentityDesign(), rotate: 90 })).toBe(false);
    expect(isIdentity({ ...createIdentityDesign(), filter: 'sepia' })).toBe(false);
  });
});
