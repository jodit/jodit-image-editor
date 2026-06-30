import { describe, expect, it, vi } from 'vitest';
import { MemoryHost } from './memory-host';
import type { MemoryNode } from './memory-host';
import { Renderer, sameVNode } from './render';
import { h, text } from './vnode';

function setup() {
  const host = new MemoryHost();
  const root = host.createElement('root');
  const renderer = new Renderer<MemoryNode>(host, root);
  return { host, root, renderer };
}

describe('Renderer (driven against the in-memory host)', () => {
  it('mounts an element tree', () => {
    const { host, root, renderer } = setup();
    renderer.render(h('div', { class: 'a' }, [h('span', {}, 'hi')]));
    expect(host.serialize(root.children[0]!)).toBe('<div class="a"><span>hi</span></div>');
  });

  it('patches text in place without replacing the node', () => {
    const { host, root, renderer } = setup();
    renderer.render(h('p', {}, 'one'));
    const node = root.children[0]!;
    renderer.render(h('p', {}, 'two'));
    expect(root.children[0]).toBe(node); // same element reused
    expect(host.serialize(node)).toBe('<p>two</p>');
  });

  it('updates and removes attributes', () => {
    const { host, root, renderer } = setup();
    renderer.render(h('div', { id: 'x', title: 'keep' }));
    renderer.render(h('div', { title: 'keep' }));
    const node = root.children[0]!;
    expect(node.attrs.has('id')).toBe(false);
    expect(node.attrs.get('title')).toBe('keep');
    void host;
  });

  it('sets known DOM properties rather than attributes', () => {
    const { root, renderer } = setup();
    renderer.render(h('input', { value: 'abc', disabled: true }));
    const node = root.children[0]!;
    expect(node.props.get('value')).toBe('abc');
    expect(node.props.get('disabled')).toBe(true);
  });

  it('applies and diffs styles', () => {
    const { root, renderer } = setup();
    renderer.render(h('div', { style: { color: 'red', width: 10 } }));
    const node = root.children[0]!;
    expect(node.style.get('color')).toBe('red');
    expect(node.style.get('width')).toBe('10');
    renderer.render(h('div', { style: { color: 'blue' } }));
    expect(node.style.get('color')).toBe('blue');
    expect(node.style.has('width')).toBe(false);
  });

  it('binds an event once and keeps firing the latest handler', () => {
    const { host, root, renderer } = setup();
    const first = vi.fn();
    const second = vi.fn();
    renderer.render(h('button', { on: { click: first } }, 'go'));
    const node = root.children[0]!;
    renderer.render(h('button', { on: { click: second } }, 'go'));
    expect(node.listeners.get('click')!.size).toBe(1); // not re-bound
    host.dispatch(node, 'click', new Event('click'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('removes an event listener when the handler is dropped', () => {
    const { host, root, renderer } = setup();
    const handler = vi.fn();
    renderer.render(h('button', { on: { click: handler } }));
    const node = root.children[0]!;
    renderer.render(h('button', {}));
    host.dispatch(node, 'click', new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('reorders keyed children, preserving node identity', () => {
    const { host, root, renderer } = setup();
    const list = (keys: number[]) =>
      h(
        'ul',
        {},
        keys.map((k) => h('li', { key: k }, String(k))),
      );
    renderer.render(list([1, 2, 3]));
    const ul = root.children[0]!;
    const liByText = (t: string) => ul.children.find((c) => host.serialize(c) === `<li>${t}</li>`);
    const original2 = liByText('2')!;
    renderer.render(list([3, 1, 2]));
    expect(host.serialize(ul)).toBe('<ul><li>3</li><li>1</li><li>2</li></ul>');
    expect(liByText('2')).toBe(original2); // moved, not recreated
  });

  it('adds and removes children at the tail', () => {
    const { host, root, renderer } = setup();
    renderer.render(h('ul', {}, [h('li', { key: 1 }, 'a')]));
    renderer.render(h('ul', {}, [h('li', { key: 1 }, 'a'), h('li', { key: 2 }, 'b')]));
    expect(host.serialize(root.children[0]!)).toBe('<ul><li>a</li><li>b</li></ul>');
    renderer.render(h('ul', {}, [h('li', { key: 2 }, 'b')]));
    expect(host.serialize(root.children[0]!)).toBe('<ul><li>b</li></ul>');
  });

  it('replaces a node when the tag changes', () => {
    const { host, root, renderer } = setup();
    renderer.render(h('div', {}, 'x'));
    renderer.render(h('section', {}, 'x'));
    expect(host.serialize(root.children[0]!)).toBe('<section>x</section>');
  });

  it('unmount detaches the managed tree', () => {
    const { root, renderer } = setup();
    renderer.render(h('div'));
    renderer.unmount();
    expect(root.children).toHaveLength(0);
  });
});

describe('sameVNode', () => {
  it('matches by kind, tag and key', () => {
    expect(sameVNode(h('div', { key: 1 }), h('div', { key: 1 }))).toBe(true);
    expect(sameVNode(h('div', { key: 1 }), h('div', { key: 2 }))).toBe(false);
    expect(sameVNode(h('div'), h('span'))).toBe(false);
    expect(sameVNode(text('a'), text('b'))).toBe(true);
    expect(sameVNode(text('a'), h('div'))).toBe(false);
  });
});
