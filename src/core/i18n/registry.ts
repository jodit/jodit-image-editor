import type { Locale, Messages, Translator } from './i18n';
import { createTranslator } from './i18n';

/**
 * Per-editor collection of locales. English is implicit: it has no entry, so an
 * unknown/`'en'` locale resolves to an identity translator (the source strings).
 *
 * No locale data is bundled here — dictionaries are registered at runtime
 * (`new ImageEditor({ locales })` or `api.registerLocale`), which is what keeps
 * the core bundle English-only.
 */
export class LocaleRegistry {
  private readonly locales = new Map<string, Messages>();

  /** Add (or merge into) a locale. Returns a disposer restoring the prior state. */
  register(locale: Locale): () => void {
    const prev = this.locales.get(locale.id);
    this.locales.set(locale.id, { ...(prev ?? {}), ...locale.messages });
    return () => {
      if (prev) this.locales.set(locale.id, prev);
      else this.locales.delete(locale.id);
    };
  }

  has(id: string): boolean {
    return this.locales.has(id);
  }

  get(id: string): Messages | undefined {
    return this.locales.get(id);
  }

  list(): string[] {
    return [...this.locales.keys()];
  }

  /** Build a translator for `id`; unknown ids yield the identity (English). */
  translator(id: string): Translator {
    return createTranslator(this.locales.get(id) ?? {});
  }
}
