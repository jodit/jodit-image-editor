/**
 * Tiny, DOM-free internationalisation core.
 *
 * Gettext-style: the **English source string is the key**. That means English
 * works with no dictionary at all (lookup falls back to the key itself), and a
 * locale is just a map that overrides some of those strings. Placeholders use
 * `{name}` and are interpolated from a params object.
 *
 * The translator is a pure function, so it is trivially testable and the render
 * layer can receive it as an injected dependency (it never reaches for a global).
 */
export type Messages = Record<string, string>;

export type TranslationParams = Record<string, string | number>;

export type Translator = (message: string, params?: TranslationParams) => string;

/** A named dictionary. Shipped as a separate file, registered on demand. */
export interface Locale {
  /** BCP-47-ish id used as `state.locale`, e.g. `'ru'`, `'zh'`. */
  id: string;
  /** Human-readable name for language pickers, e.g. `'Русский'`. */
  name: string;
  messages: Messages;
}

/**
 * Build a translator from a locale's `messages`, with an optional `fallback`
 * locale checked next. Unknown keys resolve to the key itself.
 */
export function createTranslator(messages: Messages = {}, fallback: Messages = {}): Translator {
  return (message, params) => {
    const template = messages[message] ?? fallback[message] ?? message;
    return params ? interpolate(template, params) : template;
  };
}

/** Replace `{name}` placeholders; unknown placeholders are left untouched. */
export function interpolate(template: string, params: TranslationParams): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}
