import { test, expect } from '@playwright/test';
import { waitForAppReady, gotoApp } from '../setup/helpers.js';

test.describe('Core User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    // Wait for app to be fully ready
    await waitForAppReady(page);
  });

  test.describe('Application loading', () => {
    test('should load the application', async ({ page }) => {
      await expect(page).toHaveTitle(/Fantasy Map Generator/i);
    });

    test('should display the map canvas', async ({ page }) => {
      await page.waitForSelector('#map', { timeout: 60000 });
      const svg = await page.$('#map');
      expect(svg).not.toBeNull();
    });

    test('should have toolbar visible', async ({ page }) => {
      // Wait for any toolbar element to be available
      const hasToolbar = await page.evaluate(() => {
        return document.querySelector('.toolbar') !== null ||
               document.querySelector('#optionsContainer') !== null ||
               document.querySelector('#mapOptions') !== null;
      });
      expect(hasToolbar).toBe(true);
    });
  });

  test.describe('Map regeneration workflow', () => {
    test('should have regenerate button', async ({ page }) => {
      await page.waitForFunction(() => typeof regenerateMap === 'function', { timeout: 60000 });
      const hasButton = await page.evaluate(() => {
        return typeof regenerateMap === 'function';
      });
      expect(hasButton).toBe(true);
    });

    test('should be able to access map options', async ({ page }) => {
      // Look for options/settings elements
      const hasOptions = await page.evaluate(() => {
        return document.querySelector('#optionsContainer') !== null ||
               document.querySelector('.options') !== null;
      });
      expect(hasOptions).toBe(true);
    });
  });

  test.describe('UI interactions', () => {
    test('should have working zoom controls', async ({ page }) => {
      const hasZoomControls = await page.evaluate(() => {
        return typeof zoom !== 'undefined' ||
               document.querySelector('[data-tip="zoom"]') !== null;
      });
      expect(hasZoomControls).toBe(true);
    });

    test('should have layers toggle', async ({ page }) => {
      await page.waitForSelector('#map', { timeout: 60000 });
      const hasLayers = await page.evaluate(() => {
        return document.querySelector('#toggleHeight') !== null ||
               document.querySelector('.layers') !== null ||
               document.querySelector('[id*="toggle"]') !== null;
      });
      expect(hasLayers).toBe(true);
    });
  });

  test.describe('Data export', () => {
    test('should have download/export functionality', async ({ page }) => {
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 60000 });
      const hasExport = await page.evaluate(() => {
        return typeof downloadMap === 'function' ||
               typeof saveMapURL === 'function' ||
               document.querySelector('[data-tip*="ownload"]') !== null ||
               document.querySelector('[data-tip*="xport"]') !== null ||
               document.querySelector('#mapSave') !== null;
      });
      expect(hasExport).toBe(true);
    });
  });

  test.describe('Responsive behavior', () => {
    test('should handle window resize', async ({ page }) => {
      const initialSize = await page.viewportSize();
      await page.setViewportSize({ width: 800, height: 600 });

      const svg = await page.$('#map');
      expect(svg).not.toBeNull();

      // Restore original size
      if (initialSize) {
        await page.setViewportSize(initialSize);
      }
    });
  });
});
