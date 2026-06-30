import { h } from '../../render/vdom/vnode';
import { button, numberField } from '../../ui/components/primitives';
import { ICONS } from '../../ui/icons';
import { lockedResize } from '../../core/geometry/geometry';
import { selectOutputSize } from '../../core/state/selectors';
import type { ToolDefinition } from '../types';

/**
 * Resize tool — width/height inputs with an aspect-ratio lock. The lock state
 * rides on `activeTool` (`'unlocked'` vs default), keeping all state in the one
 * state tree rather than a private field.
 */
export const resizeTool: ToolDefinition = {
  id: 'resize',
  label: 'Resize',
  icon: ICONS.resize,
  order: 5,
  renderPanel({ state, update, t }) {
    const size = selectOutputSize(state);
    if (!size) return null;

    const locked = state.activeTool !== 'unlocked';
    const apply = (next: { width?: number; height?: number }) =>
      update({ design: { resize: lockedResize(size, next, locked, state.minResizeSize) } });

    return h('div', { class: 'jie-fieldrow' }, [
      numberField({
        label: t('Width'),
        value: size.width,
        suffix: t('px'),
        onChange: (w) => apply({ width: w }),
      }),
      button({
        variant: 'icon',
        icon: locked ? ICONS.lock : ICONS.unlock,
        title: locked ? t('Aspect ratio locked') : t('Aspect ratio unlocked'),
        onClick: () => update({ activeTab: 'resize', activeTool: locked ? 'unlocked' : 'locked' }),
      }),
      numberField({
        label: t('Height'),
        value: size.height,
        suffix: t('px'),
        onChange: (hgt) => apply({ height: hgt }),
      }),
      button({
        variant: 'icon',
        icon: ICONS.reset,
        title: t('Reset size'),
        onClick: () => update({ design: { resize: null } }),
      }),
    ]);
  },
};
