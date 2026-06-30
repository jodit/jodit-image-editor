import { Store } from '../core/store/store';
import type { Scheduler } from '../core/scheduler/scheduler';
import { createRafScheduler } from '../core/scheduler/scheduler';
import { createInitialState } from '../core/state/initial';
import type { EditorPatch, EditorState } from '../core/state/types';
import {
  selectDesign,
  selectIsDirty,
  selectOrientedSize,
  selectPreviewDesign,
  selectViewportFit,
} from '../core/state/selectors';
import { selectEffectiveCrop } from '../core/state/selectors';
import { resizeCrop } from '../core/geometry/crop-interaction';
import type { CropHandle } from '../core/geometry/crop-interaction';
import { resize as resizeRaster } from '../core/operations/transform';
import type { RasterImage } from '../core/raster/raster';
import { applyFilter, registerFilter } from '../core/filters/filters';
import { toImageData } from '../image/image-data';
import { LocaleRegistry } from '../core/i18n/registry';
import type { Locale, Translator } from '../core/i18n/i18n';

import { Renderer } from '../render/vdom/render';
import { DomHost } from '../render/vdom/host-dom';

import { ToolRegistry } from '../plugins/registry';
import type { EditorApi, EditorPlugin } from '../plugins/types';
import { createBuiltinTools } from '../plugins/builtin';

import type { EncodeOptions } from '../image/codec';
import type { ImageProcessor } from '../image/processor';
import { createDefaultProcessor } from '../image/processor';

import { renderApp } from '../ui/app';
import type { AppContext } from '../ui/app';
import { paintPreview } from '../ui/preview';

import '../ui/styles/editor.css';

export interface ImageEditorProps {
  /** Mount point — an element or a CSS selector. */
  container: string | HTMLElement;
  /** Optional initial image; equivalent to calling `fromBlob` after init. */
  image?: Blob;
  /** Overrides merged onto the initial state (e.g. `{ theme: 'dark' }`). */
  state?: Partial<EditorState>;
  /** Extensions applied at construction time. */
  plugins?: EditorPlugin[];
  /** Replace the built-in tool set entirely. */
  tools?: ReturnType<typeof createBuiltinTools>;
  /** Active locale id; `'en'` (default) needs no dictionary. */
  locale?: string;
  /** Dictionaries to register at construction (import from `@jodit/image-editor/locales/*`). */
  locales?: Locale[];
  /** Notification cadence; defaults to a requestAnimationFrame scheduler. */
  scheduler?: Scheduler;
  /** Custom image processor (codec/canvas). Defaults to the canvas codec. */
  processor?: ImageProcessor;
  /** Longest edge of the in-editor preview raster. Exports stay full-res. */
  previewMaxSize?: number;
  /** Called when the user presses Save (after `toBlob`). */
  onSave?: (blob: Blob, editor: ImageEditor) => void;
  /**
   * Confirmation gate for destructive actions (Reset). Injected for testability;
   * defaults to `window.confirm`. Return `true` to proceed.
   */
  confirm?: (message: string) => boolean;
}

/**
 * The public facade. It wires together the (pure) store, the (pure) view, the
 * reconciler, and the (impure) image processor, exposing the small documented
 * API: `state`, `update`, `fromBlob`, `toBlob`, `use`, `destroy`. Undo/redo are
 * not methods — they are history-navigation patches through `update`.
 */
export class ImageEditor {
  readonly store: Store;
  private readonly container: HTMLElement;
  private readonly renderer: Renderer<Node>;
  private readonly registry = new ToolRegistry();
  private readonly locales = new LocaleRegistry();
  private readonly processor: ImageProcessor;
  private readonly previewMaxSize: number;
  private readonly onSaveCb: ImageEditorProps['onSave'];
  private readonly confirm: (message: string) => boolean;

  private source: RasterImage | null = null;
  private previewSource: RasterImage | null = null;
  /** Tiny raster used to paint the filter strip thumbnails. */
  private thumbSource: RasterImage | null = null;
  /** Bumped on each image load so thumbnails repaint for the new picture. */
  private thumbVersion = 0;

  /** Memoised preview render — see {@link paint}. */
  private cachedRaster: RasterImage | null = null;
  private cachedRasterKey = '';
  private lastPaintKey = '';

  private readonly disposers: Array<() => void> = [];
  private resizeObserver: ResizeObserver | null = null;
  private observedWrap: Element | null = null;
  private dragCleanup: (() => void) | null = null;
  private destroyed = false;

