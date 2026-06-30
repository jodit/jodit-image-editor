import { h } from '../../render/vdom/vnode';
import { button, segmented, slider } from '../../ui/components/primitives';
import { ICONS } from '../../ui/icons';
import { uid } from '../../core/util/id';
import {
  addAnnotation,
  createTextAnnotation,
  findAnnotation,
  removeAnnotation,
  updateAnnotation,
} from '../../core/annotations/operations';
import { selectDesign } from '../../core/state/selectors';
import type { TextAnnotation } from '../../core/state/types';
import type { ToolDefinition } from '../types';

/**
 * Annotate tool — add and edit text labels. New labels land in the centre and
 * become the selection; the property controls then patch that one annotation.
 */
export const annotateTool: ToolDefinition = {
  id: 'annotate',
  label: 'Annotate',
  icon: ICONS.annotate,
  order: 4,
  defaultTool: 'text',
  renderPanel({ state, update, t }) {
    const design = selectDesign(state);
    const selected = findAnnotation(design.annotations, state.selectedAnnotationId);

    const patch = (p: Partial<TextAnnotation>) => {
      if (!selected) return;
      update({ design: { annotations: updateAnnotation(design.annotations, selected.id, p) } });
    };

    const addText = () => {
      const ann = createTextAnnotation(uid());
      update({
        design: { annotations: addAnnotation(design.annotations, ann) },
        selectedAnnotationId: ann.id,
      });
    };

    const editor = selected
      ? h('div', { class: 'jie-fieldrow' }, [
          h('input', {
            class: 'jie-input',
            type: 'text',
            value: selected.text,
            on: { input: (e: Event) => patch({ text: (e.target as HTMLInputElement).value }) },
          }),
          h('input', {
            type: 'color',
            value: selected.color,
            on: { input: (e: Event) => patch({ color: (e.target as HTMLInputElement).value }) },
          }),
          button({
            label: 'B',
            active: selected.bold,
            onClick: () => patch({ bold: !selected.bold }),
          }),
          button({
            label: 'I',
            active: selected.italic,
            onClick: () => patch({ italic: !selected.italic }),
          }),
          slider({
            label: t('Size'),
            value: Math.round(selected.fontSize * 100),
            min: 1,
            max: 40,
            onInput: (v) => patch({ fontSize: v / 100 }),
          }),
          segmented(
            [
              { id: 'left', label: t('Left') },
              { id: 'center', label: t('Center') },
              { id: 'right', label: t('Right') },
            ],
            selected.align,
            (id) => patch({ align: id as TextAnnotation['align'] }),
          ),
          button({
            variant: 'icon',
            icon: ICONS.reset,
            title: t('Delete'),
            onClick: () =>
              update({
                design: { annotations: removeAnnotation(design.annotations, selected.id) },
                selectedAnnotationId: null,
              }),
          }),
        ])
      : null;

    return h('div', { style: { display: 'contents' } }, [
      editor,
      h('div', { class: 'jie-toolrow' }, [
        button({ label: t('Text'), icon: ICONS.text, active: true, onClick: addText }),
      ]),
    ]);
  },
};
