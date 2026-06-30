/**
 * Jodit Image Editor — public API.
 *
 * The headline entry points are {@link ImageEditor} / {@link init}. Everything
 * else is exported so advanced hosts can compose the pure core (pipeline,
 * filters, store) or build plugins against the typed contracts.
 */

// --- main facade ----------------------------------------------------------
export { ImageEditor, init } from './editor/editor';
export type { ImageEditorProps } from './editor/editor';

// --- state contract -------------------------------------------------------
export type {
  Annotation,
  Design,
  EditorPatch,
  EditorState,
  EditorStatus,
  FilterId,
  FinetuneState,
  FlipState,
  Point,
  Rect,
  Size,
  SourceMeta,
  TabId,
  TextAnnotation,
  ThemeName,
} from './core/state/types';
export { createIdentityDesign, createInitialState } from './core/state/initial';
export * as selectors from './core/state/selectors';

// --- pure image core ------------------------------------------------------
export type { RasterImage } from './core/raster/raster';
export { createRaster, solidRaster, cloneRaster } from './core/raster/raster';
export { execute, isIdentity } from './core/pipeline/pipeline';
export { crop, flip, resize, rotate90, sampleRotatedRect } from './core/operations/transform';
export {
  cropCenter,
  moveCropFree,
  pointerAngle,
  resizeRotatedCrop,
  rotatedCorner,
} from './core/geometry/crop-rotate';
export {
  applyAspectRatio,
  centerRect,
  clamp,
  clampRectToBounds,
  fitInViewport,
  fitScale,
  lockedResize,
  roundRect,
} from './core/geometry/geometry';
export type { ViewportFit } from './core/geometry/geometry';
export { moveCrop, resizeCrop } from './core/geometry/crop-interaction';
export type { CropHandle } from './core/geometry/crop-interaction';
export {
  addAnnotation,
  createTextAnnotation,
  findAnnotation,
  removeAnnotation,
  updateAnnotation,
} from './core/annotations/operations';
export * as adjustments from './core/filters/adjustments';
export { applyFilter, getFilter, listFilters, registerFilter } from './core/filters/filters';
export type { FilterDefinition, FilterFn } from './core/filters/filters';

// --- reactivity & scheduling ----------------------------------------------
export { Store } from './core/store/store';
export type { Listener, StoreOptions, Unsubscribe } from './core/store/store';
export {
  CoalescingScheduler,
  SyncScheduler,
  createMicrotaskScheduler,
  createRafScheduler,
} from './core/scheduler/scheduler';
export type { Scheduler } from './core/scheduler/scheduler';

// --- rendering primitives (for custom UIs) --------------------------------
export { h, text } from './render/vdom/vnode';
export type { VNode, VProps } from './render/vdom/vnode';
export { Renderer } from './render/vdom/render';
export { DomHost } from './render/vdom/host-dom';
export { MemoryHost } from './render/vdom/memory-host';
export type { Host } from './render/vdom/host';

// --- i18n core (English-only; locales ship separately) --------------------
export { createTranslator, interpolate } from './core/i18n/i18n';
export type { Locale, Messages, TranslationParams, Translator } from './core/i18n/i18n';
export { LocaleRegistry } from './core/i18n/registry';

// --- extension API --------------------------------------------------------
export { ToolRegistry } from './plugins/registry';
export { createBuiltinTools } from './plugins/builtin';
export type { EditorApi, EditorPlugin, ToolContext, ToolDefinition } from './plugins/types';

// --- UI kit (build matching tool panels / custom UIs) ---------------------
export { button, icon, numberField, segmented, slider } from './ui/components/primitives';
export type {
  ButtonProps,
  NumberFieldProps,
  SegmentedOption,
  SliderProps,
} from './ui/components/primitives';
export { ICONS } from './ui/icons';
export type { IconName } from './ui/icons';
export { TOKENS } from './ui/tokens';
export { renderApp } from './ui/app';
export type { AppContext } from './ui/app';

// --- image I/O ------------------------------------------------------------
export { CanvasImageCodec, defaultCanvasFactory } from './image/codec';
export type { CanvasFactory, EncodeOptions, ImageCodec } from './image/codec';
export { ImageProcessor, createDefaultProcessor } from './image/processor';
