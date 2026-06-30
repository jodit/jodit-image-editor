# 5. UI components & design system

> What the UI is made of, and how to reuse it — primitives, icons, design
> tokens, the layout shell, and how to build a tool panel that looks native.

The UI layer (`src/ui/`) is **all pure** and follows `view = f(state)`:
components are plain functions that return [VNodes](./03-virtual-dom.md); they
hold no state and never touch the DOM. Styling is a single stylesheet **injected
from JS** at build time (no `.css` file to ship).

```
src/ui/
├── styles/editor.css     ← design system: tokens, themes, layout, responsive
├── tokens.ts             ← TOKENS: values the imperative canvas layer needs
├── icons.ts              ← ICONS: inline SVG strings (no sprite, no network)
├── components/primitives.ts ← icon / button / slider / numberField / segmented
├── app.ts                ← renderApp(state, ctx): the root view + AppContext
└── preview.ts            ← paintPreview(): the one imperative canvas blit
```

Everything below is exported from the package entry, so a plugin or a custom UI
can reuse it:

```ts
import {
  h,
  button,
  slider,
  numberField,
  segmented,
  icon,
  ICONS,
  TOKENS,
} from '@jodit/image-editor';
```

---

## Primitives (`components/primitives.ts`)

Stateless building blocks. Each returns a `VNode`; wire behaviour by passing
callbacks.

### `icon(svg: string): VNode`

Renders inline SVG markup as a themable, `currentColor` glyph (`<span class="jie-icon">`).

```ts
icon(ICONS.crop);
```

### `button(props: ButtonProps): VNode`

```ts
interface ButtonProps {
  label?: string;
  icon?: string; // inline SVG markup (e.g. ICONS.rotate)
  onClick: (event: Event) => void;
  variant?: 'default' | 'primary' | 'icon';
  active?: boolean; // adds the .jie-btn--active state
  disabled?: boolean;
  title?: string; // tooltip / a11y label
  key?: string | number;
}
```

```ts
button({ label: 'Save', variant: 'primary', onClick: () => save() });
button({ icon: ICONS.undo, variant: 'icon', title: 'Undo', onClick: undo, disabled: !canUndo });
button({ label: 'Crop', icon: ICONS.crop, active: cropping, onClick: toggleCrop });
```

### `slider(props: SliderProps): VNode`

A labelled range input with a live value readout.

```ts
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number; // default 1
  onInput: (value: number) => void;
  onStart?: () => void; // fired on press, before the first input
}
```

`onStart` is the hook for **one undo step per drag**: open a history entry on
press, then send `commit: false` updates while dragging (see how Finetune uses
it in [doc 1](./01-state-and-reducer.md)).

```ts
slider({
  label: 'Brightness',
  value,
  min: -100,
  max: 100,
  onStart: () => update({ design: { finetune: { brightness: value } }, commit: true }),
  onInput: (v) => update({ design: { finetune: { brightness: v } }, commit: false }),
});
```

### `numberField(props: NumberFieldProps): VNode`

A labelled numeric input with an optional unit suffix; fires on `change`.

```ts
interface NumberFieldProps {
  label: string;
  value: number;
  suffix?: string; // e.g. 'px'
  onChange: (value: number) => void;
}
```

```ts
numberField({ label: 'Width', value: size.width, suffix: 'px', onChange: (w) => resizeTo(w) });
```

### `segmented(options, active, onSelect): VNode`

A horizontal group of mutually-exclusive buttons (the panel sub-tabs).

```ts
interface SegmentedOption {
  id: string;
  label: string;
  icon?: string;
}
segmented(options: SegmentedOption[], active: string, onSelect: (id: string) => void): VNode
```

```ts
segmented(
  [
    { id: 'left', label: 'Left' },
    { id: 'center', label: 'Center' },
    { id: 'right', label: 'Right' },
  ],
  selected.align,
  (id) => patch({ align: id }),
);
```

---

## Icons (`icons.ts`)

`ICONS` is a map of 24×24 `currentColor` SVG strings, inlined in the JS bundle —
no sprite, no network. `IconName` is the union of available keys.

```ts
import { ICONS } from '@jodit/image-editor';
icon(ICONS.filters);
```

Available keys: `adjust`, `finetune`, `filters`, `watermark`, `annotate`,
`resize`, `crop`, `rotate`, `flipX`, `flipY`, `undo`, `redo`, `reset`, `plus`,
`minus`, `lock`, `unlock`, `text`, `brightness`, `contrast`, `blur`, `book`.

Because icons are just strings, you can pass your own SVG markup to `icon(...)`
or a tool's `icon` field.

---

## Design tokens & theming (`styles/editor.css`, `tokens.ts`)

