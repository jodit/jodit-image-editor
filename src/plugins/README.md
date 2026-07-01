# plugins

The external extension API.

- **`types.ts`** — `EditorPlugin`, `EditorApi`, `ToolDefinition`, `ToolContext`.
- **`registry.ts`** — `ToolRegistry`: ordered, override-able, per-editor (no global
  singletons). Registration returns a disposer.
- **`builtin/`** — the default tools (`adjust`, `finetune`, `filters`,
  `annotate`, `resize`). They are ordinary `ToolDefinition`s with no privileged
  access — a host can omit, reorder or replace any of them.

## Writing a plugin

A plugin is a named bag of registrations applied at `setup` time. It dispatches
patches and describes additions; it never touches the DOM or store directly.

```ts
import type { EditorPlugin } from '@jodit/image-editor';

export const myPlugin: EditorPlugin = {
  name: 'my-plugin',
  setup(api) {
    // add a colour filter (shows up in the Filters strip automatically)
    const offFilter = api.registerFilter({ id: 'noir', label: 'Noir', apply: (r) => r });

    // add a tab + bottom panel
    const offTool = api.registerTool({
      id: 'stickers',
      label: 'Stickers',
      icon: '<svg viewBox="0 0 24 24">…</svg>',
      order: 10,
      renderPanel: ({ state, update }) => null, // return a VNode via `h()`
    });

    return () => {
      offFilter();
      offTool();
    }; // optional disposer, run on editor.destroy()
  },
};
```

Apply with `new ImageEditor({ container, plugins: [myPlugin] })` or
`editor.use(myPlugin)`.

A `ToolDefinition.renderPanel(ctx)` receives `{ state, update }` and returns the
contextual bottom panel as a VNode (or `null`).
