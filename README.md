# @jodit/image-editor

A **vanilla, framework-free, reactive** image editor: crop, resize, rotate, flip,
colour filters, finetune (brightness/contrast/saturation/blur/warmth) and text
annotations. Inspired by the Filerobot Image Editor UI, built from scratch with
no React, no runtime dependencies.

**🌐 Live demo & docs: <https://xdsoft.net/jodit/image-editor/>**

The whole editor is **`view = f(state)`**: a pure reducer produces immutable
state, a pure view turns state into a virtual DOM, and a tiny reconciler patches
the real DOM. Image processing is a separate **pure pipeline** over a DOM-free
pixel buffer, so every operation, filter and rule is unit-tested in Node.

```
Blob ──decode──▶ RasterImage ──pipeline(design)──▶ RasterImage ──encode──▶ Blob
update(patch) ─▶ reducer ─▶ Store ─scheduler(batch)─▶ render(state) ─▶ VNode ─diff─▶ DOM
```

## Features

- ✂️ **Crop** (interactive handles), **Resize** (with aspect lock), **Rotate**, **Flip X/Y**
- 🎨 **Filters**: Original, Invert, B&W, Sepia, Solarize, Clarendon, Gingham (+ register your own)
- 🎚️ **Finetune**: brightness, contrast, saturation, blur, warmth
- 🔤 **Annotate / Watermark**: text labels
- ↩️ **Undo / redo** modelled as state, navigated via `update` (not methods)
- 🧩 **Plugin API** for tools and filters
- 📱 **Mobile-first** responsive UI, light & dark themes
- 🧪 **140+ unit tests**, SOLID, logic/render/event-loop cleanly separated
- 📦 Ships **ESM** + an **ES2021** build + **types**; CSS is **injected from JS** (no `.css` file)

## Install

```bash
npm install @jodit/image-editor
```

Or use it straight from a CDN — no build step (CSS is injected from JS):

```html
<div id="editor" style="height: 600px"></div>
<script type="module">
  import { ImageEditor } from 'https://cdn.jsdelivr.net/npm/@jodit/image-editor/+esm';
  const editor = new ImageEditor({ container: '#editor' });
  document
    .querySelector('input[type=file]')
    .addEventListener('change', (e) => editor.fromBlob(e.target.files[0]));
</script>
```

New here? See **[docs/getting-started.md](docs/getting-started.md)** for a
copy-paste demo, CDN/jsDelivr options and the full API at a glance.

## Quick start

```ts
import { ImageEditor } from '@jodit/image-editor';

const editor = new ImageEditor({
  container: '#editor', // element or selector
  onSave: (blob) => console.log('exported', blob),
});

// Input is a blob, output is a blob.
const blob = await fetch('/photo.jpg').then((r) => r.blob());
await editor.fromBlob(blob);

// …user edits…
const result = await editor.toBlob({ type: 'image/png' });
```

## Public API

| Member                                   | Description                                            |
| ---------------------------------------- | ------------------------------------------------------ |
| `new ImageEditor(props)` / `init(props)` | Create + mount the editor.                             |
| `editor.state`                           | Current immutable `EditorState` snapshot.              |
| `editor.update(patch)`                   | The **one** universal mutation. Returns `this`.        |
| `editor.fromBlob(blob)`                  | Decode an image blob into the editor.                  |
| `editor.toBlob(opts?)`                   | Render the current design at full resolution → `Blob`. |
| `editor.save()`                          | Export + invoke `onSave` (fires `jie:save`).           |
| `editor.saveAs()`                        | Export + invoke `onSaveAs` (fires `jie:saveas`).       |
| `editor.reset()`                         | Reset every edit, behind the `confirm` gate.           |
| `editor.use(plugin)`                     | Apply an extension.                                    |
| `editor.destroy()`                       | Tear down listeners, observers and the DOM tree.       |

### Embedding without the built-in toolbar

The top bar (Save / size / zoom / undo-redo) is just `state.showToolbar`. Hide it
and drive everything from your own UI — the host app subscribes to the store and
calls the same public API:

```ts
const editor = new ImageEditor({
  container: '#editor',
  state: { showToolbar: false }, // no built-in top bar
  onSave: (blob) => overwrite(blob),
  onSaveAs: (blob) => saveUnderNewName(blob),
});

// Your own buttons drive it:
saveButton.onclick = () => editor.save();
saveAsButton.onclick = () => editor.saveAs();
undoButton.onclick = () => editor.update({ history: { step: -1 } });

// Keep your button states in sync with the editor:
import { selectors } from '@jodit/image-editor';
editor.store.subscribe((state) => {
  undoButton.disabled = !selectors.selectCanUndo(state);
  saveButton.disabled = !state.source;
});
```

`showToolbar` is also a normal patch: `editor.update({ showToolbar: false })`.

### Undo / redo are state, not methods

History lives **inside** state as `{ entries, index }`. You navigate it with the
same `update` you use for everything else — so **any screen/state is reachable by
calling `update`**:

```ts
editor.update({ history: { step: -1 } }); // undo
editor.update({ history: { step: +1 } }); // redo
editor.update({ history: { index: 0 } }); // jump to the start
editor.update({ activeTab: 'filters' }); // open any tab
editor.update({ design: { rotate: 90 } }); // an edit (pushes history)
editor.update({ resetDesign: true }); // back to the original
```

`props` accepts initial state too: `new ImageEditor({ container, state: { theme: 'dark' } })`.

