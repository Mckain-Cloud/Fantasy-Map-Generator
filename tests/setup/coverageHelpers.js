/**
 * Coverage Helper Functions for Playwright Tests
 *
 * Usage in tests:
 *   import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';
 *
 *   test.beforeAll(async ({ browser }) => {
 *     page = await browser.newPage();
 *     await startCoverage(page);
 *     await page.goto('/');
 *   });
 *
 *   test.afterAll(async () => {
 *     await stopCoverage(page);
 *     await page.close();
 *   });
 */

import { promises as fs } from 'fs';
import path from 'path';

// Check if coverage collection is enabled
const COLLECT_COVERAGE = process.env.COLLECT_COVERAGE === 'true';

// Global coverage data store
const allCoverage = [];
let fileCounter = 0;

/**
 * Start collecting JavaScript coverage for a page
 * @param {import('@playwright/test').Page} page - Playwright page instance
 */
export async function startCoverage(page) {
  if (!COLLECT_COVERAGE) return;

  try {
    // Coverage API is available on all Chromium-based browsers (Chrome, Edge, etc.)
    // Just try to start - the try/catch handles unsupported browsers
    await page.coverage.startJSCoverage({
      resetOnNavigation: false,
      reportAnonymousScripts: false
    });
  } catch (e) {
    // Coverage not supported or already started
  }
}

/**
 * Stop collecting coverage and store the results
 * @param {import('@playwright/test').Page} page - Playwright page instance
 */
export async function stopCoverage(page) {
  if (!COLLECT_COVERAGE) return;

  try {
    // Coverage API is available on all Chromium-based browsers (Chrome, Edge, etc.)
    const coverage = await page.coverage.stopJSCoverage();
    if (coverage && coverage.length > 0) {
      allCoverage.push(...coverage);
    }
  } catch (e) {
    // Coverage not supported or not started
  }
}

/**
 * Flush all collected coverage data to disk
 * Call this at the end of test runs
 */
export async function flushCoverage() {
  if (!COLLECT_COVERAGE || allCoverage.length === 0) return;

  try {
    const coverageDir = 'coverage';
    await fs.mkdir(coverageDir, { recursive: true });

    const fileName = `coverage-worker-${process.pid}-${++fileCounter}.json`;
    await fs.writeFile(
      path.join(coverageDir, fileName),
      JSON.stringify(allCoverage)
    );

    // Clear the buffer
    allCoverage.length = 0;
  } catch (e) {
    console.warn('Could not flush coverage:', e.message);
  }
}

/**
 * Get current coverage data (for debugging)
 */
export function getCoverageData() {
  return allCoverage;
}

/**
 * Check if coverage collection is enabled
 */
export function isCoverageEnabled() {
  return COLLECT_COVERAGE;
}

// Auto-flush on process exit
if (COLLECT_COVERAGE) {
  process.on('beforeExit', async () => {
    await flushCoverage();
  });

  process.on('exit', () => {
    // Sync write as last resort
    if (allCoverage.length > 0) {
      try {
        const fs = require('fs');
        fs.mkdirSync('coverage', { recursive: true });
        fs.writeFileSync(
          `coverage/coverage-exit-${process.pid}.json`,
          JSON.stringify(allCoverage)
        );
      } catch (e) {
        // Best effort
      }
    }
  });
}
