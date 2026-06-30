/**
 * The rendering target, abstracted.
 *
 * The reconciler talks to a `Host<N>` instead of `document` directly. The
 * production host wraps the DOM; tests use an in-memory host. This is the seam
 * that makes "everything is decoupled from the DOM" true for the render layer.
 */
export interface Host<N> {
  createElement(tag: string): N;
  createText(value: string): N;
  setText(node: N, value: string): void;

  insert(parent: N, node: N, anchor: N | null): void;
  remove(parent: N, node: N): void;
  parent(node: N): N | null;
  nextSibling(node: N): N | null;

  setAttribute(node: N, name: string, value: string): void;
  removeAttribute(node: N, name: string): void;
  /** Set a DOM *property* (value/checked/disabled) rather than an attribute. */
  setProperty(node: N, name: string, value: unknown): void;

  setStyle(node: N, prop: string, value: string): void;
  removeStyle(node: N, prop: string): void;

  addEventListener(node: N, type: string, handler: EventListener): void;
  removeEventListener(node: N, type: string, handler: EventListener): void;
}

/** Properties we set directly on the node rather than as string attributes. */
export const DOM_PROPERTIES = new Set(['value', 'checked', 'disabled', 'selected', 'innerHTML']);
