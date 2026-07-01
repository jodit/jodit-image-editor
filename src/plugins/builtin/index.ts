import type { ToolDefinition } from '../types';
import { adjustTool } from './adjust';
import { finetuneTool } from './finetune';
import { filtersTool } from './filters';
import { focusTool } from './focus';
import { annotateTool } from './annotate';
import { resizeTool } from './resize';

/**
 * The default tool set, in rail order. The editor registers these on init; they
 * are ordinary {@link ToolDefinition}s with no privileged access, so a host app
 * can omit, reorder, or replace any of them through the same plugin API.
 */
export function createBuiltinTools(): ToolDefinition[] {
  return [adjustTool, finetuneTool, filtersTool, focusTool, annotateTool, resizeTool];
}

export { adjustTool, finetuneTool, filtersTool, focusTool, annotateTool, resizeTool };
