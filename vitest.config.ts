import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // jsdom only needed by the handful of DOM-host / canvas-adapter suites.
    // Pure modules run just as well here and far faster than spinning up a
    // browser, while staying DOM-agnostic by construction.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/**/index.ts', 'src/**/*.d.ts'],
    },
  },
});
