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
 *   - tests may generate maps with their own seed; the fixture restores the
 *     baseline map (fixed seed) before the next test, and reloads the app
 *     only if a test navigated away
 *
 * playwright.config.js sets fullyParallel: false so a file's tests run in one
 * worker, in order; files still run in parallel across workers.
 */

import {test as base, expect} from "@playwright/test";
import {FAST_APP_INIT, SHARED_PAGE_SEED, gotoApp, waitForAppReady, stopCoverage, flushCoverage} from "./helpers.js";

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
      await gotoApp(page, {seed: SHARED_PAGE_SEED}); // deterministic on-load map
      await waitForAppReady(page);
      await markSharedPage(page);
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

/**
 * Per-test isolation on a shared page, cheapest remedy first:
 *  - navigated away (marker gone / app not ready): reload the app   (~10 s, rare)
 *  - different map (a test generated with its own seed) or degraded: regenerate
 *    the baseline map with the fixed seed                            (~2 s)
 *  - otherwise just close stray dialogs and reset the view           (~ms)
 */
async function resetPageState(page) {
  let status;
  try {
    status = await page.evaluate(seed => {
      if (!window.__fmgSharedPage || typeof window.generate !== "function") return "navigated";
      document.querySelectorAll("dialog[open]").forEach(d => {
        try {
          d.close();
        } catch {}
      });
      const p = window.pack;
      const degraded = !p?.cells?.i?.length || !p.states || p.states.length <= 1 || !p.burgs || p.burgs.length <= 1;
      if (degraded || window.seed !== seed) return "regenerate";
      return "ok";
    }, SHARED_PAGE_SEED);
  } catch {
    status = "navigated";
  }

  if (status === "navigated") {
    await gotoApp(page, {seed: SHARED_PAGE_SEED});
    await waitForAppReady(page);
    await markSharedPage(page);
    return;
  }

  if (status === "regenerate") {
    await page.evaluate(async seed => {
      await window.generate({seed});
      if (typeof window.drawLayers === "function") window.drawLayers();
      if (typeof window.resetZoom === "function") window.resetZoom(0);
    }, SHARED_PAGE_SEED);
  }
}

async function markSharedPage(page) {
  await page.evaluate(() => {
    window.__fmgSharedPage = true;
  });
}

export {expect};
