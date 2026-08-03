// Thin wrapper around @playwright/test's `test`/`expect` that every spec imports instead of
// importing from '@playwright/test' directly. When run with COVERAGE=1 (see `npm run
// test:coverage:e2e`), it collects real V8 JS coverage per test via the CDP session Playwright
// already opens for Chromium, and dumps each test's raw coverage to .coverage-raw/ for
// scripts/e2e-coverage-report.mjs to aggregate afterwards. A plain `npm run test:e2e` run doesn't
// set COVERAGE, so normal test runs pay zero extra cost — nothing is collected or written.
import { test as base, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const COLLECT_COVERAGE = !!process.env.COVERAGE;
const COVERAGE_DIR = path.join(process.cwd(), '.coverage-raw');

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    if (!COLLECT_COVERAGE || !page.coverage) {
      await use(page);
      return;
    }
    await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false });
    await use(page);
    const coverage = await page.coverage.stopJSCoverage();
    mkdirSync(COVERAGE_DIR, { recursive: true });
    writeFileSync(path.join(COVERAGE_DIR, `${testInfo.testId}.json`), JSON.stringify(coverage));
  },
});

export { expect };
