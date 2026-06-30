# core/store

The reactive heart. `Store` holds the current `EditorState`, applies patches
through the (pure) reducer, and notifies subscribers — **batched** via an
injected `Scheduler` so a burst of `update()` calls yields a single render.

It knows nothing about rendering or the DOM; its only collaborators are a
reducer (logic) and a scheduler (event loop) — both swappable.

```ts
import { Store, SyncScheduler } from '@jodit/image-editor';

const store = new Store({ scheduler: new SyncScheduler() });
const off = store.subscribe((state) => console.log(state.zoom));
store.update({ zoom: 2 });
off();
store.destroy();
```

| Method          | Description                                 |
| --------------- | ------------------------------------------- |
| `getState()`    | Current state.                              |
| `update(patch)` | Reduce + schedule a coalesced notification. |
| `subscribe(fn)` | Returns an unsubscribe function.            |
| `flush()`       | Force any pending notification now.         |
| `destroy()`     | Drop listeners and cancel pending work.     |

See [`core/scheduler`](../scheduler/README.md) for cadence policies.
