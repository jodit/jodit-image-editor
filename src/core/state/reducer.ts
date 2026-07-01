import type { Design, DesignPatch, EditorPatch, EditorState } from './types';
import { createIdentityDesign } from './initial';
import { commit, goTo, present, replacePresent, step } from './history';

/**
 * The pure reducer: `(state, patch) => state`.
 *
 * It is the single place where state transitions are defined, which is why it
 * is deterministic and free of side effects (no I/O, no ids, no clocks). The
 * Store wraps it with reactivity; tests exercise it directly.
 */
export function reduce(state: EditorState, patch: EditorPatch): EditorState {
  let next = state;

  // --- ephemeral UI fields (not part of history) ---------------------------
  if (patch.activeTab !== undefined) next = set(next, { activeTab: patch.activeTab });
  if (patch.activeTool !== undefined) next = set(next, { activeTool: patch.activeTool });
  if (patch.zoom !== undefined) next = set(next, { zoom: sanitizeZoom(patch.zoom) });
  if (patch.theme !== undefined) next = set(next, { theme: patch.theme });
  if (patch.showToolbar !== undefined) {
    next = set(next, { showToolbar: patch.showToolbar });
  }
  if (patch.locale !== undefined) next = set(next, { locale: patch.locale });
  if (patch.minCropSize !== undefined) {
    next = set(next, { minCropSize: Math.max(1, patch.minCropSize) });
  }
  if (patch.minResizeSize !== undefined) {
    next = set(next, { minResizeSize: Math.max(1, patch.minResizeSize) });
  }
  if (patch.status !== undefined) next = set(next, { status: patch.status });
  if (patch.error !== undefined) next = set(next, { error: patch.error });
  if (patch.source !== undefined) next = set(next, { source: patch.source });
  if (patch.viewport !== undefined) next = set(next, { viewport: patch.viewport });
  if (patch.selectedAnnotationId !== undefined) {
    next = set(next, { selectedAnnotationId: patch.selectedAnnotationId });
  }

  // --- design edits (recorded in history) ----------------------------------
  if (patch.resetHistory) {
    next = set(next, { history: { entries: [createIdentityDesign()], index: 0 } });
  }
  if (patch.resetDesign) {
    next = set(next, { history: commit(next.history, createIdentityDesign()) });
  }
  if (patch.design !== undefined) {
    const merged = mergeDesign(present(next.history), patch.design);
    const history =
      patch.commit === false ? replacePresent(next.history, merged) : commit(next.history, merged);
    next = set(next, { history });
  }

  // --- history navigation (undo/redo) --------------------------------------
  if (patch.history !== undefined) {
    const nav = patch.history;
    const history = 'step' in nav ? step(next.history, nav.step) : goTo(next.history, nav.index);
    next = set(next, { history });
  }

  return next;
}

/**
 * Merge a partial design into the present one. Nested objects (`flip`,
 * `finetune`) are shallow-merged so callers can tweak a single slider; arrays
 * and primitives are replaced wholesale.
 */
export function mergeDesign(base: Design, patch: DesignPatch): Design {
  return {
    ...base,
    ...patch,
    flip: patch.flip ? { ...base.flip, ...patch.flip } : base.flip,
    finetune: patch.finetune ? { ...base.finetune, ...patch.finetune } : base.finetune,
    rotate: patch.rotate !== undefined ? normalizeRotation(patch.rotate) : base.rotate,
  };
}

/** Snap any angle to the canonical 0 | 90 | 180 | 270. */
export function normalizeRotation(deg: number): number {
  return (((Math.round(deg / 90) * 90) % 360) + 360) % 360;
}

function sanitizeZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.min(Math.max(zoom, 0.01), 64);
}

/** Apply a shallow patch, returning the same reference when nothing changes. */
function set(state: EditorState, partial: Partial<EditorState>): EditorState {
  for (const key of Object.keys(partial) as (keyof EditorState)[]) {
    if (state[key] !== partial[key]) {
      return { ...state, ...partial };
    }
  }
  return state;
}
