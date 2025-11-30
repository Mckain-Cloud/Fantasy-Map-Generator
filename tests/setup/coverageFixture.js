/**
 * Custom Playwright Fixture with Coverage Collection
 *
 * Usage in tests:
 *   import { test, expect } from '../setup/coverageFixture.js';
 *   // or for relative paths from deeper directories:
 *   import { test, expect } from '../../setup/coverageFixture.js';
 *
 * This extends the base Playwright test with automatic coverage collection
 * when COLLECT_COVERAGE=true environment variable is set.
 */

import { test as base, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Check if coverage collection is enabled
const COLLECT_COVERAGE = process.env.COLLECT_COVERAGE === 'true';

// Track coverage data per worker
const workerCoverage = [];
let coverageFileCounter = 0;

/**
 * Extended test fixture with coverage collection
 */
export const test = base.extend({
  // Create a page with coverage enabled
  page: async ({ page, browser }, use, testInfo) => {
    // Check if browser supports coverage (Chromium/Edge only)
    const browserName = browser.browserType().name();
    const supportsCoverage = COLLECT_COVERAGE && browserName === 'chromium';

    // Start coverage before test
    if (supportsCoverage) {
      try {
        await page.coverage.startJSCoverage({
          resetOnNavigation: false,
          reportAnonymousScripts: false
        });
      } catch (e) {
        console.warn('Could not start coverage:', e.message);
      }
    }

    // Run the test
    await use(page);

    // Collect coverage after test
    if (supportsCoverage) {
      try {
        const coverage = await page.coverage.stopJSCoverage();
        if (coverage && coverage.length > 0) {
          workerCoverage.push(...coverage);
        }

        // Save coverage data periodically to avoid memory buildup
        if (workerCoverage.length >= 50) {
          await saveCoverageData(testInfo.project.name);
        }
      } catch (e) {
        console.warn('Could not collect coverage:', e.message);
      }
    }
  }
});

export { expect };

/**
 * Save accumulated coverage data to file
 */
async function saveCoverageData(projectName) {
  if (workerCoverage.length === 0) return;

  const coverageDir = 'coverage';
  try {
    await fs.mkdir(coverageDir, { recursive: true });

    const fileName = `coverage-${projectName.replace(/\s+/g, '-')}-${process.pid}-${++coverageFileCounter}.json`;
    await fs.writeFile(
      path.join(coverageDir, fileName),
      JSON.stringify(workerCoverage)
    );

    // Clear the buffer
    workerCoverage.length = 0;
  } catch (e) {
    console.warn('Could not save coverage data:', e.message);
  }
}

// Ensure coverage is saved when worker exits
process.on('beforeExit', async () => {
  if (workerCoverage.length > 0) {
    await saveCoverageData('final');
  }
});

/**
 * Manual flush function - call in afterAll if needed
 */
export async function flushCoverage(projectName = 'manual') {
  await saveCoverageData(projectName);
}
