import type { VNode } from '../render/vdom/vnode';
import { h } from '../render/vdom/vnode';
import { button, icon } from './components/primitives';
import { ICONS } from './icons';
import type { CropHandle } from '../core/geometry/crop-interaction';
import type { EditorPatch, EditorState } from '../core/state/types';
import type { ToolDefinition } from '../plugins/types';
import {
  selectCanRedo,
  selectCanUndo,
  selectEffectiveCrop,
  selectIsCropping,
  selectIsDirty,
  selectOutputSize,
  selectViewportFit,
} from '../core/state/selectors';

/**
 * The root view: a single pure function of state (+ a few intent callbacks the
 * editor injects for things a VNode cannot express on its own — saving and
 * pointer-driven crop dragging). Composing it from the tool registry keeps the
 * shell agnostic to which features exist.
 */
export interface AppContext {
  update: (patch: EditorPatch) => void;
  tools: ToolDefinition[];
  onSave: () => void;
  /** Reset all edits — the editor asks for confirmation before applying. */
  onReset: () => void;
  beginCropDrag: (handle: CropHandle, event: PointerEvent) => void;
}

export function renderApp(state: EditorState, ctx: AppContext): VNode {
  return h('div', { class: 'jie', 'data-theme': state.theme }, [
    renderTopBar(state, ctx),
    h('div', { class: 'jie-body' }, [renderRail(state, ctx), renderStage(state, ctx)]),
  ]);
}

function renderTopBar(state: EditorState, ctx: AppContext): VNode {
  const size = selectOutputSize(state);
  const fit = selectViewportFit(state);
  const percent = fit ? Math.round(fit.scale * 100) : Math.round(state.zoom * 100);

  return h('header', { class: 'jie-topbar' }, [
    button({
      label: 'Save',
      variant: 'primary',
      onClick: () => ctx.onSave(),
      disabled: !state.source,
    }),
    h('div', { class: 'jie-topbar__meta' }, [
      size ? h('span', {}, `${size.width} x ${size.height} px`) : null,
      icon(ICONS.book),
      h('div', { class: 'jie-zoom' }, [
        button({
          variant: 'icon',
          icon: ICONS.minus,
          title: 'Zoom out',
          onClick: () => zoom(ctx, state, 1 / 1.2),
        }),
        h('span', {}, `${percent}%`),
        button({
          variant: 'icon',
          icon: ICONS.plus,
          title: 'Zoom in',
          onClick: () => zoom(ctx, state, 1.2),
        }),
      ]),
    ]),
    h('div', { class: 'jie-topbar__actions' }, [
      button({
        variant: 'icon',
        icon: ICONS.reset,
        title: 'Reset',
        disabled: !selectIsDirty(state),
        onClick: () => ctx.onReset(),
      }),
      button({
        variant: 'icon',
        icon: ICONS.undo,
        title: 'Undo',
        disabled: !selectCanUndo(state),
        onClick: () => ctx.update({ history: { step: -1 } }),
      }),
      button({
        variant: 'icon',
        icon: ICONS.redo,
        title: 'Redo',
        disabled: !selectCanRedo(state),
        onClick: () => ctx.update({ history: { step: 1 } }),
      }),
    ]),
  ]);
}

function renderRail(state: EditorState, ctx: AppContext): VNode {
  return h(
    'nav',
    { class: 'jie-rail' },
    ctx.tools.map((tool) =>
      h(
        'button',
        {
          key: tool.id,
          class: 'jie-tab',
          type: 'button',
          'aria-selected': state.activeTab === tool.id,
          on: {
            click: () => ctx.update({ activeTab: tool.id, activeTool: tool.defaultTool ?? null }),
          },
        },
        [icon(tool.icon), h('span', {}, tool.label)],
      ),
    ),
  );
}

function renderStage(state: EditorState, ctx: AppContext): VNode {
  const active = ctx.tools.find((t) => t.id === state.activeTab) ?? ctx.tools[0];
  const panel = active?.renderPanel({ state, update: ctx.update }) ?? null;

  return h('div', { class: 'jie-stage' }, [
    h('div', { class: 'jie-canvas-wrap', 'data-jie-canvas-wrap': '' }, [
      // The editor paints pixels onto this canvas imperatively after each render.
      h('canvas', { class: 'jie-canvas', 'data-jie-canvas': '' }),
      renderCropOverlay(state, ctx),
    ]),
    panel ? h('div', { class: 'jie-panel' }, [panel]) : null,
  ]);
}

function renderCropOverlay(state: EditorState, ctx: AppContext): VNode | null {
  if (!selectIsCropping(state)) return null;
  const fit = selectViewportFit(state);
  const crop = selectEffectiveCrop(state);
  if (!fit || !crop) return null;

  const style = {
    left: `${fit.offsetX + crop.x * fit.scale}px`,
    top: `${fit.offsetY + crop.y * fit.scale}px`,
    width: `${crop.width * fit.scale}px`,
    height: `${crop.height * fit.scale}px`,
  };

  const handles: CropHandle[] = ['nw', 'ne', 'sw', 'se'];
  return h(
    'div',
    {
      class: 'jie-crop',
      style,
      on: { pointerdown: (e: Event) => ctx.beginCropDrag('move', e as PointerEvent) },
    },
    handles.map((handle) =>
      h('div', {
        key: handle,
        class: 'jie-crop__handle',
        'data-h': handle,
        on: {
          pointerdown: (e: Event) => {
            e.stopPropagation();
            ctx.beginCropDrag(handle, e as PointerEvent);
          },
        },
      }),
    ),
  );
}

function zoom(ctx: AppContext, state: EditorState, factor: number): void {
  ctx.update({ zoom: state.zoom * factor });
}
