import { describe, expect, it, vi } from 'vitest';
import { CoalescingScheduler, SyncScheduler, createMicrotaskScheduler } from './scheduler';

describe('CoalescingScheduler', () => {
  it('coalesces multiple requests into a single run', () => {
    let scheduled: (() => void) | null = null;
    const scheduler = new CoalescingScheduler(
      (cb) => {
        scheduled = cb;
        return 1;
      },
      () => {},
    );
    const task = vi.fn();
    scheduler.request(task);
    scheduler.request(task);
    scheduler.request(task);
    expect(task).not.toHaveBeenCalled();
    scheduled!();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('runs the latest task on flush', () => {
    const scheduler = new CoalescingScheduler(
      () => 1,
      () => {},
    );
    const a = vi.fn();
    const b = vi.fn();
    scheduler.request(a);
    scheduler.request(b);
    scheduler.flush();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('cancel drops the pending task', () => {
    const clear = vi.fn();
    const scheduler = new CoalescingScheduler(() => 1, clear);
    const task = vi.fn();
    scheduler.request(task);
    scheduler.cancel();
    scheduler.flush();
    expect(task).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });
});

describe('SyncScheduler', () => {
  it('runs tasks immediately', () => {
    const scheduler = new SyncScheduler();
    const task = vi.fn();
    scheduler.request(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});

describe('createMicrotaskScheduler', () => {
  it('defers to a microtask and coalesces', async () => {
    const scheduler = createMicrotaskScheduler();
    const task = vi.fn();
    scheduler.request(task);
    scheduler.request(task);
    expect(task).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);
  });
});
