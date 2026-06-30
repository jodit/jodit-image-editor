import type { EditorPatch, EditorState } from '../state/types';
import { reduce } from '../state/reducer';
import { createInitialState } from '../state/initial';
import type { Scheduler } from '../scheduler/scheduler';
import { SyncScheduler } from '../scheduler/scheduler';

export type Listener = (state: EditorState) => void;
export type Unsubscribe = () => void;
export type Reducer = (state: EditorState, patch: EditorPatch) => EditorState;

export interface StoreOptions {
  initialState?: EditorState;
  reducer?: Reducer;
  /** Notification cadence. Defaults to synchronous; the editor injects RAF. */
  scheduler?: Scheduler;
}

/**
 * The reactive heart: holds the current {@link EditorState}, applies patches
 * through the (pure) reducer, and notifies subscribers — but *batched* via the
 * Scheduler so a burst of `update()` calls yields a single render.
 *
 * It deliberately knows nothing about rendering or the DOM. Its only
 * collaborators are a reducer (pure logic) and a scheduler (event loop).
 */
export class Store {
  private state: EditorState;
  private readonly reducer: Reducer;
  private readonly scheduler: Scheduler;
  private readonly listeners = new Set<Listener>();
  private notifying = false;

  constructor(options: StoreOptions = {}) {
    this.state = options.initialState ?? createInitialState();
    this.reducer = options.reducer ?? reduce;
    this.scheduler = options.scheduler ?? new SyncScheduler();
  }

  getState(): EditorState {
    return this.state;
  }

  /**
   * Apply a patch. If the reducer produced a new state reference, schedule a
   * (coalesced) notification. Returns the resulting state for convenience.
   */
  update(patch: EditorPatch): EditorState {
    const next = this.reducer(this.state, patch);
    if (next !== this.state) {
      this.state = next;
      this.scheduler.request(() => this.notify());
    }
    return this.state;
  }

  /** Subscribe to state changes. The listener is *not* called immediately. */
  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Force any pending batched notification to run now. */
  flush(): void {
    this.scheduler.flush();
  }

  /** Drop listeners and cancel pending work. */
  destroy(): void {
    this.scheduler.cancel();
    this.listeners.clear();
  }

  private notify(): void {
    if (this.notifying) return; // guard against re-entrant updates during render
    this.notifying = true;
    try {
      for (const listener of this.listeners) listener(this.state);
    } finally {
      this.notifying = false;
    }
  }
}
