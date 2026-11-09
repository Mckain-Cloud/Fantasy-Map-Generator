/**
 * Shared-page Playwright test.
 *
 * `test` here is Playwright's test with the `page` fixture replaced by one
 * app page per worker: loaded once (with a small on-load map), then reused by
 * every test the worker runs. Page load is 5-15 s and used to happen once per
 * test; now it happens once per worker.
 *
 * Usage (drop-in for the default import):
 *   import {test, expect} from "../../setup/shared-test.js";
 *   test("...", async ({page}) => { ... });            // page is the shared app page
 *   test.beforeAll(async ({appPage}) => { ... });       // worker-scoped handle for beforeAll
 *
 * Rules for tests on a shared page:
 *   - do not navigate; the app is already loaded and ready
 *   - leave the page as you found it (close dialogs you open); a light reset
 *     closes stray <dialog> elements before each test anyway
 *   - if a test must regenerate the map, say so in its name and expect later
 *     tests in the same worker to see the new map
 *
 * playwright.config.js sets fullyParallel: false so a file's tests run in one
 * worker, in order; files still run in parallel across workers.
 */

import {test as base, expect} from "@playwright/test";
import {FAST_APP_INIT, gotoApp, waitForAppReady, stopCoverage, flushCoverage} from "./helpers.js";

export const test = base.extend({
  appContext: [
    async ({browser}, use) => {
      const context = await browser.newContext();
      await context.addInitScript(FAST_APP_INIT);
      await use(context);
      await context.close();
    },
    {scope: "worker"}
  ],

  appPage: [
    async ({appContext}, use) => {
      const page = await appContext.newPage();
      await gotoApp(page);
      await waitForAppReady(page);
      await use(page);
      await stopCoverage(page);
      await flushCoverage();
    },
    {scope: "worker"}
  ],

  // Override the per-test `page` with the shared one, after a light reset
  page: async ({appPage}, use) => {
    await resetPageState(appPage);
    await use(appPage);
  }
});

async function resetPageState(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll("dialog[open]").forEach(d => {
        try {
          d.close();
        } catch {}
      });
    });
  } catch {
    // page may be mid-navigation after a test that reloaded; nothing to reset
  }
}

export {expect};
