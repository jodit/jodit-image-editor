/**
 * Test environment shims.
 *
 * jsdom ships no canvas/2d context. Rather than pulling a native canvas
 * dependency we keep the *pure* layers (raster, operations, filters, pipeline)
 * canvas-free, and stub the few globals the impure adapters reference so their
 * guard-clauses can be exercised. Adapter tests that need a real pipeline use
 * the in-memory fakes living next to them.
 */
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});
