import { describe, expect, it } from 'vitest';
import { createTranslator, interpolate } from './i18n';

describe('interpolate', () => {
  it('replaces {name} placeholders from params', () => {
    expect(interpolate('{w} × {h} px', { w: 800, h: 600 })).toBe('800 × 600 px');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('hi {name}', {})).toBe('hi {name}');
  });
});

describe('createTranslator', () => {
  it('is the identity (English) with no dictionary', () => {
    const t = createTranslator();
    expect(t('Save')).toBe('Save');
    expect(t('Anything at all')).toBe('Anything at all');
  });

  it('translates known keys and falls back to the key otherwise', () => {
    const t = createTranslator({ Save: 'Сохранить' });
    expect(t('Save')).toBe('Сохранить');
    expect(t('Undo')).toBe('Undo'); // not in dict → key itself
  });

  it('checks the fallback locale before giving up', () => {
    const t = createTranslator({ Save: 'Speichern' }, { Undo: 'Rückgängig' });
    expect(t('Save')).toBe('Speichern');
    expect(t('Undo')).toBe('Rückgängig'); // from fallback
    expect(t('Redo')).toBe('Redo'); // neither → key
  });

  it('interpolates params into the resolved message', () => {
    const t = createTranslator({ 'Hello {name}': 'Привет, {name}' });
    expect(t('Hello {name}', { name: 'Jodit' })).toBe('Привет, Jodit');
  });
});
