import type { VNode } from '../../render/vdom/vnode';
import { h } from '../../render/vdom/vnode';
import { icon } from './primitives';
import { ICONS } from '../icons';
import type { HAlign, VAlign } from '../../core/state/types';

/**
 * A 3×3 anchor control: nine arrow buttons placing an element at a corner /
 * edge / centre of the image. Emits the `(align, valign)` pair for the picked
 * cell; the caller maps that to normalised coordinates.
 */
export interface PositionGridProps {
  align: HAlign;
  valign: VAlign;
  onPick: (align: HAlign, valign: VAlign) => void;
}

const CELLS: Array<{ align: HAlign; valign: VAlign; icon: string }> = [
  { align: 'left', valign: 'top', icon: ICONS.posTopLeft },
  { align: 'center', valign: 'top', icon: ICONS.posTop },
  { align: 'right', valign: 'top', icon: ICONS.posTopRight },
  { align: 'left', valign: 'middle', icon: ICONS.posLeft },
  { align: 'center', valign: 'middle', icon: ICONS.posCenter },
  { align: 'right', valign: 'middle', icon: ICONS.posRight },
  { align: 'left', valign: 'bottom', icon: ICONS.posBottomLeft },
  { align: 'center', valign: 'bottom', icon: ICONS.posBottom },
  { align: 'right', valign: 'bottom', icon: ICONS.posBottomRight },
];

export function positionGrid(props: PositionGridProps): VNode {
  return h(
    'div',
    { class: 'jie-posgrid', role: 'group' },
    CELLS.map((cell) =>
      h(
        'button',
        {
          key: `${cell.valign}-${cell.align}`,
          class: 'jie-posgrid__cell',
          type: 'button',
          'data-pos': `${cell.valign}-${cell.align}`,
          'aria-pressed': String(cell.align === props.align && cell.valign === props.valign),
          on: { click: () => props.onPick(cell.align, cell.valign) },
        },
        [icon(cell.icon)],
      ),
    ),
  );
}
