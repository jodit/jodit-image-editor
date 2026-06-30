import type { ToolDefinition } from '../types';
import { adjustTool } from './adjust';
import { finetuneTool } from './finetune';
import { filtersTool } from './filters';
import { watermarkTool } from './watermark';
import { annotateTool } from './annotate';
import { resizeTool } from './resize';

/**
 * The default tool set, in rail order. The editor registers these on init; they
 * are ordinary {@link ToolDefinition}s with no privileged access, so a host app
 * can omit, reorder, or replace any of them through the same plugin API.
 */
export function createBuiltinTools(): ToolDefinition[] {
  return [adjustTool, finetuneTool, filtersTool, watermarkTool, annotateTool, resizeTool];
}

export { adjustTool, finetuneTool, filtersTool, watermarkTool, annotateTool, resizeTool };
