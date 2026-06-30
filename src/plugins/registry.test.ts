import { describe, expect, it } from 'vitest';
import { ToolRegistry } from './registry';
import type { ToolDefinition } from './types';

const tool = (id: string, order?: number): ToolDefinition => ({
  id,
  label: id,
  icon: '',
  ...(order !== undefined ? { order } : {}),
  renderPanel: () => null,
});

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const reg = new ToolRegistry();
    reg.register(tool('a'));
    expect(reg.has('a')).toBe(true);
    expect(reg.get('a')?.label).toBe('a');
  });

  it('lists tools ordered by `order` then registration sequence', () => {
    const reg = new ToolRegistry();
    reg.register(tool('a', 2));
    reg.register(tool('b', 1));
    reg.register(tool('c')); // no order -> registration sequence
    expect(reg.list().map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('first returns the top tool', () => {
    const reg = new ToolRegistry();
    reg.register(tool('x', 5));
    reg.register(tool('y', 1));
    expect(reg.first()?.id).toBe('y');
  });

  it('the disposer removes only the exact registration', () => {
    const reg = new ToolRegistry();
    const dispose = reg.register(tool('a'));
    reg.register(tool('a')); // override
    dispose(); // should not remove the override
    expect(reg.has('a')).toBe(true);
  });
});
