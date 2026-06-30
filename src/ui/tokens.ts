/**
 * Design tokens shared between CSS and JS.
 *
 * The visual scale lives as CSS custom properties (see `editor.css`); this
 * module mirrors the handful of values the *imperative* canvas layer needs
 * (overlay colours, handle sizes) so there is one source of truth.
 */
export const TOKENS = {
  /** Crop overlay accent — matches `--jie-accent`. */
  accent: '#5b5fc7',
  /** Dimmed scrim drawn over the cropped-out region. */
  scrim: 'rgba(17, 24, 39, 0.55)',
  /** Corner handle radius, in screen pixels. */
  handleRadius: 7,
  /** Canvas backdrop behind the image. */
  canvasBackground: '#f3f4f8',
} as const;

export type Tokens = typeof TOKENS;
