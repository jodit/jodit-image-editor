import type { Design, EditorState, FinetuneState, FontOption } from './types';

/**
 * Web-safe fonts — present on effectively every OS/browser, so text renders the
 * same in the editor and the exported image without loading any web font.
 */
export const DEFAULT_FONTS: readonly FontOption[] = Object.freeze([
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
]);

/** The neutral finetune: every adjustment at its no-op value. */
export const IDENTITY_FINETUNE: Readonly<FinetuneState> = Object.freeze({
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  blur: 0,
});

/** Default colour swatches for the annotation colour picker. */
export const DEFAULT_PALETTE: readonly string[] = Object.freeze([
  '#ffffff',
  '#1a1a1a',
  '#9e9689',
  '#4a90e2',
  '#54b98a',
  '#f2c94c',
  '#eb5757',
  '#a29bfe',
  '#8b5cf6',
  '#f178b6',
  '#f2994a',
  '#b8e454',
  '#7ec8f0',
  '#5b6470',
  '#d8d2c8',
  '#eeeeee',
]);

/** The identity design — applying it returns the source untouched. */
export function createIdentityDesign(): Design {
  return {
    flip: { horizontal: false, vertical: false },
    rotate: 0,
    angle: 0,
    crop: null,
    resize: null,
    finetune: { ...IDENTITY_FINETUNE },
    filter: 'original',
    annotations: [],
    focus: null,
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
    showToolbar: true,
    locale: 'en',
    minCropSize: 8,
    minResizeSize: 1,
    palette: [...DEFAULT_PALETTE],
    fonts: DEFAULT_FONTS.map((f) => ({ ...f })),
    activePopover: null,
    viewport: null,
  };
}
