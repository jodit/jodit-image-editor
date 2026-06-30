# 3. Virtual DOM

> How a pure `render(state)` becomes real DOM, and why the whole thing isn't tied
> to `document`.

Three layers: **what to render** (VNode), **where to render** (Host), and **how
to bridge the two** (the Renderer with diff/patch).

## 1. VNode & `h()` — "what to render" (`src/render/vdom/vnode.ts`)

A VNode is just a description of a node as a plain JS object. No DOM references:

```ts
type VNode = VElement | VText;

interface VElement {
  kind: 'element';
  tag: string; // 'div', 'button', …
  key: string | number | undefined;
  props: VProps; // attributes, styles, handlers
  children: VNode[];
  node?: unknown; // the Renderer stores the created real node here
}
interface VText {
  kind: 'text';
  text: string;
  node?: unknown;
}
```

They are created with the `h()` hyperscript helper:

```ts
h('button', { class: 'jie-btn', on: { click: onClick } }, ['Save']);
```

`props` are structured like this: `class`, `style` (object), `on` (a map of
handlers by event type) and `key` are reserved; anything else is treated as an
attribute. `h` also normalises children via `normalizeChildren`: it flattens
arrays, drops `null`/`false`/`undefined` (so you can write `cond && h(...)`), and
turns strings/numbers into text nodes.

The key point: **components return VNodes and do nothing else.** This is the
concrete embodiment of "view = f(state)" — `renderApp(state)` builds a tree of
these objects without touching the DOM.

## 2. Host — "where to render" (`src/render/vdom/host.ts`)

So the reconciler doesn't depend on `document`, it works against an abstract
interface — the render target:

```ts
interface Host<N> {
  createElement(tag): N;
  createText(value): N;
  insert(parent, node, anchor): void;
  remove(parent, node): void;
  setAttribute / removeAttribute / setProperty(...): void;
  setStyle / removeStyle(...): void;
  addEventListener / removeEventListener(...): void;
  nextSibling(node): N | null;
  // …
}
```

`N` is the node type. Two implementations:

- **`DomHost`** (`host-dom.ts`) — a thin wrapper over the real `document`. This is
  the **only** place in the entire render layer that knows about the DOM at all.
- **`MemoryHost`** (`memory-host.ts`) — nodes live in memory as plain objects with
  `children`, `attrs`, `listeners`. It can `serialize()` a subtree to an
  HTML-like string and `dispatch()` events.

Why `MemoryHost` exists: it proves the render layer has no hidden DOM dependency
(the same algorithm drives a tree in Node), and gives tests a cheap, inspectable
target. A test literally does `host.serialize(root)` and compares the string — no
browser required.

## 3. Renderer — diff/patch (`src/render/vdom/render.ts`)

`Renderer<N>` keeps the previous tree and, on each `render(next)`, compares it to
the new one, applying **minimal** changes to the Host.

The top level — what to do with the root:

```ts
render(next) {
  if (this.prev === null)              this.mount(next);            // first time — create
  else if (sameVNode(this.prev, next)) this.patch(this.prev, next); // same type — patch in place
  else                                 /* replace wholesale */;
  this.prev = next;
}
```

`sameVNode(a, b)` answers "can this be patched in place?": `kind`, `tag` and
`key` all match. If not, the old node is discarded and the new one mounted.

**Prop patching** (`applyProps`) is differential: walk the new props and set only
the changed ones (`value === oldProps[name]` → skip), then remove the ones that
existed but disappeared. Class, styles and events are handled separately. A few
names (`value`, `checked`, `disabled`, `innerHTML`) are set as a node _property_
rather than an attribute — that's `DOM_PROPERTIES`. Inline SVG icons are injected
exactly via `innerHTML`.

**The event-handler trick.** Components return _fresh_ closures on every render
(`onClick: () => …`). If we re-attached the listener every time, we'd be
constantly re-binding. Instead a **stable wrapper** is attached once per event
type, and it reads the "current" handler from a side table (`WeakMap`):

```ts
const binding = { handler, wrapper: (e) => binding.handler(e) };
this.host.addEventListener(node, type, binding.wrapper); // attached ONCE
// on the next render we just:
existing.handler = newHandler; // swap the reference
```

The listener is attached once per event type; only the thing it points at
changes. Re-renders never call `addEventListener`.

**Children patching — keyed diff.** For lists (tabs, filter thumbnails) it uses
the classic snabbdom four-pointer algorithm: walk both the old and new lists from
both ends simultaneously, catch matches at the edges, and for "shuffled" elements
build a `key` map and reuse existing nodes by moving them instead of recreating.
That's why reordering a list preserves DOM-node identity (a test checks exactly
this: "moved, not recreated").

## How this ties into the preview canvas

A subtle point. The preview canvas is also a node in the VNode tree:
`h('canvas', { 'data-jie-canvas': '' })`. The diff only touches its attributes
and **never wipes the pixel buffer**, because we don't set `width`/`height` in the
props — the editor sets them imperatively at paint time. So a live canvas happily
coexists with the declarative tree: the reconciler manages the "shell", while
pixels are painted separately (that's the [next doc](./04-pixel-core.md)).

## Takeaways

- Components return pure VNodes → the `Renderer` diffs them against the previous
  tree and applies minimal edits to an abstract `Host`.
- In the browser, Host = a thin DOM wrapper; in tests, Host = an in-memory tree.
- Handlers are bound once via a stable wrapper; lists are diffed by key.
- The whole layer is unaware of `document` except for the small `DomHost` file.

→ Next: [Pixel core & pipeline](./04-pixel-core.md) — how a `Design` becomes real
pixels, and where the canvas boundary lies.
