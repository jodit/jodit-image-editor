import { describe, expect, it } from 'vitest';
import { createIdFactory } from './id';

describe('createIdFactory', () => {
  it('produces monotonically increasing prefixed ids', () => {
    const next = createIdFactory('text');
    expect(next()).toBe('text-1');
    expect(next()).toBe('text-2');
    expect(next()).toBe('text-3');
  });

  it('factories are independent', () => {
    const a = createIdFactory('a');
    const b = createIdFactory('b');
    a();
    expect(b()).toBe('b-1');
  });
});
