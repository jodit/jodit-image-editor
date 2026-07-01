import { describe, expect, it } from 'vitest';
import { resolveText } from './annotate';
import type { TextAnnotation } from '../core/state/types';

const base: TextAnnotation = {
  id: 't1',
  type: 'text',
  text: 'Hi',
  x: 0.5,
  y: 0.25,
  fontSize: 0.1,
  fontFamily: 'Arial',
  color: '#000',
  bold: false,
  italic: false,
  align: 'left',
  valign: 'top',
};

describe('resolveText', () => {
  it('maps normalised coordinates to pixels', () => {
    const r = resolveText(base, { width: 800, height: 400 });
    expect(r.x).toBe(400);
    expect(r.y).toBe(100);
    expect(r.fontPx).toBe(40); // 0.1 * 400
  });

  it('builds a CSS font string honouring weight and slant', () => {
    const r = resolveText({ ...base, bold: true, italic: true }, { width: 100, height: 100 });
    expect(r.font).toBe('italic bold 10px Arial');
  });

  it('keeps the alignment', () => {
    expect(resolveText({ ...base, align: 'center' }, { width: 10, height: 10 }).align).toBe(
      'center',
    );
  });

  it('never produces a sub-pixel font size', () => {
    expect(resolveText({ ...base, fontSize: 0 }, { width: 10, height: 10 }).fontPx).toBe(1);
  });
});
