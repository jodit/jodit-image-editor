import type { Design, EditorState, FinetuneState } from './types';

/** The neutral finetune: every adjustment at its no-op value. */
export const IDENTITY_FINETUNE: Readonly<FinetuneState> = Object.freeze({
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  blur: 0,
});

/** The identity design — applying it returns the source untouched. */
export function createIdentityDesign(): Design {
  return {
    flip: { horizontal: false, vertical: false },
    rotate: 0,
    crop: null,
    resize: null,
    finetune: { ...IDENTITY_FINETUNE },
    filter: 'original',
    annotations: [],
  };
}

/** A fresh editor state with a single (identity) history entry. */
export function createInitialState(): EditorState {
  return {
    source: null,
    status: 'idle',
    error: null,
    activeTab: 'adjust',
    activeTool: 'crop',
    zoom: 1,
    history: { entries: [createIdentityDesign()], index: 0 },
    selectedAnnotationId: null,
    theme: 'light',
    locale: 'en',
    viewport: null,
  };
}
