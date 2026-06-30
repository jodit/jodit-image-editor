# 1. State & reducer

> The heart of the logic. One immutable state, one pure function that changes
> it. No DOM, no I/O, no randomness — which is exactly why it is trivial to test.

## Two kinds of state: ephemeral vs. design

All editor state is a single flat `EditorState` object (`src/core/state/types.ts`).
Inside it there is an important split between two _kinds_ of data.

```ts
interface EditorState {
  // --- ephemeral UI (NOT recorded in history) ---
  activeTab: TabId; // which tab is open: 'adjust' | 'filters' | …
  activeTool: string | null; // which tool inside the tab is active
  zoom: number; // preview zoom factor
  theme: 'light' | 'dark';
  selectedAnnotationId: string | null;
  viewport: Size | null; // measured size of the preview area
  source: SourceMeta | null; // metadata of the loaded image
  status: 'idle' | 'loading' | 'ready' | 'exporting' | 'error';
  error: string | null;

  // --- the editing that *is* the history ---
  history: HistoryState<Design>;
}
```

- **Ephemeral fields** (`activeTab`, `zoom`, `theme`, …) describe "where I am in
  the UI right now". Undo/redo must **not** touch them: if you rotate the image,
  then open the Filters tab and press undo, the rotation is undone — not the tab
  switch.
- **`Design`** is the declarative description of _every edit applied to the
  image_. This is what goes into history.

## What `Design` is

```ts
interface Design {
  flip: { horizontal: boolean; vertical: boolean };
  rotate: number; // 0 | 90 | 180 | 270
  crop: Rect | null;
  resize: Size | null;
  finetune: { brightness; contrast; saturation; warmth; blur }; // all neutral at 0
  filter: string; // 'original', 'sepia', … (or a plugin filter)
  annotations: Annotation[]; // text labels
}
```

There are no pixels here — only _what should be done_ to the source: "rotate 90,
crop like this, brightness +20, sepia". The image is produced when the
[pipeline](./04-pixel-core.md) applies this `Design` to the source `RasterImage`.

A consequence: `Design` is a plain, serialisable value. You can persist it to
`localStorage`, send it over the wire, diff two designs — and restore the exact
same image at any time. The identity design (everything at its no-op value)
yields a byte-for-byte copy of the source.

## Why undo/redo is NOT a method

This was an explicit requirement. History lives _inside_ state as a simple list
plus a cursor (`src/core/state/history.ts`):

```ts
interface HistoryState<T> {
  entries: T[]; // [identity, rotated, rotated+sepia, …]
  index: number; // which entry we currently stand on
}
```

- **Current design** = `entries[index]` (selector `present`).
- **Make an edit** = append a new entry after `index` and advance `index`
  (`commit`). The redo tail is truncated.
- **Undo** = `index--`. **Redo** = `index++`.
- `canUndo` = `index > 0`, `canRedo` = `index < entries.length - 1`.

So there is no `editor.undo()` — undo is just "move the cursor", and the cursor
is moved through the very same `update`:

```ts
editor.update({ history: { step: -1 } }); // undo
editor.update({ history: { step: +1 } }); // redo
editor.update({ history: { index: 0 } }); // jump to the very start
```

This is what makes the requirement "any screen/state is reachable by calling
`update`" literally true: a screen _is_ a value of `EditorState`, and the only
way to change it is `update`.

## The reducer (`src/core/state/reducer.ts`)

`reduce(state, patch)` is a pure function. It processes the patch in order:

```ts
export function reduce(state, patch) {
  let next = state;

  // 1. ephemeral fields — set directly, no history
  if (patch.activeTab !== undefined) next = set(next, { activeTab: patch.activeTab });
  if (patch.zoom !== undefined) next = set(next, { zoom: sanitizeZoom(patch.zoom) });
  // … theme, viewport, status, etc.

  // 2. a design edit — recorded in history
  if (patch.design !== undefined) {
    const merged = mergeDesign(present(next.history), patch.design);
    const history =
      patch.commit === false
        ? replacePresent(next.history, merged) // replace current (used for drags)
        : commit(next.history, merged); // push a new step
    next = set(next, { history });
  }

  // 3. history navigation (undo/redo)
  if (patch.history !== undefined) {
    next = set(next, { history: /* step or index, clamped */ });
  }

  return next;
}
```

Three subtle details hidden in there:

1. **`set` returns the same reference when nothing changed.** Therefore
   `update({ activeTab: 'adjust' })` while already on `adjust` produces no new
   object — and the [Store](./02-store-and-scheduler.md) won't schedule a
   pointless re-render (`next === state`).

2. **`mergeDesign` is a smart merge.** `flip` and `finetune` are merged
   shallowly (you can send `{ finetune: { brightness: 20 } }` without touching
   the other sliders), while arrays (`annotations`) and primitives are replaced
   wholesale. `rotate` is always normalised to 0/90/180/270.

3. **`commit: false` is a "draft" edit.** A normal `commit(...)` pushes a new
   history step. During a drag (cropping or a slider) we send `commit: false`, so
   `replacePresent` _overwrites the current step in place_ instead of spawning
   hundreds of entries. One gesture = one undo step. (This same mechanism later
   helps with smoothness.)

Next to it lives `selectors.ts` — "derived reads" of state: `selectDesign`,
`selectCanUndo`, `selectOutputSize`, `selectViewportFit`, etc. The render layer
never reaches into `history.entries[index]` directly — it asks a selector. That
keeps the rules in one place and independently testable.

## Takeaways

- One flat state; `Design` inside it is the unit of history.
- Undo/redo is moving a cursor, expressed through the same `update`.
- The reducer is the single, pure place where all transitions are defined.

→ Next: [Store & scheduler](./02-store-and-scheduler.md) — how `update` reaches a
re-render, and why a burst of changes produces a single frame.
