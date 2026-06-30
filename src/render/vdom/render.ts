import type { Host } from './host';
import { DOM_PROPERTIES } from './host';
import type { EventHandler, VElement, VNode, VProps } from './vnode';
import { isElement } from './vnode';

/**
 * The reconciler: it diffs two VNode trees and applies the minimal set of
 * mutations to a {@link Host}. Generic over the host node type `N`, so the same
 * algorithm drives the real DOM in the browser and an in-memory tree in tests.
 *
 * Event handlers are bound once per type through a stable wrapper that reads the
 * latest handler from a side table; re-renders therefore never re-bind, even
 * though components hand back fresh closures each frame.
 */
interface EventBinding {
  wrapper: EventListener;
  handler: EventHandler;
}

const EMPTY_PROPS: VProps = {};

export class Renderer<N extends object> {
  private readonly events = new WeakMap<N, Map<string, EventBinding>>();
  private prev: VNode | null = null;

  constructor(
    private readonly host: Host<N>,
    private readonly container: N,
  ) {}

  /** Render `next` as the single managed child of the container. */
  render(next: VNode): void {
    if (this.prev === null) {
      const node = this.mount(next);
      this.host.insert(this.container, node, null);
    } else if (sameVNode(this.prev, next)) {
      this.patch(this.prev, next);
    } else {
      const node = this.mount(next);
      const old = this.prev.node as N;
      this.host.insert(this.container, node, this.host.nextSibling(old));
      this.host.remove(this.container, old);
    }
    this.prev = next;
  }

  /** Detach the managed subtree. */
  unmount(): void {
    if (this.prev) {
      this.host.remove(this.container, this.prev.node as N);
      this.prev = null;
    }
  }

  private mount(vnode: VNode): N {
    if (!isElement(vnode)) {
      const node = this.host.createText(vnode.text);
      vnode.node = node;
      return node;
    }
    const el = this.host.createElement(vnode.tag);
    vnode.node = el;
    this.applyProps(el, EMPTY_PROPS, vnode.props);
    for (const child of vnode.children) {
      this.host.insert(el, this.mount(child), null);
    }
    return el;
  }

  private patch(oldV: VNode, newV: VNode): N {
    const node = oldV.node as N;
    newV.node = node;
    if (!isElement(newV) || !isElement(oldV)) {
      if (!isElement(newV) && newV.text !== (oldV as { text?: string }).text) {
        this.host.setText(node, newV.text);
      }
      return node;
    }
    this.applyProps(node, oldV.props, newV.props);
    this.patchChildren(node, oldV.children, newV.children);
    return node;
  }

  // --- props ---------------------------------------------------------------

  private applyProps(node: N, oldProps: VProps, newProps: VProps): void {
    this.applyClass(node, oldProps.class, newProps.class);
    this.applyStyle(node, oldProps.style ?? {}, newProps.style ?? {});
    this.applyEvents(node, oldProps.on ?? {}, newProps.on ?? {});

    for (const name of Object.keys(newProps)) {
      if (isReserved(name)) continue;
      const value = newProps[name];
      if (value === oldProps[name]) continue;
      this.applyAttr(node, name, value);
    }
    for (const name of Object.keys(oldProps)) {
      if (isReserved(name) || name in newProps) continue;
      if (DOM_PROPERTIES.has(name)) this.host.setProperty(node, name, '');
      else this.host.removeAttribute(node, name);
    }
  }

  private applyAttr(node: N, name: string, value: unknown): void {
    if (DOM_PROPERTIES.has(name)) {
      this.host.setProperty(node, name, value);
    } else if (value === false || value === null || value === undefined) {
      this.host.removeAttribute(node, name);
    } else {
      this.host.setAttribute(node, name, value === true ? '' : stringifyAttr(value));
    }
  }

  private applyClass(node: N, oldClass?: string, newClass?: string): void {
    if (oldClass === newClass) return;
    if (newClass) this.host.setAttribute(node, 'class', newClass);
    else this.host.removeAttribute(node, 'class');
  }

