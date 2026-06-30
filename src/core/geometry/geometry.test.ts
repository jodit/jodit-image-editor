import { describe, expect, it } from 'vitest';
import {
  applyAspectRatio,
  centerRect,
  clamp,
  clampRectToBounds,
  fitInViewport,
  fitScale,
  lockedResize,
  roundRect,
} from './geometry';

describe('geometry', () => {
  it('clamp keeps values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('roundRect snaps edges to whole pixels without losing width', () => {
    expect(roundRect({ x: 0.4, y: 0.6, width: 2.1, height: 2.1 })).toEqual({
      x: 0,
      y: 1,
      width: 3,
      height: 2,
    });
  });

  it('clampRectToBounds keeps the rect inside and at least 1x1', () => {
    const r = clampRectToBounds(
      { x: -5, y: -5, width: 200, height: 200 },
      { width: 100, height: 80 },
    );
    expect(r).toEqual({ x: 0, y: 0, width: 100, height: 80 });
  });

  it('applyAspectRatio preserves area-ish and centre, honours ratio', () => {
    const r = applyAspectRatio({ x: 0, y: 0, width: 100, height: 100 }, 2);
    expect(r.width / r.height).toBeCloseTo(2, 5);
    // centre preserved at (50, 50)
    expect(r.x + r.width / 2).toBeCloseTo(50, 5);
    expect(r.y + r.height / 2).toBeCloseTo(50, 5);
  });

  it('applyAspectRatio returns the rect unchanged for null/invalid ratios', () => {
    const rect = { x: 1, y: 2, width: 3, height: 4 };
    expect(applyAspectRatio(rect, null)).toBe(rect);
    expect(applyAspectRatio(rect, 0)).toBe(rect);
  });

  it('fitScale fits content into a container, optionally clamping upscale', () => {
    expect(fitScale({ width: 200, height: 100 }, { width: 100, height: 100 })).toBeCloseTo(0.5);
    expect(fitScale({ width: 50, height: 50 }, { width: 100, height: 100 })).toBeCloseTo(2);
    expect(fitScale({ width: 50, height: 50 }, { width: 100, height: 100 }, false)).toBe(1);
  });

  it('lockedResize keeps aspect ratio when locked', () => {
    expect(lockedResize({ width: 200, height: 100 }, { width: 100 }, true)).toEqual({
      width: 100,
      height: 50,
    });
    expect(lockedResize({ width: 200, height: 100 }, { height: 25 }, true)).toEqual({
      width: 50,
      height: 25,
    });
  });

  it('lockedResize changes one dimension freely when unlocked', () => {
    expect(lockedResize({ width: 200, height: 100 }, { width: 123 }, false)).toEqual({
      width: 123,
      height: 100,
    });
  });

  it('fitInViewport centres content with contain scaling', () => {
    const fit = fitInViewport({ width: 200, height: 100 }, { width: 100, height: 100 });
    expect(fit.scale).toBeCloseTo(0.5);
    expect(fit.width).toBe(100);
    expect(fit.height).toBe(50);
    expect(fit.offsetX).toBe(0);
    expect(fit.offsetY).toBe(25);
  });

  it('centerRect centres a size in bounds', () => {
    expect(centerRect({ width: 20, height: 10 }, { width: 100, height: 50 })).toEqual({
      x: 40,
      y: 20,
      width: 20,
      height: 10,
    });
  });
});
