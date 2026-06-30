# Getting started

`@jodit/image-editor` is a vanilla, framework-free image editor. **In = image
`Blob`, out = image `Blob`.** CSS is injected from JS, so there's nothing extra
to load — one import and a container is all you need.

## Try it in 30 seconds (CDN, no build step)

Save this as `index.html` and open it in a browser — pick a photo, edit it, hit
**Save**, and download the result. Everything is loaded from
[jsDelivr](https://www.jsdelivr.com/); no install, no bundler.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jodit Image Editor — quick try</title>
    <style>
      #editor {
        height: 600px;
      }
    </style>
  </head>
  <body>
    <input id="file" type="file" accept="image/*" />
    <div id="editor"></div>

    <script type="module">
      import { ImageEditor } from 'https://cdn.jsdelivr.net/npm/@jodit/image-editor/+esm';

      const editor = new ImageEditor({
        container: '#editor',
        onSave: (blob) => {
          // a Blob comes out — here we just download it
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'edited.png';
          a.click();
        },
      });

      document.getElementById('file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) editor.fromBlob(file);
      });
    </script>
  </body>
</html>
```

CDN URL options:

- `https://cdn.jsdelivr.net/npm/@jodit/image-editor/+esm` — jsDelivr's ESM
  endpoint (recommended; always the latest).
- Pin a version: `…/npm/@jodit/image-editor@0.1.1/+esm`.
- Explicit file: `…/npm/@jodit/image-editor@0.1.1/dist/jodit-image-editor.es2021.min.js`.
- unpkg works the same: `https://unpkg.com/@jodit/image-editor`.

## Install (npm / bundler)

```bash
npm install @jodit/image-editor
```

```ts
import { ImageEditor } from '@jodit/image-editor';

const editor = new ImageEditor({ container: '#editor' });

// load a blob in…
const blob = await fetch('/photo.jpg').then((r) => r.blob());
await editor.fromBlob(blob);

// …and get a blob out
const result = await editor.toBlob({ type: 'image/png' });
```

The package ships ESM + an ES2021 build + `.d.ts` types; bundlers pick the right
one automatically.

## The whole API, briefly

| Member                                   | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `new ImageEditor(props)` / `init(props)` | Create + mount.                                 |
| `editor.state`                           | Current immutable state snapshot.               |
| `editor.update(patch)`                   | The **one** mutation entry point.               |
| `editor.fromBlob(blob)`                  | Load an image.                                  |
| `editor.toBlob(opts?)`                   | Render the current design at full res → `Blob`. |
| `editor.use(plugin)`                     | Apply an extension.                             |
| `editor.destroy()`                       | Tear everything down.                           |

Common things are just an `update` — **undo/redo are state, not methods**:

```ts
editor.update({ activeTab: 'filters' }); // open a screen
editor.update({ theme: 'dark' }); // theme
editor.update({ history: { step: -1 } }); // undo
editor.update({ history: { step: +1 } }); // redo
editor.update({ design: { rotate: 90 } }); // an edit
editor.update({ resetDesign: true }); // back to the original
```

## Other languages

The core bundle is English-only; locales are separate, opt-in modules.

```ts
// bundler
import ru from '@jodit/image-editor/locales/ru';
new ImageEditor({ container: '#editor', locales: [ru], locale: 'ru' });
```

```js
// CDN
import ru from 'https://cdn.jsdelivr.net/npm/@jodit/image-editor/locales/ru/+esm';
```

Shipped: `ru`, `es`, `fr`, `de`, `zh`. See [i18n](./06-i18n.md).

## Where to next

- [State & reducer](./01-state-and-reducer.md) — how `update` and history work.
- [UI components & design system](./05-ui-components.md) — primitives, tokens, theming.
- [Plugins](../src/plugins/README.md) — add your own tools and filters.
- [Architecture index](./README.md) — the full deep-dive.
