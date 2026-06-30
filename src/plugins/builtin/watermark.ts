import { h } from '../../render/vdom/vnode';
import { button } from '../../ui/components/primitives';
import { ICONS } from '../../ui/icons';
import { uid } from '../../core/util/id';
import { addAnnotation, createTextAnnotation } from '../../core/annotations/operations';
import { selectDesign } from '../../core/state/selectors';
import type { ToolDefinition } from '../types';

/**
 * Watermark tool — a thin preset over annotations: it stamps a low-key text
 * label near the bottom of the image. Built on the same primitives as Annotate
 * to show how features compose rather than duplicate logic.
 */
export const watermarkTool: ToolDefinition = {
  id: 'watermark',
  label: 'Watermark',
  icon: ICONS.watermark,
  order: 3,
  renderPanel({ state, update, t }) {
    const design = selectDesign(state);

    const stamp = (text: string) => {
      const ann = createTextAnnotation(uid(), {
        text,
        x: 0.5,
        y: 0.88,
        fontSize: 0.045,
        color: '#ffffff',
        align: 'center',
      });
      update({
        design: { annotations: addAnnotation(design.annotations, ann) },
        selectedAnnotationId: ann.id,
        activeTab: 'annotate',
        activeTool: 'text',
      });
    };

    return h('div', { class: 'jie-toolrow' }, [
      h('input', {
        class: 'jie-input',
        type: 'text',
        value: '© Jodit',
        id: 'jie-wm-input',
        placeholder: t('Watermark text'),
      }),
      button({
        label: t('Add watermark'),
        icon: ICONS.watermark,
        variant: 'primary',
        onClick: () => {
          const input = document.getElementById('jie-wm-input') as HTMLInputElement | null;
          stamp(input?.value || '© Jodit');
        },
      }),
    ]);
  },
};
