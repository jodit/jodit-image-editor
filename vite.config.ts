import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import webpackStats from 'rollup-plugin-webpack-stats';

/**
 * One config, several flavours selected by `--mode`. Each emits a single ESM
 * file; CSS is always injected from JS (`cssInjectedByJsPlugin`), never a
 * separate `.css`.
 *
 *  | mode (`vite build [--mode X]`) | target  | minified | file                               |
 *  | ------------------------------ | ------- | -------- | ---------------------------------- |
 *  | (default `production`)         | esnext  | no       | jodit-image-editor.js  (+ .d.ts)   |
 *  | `min`                          | esnext  | yes      | jodit-image-editor.min.js          |
 *  | `es2021`                       | es2021  | no       | jodit-image-editor.es2021.js       |
 *  | `es2021-min`                   | es2021  | yes      | jodit-image-editor.es2021.min.js   |
 *  | `analyze`                      | esnext  | yes      | + statoscope/stats.json            |
 *
 * Readable builds ship for debuggable consumption / bundler tree-shaking; the
 * `.min` builds are ready for direct `<script type="module">` / CDN use.
 */
const STATS_FILE = resolve(__dirname, 'statoscope', 'stats.json');

export default defineConfig(({ mode }) => {
  const legacy = mode.includes('es2021');
  const analyze = mode === 'analyze';
  const minified = mode.includes('min') || analyze;
  const emitTypes = mode === 'production';

  const fileName = `jodit-image-editor${legacy ? '.es2021' : ''}${minified && !analyze ? '.min' : ''}.js`;

  return {
    build: {
      target: legacy ? 'es2021' : 'esnext',
      emptyOutDir: false,
      sourcemap: true,
      minify: minified ? 'esbuild' : false,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'JoditImageEditor',
        formats: ['es'],
        fileName: () => fileName,
      },
      rollupOptions: {
        output: { exports: 'named' },
      },
    },
    plugins: [
      cssInjectedByJsPlugin(),
      // Bundle-size stats for Statoscope, only when explicitly analyzing.
      ...(analyze
        ? [
            webpackStats({
              write: (_filePath, stats) => {
                const content = JSON.stringify(stats);
                mkdirSync(dirname(STATS_FILE), { recursive: true });
                writeFileSync(STATS_FILE, content);
                return { filepath: STATS_FILE, content };
              },
            }),
          ]
        : []),
      // Types are emitted once, during the primary (default) build.
      ...(emitTypes
        ? [
            dts({
              include: ['src'],
              rollupTypes: true,
              tsconfigPath: resolve(__dirname, 'tsconfig.json'),
            }),
          ]
        : []),
    ],
  };
});
