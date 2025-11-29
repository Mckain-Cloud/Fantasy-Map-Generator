import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../../setup/helpers.js';

test.describe('Main application core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Wait for full initialization
    await waitForAppReady(page);
  });

  test.describe('Global variables initialization', () => {
    test('should initialize graphWidth and graphHeight', async ({ page }) => {
      await page.waitForFunction(() => typeof graphWidth === 'number', { timeout: 60000 });

      const result = await page.evaluate(() => {
        return {
          hasGraphWidth: typeof graphWidth === 'number',
          hasGraphHeight: typeof graphHeight === 'number',
          widthValid: graphWidth > 0,
          heightValid: graphHeight > 0
        };
      });

      expect(result.hasGraphWidth).toBe(true);
      expect(result.hasGraphHeight).toBe(true);
      expect(result.widthValid).toBe(true);
      expect(result.heightValid).toBe(true);
    });

    test('should initialize grid object', async ({ page }) => {
      await page.waitForFunction(() => typeof grid !== 'undefined', { timeout: 60000 });

      const result = await page.evaluate(() => {
        return {
          hasGrid: typeof grid === 'object',
          hasPoints: grid.points !== undefined,
          hasCells: grid.cells !== undefined
        };
      });

      expect(result.hasGrid).toBe(true);
      expect(result.hasPoints).toBe(true);
      expect(result.hasCells).toBe(true);
    });

    test('should initialize pack object', async ({ page }) => {
      await page.waitForFunction(() => typeof pack !== 'undefined', { timeout: 60000 });

      const result = await page.evaluate(() => {
        return {
          hasPack: typeof pack === 'object',
          hasCells: pack.cells !== undefined,
          hasFeatures: pack.features !== undefined
        };
      });

      expect(result.hasPack).toBe(true);
      expect(result.hasCells).toBe(true);
      expect(result.hasFeatures).toBe(true);
    });

    test('should initialize seed', async ({ page }) => {
      await page.waitForFunction(() => typeof seed !== 'undefined', { timeout: 60000 });

      const result = await page.evaluate(() => {
        return {
          hasSeed: typeof seed !== 'undefined',
          isValid: seed !== null && seed !== undefined
        };
      });

      expect(result.hasSeed).toBe(true);
      expect(result.isValid).toBe(true);
    });
  });

  test.describe('D3 library', () => {
    test('should have d3 loaded', async ({ page }) => {
      const result = await page.evaluate(() => typeof d3 !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have d3 selection methods', async ({ page }) => {
      const result = await page.evaluate(() => {
        return typeof d3.select === 'function' &&
               typeof d3.selectAll === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have d3 utility functions', async ({ page }) => {
      const result = await page.evaluate(() => {
        return typeof d3.range === 'function' &&
               typeof d3.mean === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Delaunator library', () => {
    test('should have Delaunator loaded', async ({ page }) => {
      const result = await page.evaluate(() => typeof Delaunator !== 'undefined');
      expect(result).toBe(true);
    });

    test('should be able to create Delaunator instance', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          const points = [[0, 0], [1, 0], [0, 1]];
          const delaunay = Delaunator.from(points);
          return delaunay !== null && delaunay.triangles !== undefined;
        } catch (e) {
          return false;
        }
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Random number generation', () => {
    test('should have aleaPRNG function', async ({ page }) => {
      await page.waitForFunction(() => typeof aleaPRNG === 'function', { timeout: 60000 });

      const result = await page.evaluate(() => typeof aleaPRNG === 'function');
      expect(result).toBe(true);
    });

    test('should generate consistent random numbers with same seed', async ({ page }) => {
      await page.waitForFunction(() => typeof aleaPRNG === 'function', { timeout: 60000 });

      const result = await page.evaluate(() => {
        const rng1 = aleaPRNG('test-seed');
        const rng2 = aleaPRNG('test-seed');

        const values1 = [rng1(), rng1(), rng1()];
        const values2 = [rng2(), rng2(), rng2()];

        return values1.every((val, i) => val === values2[i]);
      });
      expect(result).toBe(true);
    });

    test('should generate different numbers with different seeds', async ({ page }) => {
      await page.waitForFunction(() => typeof aleaPRNG === 'function', { timeout: 60000 });

      const result = await page.evaluate(() => {
        const rng1 = aleaPRNG('seed1');
        const rng2 = aleaPRNG('seed2');

        return rng1() !== rng2();
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Utility functions availability', () => {
    test('should have P function (probability)', async ({ page }) => {
      await page.waitForFunction(() => typeof P === 'function', { timeout: 60000 });
      const result = await page.evaluate(() => typeof P === 'function');
      expect(result).toBe(true);
    });

    test('should have rn function (round number)', async ({ page }) => {
      await page.waitForFunction(() => typeof window.rn === 'function', { timeout: 90000 });
      const result = await page.evaluate(() => typeof rn === 'function');
      expect(result).toBe(true);
    });

    test('should have ra function (random from array)', async ({ page }) => {
      await page.waitForFunction(() => typeof ra === 'function', { timeout: 60000 });
      const result = await page.evaluate(() => typeof ra === 'function');
      expect(result).toBe(true);
    });

    test('should have last function', async ({ page }) => {
      await page.waitForFunction(() => typeof last === 'function', { timeout: 60000 });
      const result = await page.evaluate(() => typeof last === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('SVG setup', () => {
    test('should have main SVG element', async ({ page }) => {
      const svg = await page.$('#map');
      expect(svg).not.toBeNull();
    });

    test('should have defs element for patterns/gradients', async ({ page }) => {
      const defs = await page.$('defs');
      expect(defs).not.toBeNull();
    });

    test('should have width and height set on map SVG', async ({ page }) => {
      await page.waitForSelector('#map', { timeout: 60000 });
      const dimensions = await page.evaluate(() => {
        const svg = document.getElementById('map');
        return svg ? {
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height')
        } : null;
      });
      expect(dimensions).not.toBeNull();
      // Width and height are set to pixel values (e.g., "1280", "720") after map generation
      expect(parseInt(dimensions.width)).toBeGreaterThan(0);
      expect(parseInt(dimensions.height)).toBeGreaterThan(0);
    });
  });
});
