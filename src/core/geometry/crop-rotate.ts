import type { Point, Rect } from '../state/types';
import type { CropHandle } from './crop-interaction';

/**
 * Pure math for a *rotated* crop frame. The frame is a `Rect` footprint plus a
 * clockwise `angle` (degrees) about the footprint's centre. As with the
 * axis-aligned helpers, the component layer only feeds pointer deltas (in source
 * pixels) and renders the result — every bit of geometry lives (and is tested)
 * here.
 */
const MIN = 8;
const DEG = Math.PI / 180;

const SIGNS: Record<Exclude<CropHandle, 'move'>, readonly [number, number]> = {
  nw: [-1, -1],
  ne: [1, -1],
  sw: [-1, 1],
  se: [1, 1],
};

export function cropCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Position of a corner of the rotated frame, in source coordinates. */
export function rotatedCorner(rect: Rect, angleDeg: number, sx: number, sy: number): Point {
  const c = cropCenter(rect);
  const a = angleDeg * DEG;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const hx = (sx * rect.width) / 2;
  const hy = (sy * rect.height) / 2;
  return { x: c.x + hx * cos - hy * sin, y: c.y + hx * sin + hy * cos };
}

/** Signed clockwise angle (degrees) from `(cx, cy)` to `(px, py)`. */
export function pointerAngle(cx: number, cy: number, px: number, py: number): number {
  return Math.atan2(py - cy, px - cx) / DEG;
}

/** Translate the frame by a source-space delta (rotation-agnostic). */
export function moveCropFree(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

/**
 * Resize a rotated frame by dragging `handle` by `(dx, dy)` in source pixels.
 * The opposite corner stays pinned in source space; the new footprint is the
 * dragged diagonal projected onto the frame's local axes, so the angle is kept.
 */
export function resizeRotatedCrop(
  rect: Rect,
  angleDeg: number,
  handle: CropHandle,
  dx: number,
  dy: number,
): Rect {
  if (handle === 'move') return moveCropFree(rect, dx, dy);

  const [sx, sy] = SIGNS[handle];
  const dragged = rotatedCorner(rect, angleDeg, sx, sy);
  const fixed = rotatedCorner(rect, angleDeg, -sx, -sy);
  const nd = { x: dragged.x + dx, y: dragged.y + dy };

  const cx = (nd.x + fixed.x) / 2;
  const cy = (nd.y + fixed.y) / 2;

  const a = angleDeg * DEG;
  const ux = Math.cos(a);
  const uy = Math.sin(a); // local width axis
  const diffx = nd.x - fixed.x;
  const diffy = nd.y - fixed.y;

  const width = Math.max(MIN, Math.abs(diffx * ux + diffy * uy));
  const height = Math.max(MIN, Math.abs(diffx * -uy + diffy * ux));

  return { x: cx - width / 2, y: cy - height / 2, width, height };
}
