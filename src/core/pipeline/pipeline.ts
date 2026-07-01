import type { Design } from '../state/types';
import type { RasterImage } from '../raster/raster';
import { crop, flip, resize, rotate90, sampleRotatedRect } from '../operations/transform';
import { applyFinetune } from '../filters/adjustments';
import { applyFilter } from '../filters/filters';
import { selectiveBlur } from '../filters/focus';

/**
 * The pure rendering pipeline: `execute(raster, design) => raster`.
 *
 * It composes the individual operations in a fixed, well-defined order so the
 * same design always yields the same pixels — the property our tests lean on.
 *
 * Text/vector annotations are intentionally *not* handled here: they require a
 * text-shaping engine (canvas) and are composited by the impure image adapter
 * on top of this pipeline's output.
 */
export function execute(source: RasterImage, design: Design): RasterImage {
  let img = source;

  // 1. Orientation — mirror first, then quarter-turns.
  if (design.flip.horizontal) img = flip(img, 'horizontal');
  if (design.flip.vertical) img = flip(img, 'vertical');
  if (design.rotate !== 0) img = rotate90(img, design.rotate);

  // 2. Crop in the oriented coordinate space — with free-angle straightening
  //    when `angle` is set (the frame is rotated; we sample it back upright).
  if (design.angle !== 0) {
    const rect = design.crop ?? { x: 0, y: 0, width: img.width, height: img.height };
    img = sampleRotatedRect(img, rect, design.angle);
  } else if (design.crop) {
    img = crop(img, design.crop);
  }

  // 3. Explicit resize.
  if (design.resize) img = resize(img, design.resize);

  // 4. Tonal finetune, then 5. the colour filter.
  img = applyFinetune(img, design.finetune);
  img = applyFilter(img, design.filter);

  // 6. Selective ("tilt-shift") blur over the finished colours.
  if (design.focus) img = selectiveBlur(img, design.focus);

  return img;
}

/** Does this design change any pixels? Lets callers skip a no-op export. */
export function isIdentity(design: Design): boolean {
  return (
    !design.flip.horizontal &&
    !design.flip.vertical &&
    design.rotate === 0 &&
    design.angle === 0 &&
    design.crop === null &&
    design.resize === null &&
    design.filter === 'original' &&
    design.focus === null &&
    design.annotations.length === 0 &&
    design.finetune.brightness === 0 &&
    design.finetune.contrast === 0 &&
    design.finetune.saturation === 0 &&
    design.finetune.warmth === 0 &&
    design.finetune.blur === 0
  );
}
