import { h } from '../../render/vdom/vnode';
import { button } from '../../ui/components/primitives';
import { ICONS } from '../../ui/icons';
import { selectDesign, selectIsCropping } from '../../core/state/selectors';
import type { ToolDefinition } from '../types';

/**
 * Adjust tool — the orientation row from the reference UI: a Crop toggle plus
 * Rotate / Flip X / Flip Y. Each maps to a single declarative design patch.
 */
export const adjustTool: ToolDefinition = {
  id: 'adjust',
  label: 'Adjust',
  icon: ICONS.adjust,
  order: 0,
  defaultTool: 'crop',
  renderPanel({ state, update, t }) {
    const design = selectDesign(state);
    const cropping = selectIsCropping(state);

    return h('div', { class: 'jie-toolrow' }, [
      button({
        label: t('Crop'),
        icon: ICONS.crop,
        active: cropping,
        onClick: () => update({ activeTab: 'adjust', activeTool: cropping ? null : 'crop' }),
      }),
      button({
        label: t('Rotate'),
        icon: ICONS.rotate,
        onClick: () => update({ design: { rotate: design.rotate + 90 } }),
      }),
      button({
        label: t('Flip X'),
        icon: ICONS.flipX,
        onClick: () => update({ design: { flip: { horizontal: !design.flip.horizontal } } }),
      }),
      button({
        label: t('Flip Y'),
        icon: ICONS.flipY,
        onClick: () => update({ design: { flip: { vertical: !design.flip.vertical } } }),
      }),
    ]);
  },
};
