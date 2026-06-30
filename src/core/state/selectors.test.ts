import { describe, expect, it } from 'vitest';
import { createInitialState } from './initial';
import { reduce } from './reducer';
import {
  selectCanRedo,
  selectCanUndo,
  selectDesign,
  selectEffectiveCrop,
  selectIsCropping,
  selectIsDirty,
  selectOrientedSize,
  selectOutputSize,
  selectPreviewDesign,
  selectViewportFit,
} from './selectors';

const withSource = () =>
  reduce(createInitialState(), {
    source: { width: 1600, height: 2000, name: 'lake.jpg', mimeType: 'image/jpeg' },
  });

describe('selectors', () => {
  it('selectDesign reads the present design', () => {
    const s = reduce(withSource(), { design: { rotate: 90 } });
    expect(selectDesign(s).rotate).toBe(90);
  });

  it('undo/redo availability', () => {
    const s0 = withSource();
    expect(selectCanUndo(s0)).toBe(false);
    const s1 = reduce(s0, { design: { rotate: 90 } });
    expect(selectCanUndo(s1)).toBe(true);
    const s2 = reduce(s1, { history: { step: -1 } });
    expect(selectCanRedo(s2)).toBe(true);
  });

  it('isDirty becomes true after an edit', () => {
    expect(selectIsDirty(withSource())).toBe(false);
    expect(selectIsDirty(reduce(withSource(), { design: { filter: 'sepia' } }))).toBe(true);
  });

  it('orientedSize swaps width/height for 90/270 rotations', () => {
    const s = reduce(withSource(), { design: { rotate: 90 } });
    expect(selectOrientedSize(s)).toEqual({ width: 2000, height: 1600 });
  });

  it('outputSize prefers explicit resize, then crop, then oriented size', () => {
    expect(selectOutputSize(withSource())).toEqual({ width: 1600, height: 2000 });
    const cropped = reduce(withSource(), {
      design: { crop: { x: 0, y: 0, width: 100, height: 50 } },
    });
    expect(selectOutputSize(cropped)).toEqual({ width: 100, height: 50 });
    const resized = reduce(withSource(), { design: { resize: { width: 10, height: 20 } } });
    expect(selectOutputSize(resized)).toEqual({ width: 10, height: 20 });
  });

  it('returns null sizes when there is no source', () => {
    expect(selectOrientedSize(createInitialState())).toBeNull();
  });

  it('rounds a fractional crop to whole output pixels', () => {
    const s = reduce(withSource(), {
      design: { crop: { x: 0, y: 0, width: 640.0789, height: 658.1359 } },
    });
    expect(selectOutputSize(s)).toEqual({ width: 640, height: 658 });
  });

  it('selectIsCropping is true only on the adjust/crop tool', () => {
    const s = reduce(withSource(), { activeTab: 'adjust', activeTool: 'crop' });
    expect(selectIsCropping(s)).toBe(true);
    expect(selectIsCropping(reduce(s, { activeTab: 'filters' }))).toBe(false);
  });

  it('selectPreviewDesign drops the crop while cropping', () => {
    let s = reduce(withSource(), { design: { crop: { x: 0, y: 0, width: 10, height: 10 } } });
    s = reduce(s, { activeTab: 'adjust', activeTool: 'crop' });
    expect(selectPreviewDesign(s).crop).toBeNull();
    s = reduce(s, { activeTab: 'filters' });
    expect(selectPreviewDesign(s).crop).not.toBeNull();
  });

  it('selectViewportFit returns null until viewport is measured', () => {
    expect(selectViewportFit(withSource())).toBeNull();
  });

  it('selectViewportFit maps content into the viewport with zoom', () => {
    let s = reduce(withSource(), { viewport: { width: 800, height: 1000 } });
    const fit = selectViewportFit(s)!;
    expect(fit.scale).toBeCloseTo(0.5); // 800/1600
    s = reduce(s, { zoom: 2 });
    expect(selectViewportFit(s)!.scale).toBeCloseTo(1);
  });

  it('selectEffectiveCrop falls back to the whole oriented image', () => {
    expect(selectEffectiveCrop(withSource())).toEqual({ x: 0, y: 0, width: 1600, height: 2000 });
    const cropped = reduce(withSource(), { design: { crop: { x: 1, y: 2, width: 3, height: 4 } } });
    expect(selectEffectiveCrop(cropped)).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });
});