  constructor(props: ImageEditorProps) {
    this.container = resolveContainer(props.container);
    this.processor = props.processor ?? createDefaultProcessor();
    this.previewMaxSize = props.previewMaxSize ?? 1600;
    this.onSaveCb = props.onSave;
    this.confirm =
      props.confirm ??
      ((message) => (typeof window !== 'undefined' ? window.confirm(message) : true));

    for (const locale of props.locales ?? []) this.locales.register(locale);

    this.store = new Store({
      scheduler: props.scheduler ?? createRafScheduler(),
      initialState: {
        ...createInitialState(),
        ...props.state,
        ...(props.locale ? { locale: props.locale } : {}),
      },
    });

    for (const tool of props.tools ?? createBuiltinTools()) this.registry.register(tool);
    for (const plugin of props.plugins ?? []) this.use(plugin);

    this.renderer = new Renderer<Node>(new DomHost(document), this.container);
    this.disposers.push(this.store.subscribe(() => this.render()));

    this.render();
    if (props.image) void this.fromBlob(props.image);
  }

  /** The current immutable state snapshot. */
  get state(): EditorState {
    return this.store.getState();
  }

  /** The one universal mutation entry point. Returns `this` for chaining. */
  update(patch: EditorPatch): this {
    this.store.update(patch);
    return this;
  }

  /** Apply an extension. Returns `this`. */
  use(plugin: EditorPlugin): this {
    const dispose = plugin.setup(this.api());
    if (typeof dispose === 'function') this.disposers.push(dispose);
    return this;
  }

