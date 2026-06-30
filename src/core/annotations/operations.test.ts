import { describe, expect, it } from 'vitest';
import {
  addAnnotation,
  createTextAnnotation,
  findAnnotation,
  removeAnnotation,
  updateAnnotation,
} from './operations';

describe('annotation operations', () => {
  it('createTextAnnotation applies sensible defaults and overrides', () => {
    const a = createTextAnnotation('t1', { text: 'Hello', bold: true });
    expect(a.id).toBe('t1');
    expect(a.type).toBe('text');
    expect(a.text).toBe('Hello');
    expect(a.bold).toBe(true);
    expect(a.align).toBe('center');
  });

  it('addAnnotation appends without mutating', () => {
    const list = [createTextAnnotation('t1')];
    const next = addAnnotation(list, createTextAnnotation('t2'));
    expect(next).toHaveLength(2);
    expect(list).toHaveLength(1);
  });

  it('removeAnnotation drops by id', () => {
    const list = [createTextAnnotation('t1'), createTextAnnotation('t2')];
    expect(removeAnnotation(list, 't1').map((a) => a.id)).toEqual(['t2']);
  });

  it('findAnnotation locates by id, null-safe', () => {
    const list = [createTextAnnotation('t1')];
    expect(findAnnotation(list, 't1')?.id).toBe('t1');
    expect(findAnnotation(list, null)).toBeUndefined();
    expect(findAnnotation(list, 'nope')).toBeUndefined();
  });

  it('updateAnnotation patches the matching item only', () => {
    const list = [createTextAnnotation('t1'), createTextAnnotation('t2')];
    const next = updateAnnotation(list, 't2', { text: 'changed' });
    expect(next[0]!.text).toBe('Text');
    expect((next[1] as { text: string }).text).toBe('changed');
  });

  it('updateAnnotation is a no-op for unknown ids', () => {
    const list = [createTextAnnotation('t1')];
    expect(updateAnnotation(list, 'x', { text: 'y' })).toEqual(list);
  });
});
