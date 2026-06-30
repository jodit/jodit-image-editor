import { describe, expect, it } from 'vitest';
import ru from './ru';
import es from './es';
import fr from './fr';
import de from './de';
import zh from './zh';
import type { Locale } from '../core/i18n/i18n';

const ALL: Locale[] = [ru, es, fr, de, zh];

describe('shipped locales', () => {
  it('each declares an id, a human name and messages', () => {
    for (const locale of ALL) {
      expect(locale.id).toBeTruthy();
      expect(locale.name).toBeTruthy();
      expect(Object.keys(locale.messages).length).toBeGreaterThan(0);
    }
  });

  it('ids are unique', () => {
    const ids = ALL.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // All locales must cover exactly the same set of keys, so none drifts behind.
  it('all locales share the same key set (no missing / extra strings)', () => {
    const reference = Object.keys(ru.messages).sort();
    for (const locale of ALL) {
      expect(Object.keys(locale.messages).sort(), `locale "${locale.id}"`).toEqual(reference);
    }
  });

  it('no translation is left empty', () => {
    for (const locale of ALL) {
      for (const [key, value] of Object.entries(locale.messages)) {
        expect(value.length, `${locale.id}:${key}`).toBeGreaterThan(0);
      }
    }
  });
});
