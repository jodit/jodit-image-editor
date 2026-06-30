import type { EventHandler, VNode } from '../../render/vdom/vnode';
import { h } from '../../render/vdom/vnode';

/**
 * Stateless UI primitives. Each is a pure function returning a {@link VNode};
 * they hold no state and reach for no DOM, so the whole component layer stays
 * inside `view = f(state)` and is trivially testable.
 */

/** Render inline SVG markup as a themable icon. */
export function icon(svg: string): VNode {
  return h('span', { class: 'jie-icon', innerHTML: svg });
}

export interface ButtonProps {
  label?: string;
  icon?: string;
  onClick: EventHandler;
  variant?: 'default' | 'primary' | 'icon';
  active?: boolean;
  disabled?: boolean;
  title?: string;
  /** Extra class(es) appended after the computed ones, e.g. `'jie-btn--bold'`. */
  className?: string;
  key?: string | number;
}

export function button(props: ButtonProps): VNode {
  const classes = ['jie-btn'];
  if (props.variant === 'primary') classes.push('jie-btn--primary');
  if (props.variant === 'icon') classes.push('jie-btn--icon');
  if (props.active) classes.push('jie-btn--active');
  if (props.className) classes.push(props.className);

  const children: VNode[] = [];
  if (props.icon) children.push(icon(props.icon));
  if (props.label) children.push(h('span', {}, props.label));

  return h(
    'button',
    {
      key: props.key,
      class: classes.join(' '),
      type: 'button',
      disabled: props.disabled ?? false,
      title: props.title ?? props.label ?? '',
      on: { click: props.onClick },
    },
    children,
  );
}

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onInput: (value: number) => void;
  /** Fired on press, before the first input — lets callers open a history step. */
  onStart?: () => void;
}

export function slider(props: SliderProps): VNode {
  const onStart = props.onStart;
  const on: Record<string, EventHandler> = {
    input: (e: Event) => props.onInput(Number((e.target as HTMLInputElement).value)),
  };
  if (onStart) on.pointerdown = () => onStart();

  return h('div', { class: 'jie-slider' }, [
    h('span', { class: 'jie-slider__label' }, props.label),
    h('input', {
      class: 'jie-range',
      type: 'range',
      min: String(props.min),
      max: String(props.max),
      step: String(props.step ?? 1),
      value: String(props.value),
      on,
    }),
    h('span', { class: 'jie-slider__value' }, String(Math.round(props.value))),
  ]);
}

export interface NumberFieldProps {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export function numberField(props: NumberFieldProps): VNode {
  return h('label', { class: 'jie-field' }, [
    h('span', {}, props.label),
    h('span', { style: { display: 'flex', 'align-items': 'center', gap: '6px' } }, [
      h('input', {
        class: 'jie-input',
        type: 'number',
        value: String(props.value),
        on: {
          change: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isFinite(v)) props.onChange(v);
          },
        },
      }),
      props.suffix ? h('span', {}, props.suffix) : null,
    ]),
  ]);
}

export interface SegmentedOption {
  id: string;
  label: string;
  icon?: string;
}

/** A horizontal group of mutually-exclusive buttons (the panel sub-tabs). */
export function segmented(
  options: SegmentedOption[],
  active: string,
  onSelect: (id: string) => void,
): VNode {
  return h(
    'div',
    { class: 'jie-toolrow' },
    options.map((opt) =>
      button({
        key: opt.id,
        label: opt.label,
        icon: opt.icon,
        active: opt.id === active,
        onClick: () => onSelect(opt.id),
      }),
    ),
  );
}
