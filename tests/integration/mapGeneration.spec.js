import { test, expect } from '@playwright/test';
import { waitForAppReady, gotoApp } from '../setup/helpers.js';

test.describe('Map Generation Integration', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    // Wait for full map generation to complete
    await waitForAppReady(page);
  });

  test.describe('Basic map generation', () => {
    test('should generate a map successfully', async ({ page }) => {
      // waitForAppReady() in beforeEach already ensures the app is loaded
      // Just verify the global variables are accessible
      const result = await page.evaluate(() => {
        return {
          hasGrid: typeof grid !== 'undefined',
          hasPack: typeof pack !== 'undefined',
          hasGraphWidth: typeof graphWidth !== 'undefined',
          hasGraphHeight: typeof graphHeight !== 'undefined'
        };
      });

      expect(result.hasGrid).toBe(true);
      expect(result.hasPack).toBe(true);
      expect(result.hasGraphWidth).toBe(true);
      expect(result.hasGraphHeight).toBe(true);
    });

    test('should have cells data in pack', async ({ page }) => {
      await page.waitForFunction(
        () => typeof pack !== 'undefined' && pack.cells && pack.cells.i && pack.cells.i.length > 0,
        { timeout: 120000 }
      );

      const result = await page.evaluate(() => {
        return {
          hasCells: pack.cells !== undefined,
          cellsHasData: pack.cells.i && pack.cells.i.length > 0
        };
      });

      expect(result.hasCells).toBe(true);
      expect(result.cellsHasData).toBe(true);
    });

    test('should have states generated', async ({ page }) => {
      await page.waitForFunction(
        () => typeof pack !== 'undefined' && pack.states && pack.states.length > 0,
        { timeout: 120000 }
      );

      const result = await page.evaluate(() => {
        return {
          hasStates: Array.isArray(pack.states),
          stateCount: pack.states ? pack.states.length : 0
        };
      });

      expect(result.hasStates).toBe(true);
      expect(result.stateCount).toBeGreaterThan(0);
    });

    test('should have burgs generated', async ({ page }) => {
      await page.waitForFunction(
        () => typeof pack !== 'undefined' && pack.burgs && pack.burgs.length > 0,
        { timeout: 120000 }
      );

      const result = await page.evaluate(() => {
        return {
          hasBurgs: Array.isArray(pack.burgs),
          burgCount: pack.burgs ? pack.burgs.length : 0
        };
      });

      expect(result.hasBurgs).toBe(true);
      expect(result.burgCount).toBeGreaterThan(0);
    });

    test('should have cultures generated', async ({ page }) => {
      await page.waitForFunction(
        () => typeof pack !== 'undefined' && pack.cultures && pack.cultures.length > 0,
        { timeout: 120000 }
      );

      const result = await page.evaluate(() => {
        return {
          hasCultures: Array.isArray(pack.cultures),
          cultureCount: pack.cultures ? pack.cultures.length : 0
        };
      });

      expect(result.hasCultures).toBe(true);
      expect(result.cultureCount).toBeGreaterThan(0);
    });

    test('should have rivers generated', async ({ page }) => {
      await page.waitForFunction(
        () => typeof pack !== 'undefined' && pack.rivers && pack.rivers.length > 0,
        { timeout: 120000 }
      );

      const result = await page.evaluate(() => {
        return {
          hasRivers: Array.isArray(pack.rivers),
          riverCount: pack.rivers ? pack.rivers.length : 0
        };
      });

      expect(result.hasRivers).toBe(true);
      expect(result.riverCount).toBeGreaterThan(0);
    });
  });

  test.describe('Map data integrity', () => {
    test('should have valid cell heights', async ({ page }) => {
      await page.waitForFunction(
        () => typeof pack !== 'undefined' && pack.cells && pack.cells.h && pack.cells.h.length > 0,
        { timeout: 120000 }
      );

      const result = await page.evaluate(() => {
        const heights = pack.cells.h;
        return {
          hasHeights: heights !== undefined,
          allValid: heights.every(h => typeof h === 'number' && !isNaN(h)),
          hasLand: heights.some(h => h >= 20),
          hasWater: heights.some(h => h < 20)
        };
      });

      expect(result.hasHeights).toBe(true);
      expect(result.allValid).toBe(true);
      expect(result.hasLand).toBe(true);
      expect(result.hasWater).toBe(true);
    });

    test('should have valid biomes assigned', async ({ page }) => {
      await page.waitForFunction(() => typeof pack !== 'undefined' && pack.cells.biome, { timeout: 60000 });

      const result = await page.evaluate(() => {
        const biomes = pack.cells.biome;
        return {
          hasBiomes: biomes !== undefined,
          allValid: biomes.every(b => b >= 0 && b <= 12),
          hasMarine: biomes.some(b => b === 0)
        };
      });

      expect(result.hasBiomes).toBe(true);
      expect(result.allValid).toBe(true);
      expect(result.hasMarine).toBe(true);
    });

    test('should have valid temperatures', async ({ page }) => {
      await page.waitForFunction(() => typeof grid !== 'undefined' && grid.cells.temp, { timeout: 60000 });

      const result = await page.evaluate(() => {
        const temps = grid.cells.temp;
        return {
          hasTemp: temps !== undefined,
          allValid: temps.every(t => typeof t === 'number' && !isNaN(t)),
          inRange: temps.every(t => t >= -50 && t <= 50)
        };
      });

      expect(result.hasTemp).toBe(true);
      expect(result.allValid).toBe(true);
      expect(result.inRange).toBe(true);
    });
  });

  test.describe('Map SVG elements', () => {
    test('should have main SVG element', async ({ page }) => {
      const svg = await page.$('#map');
      expect(svg).not.toBeNull();
    });

    test('should have terrain layer', async ({ page }) => {
      const terrain = await page.$('#terrs');
      expect(terrain).not.toBeNull();
    });

    test('should have biomes layer', async ({ page }) => {
      const biomes = await page.$('#biomes');
      expect(biomes).not.toBeNull();
    });

    test('should have rivers layer', async ({ page }) => {
      const rivers = await page.$('#rivers');
      expect(rivers).not.toBeNull();
    });

    test('should have borders layer', async ({ page }) => {
      const borders = await page.$('#borders');
      expect(borders).not.toBeNull();
    });

    test('should have labels layer', async ({ page }) => {
      await page.waitForSelector('#map', { timeout: 60000 });
      const labels = await page.$('#labels');
      expect(labels).not.toBeNull();
    });
  });
});
