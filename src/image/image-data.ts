import type { RasterImage } from '../core/raster/raster';

/**
 * Bridge a {@link RasterImage} to a DOM `ImageData`.
 *
 * Centralised so the (single) buffer-type assertion lives in one place: our
 * pixel buffer is always `ArrayBuffer`-backed, which `ImageData` requires, but
 * the lib's generic cannot prove it across versions.
 */
export function toImageData(raster: RasterImage): ImageData {
  return new ImageData(raster.data, raster.width, raster.height);
}
