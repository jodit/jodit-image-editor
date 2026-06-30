/**
 * The event-loop boundary, isolated behind one tiny interface.
 *
 * The Store knows *that* a re-render must happen; the Scheduler decides *when*.
 * Keeping them apart means the render cadence (animation frame, microtask, or
 * synchronous in tests) is a swappable policy and never leaks into logic.
 */
export interface Scheduler {
  /** Queue `task`. Multiple requests before a flush coalesce into one run. */
  request(task: () => void): void;
  /** Run the pending task immediately, if any. */
  flush(): void;
  /** Discard the pending task without running it. */
  cancel(): void;
}

type Timer = (cb: () => void) => unknown;
type Canceller = (handle: unknown) => void;

/**
 * Coalescing scheduler driven by injected timer functions. A single task is
 * pending at a time — the latest wins — and it is flushed on the next tick of
 * whatever timer was supplied.
 */
export class CoalescingScheduler implements Scheduler {
  private pending: (() => void) | null = null;
  private handle: unknown = null;

  constructor(
    private readonly schedule: Timer,
    private readonly clear: Canceller,
  ) {}

  request(task: () => void): void {
    this.pending = task;
    if (this.handle === null) {
      this.handle = this.schedule(() => this.flush());
    }
  }

  flush(): void {
    if (this.handle !== null) {
      this.clear(this.handle);
      this.handle = null;
    }
    const task = this.pending;
    this.pending = null;
    if (task) task();
  }

  cancel(): void {
    if (this.handle !== null) {
      this.clear(this.handle);
      this.handle = null;
    }
    this.pending = null;
  }
}

/** Batches renders into `requestAnimationFrame` (falls back to a 16ms timer). */
export function createRafScheduler(): Scheduler {
  const hasRaf = typeof requestAnimationFrame === 'function';
  const schedule: Timer = hasRaf
    ? (cb) => requestAnimationFrame(() => cb())
    : (cb) => setTimeout(cb, 16);
  const clear: Canceller = hasRaf
    ? (h) => cancelAnimationFrame(h as number)
    : (h) => clearTimeout(h as ReturnType<typeof setTimeout>);
  return new CoalescingScheduler(schedule, clear);
}

/** Batches renders into a microtask — good for deterministic async tests. */
export function createMicrotaskScheduler(): Scheduler {
  let cancelled = false;
  const schedule: Timer = (cb) => {
    cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) cb();
    });
    return 1;
  };
  const clear: Canceller = () => {
    cancelled = true;
  };
  return new CoalescingScheduler(schedule, clear);
}

/** Runs tasks synchronously on request — the simplest policy, used in tests. */
export class SyncScheduler implements Scheduler {
  private pending: (() => void) | null = null;

  request(task: () => void): void {
    this.pending = task;
    this.flush();
  }

  flush(): void {
    const task = this.pending;
    this.pending = null;
    if (task) task();
  }

  cancel(): void {
    this.pending = null;
  }
}
