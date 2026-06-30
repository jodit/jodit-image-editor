import type { RasterImage } from '../core/raster/raster';
import type { Size } from '../core/state/types';
import type { ViewportFit } from '../core/geometry/geometry';
import { toImageData } from '../image/image-data';

/**
 * Paints a processed raster onto the visible preview canvas.
 *
 * This is imperative, DOM-bound code by nature (canvas pixels live outside the
 * VNode tree), so it is deliberately tiny and isolated here rather than smeared
 * through the view. It honours device-pixel-ratio for crisp output and draws
 * the image at exactly the rectangle the crop overlay is positioned against.
 */
export function paintPreview(
  canvas: HTMLCanvasElement,
  raster: RasterImage,
  viewport: Size,
  fit: ViewportFit,
): void {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.max(1, Math.round(viewport.width * dpr));
  canvas.height = Math.max(1, Math.round(viewport.height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  const off = document.createElement('canvas');
  off.width = raster.width;
  off.height = raster.height;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;
  offCtx.putImageData(toImageData(raster), 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, fit.offsetX, fit.offsetY, fit.width, fit.height);
}
