import { describe, expect, it, vi } from 'vitest';
import { Store } from './store';
import { CoalescingScheduler, SyncScheduler } from '../scheduler/scheduler';
import { present } from '../state/history';

describe('Store', () => {
  it('applies patches through the reducer', () => {
    const store = new Store();
    store.update({ activeTab: 'filters' });
    expect(store.getState().activeTab).toBe('filters');
  });

  it('notifies subscribers synchronously with the SyncScheduler', () => {
    const store = new Store({ scheduler: new SyncScheduler() });
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ zoom: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].zoom).toBe(2);
  });

  it('does not notify when state is unchanged', () => {
    const store = new Store({ scheduler: new SyncScheduler() });
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ activeTab: store.getState().activeTab });
    expect(listener).not.toHaveBeenCalled();
  });

  it('batches a burst of updates into a single notification', () => {
    let scheduled: (() => void) | null = null;
    const scheduler = new CoalescingScheduler(
      (cb) => {
        scheduled = cb;
        return 1;
      },
      () => {},
    );
    const store = new Store({ scheduler });
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ zoom: 2 });
    store.update({ zoom: 3 });
    store.update({ activeTab: 'resize' });
    expect(listener).not.toHaveBeenCalled();
    scheduled!();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].zoom).toBe(3);
  });

  it('records design edits in history and supports undo via update', () => {
    const store = new Store();
    store.update({ design: { rotate: 90 } });
    expect(present(store.getState().history).rotate).toBe(90);
    store.update({ history: { step: -1 } });
    expect(present(store.getState().history).rotate).toBe(0);
  });

  it('unsubscribe stops notifications', () => {
    const store = new Store({ scheduler: new SyncScheduler() });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.update({ zoom: 5 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('destroy clears listeners', () => {
    const store = new Store({ scheduler: new SyncScheduler() });
    const listener = vi.fn();
    store.subscribe(listener);
    store.destroy();
    store.update({ zoom: 9 });
    expect(listener).not.toHaveBeenCalled();
  });
});
