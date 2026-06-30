import { h } from '../../render/vdom/vnode';
import { segmented, slider } from '../../ui/components/primitives';
import { ICONS } from '../../ui/icons';
import { selectDesign } from '../../core/state/selectors';
import type { FinetuneState } from '../../core/state/types';
import type { ToolDefinition } from '../types';

interface FineField {
  id: keyof FinetuneState;
  label: string;
  icon: string;
  min: number;
  max: number;
}

const FIELDS: FineField[] = [
  { id: 'brightness', label: 'Brightness', icon: ICONS.brightness, min: -100, max: 100 },
  { id: 'contrast', label: 'Contrast', icon: ICONS.contrast, min: -100, max: 100 },
  { id: 'saturation', label: 'Saturation', icon: ICONS.filters, min: -100, max: 100 },
  { id: 'blur', label: 'Blur', icon: ICONS.blur, min: 0, max: 100 },
  { id: 'warmth', label: 'Warmth', icon: ICONS.brightness, min: -100, max: 100 },
];

function activeField(activeTool: string | null): FineField {
  return FIELDS.find((f) => f.id === activeTool) ?? FIELDS[0]!;
}

/**
 * Finetune tool — a single slider whose target is chosen by the sub-tab row.
 * `pointerdown` opens a history step and live `input` replaces it, so a drag is
 * one undo.
 */
export const finetuneTool: ToolDefinition = {
  id: 'finetune',
  label: 'Finetune',
  icon: ICONS.finetune,
  order: 1,
  defaultTool: 'brightness',
  renderPanel({ state, update, t }) {
    const field = activeField(state.activeTool);
    const finetune = selectDesign(state).finetune;
    const value = finetune[field.id];

    // `commit: false` while dragging coalesces the gesture into one undo step.
    const setValue = (v: number, commit: boolean) => {
      const patch: Partial<FinetuneState> = { [field.id]: v };
      update({ design: { finetune: patch }, commit });
    };

    return h('div', { class: 'jie-panel-stack', style: { display: 'contents' } }, [
      slider({
        label: t(field.label),
        value,
        min: field.min,
        max: field.max,
        onStart: () => setValue(value, true),
        onInput: (v) => setValue(v, false),
      }),
      segmented(
        FIELDS.map((f) => ({ id: f.id, label: t(f.label), icon: f.icon })),
        field.id,
        (id) => update({ activeTab: 'finetune', activeTool: id }),
      ),
    ]);
  },
};
