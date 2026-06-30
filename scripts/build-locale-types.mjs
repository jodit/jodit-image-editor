#!/usr/bin/env node
/**
 * Emit a `.d.ts` next to each built locale chunk.
 *
 * Every locale module has the identical shape (`export default Locale`), so we
 * write a tiny shared declaration per file rather than wrestling the bundler's
 * type emitter. Run after `vite build --mode locales`.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, 'src/locales');
const outDir = resolve(root, 'dist/locales');

mkdirSync(outDir, { recursive: true });

const dts = `import type { Locale } from '../index';
declare const locale: Locale;
export default locale;
`;

const ids = readdirSync(srcDir)
  .filter((f) => f.endsWith('.ts') && !/\.(d|test|spec)\.ts$/.test(f))
  .map((f) => f.replace(/\.ts$/, ''));

for (const id of ids) {
  writeFileSync(resolve(outDir, `${id}.d.ts`), dts);
}

console.log(`locale types written: ${ids.join(', ')}`);
