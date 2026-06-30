import type { Design, EditorState, Rect, Size } from './types';
import { canRedo, canUndo, present } from './history';
import { fitInViewport } from '../geometry/geometry';
import type { ViewportFit } from '../geometry/geometry';

/**
 * Derived, memo-free reads of state. Keeping these as standalone functions
 * (rather than methods) means the render layer never reaches into the history
 * structure directly and the rules stay testable in isolation.
 */

export function selectDesign(state: EditorState): Design {
  return present(state.history);
}

/** True while the user is actively framing a crop (handles are visible). */
export function selectIsCropping(state: EditorState): boolean {
  return state.activeTab === 'adjust' && state.activeTool === 'crop';
}

/**
 * The design used to paint the live preview. While cropping we drop the crop so
 * the full image is visible *under* the drag handles; otherwise it is the full
 * present design.
 */
export function selectPreviewDesign(state: EditorState): Design {
  const design = selectDesign(state);
  return selectIsCropping(state) ? { ...design, crop: null } : design;
}

export function selectCanUndo(state: EditorState): boolean {
  return canUndo(state.history);
}

export function selectCanRedo(state: EditorState): boolean {
  return canRedo(state.history);
}

/** Whether the present design differs from the identity (i.e. there are edits). */
export function selectIsDirty(state: EditorState): boolean {
  return state.history.index > 0 || state.history.entries.length > 1;
}

/**
 * The output dimensions the current design will produce, before any explicit
 * `resize`. Rotation by 90/270 swaps width and height; crop overrides both.
 */
export function selectOrientedSize(state: EditorState): Size | null {
  if (!state.source) return null;
  const design = selectDesign(state);
  const { width, height } = state.source;
  const swap = design.rotate === 90 || design.rotate === 270;
  return swap ? { width: height, height: width } : { width, height };
}

/**
 * Final output size in whole pixels: explicit resize > crop size > oriented
 * source size. The crop rect is fractional while dragging, so it is rounded
 * here — the exported image (and the dimensions readout) is always integer.
 */
export function selectOutputSize(state: EditorState): Size | null {
  const design = selectDesign(state);
  if (design.resize) return design.resize;
  if (design.crop) {
    return { width: Math.round(design.crop.width), height: Math.round(design.crop.height) };
  }
  return selectOrientedSize(state);
}

/** Size of the content currently shown in the preview canvas. */
export function selectPreviewContentSize(state: EditorState): Size | null {
  return selectIsCropping(state) ? selectOrientedSize(state) : selectOutputSize(state);
}

/**
 * How the preview content maps onto the measured viewport, including the manual
 * zoom factor. Shared by the canvas painter and the crop overlay so the handles
 * always sit exactly on the pixels they affect. `null` until both the source
 * and the viewport are known.
 */
export function selectViewportFit(state: EditorState): (ViewportFit & { content: Size }) | null {
  const content = selectPreviewContentSize(state);
  if (!content || !state.viewport) return null;
  const base = fitInViewport(content, state.viewport);
  const scale = base.scale * state.zoom;
  const width = content.width * scale;
  const height = content.height * scale;
  return {
    scale,
    width,
    height,
    offsetX: (state.viewport.width - width) / 2,
    offsetY: (state.viewport.height - height) / 2,
    content,
  };
}

/** The crop rect to display: the explicit crop, or the whole oriented image. */
export function selectEffectiveCrop(state: EditorState): Rect | null {
  const design = selectDesign(state);
  if (design.crop) return design.crop;
  const size = selectOrientedSize(state);
  return size ? { x: 0, y: 0, width: size.width, height: size.height } : null;
}
