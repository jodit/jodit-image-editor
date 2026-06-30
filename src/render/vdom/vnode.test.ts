import { describe, expect, it } from 'vitest';
import { h, isElement, normalizeChildren, text } from './vnode';

describe('h / vnode', () => {
  it('builds an element vnode with normalised children', () => {
    const node = h('div', { class: 'x' }, ['hello', 42]);
    expect(node.kind).toBe('element');
    expect(node.tag).toBe('div');
    expect(node.children).toHaveLength(2);
    expect(node.children[0]).toEqual({ kind: 'text', text: 'hello' });
    expect(node.children[1]).toEqual({ kind: 'text', text: '42' });
  });

  it('extracts the key from props', () => {
    expect(h('li', { key: 7 }).key).toBe(7);
  });

  it('accepts a single child (not wrapped in an array)', () => {
    expect(h('p', {}, 'solo').children).toHaveLength(1);
  });

  it('normalizeChildren drops null/undefined/booleans', () => {
    expect(normalizeChildren([null, undefined, false, true, 'keep'])).toEqual([
      { kind: 'text', text: 'keep' },
    ]);
  });

  it('text() coerces to string', () => {
    expect(text(5)).toEqual({ kind: 'text', text: '5' });
  });

  it('isElement narrows correctly', () => {
    expect(isElement(h('div'))).toBe(true);
    expect(isElement(text('a'))).toBe(false);
  });
});
