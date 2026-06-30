import type { Annotation, TextAnnotation } from '../core/state/types';
import type { RasterImage } from '../core/raster/raster';
import { createRaster } from '../core/raster/raster';
import { toImageData } from './image-data';
import type { CanvasFactory } from './codec';

/**
 * Compositing of vector annotations (currently text) onto a raster.
 *
 * Text needs a shaping engine, so unlike the pure pipeline this lives on the
 * canvas side. The *geometry* (resolving normalised coordinates to pixels) is
 * pure and exported separately so it can be unit-tested without a canvas.
 */

export interface ResolvedText {
  text: string;
  x: number;
  y: number;
  fontPx: number;
  font: string;
  color: string;
  align: CanvasTextAlign;
}

/** Resolve a {@link TextAnnotation}'s normalised values to image pixels. */
export function resolveText(
  ann: TextAnnotation,
  size: { width: number; height: number },
): ResolvedText {
  const fontPx = Math.max(1, Math.round(ann.fontSize * size.height));
  const weight = ann.bold ? 'bold' : 'normal';
  const slant = ann.italic ? 'italic' : 'normal';
  return {
    text: ann.text,
    x: Math.round(ann.x * size.width),
    y: Math.round(ann.y * size.height),
    fontPx,
    font: `${slant} ${weight} ${fontPx}px ${ann.fontFamily}`,
    color: ann.color,
    align: ann.align,
  };
}

function isText(ann: Annotation): ann is TextAnnotation {
  return ann.type === 'text';
}

/**
 * Draw `annotations` over `raster`, returning a new raster. When there are no
 * annotations the input is returned untouched (no canvas work).
 */
export function compositeAnnotations(
  createCanvas: CanvasFactory,
  raster: RasterImage,
  annotations: readonly Annotation[],
): RasterImage {
  if (annotations.length === 0) return raster;

  const canvas = createCanvas(raster.width, raster.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire a 2D canvas context');

  ctx.putImageData(toImageData(raster), 0, 0);
  ctx.textBaseline = 'top';

  for (const ann of annotations) {
    if (!isText(ann)) continue;
    const r = resolveText(ann, raster);
    ctx.font = r.font;
    ctx.fillStyle = r.color;
    ctx.textAlign = r.align;
    drawWrapped(ctx, r);
  }

  const out = ctx.getImageData(0, 0, raster.width, raster.height);
  return createRaster(out.width, out.height, out.data);
}

/** Naive multi-line layout: split on `\n`, advance by 1.2× line height. */
function drawWrapped(ctx: CanvasRenderingContext2D, r: ResolvedText): void {
  const lines = r.text.split('\n');
  const lineHeight = r.fontPx * 1.2;
  lines.forEach((line, i) => ctx.fillText(line, r.x, r.y + i * lineHeight));
}
