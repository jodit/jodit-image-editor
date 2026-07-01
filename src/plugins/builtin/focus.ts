import { h } from '../../render/vdom/vnode';
import { button, segmented, slider } from '../../ui/components/primitives';
import { ICONS } from '../../ui/icons';
import { createDefaultFocus } from '../../core/filters/focus';
import { selectDesign } from '../../core/state/selectors';
import type { Focus, FocusShape } from '../../core/state/types';
import type { ToolDefinition } from '../types';

/**
 * Focus tool — a selective ("tilt-shift") blur: keep a radial/linear region
 * sharp and blur the rest. The whole thing is declarative (`design.focus`);
 * touching a control materialises it, the trash button clears it.
 */
export const focusTool: ToolDefinition = {
  id: 'focus',
  label: 'Focus',
  icon: ICONS.focus,
  order: 3,
  defaultTool: 'radial',
  renderPanel({ state, update, t }) {
    const focus: Focus = selectDesign(state).focus ?? createDefaultFocus();
    const enabled = selectDesign(state).focus !== null;

    // `commit: false` while dragging coalesces a gesture into one undo step.
    const set = (patch: Partial<Focus>, commit: boolean) =>
      update({ design: { focus: { ...focus, ...patch } }, commit });

    return h('div', { class: 'jie-panel-stack', style: { display: 'contents' } }, [
      h('div', { class: 'jie-toolrow' }, [
        slider({
          label: t('Intensity'),
          value: focus.amount,
          min: 0,
          max: 100,
          onStart: () => set({ amount: focus.amount }, true),
          onInput: (v) => set({ amount: v }, false),
        }),
        slider({
          label: t('Radius'),
          value: Math.round(focus.radius * 100),
          min: 5,
          max: 90,
          onStart: () => set({ radius: focus.radius }, true),
          onInput: (v) => set({ radius: v / 100 }, false),
        }),
        enabled
          ? button({
              variant: 'icon',
              icon: ICONS.trash,
              title: t('Reset'),
              onClick: () => update({ design: { focus: null } }),
            })
          : null,
      ]),
      segmented(
        [
          { id: 'radial', label: t('Radial') },
          { id: 'linear', label: t('Linear') },
        ],
        focus.shape,
        (id) => set({ shape: id as FocusShape }, true),
      ),
    ]);
  },
};
