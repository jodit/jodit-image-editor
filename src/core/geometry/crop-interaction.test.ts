import { describe, expect, it } from 'vitest';
import { moveCrop, resizeCrop } from './crop-interaction';

const bounds = { width: 100, height: 100 };
const rect = { x: 20, y: 20, width: 40, height: 40 };

describe('moveCrop', () => {
  it('translates and clamps to bounds', () => {
    expect(moveCrop(rect, 10, 10, bounds)).toEqual({ x: 30, y: 30, width: 40, height: 40 });
    expect(moveCrop(rect, -999, -999, bounds)).toEqual({ x: 0, y: 0, width: 40, height: 40 });
    expect(moveCrop(rect, 999, 999, bounds)).toEqual({ x: 60, y: 60, width: 40, height: 40 });
  });
});

describe('resizeCrop', () => {
  it('grows from the SE handle', () => {
    expect(resizeCrop(rect, 'se', 10, 20, bounds)).toEqual({
      x: 20,
      y: 20,
      width: 50,
      height: 60,
    });
  });

  it('moves the origin when dragging the NW handle', () => {
    const out = resizeCrop(rect, 'nw', -10, -10, bounds);
    expect(out).toEqual({ x: 10, y: 10, width: 50, height: 50 });
  });

  it('respects the minimum size', () => {
    const out = resizeCrop(rect, 'se', -1000, -1000, bounds);
    expect(out.width).toBeGreaterThanOrEqual(8);
    expect(out.height).toBeGreaterThanOrEqual(8);
  });

  it('keeps the aspect ratio when provided', () => {
    const out = resizeCrop(rect, 'se', 20, 0, bounds, 2);
    expect(out.width / out.height).toBeCloseTo(2, 5);
  });

  it("delegates the 'move' handle to moveCrop", () => {
    expect(resizeCrop(rect, 'move', 5, 5, bounds)).toEqual(moveCrop(rect, 5, 5, bounds));
  });
});
