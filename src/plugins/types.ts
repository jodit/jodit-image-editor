import type { VNode } from '../render/vdom/vnode';
import type { EditorPatch, EditorState } from '../core/state/types';
import type { FilterDefinition } from '../core/filters/filters';

/**
 * The external extension contract.
 *
 * A plugin is a named bag of registrations applied at `setup` time. Tools add
 * tabs and panels; filters add entries to the colour-filter registry. Plugins
 * never touch the DOM or the store directly — they describe additions and
 * dispatch patches, keeping the same `view = f(state)` discipline.
 */

/** What a tool panel receives each render: current state + the dispatcher. */
export interface ToolContext {
  state: EditorState;
  update: (patch: EditorPatch) => void;
}

/** A tab in the left rail plus the contextual panel shown when it is active. */
export interface ToolDefinition {
  /** Stable id; also used as the `activeTab` value. */
  id: string;
  label: string;
  /** Inline SVG markup for the rail icon. */
  icon: string;
  /** Sort order in the rail (ascending). Defaults to registration order. */
  order?: number;
  /** Default `activeTool` to select when this tab opens. */
  defaultTool?: string;
  /** Render the bottom contextual panel. Return `null` for no panel. */
  renderPanel(ctx: ToolContext): VNode | null;
}

/** Surface handed to a plugin's `setup`. */
export interface EditorApi {
  registerTool: (tool: ToolDefinition) => () => void;
  registerFilter: (def: FilterDefinition) => () => void;
  getState: () => EditorState;
  update: (patch: EditorPatch) => void;
}

export interface EditorPlugin {
  name: string;
  /** Perform registrations; optionally return a disposer run on `destroy()`. */
  setup: (api: EditorApi) => void | (() => void);
}
