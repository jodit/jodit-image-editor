/**
 * `RasterImage` — a DOM-free, canvas-free pixel buffer.
 *
 * This is the currency of the whole image core. By depending on a plain
 * `Uint8ClampedArray` instead of `ImageData`/`Canvas`, every operation and
 * filter becomes a pure function that runs (and is tested) in Node without a
 * browser. The canvas adapter is the only code that converts to/from the DOM.
 */
/** RGBA pixel buffer backed by a plain `ArrayBuffer` (matches `ImageData`). */
export type PixelData = Uint8ClampedArray<ArrayBuffer>;

export interface RasterImage {
  readonly width: number;
  readonly height: number;
  /** RGBA, row-major, length === width * height * 4. */
  readonly data: PixelData;
}

export const CHANNELS = 4;

/** Create a raster, optionally backed by existing pixel data. */
export function createRaster(width: number, height: number, data?: PixelData): RasterImage {
  assertPositiveInt(width, 'width');
  assertPositiveInt(height, 'height');
  const expected = width * height * CHANNELS;
  if (data && data.length !== expected) {
    throw new RangeError(
      `data length ${data.length} does not match ${width}x${height} (${expected})`,
    );
  }
  return { width, height, data: data ?? new Uint8ClampedArray(expected) };
}

/** A solid-colour raster — handy for tests and default backgrounds. */
export function solidRaster(
  width: number,
  height: number,
  [r, g, b, a]: readonly [number, number, number, number],
): RasterImage {
  const img = createRaster(width, height);
  for (let i = 0; i < img.data.length; i += CHANNELS) {
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = a;
  }
  return img;
}

/** Deep copy — operations stay pure by never mutating their input. */
export function cloneRaster(img: RasterImage): RasterImage {
  return createRaster(img.width, img.height, new Uint8ClampedArray(img.data));
}

/** Byte offset of pixel (x, y). Assumes in-bounds coordinates. */
export function indexOf(img: RasterImage, x: number, y: number): number {
  return (y * img.width + x) * CHANNELS;
}

/** Read a pixel as an `[r, g, b, a]` tuple. */
export function getPixel(img: RasterImage, x: number, y: number): [number, number, number, number] {
  const i = indexOf(img, x, y);
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}

function assertPositiveInt(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}
