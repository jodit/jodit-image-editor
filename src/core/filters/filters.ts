import type { FilterId, Loose } from '../state/types';
import type { RasterImage } from '../raster/raster';
import { CHANNELS, createRaster } from '../raster/raster';
import { contrast, saturation, warmth } from './adjustments';

/**
 * Named colour filters. Each is a pure `(raster) => raster`. They are exposed
 * through a small registry so plugins can add their own without touching this
 * file (Open/Closed).
 */
export type FilterFn = (img: RasterImage) => RasterImage;

export interface FilterDefinition {
  id: string;
  label: string;
  apply: FilterFn;
}

function perPixel(
  img: RasterImage,
  fn: (r: number, g: number, b: number) => [number, number, number],
): RasterImage {
  const out = createRaster(img.width, img.height, new Uint8ClampedArray(img.data));
  for (let i = 0; i < out.data.length; i += CHANNELS) {
    const [r, g, b] = fn(out.data[i]!, out.data[i + 1]!, out.data[i + 2]!);
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
  }
  return out;
}

export const original: FilterFn = (img) =>
  createRaster(img.width, img.height, new Uint8ClampedArray(img.data));

export const invert: FilterFn = (img) => perPixel(img, (r, g, b) => [255 - r, 255 - g, 255 - b]);

export const grayscale: FilterFn = (img) =>
  perPixel(img, (r, g, b) => {
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    return [l, l, l];
  });

export const sepia: FilterFn = (img) =>
  perPixel(img, (r, g, b) => [
    0.393 * r + 0.769 * g + 0.189 * b,
    0.349 * r + 0.686 * g + 0.168 * b,
    0.272 * r + 0.534 * g + 0.131 * b,
  ]);

/** Solarize: invert only the channels above the midpoint. */
export const solarize: FilterFn = (img) =>
  perPixel(img, (r, g, b) => [r < 128 ? r : 255 - r, g < 128 ? g : 255 - g, b < 128 ? b : 255 - b]);

/** Clarendon-ish: punchy contrast with a cool tint. */
export const clarendon: FilterFn = (img) => warmth(saturation(contrast(img, 20), 25), -10);

/** Gingham-ish: soft, faded, warm. */
export const gingham: FilterFn = (img) => warmth(saturation(contrast(img, -10), -15), 12);

const REGISTRY = new Map<string, FilterDefinition>();

/** Register (or override) a filter. Returns the editor's `unregister`. */
export function registerFilter(def: FilterDefinition): () => void {
  REGISTRY.set(def.id, def);
  return () => {
    if (REGISTRY.get(def.id) === def) REGISTRY.delete(def.id);
  };
}

export function getFilter(id: string): FilterDefinition | undefined {
  return REGISTRY.get(id);
}

export function listFilters(): FilterDefinition[] {
  return [...REGISTRY.values()];
}

/** Apply a filter by id; unknown ids fall back to the original. */
export function applyFilter(img: RasterImage, id: Loose<FilterId>): RasterImage {
  const def = REGISTRY.get(id);
  return def ? def.apply(img) : original(img);
}

// Built-ins are registered eagerly so the editor works out of the box.
const BUILT_INS: FilterDefinition[] = [
  { id: 'original', label: 'Original', apply: original },
  { id: 'invert', label: 'Invert', apply: invert },
  { id: 'grayscale', label: 'Black & White', apply: grayscale },
  { id: 'sepia', label: 'Sepia', apply: sepia },
  { id: 'solarize', label: 'Solarize', apply: solarize },
  { id: 'clarendon', label: 'Clarendon', apply: clarendon },
  { id: 'gingham', label: 'Gingham', apply: gingham },
];
BUILT_INS.forEach(registerFilter);
