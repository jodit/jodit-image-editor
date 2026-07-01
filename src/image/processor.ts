import type { Design } from '../core/state/types';
import type { RasterImage } from '../core/raster/raster';
import { execute } from '../core/pipeline/pipeline';
import type { CanvasFactory, CanvasLimits, EncodeOptions, ImageCodec } from './codec';
import { CanvasImageCodec, defaultCanvasFactory } from './codec';
import { compositeAnnotations } from './annotate';

/**
 * Orchestrates the full image lifecycle by composing the pure pipeline with the
 * impure codec/annotation steps. It owns no state — give it a source raster and
 * a design and it produces pixels or a blob.
 */
export class ImageProcessor {
  private readonly codec: ImageCodec;
  private readonly createCanvas: CanvasFactory;

  constructor(deps: { codec: ImageCodec; createCanvas: CanvasFactory }) {
    this.codec = deps.codec;
    this.createCanvas = deps.createCanvas;
  }

  /** Decode a blob into the editor's working raster. */
  decode(blob: Blob): Promise<RasterImage> {
    return this.codec.decode(blob);
  }

  /** Apply a full design: pure pipeline first, then annotation compositing. */
  render(source: RasterImage, design: Design): RasterImage {
    const pixels = execute(source, design);
    return compositeAnnotations(this.createCanvas, pixels, design.annotations);
  }

  /** Render a design and encode the result to a blob. */
  async toBlob(source: RasterImage, design: Design, options?: EncodeOptions): Promise<Blob> {
    return this.codec.encode(this.render(source, design), options);
  }
}

/**
 * Convenience factory using the default canvas-backed codec. Tests and headless
 * environments can build an {@link ImageProcessor} with their own canvas instead.
 */
export function createDefaultProcessor(
  createCanvas: CanvasFactory = defaultCanvasFactory,
  limits?: CanvasLimits,
): ImageProcessor {
  return new ImageProcessor({ codec: new CanvasImageCodec(createCanvas, limits), createCanvas });
}
