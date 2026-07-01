import type { VNode } from '../../render/vdom/vnode';
import { h } from '../../render/vdom/vnode';

/**
 * A colour picker: a swatch button that toggles a popover of preset swatches.
 * It replaces the native `<input type="color">` with something themable and
 * configurable (the palette). Open/close is driven by state (`view = f(state)`);
 * a full-cover backdrop closes it on an outside click — no global listeners.
 */
export interface ColorPickerProps {
  value: string;
  palette: string[];
  open: boolean;
  onToggle: () => void;
  onPick: (color: string) => void;
  title?: string;
}

export function colorPicker(props: ColorPickerProps): VNode {
  const children: VNode[] = [
    h('button', {
      class: 'jie-color',
      type: 'button',
      title: props.title ?? 'Colour',
      style: { background: props.value },
      'aria-haspopup': 'true',
      'aria-expanded': String(props.open),
      on: { click: () => props.onToggle() },
    }),
  ];

  if (props.open) {
    children.push(
      h('div', { class: 'jie-popover__backdrop', on: { click: () => props.onToggle() } }),
      h(
        'div',
        { class: 'jie-popover jie-swatches', role: 'listbox' },
        props.palette.map((color) =>
          h('button', {
            key: color,
            class: 'jie-swatch',
            type: 'button',
            title: color,
            style: { background: color },
            'aria-pressed': String(color.toLowerCase() === props.value.toLowerCase()),
            on: { click: () => props.onPick(color) },
          }),
        ),
      ),
    );
  }

  return h('div', { class: 'jie-colorpicker' }, children);
}
