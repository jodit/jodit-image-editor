import { describe, expect, it } from 'vitest';
import { LocaleRegistry } from './registry';
import type { Locale } from './i18n';

const ru: Locale = { id: 'ru', name: 'Русский', messages: { Save: 'Сохранить' } };

describe('LocaleRegistry', () => {
  it('registers a locale and builds a translator for it', () => {
    const reg = new LocaleRegistry();
    reg.register(ru);
    expect(reg.has('ru')).toBe(true);
    expect(reg.translator('ru')('Save')).toBe('Сохранить');
  });

  it('yields the identity translator for unknown / English locales', () => {
    const reg = new LocaleRegistry();
    expect(reg.translator('en')('Save')).toBe('Save');
    expect(reg.translator('xx')('Crop')).toBe('Crop');
  });

  it('merges additional messages into an existing locale', () => {
    const reg = new LocaleRegistry();
    reg.register(ru);
    reg.register({ id: 'ru', name: 'Русский', messages: { Undo: 'Отменить' } });
    const t = reg.translator('ru');
    expect(t('Save')).toBe('Сохранить'); // kept
    expect(t('Undo')).toBe('Отменить'); // added
  });

  it('the disposer restores the prior state', () => {
    const reg = new LocaleRegistry();
    const dispose = reg.register(ru);
    dispose();
    expect(reg.has('ru')).toBe(false);
  });

  it('lists registered locale ids', () => {
    const reg = new LocaleRegistry();
    reg.register(ru);
    reg.register({ id: 'de', name: 'Deutsch', messages: {} });
    expect(reg.list().sort()).toEqual(['de', 'ru']);
  });
});