The visual scale lives as CSS custom properties under the `.jie` root, so the
whole tree re-themes by switching one attribute. `tokens.ts` mirrors only the
few values the imperative canvas layer needs (`TOKENS.accent`, `TOKENS.scrim`,
`TOKENS.handleRadius`, `TOKENS.canvasBackground`).

Key CSS variables you can override from the host page:

| Variable                                     | Meaning                                   |
| -------------------------------------------- | ----------------------------------------- |
| `--jie-accent` / `--jie-accent-soft`         | brand accent + soft hover/active          |
| `--jie-bg` / `--jie-surface` / `--jie-stage` | backgrounds (page / panels / canvas area) |
| `--jie-border`                               | hairlines                                 |
| `--jie-text` / `--jie-text-dim`              | text + secondary text                     |
| `--jie-radius` / `--jie-radius-sm`           | corner radii                              |
| `--jie-rail-w`                               | left rail width                           |

**Theming** is part of state. Light/dark are built in via `[data-theme]`;
switch with:

```ts
editor.update({ theme: editor.state.theme === 'dark' ? 'light' : 'dark' });
```

To re-skin, scope your overrides to the root:

```css
.jie {
  --jie-accent: #e0533d;
  --jie-radius: 16px;
}
```

---

## The layout shell (`app.ts`)

`renderApp(state, ctx)` is the root view. It is a pure function of state plus a
small `AppContext` of _intents_ the editor injects (things a VNode can't express
on its own):

```ts
interface AppContext {
  update: (patch: EditorPatch) => void;
  tools: ToolDefinition[]; // the rail is built from these
  onSave: () => void;
  onReset: () => void; // editor prompts for confirmation
  beginCropDrag: (handle, event) => void; // pointer-driven crop
}
```

The DOM structure it produces (handy for custom CSS):

```
.jie[data-theme]
├── .jie-topbar               Save · dimensions · zoom · reset/undo/redo
│   ├── .jie-btn--primary
│   ├── .jie-topbar__meta → .jie-zoom
│   └── .jie-topbar__actions
└── .jie-body
    ├── .jie-rail             one .jie-tab per registered tool
    └── .jie-stage
        ├── .jie-canvas-wrap  preview area
        │   ├── canvas.jie-canvas         (painted imperatively)
        │   └── .jie-crop → .jie-crop__handle[data-h]   (only while cropping)
        └── .jie-panel        the active tool's contextual panel
```

The rail and the active panel are both derived from the **tool registry**, so the
shell is agnostic to which features exist — add a tool (see
[plugins](../src/plugins/README.md)) and a tab + panel appear automatically.

`paintPreview(canvas, raster, viewport, fit)` (`preview.ts`) is the only
imperative piece: it blits a processed raster onto the canvas at the exact rect
the crop overlay is positioned against. See the
[pixel core doc](./04-pixel-core.md) for the caching around it.

---

## Reusable CSS classes

If you build panels with raw `h(...)` instead of the primitives, these classes
give the native look:

| Class                                          | Use                        |
| ---------------------------------------------- | -------------------------- |
| `jie-btn`, `jie-btn--primary/icon/active`      | buttons                    |
| `jie-icon`                                     | 24×24 icon wrapper         |
| `jie-toolrow`                                  | centred row of buttons     |
| `jie-fieldrow`                                 | row of labelled fields     |
| `jie-field`, `jie-input`                       | a labelled input           |
| `jie-slider`, `jie-range`, `jie-slider__value` | slider parts               |
| `jie-thumbs`, `jie-thumb`, `jie-thumb__swatch` | scrollable thumbnail strip |

---

## Putting it together: a custom tool panel

A tool's `renderPanel(ctx)` returns the bottom panel as a VNode. Build it from
the primitives and it matches the built-ins exactly:

```ts
import { h, button, slider, ICONS } from '@jodit/image-editor';
import type { EditorPlugin } from '@jodit/image-editor';

const vignettePlugin: EditorPlugin = {
  name: 'vignette',
  setup(api) {
    api.registerTool({
      id: 'vignette',
      label: 'Vignette',
      icon: ICONS.contrast,
      renderPanel: ({ state, update }) =>
        h('div', { class: 'jie-toolrow' }, [
          slider({
            label: 'Amount',
            value: 0,
            min: 0,
            max: 100,
            onInput: (v) => update({ design: { finetune: { contrast: -v } } }),
          }),
          button({
            label: 'Clear',
            icon: ICONS.reset,
            onClick: () => update({ resetDesign: true }),
          }),
        ]),
    });
  },
};
```

Register it with `new ImageEditor({ container, plugins: [vignettePlugin] })` and
the rail gains a "Vignette" tab whose panel uses the same look-and-feel as Adjust,
Filters, and the rest.

← Back to the [docs index](./README.md).
