/**
 * Monotonic id generator.
 *
 * Annotations need stable, unique ids for keyed rendering and selection. A
 * simple incrementing counter keeps this deterministic (no `Math.random`,
 * no clock) which makes any code that builds ids straightforward to test.
 */
export function createIdFactory(prefix = 'id'): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

/** Shared default factory for ad-hoc ids. */
export const uid = createIdFactory('jie');
