#!/usr/bin/env node
/**
 * CI-friendly bundle-size budget.
 *
 * Reads the Statoscope stats produced by `npm run stats` (webpack-compatible,
 * via rollup-plugin-webpack-stats) and fails if the shipped JS exceeds the
 * budget. Statoscope's `serve`/`report` give the interactive view; this gives a
 * hard gate that can run in CI.
 */
import { readFileSync } from 'node:fs';

const BUDGET_KB = Number(process.env.SIZE_BUDGET_KB ?? 90);

const statsUrl = new URL('../statoscope/stats.json', import.meta.url);
const stats = JSON.parse(readFileSync(statsUrl, 'utf8'));

const jsAssets = (stats.assets ?? []).filter(
  (a) => a.name.endsWith('.js') && !a.name.endsWith('.map'),
);

if (jsAssets.length === 0) {
  console.error('No JS assets found in statoscope/stats.json — run `npm run stats` first.');
  process.exit(1);
}

const total = jsAssets.reduce((sum, a) => sum + a.size, 0);
const budget = BUDGET_KB * 1024;

for (const a of jsAssets) {
  console.log(`  ${a.name.padEnd(32)} ${(a.size / 1024).toFixed(1)} KB`);
}
console.log(`  ${''.padEnd(32)} ──────`);
console.log(`  total JS ${(total / 1024).toFixed(1)} KB  (budget ${BUDGET_KB} KB)`);

if (total > budget) {
  console.error(`✗ bundle is ${((total - budget) / 1024).toFixed(1)} KB over budget`);
  process.exit(1);
}
console.log('✓ within budget');
