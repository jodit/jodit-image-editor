import type { RasterImage } from '../core/raster/raster';
import { createRaster } from '../core/raster/raster';
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
}

export interface ImageCodec {
  decode(blob: Blob): Promise<RasterImage>;
  encode(raster: RasterImage, options?: EncodeOptions): Promise<Blob>;
}

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
  constructor(private readonly createCanvas: CanvasFactory = defaultCanvasFactory) {}

  async decode(blob: Blob): Promise<RasterImage> {
    const bitmap = await this.toBitmap(blob);
    const canvas = this.createCanvas(bitmap.width, bitmap.height);
    const ctx = this.context(canvas);
    ctx.drawImage(bitmap, 0, 0);
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return createRaster(imageData.width, imageData.height, imageData.data);
  }

  async encode(raster: RasterImage, options: EncodeOptions = {}): Promise<Blob> {
    const { type = 'image/png', quality = 0.92 } = options;
    const canvas = this.createCanvas(raster.width, raster.height);
    const ctx = this.context(canvas);
    ctx.putImageData(toImageData(raster), 0, 0);
    return canvas.toBlobAsync(type, quality);
  }

  private context(canvas: CanvasLike): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to acquire a 2D canvas context');
    return ctx;
  }

  private async toBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob);
    }
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
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
