import { test, expect } from '@playwright/test';
import { gotoApp, APP_URL } from './setup/helpers.js';

test('diagnostic - page load check', async ({ page }) => {
  console.log('[DIAG] Starting test...');

  // Listen to console messages from the browser
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER ERROR] ${err.message}`);
  });

  // Track failed requests
  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log('[DIAG] Navigating to:', APP_URL);
  await gotoApp(page);
  console.log('[DIAG] DOM content loaded');

  // Check for script errors
  const scriptErrors = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.map(s => ({
      src: s.src || '(inline)',
      type: s.type || 'text/javascript'
    })).slice(0, 10); // First 10 scripts
  });
  console.log('[DIAG] First 10 scripts:', JSON.stringify(scriptErrors));

  // Check basic page load
  const title = await page.title();
  console.log(`[DIAG] Page title: ${title}`);

  // Check if #map exists
  const mapExists = await page.$('#map');
  console.log(`[DIAG] #map exists: ${!!mapExists}`);

  // Poll for app state every 5 seconds
  // Note: grid/pack are declared with 'let', not on window object
  for (let i = 0; i < 12; i++) {
    const status = await page.evaluate(() => {
      return {
        grid: typeof grid,
        pack: typeof pack,
        biomesData: typeof biomesData,
        nameBases: typeof nameBases,
        d3: typeof d3,
        packCellsLength: pack?.cells?.i?.length || 0,
        documentReady: document.readyState
      };
    });
    console.log(`[DIAG ${i * 5}s] Status:`, JSON.stringify(status));

    if (status.packCellsLength > 0) {
      console.log('[DIAG] App fully loaded!');
      break;
    }

    await page.waitForTimeout(5000);
  }

  expect(true).toBe(true);
});
