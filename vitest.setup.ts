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

// jsdom has no 2D context and logs a noisy "not implemented" error whenever
// something calls `getContext`. Our editor guards on a null context (it uses a
// fake processor in tests), so make `getContext` return null quietly.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

afterEach(() => {
  vi.restoreAllMocks();
});
