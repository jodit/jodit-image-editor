import type { Annotation, TextAnnotation } from '../state/types';

/**
 * Pure list operations for annotations. They never mutate the input array, so
 * they slot straight into immutable design patches and are tested without any
 * canvas or DOM.
 */

export function createTextAnnotation(
  id: string,
  overrides: Partial<TextAnnotation> = {},
): TextAnnotation {
  return {
    id,
    type: 'text',
    text: 'Text',
    x: 0.5,
    y: 0.4,
    fontSize: 0.06,
    fontFamily: 'Arial',
    color: '#222222',
    bold: false,
    italic: false,
    align: 'center',
    ...overrides,
  };
}

export function addAnnotation(list: readonly Annotation[], ann: Annotation): Annotation[] {
  return [...list, ann];
}

export function removeAnnotation(list: readonly Annotation[], id: string): Annotation[] {
  return list.filter((a) => a.id !== id);
}

export function findAnnotation(
  list: readonly Annotation[],
  id: string | null,
): Annotation | undefined {
  if (id === null) return undefined;
  return list.find((a) => a.id === id);
}

/** Patch a single annotation by id; ids that do not exist are a no-op. */
export function updateAnnotation(
  list: readonly Annotation[],
  id: string,
  patch: Partial<Annotation>,
): Annotation[] {
  return list.map((a) => (a.id === id ? { ...a, ...patch } : a));
}