  private applyStyle(
    node: N,
    oldStyle: Record<string, string | number>,
    newStyle: Record<string, string | number>,
  ): void {
    for (const prop of Object.keys(newStyle)) {
      if (newStyle[prop] !== oldStyle[prop]) this.host.setStyle(node, prop, String(newStyle[prop]));
    }
    for (const prop of Object.keys(oldStyle)) {
      if (!(prop in newStyle)) this.host.removeStyle(node, prop);
    }
  }

  private applyEvents(
    node: N,
    oldOn: Record<string, EventHandler>,
    newOn: Record<string, EventHandler>,
  ): void {
    let map = this.events.get(node);
    for (const type of Object.keys(oldOn)) {
      if (!(type in newOn) && map?.has(type)) {
        this.host.removeEventListener(node, type, map.get(type)!.wrapper);
        map.delete(type);
      }
    }
    for (const type of Object.keys(newOn)) {
      const handler = newOn[type]!;
      const existing = map?.get(type);
      if (existing) {
        existing.handler = handler;
        continue;
      }
      if (!map) {
        map = new Map();
        this.events.set(node, map);
      }
      const binding: EventBinding = {
        handler,
        wrapper: (event: Event) => binding.handler(event),
      };
      map.set(type, binding);
      this.host.addEventListener(node, type, binding.wrapper);
    }
  }

  // --- keyed children diff (snabbdom four-pointer algorithm) ---------------

  private patchChildren(parent: N, oldCh: VNode[], newCh: VNode[]): void {
    let oldStart = 0;
    let oldEnd = oldCh.length - 1;
    let newStart = 0;
    let newEnd = newCh.length - 1;
    let keyMap: Map<string | number, number> | null = null;

    while (oldStart <= oldEnd && newStart <= newEnd) {
      const os = oldCh[oldStart]!;
      const oe = oldCh[oldEnd]!;
      const ns = newCh[newStart]!;
      const ne = newCh[newEnd]!;

      if (!sameVNode(os, ns)) {
        // shifted/removed at the head — fall through to other cases
      } else {
        this.patch(os, ns);
        oldStart++;
        newStart++;
        continue;
      }
      if (sameVNode(oe, ne)) {
        this.patch(oe, ne);
        oldEnd--;
        newEnd--;
        continue;
      }
      if (sameVNode(os, ne)) {
        this.patch(os, ne);
        this.host.insert(parent, os.node as N, this.host.nextSibling(oe.node as N));
        oldStart++;
        newEnd--;
        continue;
      }
      if (sameVNode(oe, ns)) {
        this.patch(oe, ns);
        this.host.insert(parent, oe.node as N, os.node as N);
        oldEnd--;
        newStart++;
        continue;
      }

      keyMap ??= buildKeyMap(oldCh, oldStart, oldEnd);
      const movedIndex = ns.key !== undefined ? keyMap.get(ns.key) : undefined;
      if (movedIndex === undefined) {
        this.host.insert(parent, this.mount(ns), os.node as N);
      } else {
        const moved = oldCh[movedIndex]!;
        this.patch(moved, ns);
        moved.node = undefined; // mark as consumed so it isn't removed later
        this.host.insert(parent, ns.node as N, os.node as N);
      }
      newStart++;
    }

    if (oldStart > oldEnd) {
      const anchor = newCh[newEnd + 1]?.node ?? null;
      for (let i = newStart; i <= newEnd; i++) {
        this.host.insert(parent, this.mount(newCh[i]!), anchor as N | null);
      }
    } else if (newStart > newEnd) {
      for (let i = oldStart; i <= oldEnd; i++) {
        const node = oldCh[i]!.node;
        if (node) this.host.remove(parent, node as N);
      }
    }
  }
}

function buildKeyMap(children: VNode[], start: number, end: number): Map<string | number, number> {
  const map = new Map<string | number, number>();
  for (let i = start; i <= end; i++) {
    const key = children[i]!.key;
    if (key !== undefined) map.set(key, i);
  }
  return map;
}

/** Two nodes are "the same" (patchable in place) iff kind, tag and key match. */
export function sameVNode(a: VNode, b: VNode): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'text') return true;
  return a.tag === (b as VElement).tag && a.key === (b as VElement).key;
}

function isReserved(name: string): boolean {
  return name === 'key' || name === 'class' || name === 'style' || name === 'on';
}

/** Stringify an attribute value safely (objects → JSON, primitives → String). */
function stringifyAttr(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value) ?? '';
}
