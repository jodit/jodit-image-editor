import type { Host } from './host';

/**
 * The production {@link Host}: a thin, allocation-free adapter over the real
 * DOM. It is the *only* place the render layer touches `document`; everything
 * upstream stays DOM-agnostic.
 */
export class DomHost implements Host<Node> {
  constructor(private readonly doc: Document = document) {}

  createElement(tag: string): Node {
    return this.doc.createElement(tag);
  }

  createText(value: string): Node {
    return this.doc.createTextNode(value);
  }

  setText(node: Node, value: string): void {
    node.textContent = value;
  }

  insert(parent: Node, node: Node, anchor: Node | null): void {
    parent.insertBefore(node, anchor);
  }

  remove(parent: Node, node: Node): void {
    if (node.parentNode === parent) parent.removeChild(node);
  }

  parent(node: Node): Node | null {
    return node.parentNode;
  }

  nextSibling(node: Node): Node | null {
    return node.nextSibling;
  }

  setAttribute(node: Node, name: string, value: string): void {
    (node as Element).setAttribute(name, value);
  }

  removeAttribute(node: Node, name: string): void {
    (node as Element).removeAttribute(name);
  }

  setProperty(node: Node, name: string, value: unknown): void {
    (node as unknown as Record<string, unknown>)[name] = value;
  }

  setStyle(node: Node, prop: string, value: string): void {
    (node as HTMLElement).style.setProperty(prop, value);
  }

  removeStyle(node: Node, prop: string): void {
    (node as HTMLElement).style.removeProperty(prop);
  }

  addEventListener(node: Node, type: string, handler: EventListener): void {
    node.addEventListener(type, handler);
  }

  removeEventListener(node: Node, type: string, handler: EventListener): void {
    node.removeEventListener(type, handler);
  }
}
