import type { VNode } from '../../render/vdom/vnode';
import { h } from '../../render/vdom/vnode';
import { icon } from './primitives';
import { ICONS } from '../icons';
import type { FontOption } from '../../core/state/types';

/**
 * A font dropdown: a trigger showing the current font (rendered in that font)
 * and a popover list where every option previews itself. Same popover pattern
 * as the colour picker — open/close lives in state, a backdrop closes it.
 */
export interface FontSelectProps {
  value: string;
  fonts: FontOption[];
  open: boolean;
  onToggle: () => void;
  onPick: (value: string) => void;
  title?: string;
}

export function fontSelect(props: FontSelectProps): VNode {
  const current = props.fonts.find((f) => f.value === props.value);
  const children: VNode[] = [
    h(
      'button',
      {
        class: 'jie-fontselect__trigger',
        type: 'button',
        title: props.title ?? 'Font',
        'aria-haspopup': 'listbox',
        'aria-expanded': String(props.open),
        on: { click: () => props.onToggle() },
      },
      [
        icon(ICONS.font),
        h('span', { style: { 'font-family': props.value } }, current?.label ?? 'Font'),
        icon(ICONS.book),
      ],
    ),
  ];

  if (props.open) {
    children.push(
      h('div', { class: 'jie-popover__backdrop', on: { click: () => props.onToggle() } }),
      h(
        'div',
        { class: 'jie-popover jie-fontlist', role: 'listbox' },
        props.fonts.map((f) =>
          h(
            'button',
            {
              key: f.value,
              class: 'jie-fontlist__item',
              type: 'button',
              'aria-pressed': String(f.value === props.value),
              style: { 'font-family': f.value },
              on: { click: () => props.onPick(f.value) },
            },
            f.label,
          ),
        ),
      ),
    );
  }

  return h('div', { class: 'jie-fontselect' }, children);
}
