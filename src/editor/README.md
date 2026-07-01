# editor

The public facade. `ImageEditor` wires together the (pure) store, the (pure)
view, the reconciler, and the (impure) image processor — and exposes the small
documented API.

```ts
import { ImageEditor, init } from '@jodit/image-editor';

const editor = new ImageEditor({ container: '#editor', onSave: (blob) => save(blob) });
// init(props) is an alias for `new ImageEditor(props)`.
```

| Member             | Description                                                           |
| ------------------ | --------------------------------------------------------------------- |
| `state`            | Current immutable `EditorState`.                                      |
| `update(patch)`    | The one universal mutation (incl. undo/redo & navigation).            |
| `fromBlob(blob)`   | Decode an image; resets the design; downscales a preview raster.      |
| `toBlob(options?)` | Render the current design at **full** resolution → `Blob`.            |
| `save()`           | Export + call `onSave` (fires `jie:save`). No-op with no image.       |
| `saveAs()`         | Export + call `onSaveAs` (fires `jie:saveas`).                        |
| `reset()`          | Reset all edits, behind the `confirm` gate.                           |
| `use(plugin)`      | Apply an extension.                                                   |
| `destroy()`        | Disconnect the resize observer, drag listeners, plugins and DOM tree. |

## Responsibilities kept separate

- **Logic** lives in the store/reducer; the editor only forwards to it.
- **Render** is `renderApp(state)` committed by the `Renderer`.
- **Event loop** is the injected `Scheduler` (RAF by default).
- **Imperative glue** the editor owns is minimal and explicit: a `ResizeObserver`
  that feeds the viewport back into state, painting the preview canvas after each
  render, and the pointer-drag crop loop (which dispatches transient
  `commit: false` patches, committing once on release).

Props: `container`, `image?`, `state?`, `plugins?`, `tools?`, `locale?`,
`locales?`, `scheduler?`, `processor?`, `previewMaxSize?`, `confirm?`, `onSave?`,
`onSaveAs?`, and the size limits `minCropSize?` (smallest crop frame, source px —
default 8) and `minResizeSize?` (smallest Resize dimension, px — default 1).
`jie:save` / `jie:saveas` `CustomEvent`s are dispatched on the container when the
user saves.

To embed the editor without its own top bar, start it with
`state: { showToolbar: false }` (or `update({ showToolbar: false })`) and drive
Save / Save as / undo-redo from your own UI via `save()`, `saveAs()` and
`update(...)`, subscribing to `editor.store` for button state.

```ts
new ImageEditor({ container: '#editor', minCropSize: 64, minResizeSize: 16 });
// both are live state too — change them any time:
editor.update({ minCropSize: 100 });
```
