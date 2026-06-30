import type { Rect, Size } from '../state/types';
import { clamp, clampRectToBounds } from './geometry';

/**
 * Pure math for interactive cropping. The component layer only converts pointer
 * pixels into `(dx, dy)` deltas and renders the result — all the geometry that
 * decides where the box ends up lives (and is tested) here.
 */
export type CropHandle = 'nw' | 'ne' | 'sw' | 'se' | 'move';

/** Default minimum crop size (source px) when no explicit limit is given. */
export const DEFAULT_MIN_CROP = 8;

/** Translate the crop rect by a delta, clamped inside `bounds`. */
export function moveCrop(rect: Rect, dx: number, dy: number, bounds: Size): Rect {
  return clampRectToBounds({ ...rect, x: rect.x + dx, y: rect.y + dy }, bounds);
}

/**
 * Resize the crop rect by dragging `handle` by `(dx, dy)`. The opposite corner
 * stays anchored; `ratio` (width/height) is honoured when provided; the box
 * never shrinks below `min` (source px) on either axis.
 */
export function resizeCrop(
  rect: Rect,
  handle: CropHandle,
  dx: number,
  dy: number,
  bounds: Size,
  ratio: number | null = null,
  min: number = DEFAULT_MIN_CROP,
): Rect {
  if (handle === 'move') return moveCrop(rect, dx, dy, bounds);

  const left = handle === 'nw' || handle === 'sw';
  const top = handle === 'nw' || handle === 'ne';

  let { x, y, width, height } = rect;
  if (left) {
    const nx = clamp(x + dx, 0, x + width - min);
    width += x - nx;
    x = nx;
  } else {
    width = clamp(width + dx, min, bounds.width - x);
  }
  if (top) {
    const ny = clamp(y + dy, 0, y + height - min);
    height += y - ny;
    y = ny;
  } else {
    height = clamp(height + dy, min, bounds.height - y);
  }

  let next: Rect = { x, y, width, height };
  if (ratio !== null && ratio > 0) next = enforceRatio(next, handle, ratio);
  return clampRectToBounds(next, bounds);
}

/** Re-derive height from width for the dragged ratio, anchored at the fixed corner. */
function enforceRatio(rect: Rect, handle: CropHandle, ratio: number): Rect {
  const height = rect.width / ratio;
  const anchorTop = handle === 'sw' || handle === 'se';
  const y = anchorTop ? rect.y : rect.y + rect.height - height;
  return { ...rect, height, y };
}