  /** Load an image blob; resets the design and re-fits the preview. */
  async fromBlob(blob: Blob): Promise<this> {
    this.store.update({ status: 'loading', error: null });
    try {
      const raster = await this.processor.decode(blob);
      if (this.destroyed) return this;
      this.source = raster;
      this.previewSource = downscale(raster, this.previewMaxSize);
      this.thumbSource = downscale(raster, 160);
      this.thumbVersion++;
      this.store.update({
        source: {
          width: raster.width,
          height: raster.height,
          name: blob instanceof File ? blob.name : null,
          mimeType: blob.type || 'image/png',
        },
        resetDesign: true,
        status: 'ready',
      });
    } catch (error) {
      this.store.update({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return this;
  }

  /** Render the current design at full resolution and encode it to a blob. */
  async toBlob(options?: EncodeOptions): Promise<Blob> {
    if (!this.source) throw new Error('No image loaded — call fromBlob() first');
    this.store.update({ status: 'exporting' });
    try {
      return await this.processor.toBlob(this.source, selectDesign(this.store.getState()), options);
    } finally {
      this.store.update({ status: 'ready' });
    }
  }

  /** Tear down listeners, observers, and the rendered tree. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.dragCleanup?.();
    this.resizeObserver?.disconnect();
    for (const dispose of this.disposers.splice(0)) dispose();
    this.renderer.unmount();
    this.store.destroy();
  }

  // --- internals -----------------------------------------------------------

  private api(): EditorApi {
    return {
      registerTool: (tool) => this.registry.register(tool),
      registerFilter: (def) => registerFilter(def),
      registerLocale: (locale) => this.locales.register(locale),
      getState: () => this.store.getState(),
      update: (patch) => this.store.update(patch),
    };
  }

  /** Translator for the currently active locale. */
  private translator(): Translator {
    return this.locales.translator(this.store.getState().locale);
  }

  private appContext(): AppContext {
    return {
      update: (patch) => this.store.update(patch),
      tools: this.registry.list(),
      t: this.translator(),
      onSave: () => void this.handleSave(),
      onReset: () => this.handleReset(),
      beginCropDrag: (handle, event) => this.beginCropDrag(handle, event),
    };
  }

  /** Reset every edit, behind a confirmation prompt. */
  private handleReset(): void {
    if (!selectIsDirty(this.store.getState())) return;
    if (this.confirm(this.translator()('Reset all changes? You can still undo afterwards.'))) {
      this.store.update({ resetDesign: true });
    }
  }

  private render(): void {
    if (this.destroyed) return;
    this.renderer.render(renderApp(this.store.getState(), this.appContext()));
    this.ensureViewportObserver();
    this.paint();
    this.paintFilterThumbs();
  }

  private async handleSave(): Promise<void> {
    if (!this.source) return;
    const blob = await this.toBlob();
    this.onSaveCb?.(blob, this);
    this.container.dispatchEvent(new CustomEvent('jie:save', { detail: { blob }, bubbles: true }));
  }

  private ensureViewportObserver(): void {
    const wrap = this.container.querySelector('[data-jie-canvas-wrap]');
    if (!wrap || wrap === this.observedWrap) return;
    this.resizeObserver?.disconnect();
    this.observedWrap = wrap;
    if (typeof ResizeObserver === 'undefined') {
      this.measureViewport(wrap);
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.measureViewport(wrap));
    this.resizeObserver.observe(wrap);
    this.measureViewport(wrap);
  }

  private measureViewport(wrap: Element): void {
    const { clientWidth, clientHeight } = wrap;
    const current = this.store.getState().viewport;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    if (current && current.width === clientWidth && current.height === clientHeight) return;
    this.store.update({ viewport: { width: clientWidth, height: clientHeight } });
  }

  /**
   * Paint the preview canvas — with two layers of memoisation so dragging the
   * crop box never re-runs the (potentially expensive) filter pipeline:
   *
   *  1. The rendered raster is cached by the pixel-affecting design. While
   *     cropping, `selectPreviewDesign` drops the crop, so every pointer move
   *     yields the *same* key → the filter is computed once, not per frame.
   *  2. The canvas blit is skipped when neither the raster nor the viewport/fit
   *     changed. The crop overlay is plain DOM, so it keeps tracking the pointer
   *     smoothly regardless.
   */
  private paint(): void {
    const state = this.store.getState();
    const canvas = this.container.querySelector<HTMLCanvasElement>('[data-jie-canvas]');
    if (!canvas || !this.previewSource || !state.viewport) return;
    const fit = selectViewportFit(state);
    if (!fit) return;

    const design = selectPreviewDesign(state);
    const rasterKey = `${this.thumbVersion}:${JSON.stringify(design)}`;
    if (rasterKey !== this.cachedRasterKey || !this.cachedRaster) {
      this.cachedRaster = this.processor.render(this.previewSource, design);
      this.cachedRasterKey = rasterKey;
    }

    const paintKey = `${rasterKey}@${state.viewport.width}x${state.viewport.height}:${fit.scale}:${fit.offsetX},${fit.offsetY}`;
    if (paintKey === this.lastPaintKey) return; // nothing visual changed
    this.lastPaintKey = paintKey;
    paintPreview(canvas, this.cachedRaster, state.viewport, fit);
  }

  /**
   * Paint each filter-strip thumbnail with the live filtered image. Thumbnails
   * are keyed by `version:filterId` so they paint once per image (cheap) and
   * repaint when a new picture is loaded.
   */
  private paintFilterThumbs(): void {
    const thumb = this.thumbSource;
    if (!thumb) return;
    const canvases = this.container.querySelectorAll<HTMLCanvasElement>(
      'canvas[data-jie-filter-thumb]',
    );
    for (const canvas of canvases) {
      const id = canvas.dataset.jieFilterThumb;
      if (!id) continue;
      const key = `${this.thumbVersion}:${id}`;
      if (canvas.dataset.key === key) continue;
      const raster = applyFilter(thumb, id);
      canvas.width = raster.width;
      canvas.height = raster.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.putImageData(toImageData(raster), 0, 0);
      canvas.dataset.key = key;
    }
  }

  private beginCropDrag(handle: CropHandle, event: PointerEvent): void {
    const startState = this.store.getState();
    const fit = selectViewportFit(startState);
    const startCrop = selectEffectiveCrop(startState);
    const oriented = selectOrientedSize(startState);
    if (!fit || !startCrop || !oriented) return;

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    let committed = false;

    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - startX) / fit.scale;
      const dy = (e.clientY - startY) / fit.scale;
      const next = resizeCrop(startCrop, handle, dx, dy, oriented);
      this.store.update({ design: { crop: next }, commit: !committed });
      committed = true;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.dragCleanup = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    this.dragCleanup = onUp;
  }
}

function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof container !== 'string') return container;
  const el = document.querySelector<HTMLElement>(container);
  if (!el) throw new Error(`Container not found: ${container}`);
  return el;
}

/** Downscale a raster so its longest edge is at most `maxSize` (for previews). */
function downscale(raster: RasterImage, maxSize: number): RasterImage {
  const longest = Math.max(raster.width, raster.height);
  if (longest <= maxSize) return raster;
  const scale = maxSize / longest;
  return resizeRaster(raster, {
    width: Math.round(raster.width * scale),
    height: Math.round(raster.height * scale),
  });
}

/** Convenience factory mirroring the documented `init(props)` entry point. */
export function init(props: ImageEditorProps): ImageEditor {
  return new ImageEditor(props);
}
