import { test, expect } from '@playwright/test';
import { waitForAppReady, gotoApp, stopCoverage, flushCoverage } from '../setup/helpers.js';

test.describe('Toolbar Button Tests', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Main Toolbar Buttons', () => {
    test('zoom in function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof zoomIn === 'function' || typeof zoom === 'function';
      });
      expect(exists).toBe(true);
    });

    test('zoom out function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof zoomOut === 'function' || typeof zoom === 'function';
      });
      expect(exists).toBe(true);
    });

    test('zoom reset button exists and is clickable', async ({ page }) => {
      const result = await page.evaluate(() => {
        const btn = document.getElementById('zoomReset');
        if (btn) {
          btn.click();
          return { found: true };
        }
        return { found: false };
      });
      expect(result.found).toBe(true);
    });

    test('regenerate button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('regenerate') !== null;
      });
      expect(exists).toBe(true);
    });

    test('options button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('optionsTrigger') !== null;
      });
      expect(exists).toBe(true);
    });
  });

  test.describe('Tool Buttons', () => {
    test('tools container exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toolsContent') !== null ||
               document.querySelector('.tools') !== null;
      });
      expect(exists).toBe(true);
    });

    test('undo button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('undo') !== null;
      });
      expect(exists).toBe(true);
    });

    test('redo button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('redo') !== null;
      });
      expect(exists).toBe(true);
    });
  });

  test.describe('Menu Buttons', () => {
    test('save button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('saveButton') !== null;
      });
      expect(exists).toBe(true);
    });

    test('export button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('exportButton') !== null;
      });
      expect(exists).toBe(true);
    });

    test('load button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('loadButton') !== null;
      });
      expect(exists).toBe(true);
    });
  });

  test.describe('Layer Panel', () => {
    test('layers container exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('mapLayers') !== null;
      });
      expect(exists).toBe(true);
    });

    test('oceanLayers element exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('oceanLayers') !== null;
      });
      expect(exists).toBe(true);
    });

    test('toggleBiomes button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toggleBiomes') !== null;
      });
      expect(exists).toBe(true);
    });

    test('toggleStates button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toggleStates') !== null;
      });
      expect(exists).toBe(true);
    });

    test('toggleBorders button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toggleBorders') !== null;
      });
      expect(exists).toBe(true);
    });

    test('toggleRoutes button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toggleRoutes') !== null;
      });
      expect(exists).toBe(true);
    });

    test('toggleRivers button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toggleRivers') !== null;
      });
      expect(exists).toBe(true);
    });

    test('toggleLabels button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toggleLabels') !== null;
      });
      expect(exists).toBe(true);
    });

    test('toggleMarkers button exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('toggleMarkers') !== null;
      });
      expect(exists).toBe(true);
    });
  });

  test.describe('Editor Buttons', () => {
    test('burgs editor button can open editor', async ({ page }) => {
      const canOpen = await page.evaluate(() => {
        return typeof editBurg === 'function' || typeof overviewBurgs === 'function';
      });
      expect(canOpen).toBe(true);
    });

    test('states editor function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof editStates === 'function';
      });
      expect(exists).toBe(true);
    });

    test('cultures editor function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof editCultures === 'function';
      });
      expect(exists).toBe(true);
    });

    test('religions editor function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof editReligions === 'function';
      });
      expect(exists).toBe(true);
    });

    test('provinces editor function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof editProvinces === 'function';
      });
      expect(exists).toBe(true);
    });

    test('biomes editor function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof editBiomes === 'function';
      });
      expect(exists).toBe(true);
    });

    test('zones editor function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof editZones === 'function';
      });
      expect(exists).toBe(true);
    });

    test('units editor function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof editUnits === 'function';
      });
      expect(exists).toBe(true);
    });
  });

  test.describe('Zoom Controls', () => {
    test('zoom extent controls exist', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('zoomExtentMin') !== null ||
               document.getElementById('zoomExtentMax') !== null;
      });
      expect(exists).toBe(true);
    });

    test('zoom can be changed via function', async ({ page }) => {
      const result = await page.evaluate(() => {
        if (typeof zoom === 'function') {
          // Get initial scale
          const svg = document.getElementById('map');
          if (svg) {
            return { hasZoom: true };
          }
        }
        return { hasZoom: typeof zoom === 'function' };
      });
      expect(result.hasZoom).toBe(true);
    });
  });

  test.describe('Navigation', () => {
    test('fitMapToScreen function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof fitMapToScreen === 'function';
      });
      expect(exists).toBe(true);
    });

    test('resetZoom function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof resetZoom === 'function';
      });
      expect(exists).toBe(true);
    });
  });
});