## Extending

```ts
import type { EditorPlugin } from '@jodit/image-editor';

const stickerPlugin: EditorPlugin = {
  name: 'sticker',
  setup(api) {
    api.registerFilter({ id: 'duotone', label: 'Duotone', apply: (raster) => /* … */ raster });
    api.registerTool({ id: 'sticker', label: 'Sticker', icon: '<svg…>', renderPanel: () => null });
  },
};

new ImageEditor({ container: '#editor', plugins: [stickerPlugin] });
```

See [`src/plugins/README.md`](src/plugins/README.md).

## Internationalisation

The core bundle ships **English only** (gettext-style: the English string is the
key). Five locales ship as separate, opt-in modules — **`ru`, `es`, `fr`, `de`,
`zh`** — and switching language is just an `update`:

```ts
import { ImageEditor } from '@jodit/image-editor';
import ru from '@jodit/image-editor/locales/ru';

const editor = new ImageEditor({ container: '#editor', locales: [ru], locale: 'ru' });
editor.update({ locale: 'en' }); // back to built-in English
```

Full guide: [`docs/06-i18n.md`](docs/06-i18n.md).

## Architecture & module map

A guided, four-part deep-dive lives in [`docs/`](docs/README.md):
[state & reducer](docs/01-state-and-reducer.md) ·
[store & scheduler](docs/02-store-and-scheduler.md) ·
[virtual DOM](docs/03-virtual-dom.md) ·
[pixel core & pipeline](docs/04-pixel-core.md).

Each module also has its own README:

| Area        | Module                                                                                                                                         | Responsibility                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| State       | [`core/state`](src/core/state/README.md)                                                                                                       | Types, reducer, history, selectors         |
| Reactivity  | [`core/store`](src/core/store/README.md) · [`core/scheduler`](src/core/scheduler/README.md)                                                    | Reactive store + event-loop batching       |
| Pixels      | [`core/raster`](src/core/raster/README.md) · [`core/operations`](src/core/operations/README.md) · [`core/filters`](src/core/filters/README.md) | DOM-free pixel buffer, transforms, filters |
| Geometry    | [`core/geometry`](src/core/geometry/README.md)                                                                                                 | Crop/resize/fit math                       |
| Pipeline    | [`core/pipeline`](src/core/pipeline/README.md)                                                                                                 | Pure `design → pixels`                     |
| Annotations | [`core/annotations`](src/core/annotations/README.md)                                                                                           | Annotation list operations                 |
| Render      | [`render/vdom`](src/render/vdom/README.md)                                                                                                     | `h()`, diff/patch, host abstraction        |
| UI          | [`ui`](src/ui/README.md)                                                                                                                       | Design system, icons, components, view     |
| Plugins     | [`plugins`](src/plugins/README.md)                                                                                                             | Tool registry + extension API              |
| Image I/O   | [`image`](src/image/README.md)                                                                                                                 | Blob ⇄ raster, annotation compositing      |
| Facade      | [`editor`](src/editor/README.md)                                                                                                               | Wires it all into `ImageEditor`            |

## Scripts

```bash
npm start      # Vite dev server for the demo stand
npm test       # Vitest (run once)
npm run build  # ESM + ES2021 + .d.ts into dist/
npm run lint   # ESLint + Prettier check

# Bundle-size monitoring (Statoscope)
npm run analyze # build + open the interactive Statoscope report
npm run report  # build + write a shareable statoscope/report.html
npm run stats   # build + emit statoscope/stats.json only
npm run size    # build + fail if shipped JS exceeds the budget (SIZE_BUDGET_KB, default 90)
```

## Bundle-size monitoring

Bundle size is tracked with **[Statoscope](https://statoscope.tech/)**. Since the
build runs on Vite/Rollup, [`rollup-plugin-webpack-stats`](https://www.npmjs.com/package/rollup-plugin-webpack-stats)
emits a webpack-compatible `statoscope/stats.json` (only in `--mode analyze`, so
normal builds and published artifacts stay clean), which the Statoscope CLI turns
into a report:

- `npm run analyze` — serves the interactive report (modules, treemap, sizes).
- `npm run report` — writes a static `statoscope/report.html` for CI artifacts.
- `npm run size` — a hard budget gate over the stats (`scripts/check-size.mjs`),
  handy in CI. Override with `SIZE_BUDGET_KB=120 npm run size`.

The `statoscope/` folder is git-ignored.

## Build output

Each entry is an ESM file with CSS injected as a `<style>` element (no separate
`.css`). Readable builds ship for debuggable consumption and bundler
tree-shaking; the `.min` builds are ready for direct `<script type="module">` /
CDN use (`unpkg`/`jsdelivr` point at the ES2021 min build).

| File                                    | Target   | Minified                  |
| --------------------------------------- | -------- | ------------------------- |
| `dist/jodit-image-editor.js`            | `esnext` | no                        |
| `dist/jodit-image-editor.min.js`        | `esnext` | yes                       |
| `dist/jodit-image-editor.es2021.js`     | ES2021   | no                        |
| `dist/jodit-image-editor.es2021.min.js` | ES2021   | yes                       |
| `dist/index.d.ts`                       | —        | bundled type declarations |

## Browser support

"Green" / evergreen browsers — the last two versions of Chrome, Firefox, Safari
and Edge (see `.browserslistrc`).

## License

[MIT](LICENSE) © Valeriy Chupurnov and contributors.
