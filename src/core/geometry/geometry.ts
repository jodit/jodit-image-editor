import type { Rect, Size } from '../state/types';

/**
 * Pure geometry: rectangles, aspect ratios, fit/zoom math. No pixels, no DOM —
 * just numbers, so cropping logic and "fit image to viewport" can be reasoned
 * about and tested independently of rendering.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round a rect to integer pixels (canvas works in whole pixels). */
export function roundRect(rect: Rect): Rect {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  return {
    x,
    y,
    width: Math.round(rect.x + rect.width) - x,
    height: Math.round(rect.y + rect.height) - y,
  };
}

/**
 * Constrain a crop rect to sit fully inside `bounds`, never collapsing below
 * 1×1. The position is nudged before the size is trimmed, mirroring how a drag
 * should behave at the edges.
 */
export function clampRectToBounds(rect: Rect, bounds: Size): Rect {
  const width = clamp(rect.width, 1, bounds.width);
  const height = clamp(rect.height, 1, bounds.height);
  const x = clamp(rect.x, 0, bounds.width - width);
  const y = clamp(rect.y, 0, bounds.height - height);
  return { x, y, width, height };
}

/**
 * Resize `rect` to honour `ratio` (width / height), keeping its centre fixed.
 * `null` ratio means "free" and returns the rect unchanged.
 */
export function applyAspectRatio(rect: Rect, ratio: number | null): Rect {
  if (ratio === null || !Number.isFinite(ratio) || ratio <= 0) return rect;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const area = rect.width * rect.height;
  const height = Math.sqrt(area / ratio);
  const width = height * ratio;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/**
 * Scale a size to fit inside `container` while preserving its aspect ratio.
 * Never upscales past 1:1 when `allowUpscale` is false.
 */
export function fitScale(content: Size, container: Size, allowUpscale = true): number {
  const scale = Math.min(container.width / content.width, container.height / content.height);
  return allowUpscale ? scale : Math.min(scale, 1);
}

/** Maintain aspect ratio when one dimension changes (the linked-resize case). */
export function lockedResize(source: Size, next: Partial<Size>, locked: boolean): Size {
  const ratio = source.width / source.height;
  if (!locked) {
    return {
      width: Math.max(1, Math.round(next.width ?? source.width)),
      height: Math.max(1, Math.round(next.height ?? source.height)),
    };
  }
  if (next.width !== undefined) {
    const width = Math.max(1, Math.round(next.width));
    return { width, height: Math.max(1, Math.round(width / ratio)) };
  }
  if (next.height !== undefined) {
    const height = Math.max(1, Math.round(next.height));
    return { width: Math.max(1, Math.round(height * ratio)), height };
  }
  return { ...source };
}

export interface ViewportFit {
  scale: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Place `content` centred inside `container` with "contain" scaling. Returns
 * the scale and the offset of the painted rectangle — the bridge between image
 * pixels and on-screen pixels used by the crop overlay.
 */
export function fitInViewport(content: Size, container: Size): ViewportFit {
  const scale = Math.min(container.width / content.width, container.height / content.height) || 0;
  const width = content.width * scale;
  const height = content.height * scale;
  return {
    scale,
    width,
    height,
    offsetX: (container.width - width) / 2,
    offsetY: (container.height - height) / 2,
  };
}

/** Centre a rect of `size` within `bounds`. */
export function centerRect(size: Size, bounds: Size): Rect {
  return {
    x: (bounds.width - size.width) / 2,
    y: (bounds.height - size.height) / 2,
    width: size.width,
    height: size.height,
  };
}
