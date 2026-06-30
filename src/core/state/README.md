# core/state

The single source of truth and the only place state transitions are defined.

- **`types.ts`** — `EditorState`, `Design`, `EditorPatch`, `DesignPatch`, history & annotation types. All plain, serialisable data.
- **`initial.ts`** — `createInitialState()` / `createIdentityDesign()` (the no-op design).
- **`reducer.ts`** — the pure `reduce(state, patch) => state`. Deterministic: no I/O, no ids, no clocks.
- **`history.ts`** — pure undo/redo timeline helpers (`commit`, `goTo`, `step`, `replacePresent`, `present`, `canUndo/canRedo`).
- **`selectors.ts`** — derived reads (`selectDesign`, `selectOutputSize`, `selectViewportFit`, …).

## Why undo/redo is not a method

History is a value in state: `{ entries: Design[]; index: number }`. Editing
**commits** a new entry; undo/redo just move `index`. Both happen through the
ordinary `update` patch, so any screen is reachable declaratively.

```ts
import { reduce, createInitialState, present } from '@jodit/image-editor';

let s = createInitialState();
s = reduce(s, { design: { rotate: 90 } }); // commit
s = reduce(s, { history: { step: -1 } }); // undo
present(s.history).rotate; // 0
```

`commit: false` on a design patch **replaces** the present entry instead of
pushing — used during drags so a gesture is one undo step.

Tested in `*.test.ts` alongside each file.
