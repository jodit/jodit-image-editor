import { describe, expect, it } from 'vitest';
import {
  cropCenter,
  moveCropFree,
  pointerAngle,
  resizeRotatedCrop,
  rotatedCorner,
} from './crop-rotate';

const rect = { x: 0, y: 0, width: 10, height: 10 };

describe('cropCenter', () => {
  it('is the rect centre', () => {
    expect(cropCenter(rect)).toEqual({ x: 5, y: 5 });
  });
});

describe('pointerAngle', () => {
  it('measures clockwise degrees from a centre', () => {
    expect(pointerAngle(0, 0, 1, 0)).toBeCloseTo(0);
    expect(pointerAngle(0, 0, 0, 1)).toBeCloseTo(90); // y-down → clockwise
    expect(pointerAngle(0, 0, -1, 0)).toBeCloseTo(180);
  });
});

describe('rotatedCorner', () => {
  it('returns the plain corners at angle 0', () => {
    expect(rotatedCorner(rect, 0, -1, -1)).toEqual({ x: 0, y: 0 }); // nw
    expect(rotatedCorner(rect, 0, 1, 1)).toEqual({ x: 10, y: 10 }); // se
  });

  it('rotates corners clockwise about the centre', () => {
    const nw = rotatedCorner(rect, 90, -1, -1);
    expect(nw.x).toBeCloseTo(10);
    expect(nw.y).toBeCloseTo(0);
  });
});

describe('moveCropFree', () => {
  it('translates without clamping', () => {
    expect(moveCropFree(rect, -5, 3)).toEqual({ x: -5, y: 3, width: 10, height: 10 });
  });
});

describe('resizeRotatedCrop', () => {
  it('at angle 0 grows from the dragged corner, pinning the opposite one', () => {
    const out = resizeRotatedCrop(rect, 0, 'se', 2, 4);
    expect(out).toEqual({ x: 0, y: 0, width: 12, height: 14 });
  });

  it('keeps the angle and respects the default minimum size', () => {
    const out = resizeRotatedCrop(rect, 30, 'se', -1000, -1000);
    expect(out.width).toBeGreaterThanOrEqual(8);
    expect(out.height).toBeGreaterThanOrEqual(8);
  });

  it('honours a custom minimum size', () => {
    // a 10×10 frame with no drag would stay 10×10, but min 25 floors both axes
    const out = resizeRotatedCrop(rect, 30, 'se', 0, 0, 25);
    expect(out.width).toBeCloseTo(25);
    expect(out.height).toBeCloseTo(25);
  });

  it("delegates the 'move' handle to moveCropFree", () => {
    expect(resizeRotatedCrop(rect, 45, 'move', 5, 6)).toEqual(moveCropFree(rect, 5, 6));
  });
});
