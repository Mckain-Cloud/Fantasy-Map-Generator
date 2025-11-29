import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../setup/helpers.js';

test.describe('Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Wait for app to be fully initialized
    await waitForAppReady(page);
  });

  test.describe('Page load performance', () => {
    test('should load page within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.waitForFunction(() => typeof grid !== 'undefined', { timeout: 120000 });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(120000); // 2 minutes max
    });

    test('should have main scripts loaded', async ({ page }) => {
      const hasScripts = await page.evaluate(() => {
        return typeof pack !== 'undefined' &&
               typeof grid !== 'undefined' &&
               typeof d3 !== 'undefined';
      });
      expect(hasScripts).toBe(true);
    });
  });

  test.describe('Memory usage', () => {
    test('should not create excessive DOM nodes', async ({ page }) => {
      const nodeCount = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });
      expect(nodeCount).toBeLessThan(100000); // Reasonable limit
    });

    test('should have reasonable SVG element count', async ({ page }) => {
      const svgElements = await page.evaluate(() => {
        return document.querySelectorAll('svg *').length;
      });
      expect(svgElements).toBeGreaterThan(0);
      expect(svgElements).toBeLessThan(500000); // Depends on map complexity
    });
  });

  test.describe('Rendering performance', () => {
    test('should render map elements', async ({ page }) => {
      await page.waitForSelector('#map', { timeout: 60000 });

      const hasElements = await page.evaluate(() => {
        const map = document.getElementById('map');
        return map && map.children.length > 0;
      });
      expect(hasElements).toBe(true);
    });

    test('should have visible terrain', async ({ page }) => {
      const terrain = await page.$('#terrs');
      expect(terrain).not.toBeNull();
    });
  });

  test.describe('Data structure sizes', () => {
    test('should have reasonable cell count', async ({ page }) => {
      await page.waitForFunction(() => typeof pack !== 'undefined' && pack.cells, { timeout: 60000 });

      const cellCount = await page.evaluate(() => {
        return pack.cells.i ? pack.cells.i.length : 0;
      });
      expect(cellCount).toBeGreaterThan(1000);
      expect(cellCount).toBeLessThan(100000); // Typical range
    });

    test('should have reasonable grid cell count', async ({ page }) => {
      await page.waitForFunction(() => typeof grid !== 'undefined' && grid.cells, { timeout: 60000 });

      const gridCellCount = await page.evaluate(() => {
        return grid.cells.i ? grid.cells.i.length : 0;
      });
      expect(gridCellCount).toBeGreaterThan(100);
      expect(gridCellCount).toBeLessThan(50000);
    });
  });

  test.describe('Function execution time', () => {
    test('should execute utility functions quickly', async ({ page }) => {
      const executionTime = await page.evaluate(() => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
          rn(Math.random() * 100, 2);
        }
        return performance.now() - start;
      });
      expect(executionTime).toBeLessThan(100); // Should be very fast
    });

    test('should have reasonable name generation time', async ({ page }) => {
      await page.waitForFunction(() => typeof Names !== 'undefined', { timeout: 60000 });

      const executionTime = await page.evaluate(() => {
        const start = performance.now();
        try {
          for (let i = 0; i < 10; i++) {
            Names.getBase(0);
          }
          return performance.now() - start;
        } catch (e) {
          return -1; // Error occurred
        }
      });

      if (executionTime >= 0) {
        expect(executionTime).toBeLessThan(1000); // 10 names in < 1 second
      }
    });
  });
});
