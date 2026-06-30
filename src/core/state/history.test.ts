import { describe, expect, it } from 'vitest';
import type { HistoryState } from './types';
import {
  MAX_HISTORY,
  canRedo,
  canUndo,
  commit,
  goTo,
  present,
  replacePresent,
  step,
} from './history';

const start = (): HistoryState<number> => ({ entries: [0], index: 0 });

describe('history', () => {
  it('present returns the active entry and throws when out of range', () => {
    expect(present(start())).toBe(0);
    expect(() => present({ entries: [], index: 0 })).toThrow(RangeError);
  });

  it('commit appends and advances the index', () => {
    const h = commit(start(), 1);
    expect(h.entries).toEqual([0, 1]);
    expect(h.index).toBe(1);
    expect(present(h)).toBe(1);
  });

  it('commit truncates the redo tail', () => {
    let h = commit(commit(start(), 1), 2); // [0,1,2] idx 2
    h = goTo(h, 0); // back to start
    h = commit(h, 9); // should drop 1 and 2
    expect(h.entries).toEqual([0, 9]);
    expect(h.index).toBe(1);
  });

  it('canUndo / canRedo reflect cursor position', () => {
    const h = commit(start(), 1);
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
    const back = goTo(h, 0);
    expect(canUndo(back)).toBe(false);
    expect(canRedo(back)).toBe(true);
  });

  it('step and goTo clamp into range', () => {
    const h = commit(start(), 1); // idx 1
    expect(step(h, -5).index).toBe(0);
    expect(step(h, +5).index).toBe(1);
    expect(goTo(h, 99).index).toBe(1);
  });

  it('goTo returns the same reference when nothing changes', () => {
    const h = start();
    expect(goTo(h, 0)).toBe(h);
  });

  it('replacePresent overwrites in place without adding a step', () => {
    const h = commit(start(), 1); // [0,1] idx 1
    const r = replacePresent(h, 42);
    expect(r.entries).toEqual([0, 42]);
    expect(r.index).toBe(1);
    expect(canUndo(r)).toBe(true);
  });

  it('commit trims to MAX_HISTORY, dropping the oldest entries', () => {
    let h = start();
    for (let i = 1; i <= MAX_HISTORY + 10; i++) h = commit(h, i);
    expect(h.entries.length).toBe(MAX_HISTORY);
    expect(present(h)).toBe(MAX_HISTORY + 10);
    expect(h.entries[0]).toBe(11); // oldest survivors shifted
  });
});
