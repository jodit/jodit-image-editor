import type { HistoryState } from './types';

/**
 * Pure helpers over the linear undo/redo timeline.
 *
 * The timeline is a plain `{ entries, index }` value living *inside* the editor
 * state — there are no `undo()`/`redo()` methods. Undo is "decrement index",
 * redo is "increment index", and committing an edit truncates the redo tail.
 */

export const MAX_HISTORY = 100;

/** The currently active entry. */
export function present<T>(history: HistoryState<T>): T {
  const value = history.entries[history.index];
  if (value === undefined) {
    throw new RangeError(`history index ${history.index} is out of bounds`);
  }
  return value;
}

export function canUndo<T>(history: HistoryState<T>): boolean {
  return history.index > 0;
}

export function canRedo<T>(history: HistoryState<T>): boolean {
  return history.index < history.entries.length - 1;
}

/**
 * Commit a new present value. Any redo tail is dropped and the timeline is
 * trimmed to {@link MAX_HISTORY} entries (oldest first).
 */
export function commit<T>(history: HistoryState<T>, next: T): HistoryState<T> {
  const kept = history.entries.slice(0, history.index + 1);
  kept.push(next);
  const overflow = Math.max(0, kept.length - MAX_HISTORY);
  const entries = overflow > 0 ? kept.slice(overflow) : kept;
  return { entries, index: entries.length - 1 };
}

/** Replace the present value in place, without creating a new history step. */
export function replacePresent<T>(history: HistoryState<T>, next: T): HistoryState<T> {
  const entries = history.entries.slice();
  entries[history.index] = next;
  return { entries, index: history.index };
}

/** Clamp an absolute index into a valid position on the timeline. */
export function goTo<T>(history: HistoryState<T>, index: number): HistoryState<T> {
  const clamped = clamp(index, 0, history.entries.length - 1);
  return clamped === history.index ? history : { ...history, index: clamped };
}

/** Move the cursor by a relative number of steps (negative = undo). */
export function step<T>(history: HistoryState<T>, delta: number): HistoryState<T> {
  return goTo(history, history.index + delta);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
