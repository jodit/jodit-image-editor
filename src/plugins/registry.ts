import type { ToolDefinition } from './types';

/**
 * Ordered, override-able collection of tools. Registration returns a disposer
 * so plugins (and the editor's teardown) can cleanly remove what they added —
 * no global mutable singletons, one registry instance per editor.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();
  private seq = 0;
  private readonly order = new Map<string, number>();

  /** Unordered tools sort after every explicitly-ordered one, by arrival. */
  private static readonly UNORDERED_BASE = 1e6;

  register(tool: ToolDefinition): () => void {
    this.tools.set(tool.id, tool);
    this.order.set(tool.id, tool.order ?? ToolRegistry.UNORDERED_BASE + this.seq++);
    return () => {
      if (this.tools.get(tool.id) === tool) {
        this.tools.delete(tool.id);
        this.order.delete(tool.id);
      }
    };
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  /** Tools sorted by their `order`, ties broken by registration sequence. */
  list(): ToolDefinition[] {
    return [...this.tools.values()].sort(
      (a, b) => (this.order.get(a.id) ?? 0) - (this.order.get(b.id) ?? 0),
    );
  }

  /** The id to fall back to when the active tab is unknown. */
  first(): ToolDefinition | undefined {
    return this.list()[0];
  }
}
