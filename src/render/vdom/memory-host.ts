import type { Host } from './host';

/**
 * A fully in-memory {@link Host}. It proves the render layer has no hidden DOM
 * dependency — the same reconciler drives this tree — and gives tests a cheap,
 * inspectable target. It can also serialise to an HTML-ish string.
 */
export interface MemoryNode {
  type: 'element' | 'text';
  tag?: string;
  text?: string;
  attrs: Map<string, string>;
  props: Map<string, unknown>;
  style: Map<string, string>;
  listeners: Map<string, Set<EventListener>>;
  children: MemoryNode[];
  parent: MemoryNode | null;
}

export class MemoryHost implements Host<MemoryNode> {
  createElement(tag: string): MemoryNode {
    return this.node('element', { tag });
  }

  createText(value: string): MemoryNode {
    return this.node('text', { text: value });
  }

  setText(node: MemoryNode, value: string): void {
    node.text = value;
  }

  insert(parent: MemoryNode, node: MemoryNode, anchor: MemoryNode | null): void {
    if (node.parent) this.remove(node.parent, node);
    const at = anchor ? parent.children.indexOf(anchor) : -1;
    if (at === -1) parent.children.push(node);
    else parent.children.splice(at, 0, node);
    node.parent = parent;
  }

  remove(parent: MemoryNode, node: MemoryNode): void {
    const at = parent.children.indexOf(node);
    if (at !== -1) parent.children.splice(at, 1);
    node.parent = null;
  }

  parent(node: MemoryNode): MemoryNode | null {
    return node.parent;
  }

  nextSibling(node: MemoryNode): MemoryNode | null {
    if (!node.parent) return null;
    const at = node.parent.children.indexOf(node);
    return node.parent.children[at + 1] ?? null;
  }

  setAttribute(node: MemoryNode, name: string, value: string): void {
    node.attrs.set(name, value);
  }

  removeAttribute(node: MemoryNode, name: string): void {
    node.attrs.delete(name);
  }

  setProperty(node: MemoryNode, name: string, value: unknown): void {
    node.props.set(name, value);
  }

  setStyle(node: MemoryNode, prop: string, value: string): void {
    node.style.set(prop, value);
  }

  removeStyle(node: MemoryNode, prop: string): void {
    node.style.delete(prop);
  }

  addEventListener(node: MemoryNode, type: string, handler: EventListener): void {
    const set = node.listeners.get(type) ?? new Set();
    set.add(handler);
    node.listeners.set(type, set);
  }

  removeEventListener(node: MemoryNode, type: string, handler: EventListener): void {
    node.listeners.get(type)?.delete(handler);
  }

  /** Fire every listener bound for `type` on `node` (test convenience). */
  dispatch(node: MemoryNode, type: string, event: Event): void {
    for (const handler of node.listeners.get(type) ?? []) handler(event);
  }

  /** Serialise the subtree to a compact HTML-like string for assertions. */
  serialize(node: MemoryNode): string {
    if (node.type === 'text') return node.text ?? '';
    const attrs = [...node.attrs].map(([k, v]) => ` ${k}="${v}"`).join('');
    const inner = node.children.map((c) => this.serialize(c)).join('');
    return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
  }

  private node(type: 'element' | 'text', partial: Partial<MemoryNode>): MemoryNode {
    return {
      type,
      attrs: new Map(),
      props: new Map(),
      style: new Map(),
      listeners: new Map(),
      children: [],
      parent: null,
      ...partial,
    };
  }
}
