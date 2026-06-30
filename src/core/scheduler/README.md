# core/scheduler

The event-loop boundary behind one tiny interface. The store knows _that_ a
re-render must happen; the scheduler decides _when_.

```ts
export interface Scheduler {
  request(task: () => void): void; // coalesced — runs at most once per tick
  flush(): void; // run the pending task now
  cancel(): void; // drop it
}
```

Implementations:

- `createRafScheduler()` — batches into `requestAnimationFrame` (the editor default).
- `createMicrotaskScheduler()` — batches into a microtask (deterministic async tests).
- `SyncScheduler` — runs immediately (synchronous unit tests).
- `CoalescingScheduler(schedule, clear)` — generic, driven by injected timers.

Because the cadence is injected, the same store is fully deterministic in tests
and frame-batched in the browser.
