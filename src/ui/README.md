# ui

The presentation layer — all pure, all `view = f(state)`.

- **`styles/editor.css`** — the design system: CSS custom-property tokens, light &
  dark themes (`[data-theme]`), the layout (top bar, rail, stage, panel, crop
  overlay) and a mobile-first responsive breakpoint. Processed by PostCSS
  (nesting + autoprefixer) and **injected from JS** at build time.
- **`tokens.ts`** — the few token values the imperative canvas layer needs.
- **`icons.ts`** — inline SVG icon strings (no sprite, no network).
- **`components/primitives.ts`** — stateless `button`, `slider`, `numberField`,
  `segmented`, `icon`; each returns a VNode.
- **`app.ts`** — `renderApp(state, ctx)`: the root view, composed from the tool
  registry so the shell is agnostic to which features exist.
- **`preview.ts`** — `paintPreview(...)`: the only imperative bit, painting a
  processed raster onto the canvas at the exact rect the crop overlay uses.

The view never mutates anything; it dispatches `update(patch)` and reads
selectors. Pointer-driven crop dragging and Save are the two intents passed in
via `ctx` (a VNode can't express a window-level drag on its own).
