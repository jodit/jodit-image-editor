# 2. Store & scheduler

> Two small entities with sharply separated roles: the **Store** knows _that_
> state changed; the **Scheduler** decides _when_ to re-render.

They are kept apart on purpose — the render cadence (animation frame, microtask,
or "immediately" in tests) is a swappable policy that never leaks into the logic.

## Store (`src/core/store/store.ts`)

The Store holds the current state and a set of subscribers. Everything revolves
around `update`:

```ts
update(patch: EditorPatch): EditorState {
  const next = this.reducer(this.state, patch);   // the pure reducer from doc 1
  if (next !== this.state) {                       // did the reference change?
    this.state = next;
    this.scheduler.request(() => this.notify());   // do NOT call subscribers now
  }
  return this.state;
}
```

Two important points:

1. **The `next !== this.state` check.** Remember from
   [doc 1](./01-state-and-reducer.md) that the reducer returns the _same
   reference_ when nothing changed. That pays off here: a no-op `update`
   triggers neither a notification nor a re-render. A free optimisation.

2. **`scheduler.request(...)` instead of calling subscribers directly.** The
   Store does not re-render immediately — it merely _asks_ the scheduler to do
   it "when the time comes". This is the batching point.

Subscription and notification:

```ts
subscribe(listener) {
  this.listeners.add(listener);
  return () => this.listeners.delete(listener);   // unsubscribe function
}

private notify() {
  if (this.notifying) return;        // guard against re-entrancy
  this.notifying = true;
  try {
    for (const l of this.listeners) l(this.state);
  } finally {
    this.notifying = false;
  }
}
```

The `notifying` flag guards the case where a subscriber (e.g. the renderer) calls
`update` _during_ rendering and would otherwise recurse into `notify`. We simply
don't let a notification nest inside itself.

The Store knows nothing about the DOM or rendering. Its only collaborators are
the `reducer` (logic) and the `scheduler` (event loop), both injected and both
swappable.

## Scheduler (`src/core/scheduler/scheduler.ts`)

The whole event loop hides behind a tiny interface:

```ts
interface Scheduler {
  request(task: () => void): void; // queue a task; runs at most once per tick
  flush(): void; // run the pending task right now
  cancel(): void; // drop the pending task
}
```

The main implementation is `CoalescingScheduler`. The idea of "coalescing": no
matter how many times you call `request` before the tick fires, the task runs
**once**.

```ts
request(task) {
  this.pending = task;             // remember the latest task
  if (this.handle === null) {      // no tick scheduled yet?
    this.handle = this.schedule(() => this.flush());  // schedule once
  }
}
flush() {
  if (this.handle !== null) { this.clear(this.handle); this.handle = null; }
  const task = this.pending;
  this.pending = null;
  if (task) task();
}
```

Note that `schedule` and `clear` are timer functions **injected from outside**.
Because of that, one class yields three different policies:

- `createRafScheduler()` — schedules via `requestAnimationFrame` (the editor
  default: re-renders are aligned with browser frames, ~60 fps).
- `createMicrotaskScheduler()` — via a microtask; handy for deterministic async
  tests.
- `SyncScheduler` — runs the task **immediately** on `request`. Used in unit
  tests so they don't wait for frames: call `update` → state and subscribers
  update on the same line.

## Why this matters — an example

Picture the "brightness" slider. While the user drags it, the `input` event
fires dozens of times per second. Each one is an
`update({ design: { finetune: { brightness: … } }, commit: false })`.

Without batching: 30 changes → 30 full DOM re-renders per frame. With a
`CoalescingScheduler` on `requestAnimationFrame`:

```
update, update, update, … (many times within 16 ms)
   └─ each changes state, but scheduler.request only marks "render needed"
   └─ once per frame rAF fires → notify() → a single render(state)
```

So **a burst of changes within a frame collapses into one re-render**, with the
latest state. The Store never knows the word "frame" — it just "requested", and
the coalescing and timing are the scheduler's job.

In tests the same wiring becomes deterministic: inject a `SyncScheduler` and
`update` becomes synchronous — no `await` for frames. That is a direct
consequence of pushing the event loop behind an interface.

Two more bits: `store.flush()` forces any pending re-render to run right now, and
`store.destroy()` cancels the pending task and clears subscribers (called by
`editor.destroy()`).

## Takeaways

- `update` → reducer → (if something changed) `scheduler.request` → one batched
  render per tick.
- Store = "what changed", Scheduler = "when to paint", both swappable.
- That swappability is what makes the whole loop testable and deterministic.

→ Next: [Virtual DOM](./03-virtual-dom.md) — how `render(state)` becomes real DOM
through diff/patch, and why it isn't tied to `document`.
