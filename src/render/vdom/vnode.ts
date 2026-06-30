/**
 * Virtual node model + the `h()` hyperscript helper.
 *
 * VNodes are plain data describing *what* the UI should look like. They carry
 * no reference to the DOM; committing them is the renderer's job. This is the
 * concrete shape of "view = f(state)": components return VNodes.
 */

export type EventHandler = (event: Event) => void;

export interface VProps {
  key?: string | number;
  class?: string;
  style?: Record<string, string | number>;
  /** DOM event handlers keyed by event type, e.g. `{ click: () => ... }`. */
  on?: Record<string, EventHandler>;
  /** Anything else becomes an attribute (or a property for the known set). */
  [name: string]: unknown;
}

export interface VElement {
  kind: 'element';
  tag: string;
  key: string | number | undefined;
  props: VProps;
  children: VNode[];
  /** Filled in by the renderer with the host node it is bound to. */
  node?: unknown;
}

export interface VText {
  kind: 'text';
  text: string;
  /** Text nodes are never keyed; declared so the diff can read `.key` uniformly. */
  key?: undefined;
  node?: unknown;
}

export type VNode = VElement | VText;

export type VChild = VNode | string | number | boolean | null | undefined;

const RESERVED = new Set(['key', 'class', 'style', 'on']);

/** Hyperscript factory. `h('div', { class: 'x' }, [child, 'text'])`. */
export function h(tag: string, props: VProps = {}, children: VChild | VChild[] = []): VElement {
  return {
    kind: 'element',
    tag,
    key: props.key,
    props,
    children: normalizeChildren(children),
  };
}

export function text(value: string | number): VText {
  return { kind: 'text', text: String(value) };
}

/** Flatten, drop falsy holes, and coerce primitives into text nodes. */
export function normalizeChildren(children: VChild | VChild[]): VNode[] {
  const list = Array.isArray(children) ? children : [children];
  const out: VNode[] = [];
  for (const child of list) {
    if (child === null || child === undefined || child === false || child === true) continue;
    out.push(typeof child === 'object' ? child : text(child));
  }
  return out;
}

export function isElement(node: VNode): node is VElement {
  return node.kind === 'element';
}

export function isReservedProp(name: string): boolean {
  return RESERVED.has(name);
}
