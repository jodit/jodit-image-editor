/**
 * The single source of truth for the editor's shape.
 *
 * Everything in here is a plain, serialisable value — no DOM nodes, no class
 * instances, no functions. That is what lets `view = f(state)` hold and what
 * makes "any screen can be reached with `update`" literally true: a screen is
 * just a value of {@link EditorState}.
 */

/**
 * A string literal union that still accepts arbitrary strings (for
 * plugin-supplied ids) without collapsing the editor-provided autocomplete.
 */
export type Loose<T extends string> = T | (string & {});

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Axis-aligned rectangle, in source-image pixel coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlipState {
  horizontal: boolean;
  vertical: boolean;
}

/**
 * Finetune adjustments. Each is a *neutral-at-zero* slider so the identity
 * design produces a byte-for-byte copy of the source.
 */
export interface FinetuneState {
  /** -100..100, 0 = unchanged. */
  brightness: number;
  /** -100..100, 0 = unchanged. */
  contrast: number;
  /** -100..100, 0 = unchanged. */
  saturation: number;
  /** -100..100, negative = cooler, positive = warmer. */
  warmth: number;
  /** 0..100, 0 = no blur. */
  blur: number;
}

/** Built-in colour filters. The registry makes this open for extension. */
export type FilterId =
  'original' | 'invert' | 'grayscale' | 'sepia' | 'solarize' | 'clarendon' | 'gingham';

export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

export interface TextAnnotation {
  id: string;
  type: 'text';
  text: string;
  /** Anchor point, normalised 0..1 against the cropped image. */
  x: number;
  y: number;
  /** Font size as a fraction (0..1) of the image height — resolution independent. */
  fontSize: number;
  /** CSS font stack, e.g. `'Arial, Helvetica, sans-serif'`. */
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  /** Horizontal anchoring of the text at `x`. */
  align: HAlign;
  /** Vertical anchoring of the text at `y`. */
  valign: VAlign;
}

/** Discriminated union, intentionally open for plugin-defined annotations. */
export type Annotation = TextAnnotation;

/** A selectable font: a display `label` and the CSS font-family `value`. */
export interface FontOption {
  label: string;
  value: string;
}

/**
 * The *design* is the declarative description of every edit. It is the unit of
 * history (undo/redo). Rendering an image = applying a design to a raster.
 */
export interface Design {
  flip: FlipState;
  /** Orientation in degrees; always one of 0 | 90 | 180 | 270. */
  rotate: number;
  /**
   * Free rotation of the crop frame, in degrees (clockwise). Independent of the
   * orthogonal `rotate`. The export samples the rotated frame back to an upright
   * image, so `crop.width × crop.height` stays the output size.
   */
  angle: number;
  /** Crop window in the oriented (post-rotate/flip) coordinate space. */
  crop: Rect | null;
  /** Explicit output size; `null` means "derive from crop / source". */
  resize: Size | null;
  finetune: FinetuneState;
  /** Built-in or plugin-registered filter id. */
  filter: Loose<FilterId>;
  annotations: Annotation[];
  /** Selective ("tilt-shift") blur; `null` = whole image is sharp. */
  focus: Focus | null;
}

export type FocusShape = 'radial' | 'linear';

/** A selective-blur region: sharp inside, blurred outside. */
export interface Focus {
  shape: FocusShape;
  /** Centre, normalised 0..1. */
  x: number;
  y: number;
  /** Sharp-zone radius, as a fraction of the image's shorter side. */
  radius: number;
  /** Orientation of the sharp band, in degrees (linear only). */
  angle: number;
  /** Blur intensity, 0..100. */
  amount: number;
}

/**
 * A partial design edit. Unlike `Partial<Design>`, the nested `flip`/`finetune`
 * objects are themselves partial, so a caller can nudge a single slider.
 */
export type DesignPatch = Omit<Partial<Design>, 'flip' | 'finetune'> & {
  flip?: Partial<FlipState>;
  finetune?: Partial<FinetuneState>;
};

/** Linear undo/redo timeline. `index` points at the active entry. */
export interface HistoryState<T> {
  entries: T[];
  index: number;
}

export type TabId = Loose<'adjust' | 'finetune' | 'filters' | 'annotate' | 'resize'>;

export type ThemeName = 'light' | 'dark';

export interface SourceMeta {
  width: number;
  height: number;
  name: string | null;
  mimeType: string;
}

export type EditorStatus = 'idle' | 'loading' | 'ready' | 'exporting' | 'error';

/**
 * The complete editor state. Pure data; produced only by the reducer.
 */
export interface EditorState {
  source: SourceMeta | null;
  status: EditorStatus;
  error: string | null;
  activeTab: TabId;
  activeTool: string | null;
  /** 0..n, where 1 = 100%. */
  zoom: number;
  history: HistoryState<Design>;
  selectedAnnotationId: string | null;
  theme: ThemeName;
  /**
   * Show the built-in top toolbar (Save / size / zoom / undo-redo). Hide it
   * (`false`) to embed the editor chrome-less and drive those actions from your
   * own UI via `save()` / `saveAs()` / `update()`.
   */
  showToolbar: boolean;
  /** Active locale id. `'en'` (default) needs no dictionary. */
  locale: string;
  /** Smallest allowed crop frame size, in source pixels (per axis). */
  minCropSize: number;
  /** Smallest allowed output dimension in the Resize tool, in pixels. */
  minResizeSize: number;
  /** Colour swatches offered by the colour picker (CSS `#rgb`/`#rrggbb`). */
  palette: string[];
  /** Fonts offered by the text font selector (web-safe by default). */
  fonts: FontOption[];
  /** Id of the currently open popover (colour picker / font menu), or `null`. */
  activePopover: string | null;
  /** Measured size of the preview area, in CSS pixels. Ephemeral layout state. */
  viewport: Size | null;
}

/**
 * The one and only way to mutate the editor. `update(patch)` funnels through
 * the reducer. Undo/redo are *not* methods — they are expressed as a history
 * navigation patch, keeping the API surface minimal and the timeline in-state.
 */
export interface EditorPatch {
  activeTab?: TabId;
  activeTool?: string | null;
  zoom?: number;
  theme?: ThemeName;
  showToolbar?: boolean;
  locale?: string;
  minCropSize?: number;
  minResizeSize?: number;
  palette?: string[];
  fonts?: FontOption[];
  activePopover?: string | null;
  selectedAnnotationId?: string | null;
  status?: EditorStatus;
  error?: string | null;
  source?: SourceMeta | null;
  viewport?: Size | null;
  /** A design edit. Merged into the present design and pushed onto history. */
  design?: DesignPatch;
  /**
   * How a `design` edit affects history. `true` (default) pushes a new entry;
   * `false` *replaces* the current entry — used during a drag so a gesture
   * yields one undo step instead of hundreds.
   */
  commit?: boolean;
  /**
   * History navigation. `{ index }` jumps to an absolute entry; `{ step }`
   * moves relative (`-1` = undo, `+1` = redo). Either is clamped to range.
   */
  history?: { index: number } | { step: number };
  /** Reset the *design* back to identity as a new, undoable history step. */
  resetDesign?: boolean;
  /** Clear history entirely to a single identity entry (used when loading a new image). */
  resetHistory?: boolean;
}
