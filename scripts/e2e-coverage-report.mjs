// Aggregates the raw V8 coverage dumped by tests/e2e/fixtures.js (one JSON file per test, written
// under .coverage-raw/ when the e2e suite runs with COVERAGE=1) into a per-file line-coverage
// table for js/*.js. Run via `npm run test:coverage:e2e` — this alone won't do anything useful
// without a COVERAGE=1 `playwright test` run first to populate .coverage-raw/.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COVERAGE_DIR = path.join(ROOT, '.coverage-raw');

if (!existsSync(COVERAGE_DIR) || readdirSync(COVERAGE_DIR).length === 0) {
  console.error('No raw coverage found in .coverage-raw/ — run `npm run test:coverage:e2e`, not this script directly.');
  process.exit(1);
}

// relPath -> Uint8Array of source.length, 1 where any test executed that byte
const coveredBytes = new Map();
const sourceCache = new Map();

for (const file of readdirSync(COVERAGE_DIR)) {
  if (!file.endsWith('.json')) continue;
  const entries = JSON.parse(readFileSync(path.join(COVERAGE_DIR, file), 'utf8'));
  for (const entry of entries) {
    const url = entry.url || '';
    const idx = url.indexOf('/js/');
    if (idx === -1) continue;
    const relPath = url.slice(idx + 1); // "js/foo.js"
    const absPath = path.join(ROOT, relPath);

    let source = sourceCache.get(relPath);
    if (source === undefined) {
      try { source = readFileSync(absPath, 'utf8'); } catch { continue; }
      sourceCache.set(relPath, source);
    }

    let accumulated = coveredBytes.get(relPath);
    if (!accumulated) { accumulated = new Uint8Array(source.length); coveredBytes.set(relPath, accumulated); }

    // Phase 1 — WITHIN this one test's coverage entry: V8 ranges nest (e.g. a module-top-level
    // range with count>0 containing an individual never-called function's range with count===0),
    // emitted outer-before-inner, so an *unconditional* overwrite in array order lets the more
    // specific inner range correctly win over its broader parent.
    const perTest = new Uint8Array(source.length);
    for (const fn of entry.functions || []) {
      for (const range of fn.ranges || []) {
        const hit = range.count > 0 ? 1 : 0;
        for (let i = range.startOffset; i < range.endOffset && i < perTest.length; i++) perTest[i] = hit;
      }
    }

    // Phase 2 — ACROSS tests: OR this test's result into the running total. A byte covered by any
    // single test stays covered even if a later test's run didn't happen to hit it.
    for (let i = 0; i < accumulated.length; i++) { if (perTest[i]) accumulated[i] = 1; }
  }
}

function lineCoverage(relPath) {
  const source = sourceCache.get(relPath);
  const covered = coveredBytes.get(relPath);
  const lines = source.split('\n');
  let offset = 0, coveredLines = 0, codeLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const isCode = trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
    if (isCode) {
      codeLines++;
      let hit = false;
      for (let i = offset; i < offset + line.length; i++) { if (covered[i]) { hit = true; break; } }
      if (hit) coveredLines++;
    }
    offset += line.length + 1;
  }
  return { coveredLines, codeLines, pct: codeLines ? (100 * coveredLines / codeLines) : 0 };
}

const rows = [...coveredBytes.keys()].sort().map(relPath => [relPath, lineCoverage(relPath)]);
let totalCovered = 0, totalCode = 0;

console.log('');
console.log('E2E coverage (js/*.js, driven by the real Playwright suite):');
console.log('-'.repeat(52));
for (const [file, r] of rows) {
  totalCovered += r.coveredLines; totalCode += r.codeLines;
  console.log(`${file.padEnd(28)} ${r.pct.toFixed(1).padStart(5)}%  (${r.coveredLines}/${r.codeLines} lines)`);
}
console.log('-'.repeat(52));
const totalPct = totalCode ? (100 * totalCovered / totalCode) : 0;
console.log(`${'TOTAL'.padEnd(28)} ${totalPct.toFixed(1).padStart(5)}%  (${totalCovered}/${totalCode} lines)`);
console.log('');
