# demo

A small standalone stand that mounts the editor and drives it **only** through
the public API (`update`, `fromBlob`, `toBlob`).

```bash
npm start   # → http://localhost:5173
```

- `index.html` — page shell + a toolbar that calls the editor API.
- `main.ts` — wires the buttons; loads the bundled sample image on start; the
  "Export" / "Save" path shows the resulting blob as a downloadable image.

Every toolbar action is a documented call:

```ts
editor.update({ activeTab: 'filters' }); // open a tab
editor.update({ history: { step: -1 } }); // undo (state, not a method)
editor.update({ theme: 'dark' }); // theming
const blob = await editor.toBlob({ type: 'image/png' });
```

## Sample image

`assets/sample.jpg` — a mountain-lake photo from
[Lorem Picsum](https://picsum.photos/) (image id `1018`), sourced from
[Unsplash](https://unsplash.com/) and free to use under the
[Unsplash License](https://unsplash.com/license) (free for commercial and
non-commercial use, no attribution required).
