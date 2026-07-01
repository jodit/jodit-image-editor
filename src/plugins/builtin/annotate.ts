import { h } from '../../render/vdom/vnode';
import { button, slider } from '../../ui/components/primitives';
import { colorPicker } from '../../ui/components/color-picker';
import { fontSelect } from '../../ui/components/font-select';
import { positionGrid } from '../../ui/components/position-grid';
import { ICONS } from '../../ui/icons';
import { uid } from '../../core/util/id';
import {
  createTextAnnotation,
  removeAnnotation,
  updateAnnotation,
} from '../../core/annotations/operations';
import { selectDesign } from '../../core/state/selectors';
import type { HAlign, TextAnnotation, VAlign } from '../../core/state/types';
import type { ToolDefinition } from '../types';

const COLOR_POPOVER = 'text-color';
const FONT_POPOVER = 'text-font';
const PAD = 0.04; // keep the anchored text a little off the edges

/** Normalised anchor coordinates for a `(align, valign)` cell. */
function anchorXY(align: HAlign, valign: VAlign): { x: number; y: number } {
  return {
    x: align === 'left' ? PAD : align === 'right' ? 1 - PAD : 0.5,
    y: valign === 'top' ? PAD : valign === 'bottom' ? 1 - PAD : 0.5,
  };
}

/**
 * Text tool — a single text label over the image. When none exists the panel
 * shows an "Add text" button; once added it shows the property controls (text,
 * font, colour, bold/italic, size, a 3×3 position grid, delete).
 */
export const annotateTool: ToolDefinition = {
  id: 'annotate',
  label: 'Text',
  icon: ICONS.text,
  order: 4,
  defaultTool: 'text',
  renderPanel({ state, update, t }) {
    const design = selectDesign(state);
    // Only one text annotation is supported.
    const text = design.annotations[0];

    if (!text) {
      const addText = () => {
        const ann = createTextAnnotation(uid());
        update({ design: { annotations: [ann] }, selectedAnnotationId: ann.id });
      };
      return h('div', { class: 'jie-toolrow' }, [
        button({ label: t('Add text'), icon: ICONS.text, variant: 'primary', onClick: addText }),
      ]);
    }

    const patch = (p: Partial<TextAnnotation>) =>
      update({ design: { annotations: updateAnnotation(design.annotations, text.id, p) } });

    return h('div', { class: 'jie-toolrow' }, [
      h('input', {
        class: 'jie-input',
        type: 'text',
        value: text.text,
        on: { input: (e: Event) => patch({ text: (e.target as HTMLInputElement).value }) },
      }),
      fontSelect({
        value: text.fontFamily,
        fonts: state.fonts,
        title: t('Font'),
        open: state.activePopover === FONT_POPOVER,
        onToggle: () =>
          update({ activePopover: state.activePopover === FONT_POPOVER ? null : FONT_POPOVER }),
        onPick: (fontFamily) => {
          patch({ fontFamily });
          update({ activePopover: null });
        },
      }),
      colorPicker({
        value: text.color,
        palette: state.palette,
        title: t('Colour'),
        open: state.activePopover === COLOR_POPOVER,
        onToggle: () =>
          update({ activePopover: state.activePopover === COLOR_POPOVER ? null : COLOR_POPOVER }),
        onPick: (color) => {
          patch({ color });
          update({ activePopover: null });
        },
      }),
      button({
        label: 'B',
        className: 'jie-btn--bold',
        active: text.bold,
        onClick: () => patch({ bold: !text.bold }),
      }),
      button({
        label: 'I',
        className: 'jie-btn--italic',
        active: text.italic,
        onClick: () => patch({ italic: !text.italic }),
      }),
      slider({
        label: t('Size'),
        value: Math.round(text.fontSize * 100),
        min: 1,
        max: 40,
        onInput: (v) => patch({ fontSize: v / 100 }),
      }),
      positionGrid({
        align: text.align,
        valign: text.valign,
        onPick: (align, valign) => patch({ align, valign, ...anchorXY(align, valign) }),
      }),
      button({
        variant: 'icon',
        icon: ICONS.trash,
        title: t('Delete'),
        onClick: () =>
          update({
            design: { annotations: removeAnnotation(design.annotations, text.id) },
            selectedAnnotationId: null,
          }),
      }),
    ]);
  },
};
