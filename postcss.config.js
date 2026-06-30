import postcssNesting from 'postcss-nesting';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    // Native-ish CSS nesting so component styles read top-down.
    postcssNesting(),
    // Targets "green" evergreen browsers via the `browserslist` field.
    autoprefixer(),
  ],
};
