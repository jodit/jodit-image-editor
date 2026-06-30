# Architecture docs

Deep-dive into how `@jodit/image-editor` works, one layer per document. The
guiding principle throughout is **`view = f(state)`**: an immutable state is
produced by a pure reducer, a pure view turns it into a virtual DOM, and a tiny
reconciler patches the real DOM. Image processing is a separate, DOM-free pure
pipeline.

```
update(patch) ─▶ reducer ─▶ Store(state) ─scheduler(batch)─▶ render(state) ─▶ VNode ─diff─▶ DOM
      ▲                                                                                      │
      └─────────────────────────────── UI events (click, drag) ─────────────────────────────┘

Blob ──decode──▶ RasterImage ──pipeline(design)──▶ RasterImage ──encode──▶ Blob
```

## Contents

**Start here:** [Getting started](./getting-started.md) — install / CDN (jsDelivr),
a copy-paste demo, and the whole API at a glance.

1. [State & reducer](./01-state-and-reducer.md) — `EditorState`, `Design`, and
   why undo/redo is part of state rather than a method.
2. [Store & scheduler](./02-store-and-scheduler.md) — reactivity and how a burst
   of updates collapses into one frame.
3. [Virtual DOM](./03-virtual-dom.md) — `h()`, diff/patch, and how the render
   layer is decoupled from the DOM via the `Host` abstraction.
4. [Pixel core & pipeline](./04-pixel-core.md) — the DOM-free `RasterImage`,
   transforms, filters, the pure pipeline, and the thin canvas boundary.
5. [UI components & design system](./05-ui-components.md) — primitives, icons,
   design tokens/theming, the layout shell, and building a custom tool panel.
6. [Internationalisation (i18n)](./06-i18n.md) — gettext-style translation, the
   English-only core, the five shipped locales, and writing your own.

## How the layers map to the code

| Layer       | Path                  | Responsibility                               |
| ----------- | --------------------- | -------------------------------------------- |
| State       | `src/core/state`      | Types, reducer, history, selectors           |
| Reactivity  | `src/core/store`      | Reactive store                               |
| Event loop  | `src/core/scheduler`  | Render batching policy                       |
| Render      | `src/render/vdom`     | `h()`, diff/patch, `Host` abstraction        |
| Pixels      | `src/core/raster`     | DOM-free RGBA buffer                         |
| Transforms  | `src/core/operations` | Crop / resize / rotate / flip                |
| Filters     | `src/core/filters`    | Finetune adjustments + named filter registry |
| Pipeline    | `src/core/pipeline`   | Pure `design → pixels`                       |
| Canvas edge | `src/image`           | Blob ⇄ raster, text compositing              |
| Facade      | `src/editor`          | Wires everything into `ImageEditor`          |

Each `src/**` module also has its own focused `README.md`.
