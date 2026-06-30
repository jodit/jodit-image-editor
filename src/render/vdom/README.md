# render/vdom

A tiny **keyed virtual DOM** that is decoupled from the DOM by construction.

- **`vnode.ts`** — `h()` hyperscript + VNode model (plain data, no DOM refs).
- **`host.ts`** — `Host<N>`, the abstract rendering target.
- **`render.ts`** — the reconciler: diff two VNode trees, apply the minimal
  mutations to a `Host`. Keyed children use the snabbdom four-pointer algorithm.
  Event handlers bind once per type through a stable wrapper, so re-renders never
  re-bind even though components return fresh closures each frame.
- **`host-dom.ts`** — `DomHost`, the production adapter over `document`.
- **`memory-host.ts`** — `MemoryHost`, an in-memory adapter used by tests; proves
  there is no hidden DOM dependency and can `serialize()` a subtree.

```ts
import { Renderer, DomHost, h } from '@jodit/image-editor';

const renderer = new Renderer(new DomHost(), document.getElementById('root')!);
renderer.render(h('div', { class: 'a' }, [h('span', {}, 'hi')]));
renderer.render(h('div', { class: 'b' }, [h('span', {}, 'bye')])); // patches in place
```

The reconciler is the seam that makes "everything is decoupled from the DOM"
true for the render layer: the same algorithm drives `DomHost` in the browser
and `MemoryHost` in Node.
