import { h } from '../../render/vdom/vnode';
import { ICONS } from '../../ui/icons';
import { listFilters } from '../../core/filters/filters';
import { selectDesign } from '../../core/state/selectors';
import type { ToolDefinition } from '../types';

/**
 * Filters tool — a horizontally scrollable strip of filter thumbnails. The
 * strip is built from the *registry*, so plugin-registered filters appear here
 * automatically without any change to this file (Open/Closed).
 */
export const filtersTool: ToolDefinition = {
  id: 'filters',
  label: 'Filters',
  icon: ICONS.filters,
  order: 2,
  renderPanel({ state, update, t }) {
    const active = selectDesign(state).filter;

    return h(
      'div',
      { class: 'jie-thumbs' },
      listFilters().map((f) =>
        h(
          'button',
          {
            key: f.id,
            class: 'jie-thumb',
            type: 'button',
            'aria-pressed': f.id === active,
            on: { click: () => update({ design: { filter: f.id } }) },
          },
          [
            // The editor paints a live filtered preview onto this canvas after
            // render (see ImageEditor#paintFilterThumbs).
            h('canvas', { class: 'jie-thumb__swatch', 'data-jie-filter-thumb': f.id }),
            h('span', {}, t(f.label)),
          ],
        ),
      ),
    );
  },
};
