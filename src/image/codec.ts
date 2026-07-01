import type { RasterImage } from '../core/raster/raster';
import { createRaster } from '../core/raster/raster';
import { flattenOnBackground, parseHexColor } from '../core/raster/composite';
import { fitWithinLimits } from '../core/geometry/geometry';
import { toImageData } from './image-data';

/**
 * The blob ⇄ raster boundary.
 *
 * This is the *only* module that decodes/encodes pixels through a canvas. Keep
 * it thin: it converts between the editor's pure {@link RasterImage} and the
 * platform image APIs, nothing more. Everything else operates on rasters.
 */
export interface EncodeOptions {
  /** Output MIME type, e.g. `image/png`, `image/jpeg`, `image/webp`. */
  type?: string;
  /** 0..1 quality for lossy formats. */
  quality?: number;
  /**
   * Background colour (`#rgb` / `#rrggbb`) painted under the image before
   * encoding. Applied automatically for alpha-less formats (JPEG/BMP, default
   * white) so transparency doesn't turn black; pass it explicitly to flatten
   * any format.
   */
  background?: string;
}

export interface ImageCodec {
  decode(blob: Blob): Promise<RasterImage>;
  encode(raster: RasterImage, options?: EncodeOptions): Promise<Blob>;
}

/** Canvas ceilings to keep decoded images within (guards iOS Safari etc.). */
export interface CanvasLimits {
  /** Max single edge, in pixels. */
  maxSize?: number;
  /** Max total pixels (w × h). Default ~16.7 Mpx — the common iOS Safari cap. */
  maxPixels?: number;
}

const ALPHALESS = /image\/(jpe?g|bmp)/i;

/** Factory for a 2D canvas — overridable so non-DOM hosts can plug in. */
export type CanvasFactory = (width: number, height: number) => CanvasLike;

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
  toBlobAsync(type: string, quality: number): Promise<Blob>;
}

export function defaultCanvasFactory(width: number, height: number): CanvasLike {
  if (typeof document === 'undefined') {
    throw new Error('No DOM available: provide a CanvasFactory to the codec');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return {
    get width() {
      return canvas.width;
    },
    set width(v: number) {
      canvas.width = v;
    },
    get height() {
      return canvas.height;
    },
    set height(v: number) {
      canvas.height = v;
    },
    getContext: (t) => canvas.getContext(t),
    toBlobAsync: (type, quality) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
          type,
          quality,
        );
      }),
  };
}

/**
 * Canvas-backed codec. Decodes via `createImageBitmap` (with an `<img>`
 * fallback) and encodes via `toBlob`.
 */
export class CanvasImageCodec implements ImageCodec {
  private readonly maxPixels: number;
  private readonly maxSize?: number;

  constructor(
    private readonly createCanvas: CanvasFactory = defaultCanvasFactory,
    limits: CanvasLimits = {},
  ) {
    this.maxPixels = limits.maxPixels ?? 16_777_216;
    this.maxSize = limits.maxSize;
  }

  async decode(blob: Blob): Promise<RasterImage> {
    const bitmap = await this.toBitmap(blob);
    // Fit within canvas limits so huge photos don't silently black out (iOS).
    const scale = fitWithinLimits(bitmap.width, bitmap.height, {
      maxSize: this.maxSize,
      maxPixels: this.maxPixels,
    });
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = this.createCanvas(w, h);
    const ctx = this.context(canvas);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
    const imageData = ctx.getImageData(0, 0, w, h);
    return createRaster(imageData.width, imageData.height, imageData.data);
  }

  async encode(raster: RasterImage, options: EncodeOptions = {}): Promise<Blob> {
    const { type = 'image/png', quality = 0.92, background } = options;
    // Flatten alpha onto a background for formats that can't store it.
    const flat =
      background !== undefined || ALPHALESS.test(type)
        ? flattenOnBackground(raster, parseHexColor(background ?? '#ffffff'))
        : raster;
    const canvas = this.createCanvas(flat.width, flat.height);
    const ctx = this.context(canvas);
    ctx.putImageData(toImageData(flat), 0, 0);
    return canvas.toBlobAsync(type, quality);
  }

  private context(canvas: CanvasLike): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to acquire a 2D canvas context');
    return ctx;
  }

  private async toBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === 'function') {
      // `imageOrientation: 'from-image'` applies the EXIF orientation tag, so
      // photos shot on phones (portrait/landscape) decode upright instead of
      // sideways. Without it, `createImageBitmap` defaults to 'none'.
      return createImageBitmap(blob, { imageOrientation: 'from-image' });
    }
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      // Modern browsers honour EXIF for <img> drawImage by default
      // (image-orientation: from-image); set it explicitly for older ones.
      img.style.imageOrientation = 'from-image';
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to decode image blob'));
      };
      img.src = url;
    });
  }
}
