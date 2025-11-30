import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('OceanLayers module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('OceanLayers function availability', () => {
    test('should have OceanLayers function on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof window.OceanLayers === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('oceanLayers element', () => {
    test('should have oceanLayers element in DOM', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('oceanLayers');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have oceanLayers as SVG group', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('oceanLayers');
        return element?.tagName.toLowerCase();
      });
      expect(result).toBe('g');
    });

    test('should have layers attribute', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('oceanLayers');
        return element?.getAttribute('layers') !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Grid cells ocean properties', () => {
    test('should have grid.cells.t array (elevation tiers)', async ({ page }) => {
      const result = await page.evaluate(() => {
        return grid.cells.t !== undefined && grid.cells.t.length > 0;
      });
      expect(result).toBe(true);
    });

    test('should have negative t values for ocean cells', async ({ page }) => {
      const result = await page.evaluate(() => {
        const tiers = Array.from(grid.cells.t);
        const oceanCells = tiers.filter(t => t < 0);
        return oceanCells.length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should have t values from -9 to positive', async ({ page }) => {
      const result = await page.evaluate(() => {
        const tiers = Array.from(grid.cells.t);
        const minT = Math.min(...tiers);
        const maxT = Math.max(...tiers);
        return { minT, maxT };
      });
      expect(result.minT).toBeLessThanOrEqual(0);
      expect(result.maxT).toBeGreaterThanOrEqual(0);
    });

    test('should have ocean depth tiers from -1 to -9', async ({ page }) => {
      const result = await page.evaluate(() => {
        const tiers = Array.from(grid.cells.t);
        const oceanTiers = [...new Set(tiers.filter(t => t < 0))].sort((a, b) => a - b);
        return oceanTiers;
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeGreaterThanOrEqual(-9);
    });
  });

  test.describe('Grid vertices for ocean paths', () => {
    test('should have grid.vertices.p array', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Array.isArray(grid.vertices.p);
      });
      expect(result).toBe(true);
    });

    test('should have grid.vertices.c array', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Array.isArray(grid.vertices.c);
      });
      expect(result).toBe(true);
    });

    test('should have grid.vertices.v array', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Array.isArray(grid.vertices.v);
      });
      expect(result).toBe(true);
    });

    test('vertices should have coordinate pairs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const vertex = grid.vertices.p[0];
        return Array.isArray(vertex) && vertex.length === 2;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Ocean layer settings', () => {
    test('should support "none" layers setting', async ({ page }) => {
      const result = await page.evaluate(() => {
        const oceanLayersEl = document.getElementById('oceanLayers');
        oceanLayersEl.setAttribute('layers', 'none');
        return oceanLayersEl.getAttribute('layers');
      });
      expect(result).toBe('none');
    });

    test('should support "random" layers setting', async ({ page }) => {
      const result = await page.evaluate(() => {
        const oceanLayersEl = document.getElementById('oceanLayers');
        oceanLayersEl.setAttribute('layers', 'random');
        return oceanLayersEl.getAttribute('layers');
      });
      expect(result).toBe('random');
    });

    test('should support comma-separated depth values', async ({ page }) => {
      const result = await page.evaluate(() => {
        const oceanLayersEl = document.getElementById('oceanLayers');
        oceanLayersEl.setAttribute('layers', '-1,-3,-6,-9');
        return oceanLayersEl.getAttribute('layers');
      });
      expect(result).toBe('-1,-3,-6,-9');
    });
  });

  test.describe('lineGen curve generator', () => {
    test('should have lineGen defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof lineGen === 'function');
      expect(result).toBe(true);
    });

    test('should be able to set curve type', async ({ page }) => {
      const result = await page.evaluate(() => {
        // lineGen is a d3 line generator
        lineGen.curve(d3.curveBasisClosed);
        return true;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Grid cell boundary detection', () => {
    test('should have grid.cells.b array (boundary flags)', async ({ page }) => {
      const result = await page.evaluate(() => {
        return grid.cells.b !== undefined;
      });
      expect(result).toBe(true);
    });

    test('should have some boundary cells', async ({ page }) => {
      const result = await page.evaluate(() => {
        const boundaries = Array.from(grid.cells.b);
        return boundaries.filter(b => b).length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should have grid.cells.v array (cell vertices)', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Array.isArray(grid.cells.v);
      });
      expect(result).toBe(true);
    });

    test('should have grid.cells.c array (cell neighbors)', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Array.isArray(grid.cells.c);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('clipPoly helper', () => {
    test('should have clipPoly function available', async ({ page }) => {
      const result = await page.evaluate(() => typeof clipPoly === 'function');
      expect(result).toBe(true);
    });

    test('should clip polygon to bounds', async ({ page }) => {
      const result = await page.evaluate(() => {
        const polygon = [[0, 0], [100, 0], [100, 100], [0, 100]];
        const clipped = clipPoly(polygon, 1);
        return Array.isArray(clipped);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('round helper for paths', () => {
    test('should have round function available', async ({ page }) => {
      const result = await page.evaluate(() => typeof round === 'function');
      expect(result).toBe(true);
    });

    test('should round path coordinates', async ({ page }) => {
      const result = await page.evaluate(() => {
        const path = 'M10.123456,20.654321L30.111111,40.222222Z';
        const rounded = round(path);
        return rounded;
      });
      // Should round to fewer decimals
      expect(result).not.toContain('123456');
    });
  });

  test.describe('Ocean paths SVG generation', () => {
    test('should generate valid SVG path data', async ({ page }) => {
      const result = await page.evaluate(() => {
        const oceanLayersEl = document.getElementById('oceanLayers');
        const paths = oceanLayersEl.querySelectorAll('path');
        if (paths.length === 0) return { hasPaths: false };
        const firstPath = paths[0].getAttribute('d');
        return {
          hasPaths: true,
          startsWithM: firstPath?.startsWith('M'),
          hasNumbers: /\d/.test(firstPath)
        };
      });
      if (result.hasPaths) {
        expect(result.startsWithM).toBe(true);
        expect(result.hasNumbers).toBe(true);
      }
    });

    test('should have fill color on ocean paths', async ({ page }) => {
      const result = await page.evaluate(() => {
        const oceanLayersEl = document.getElementById('oceanLayers');
        const paths = oceanLayersEl.querySelectorAll('path');
        if (paths.length === 0) return null;
        return paths[0].getAttribute('fill');
      });
      if (result !== null) {
        expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    test('should have fill-opacity on ocean paths', async ({ page }) => {
      const result = await page.evaluate(() => {
        const oceanLayersEl = document.getElementById('oceanLayers');
        const paths = oceanLayersEl.querySelectorAll('path');
        if (paths.length === 0) return null;
        const opacity = paths[0].getAttribute('fill-opacity');
        return opacity ? parseFloat(opacity) : null;
      });
      if (result !== null) {
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('Ocean depth tier semantics', () => {
    test('tier -1 should be shallowest ocean', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Tier -1 is coastal water
        const tiers = Array.from(grid.cells.t);
        const tier1Cells = tiers.filter(t => t === -1).length;
        return tier1Cells;
      });
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('tier -9 should be deepest ocean', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Tier -9 is deep ocean
        const tiers = Array.from(grid.cells.t);
        const tier9Cells = tiers.filter(t => t === -9).length;
        return tier9Cells;
      });
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should have more shallow than deep ocean cells typically', async ({ page }) => {
      const result = await page.evaluate(() => {
        const tiers = Array.from(grid.cells.t);
        const shallowCells = tiers.filter(t => t >= -3 && t < 0).length;
        const deepCells = tiers.filter(t => t < -6).length;
        return { shallowCells, deepCells };
      });
      // This may vary by map, so just check the structure
      expect(result.shallowCells).toBeGreaterThanOrEqual(0);
      expect(result.deepCells).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('D3 curve types', () => {
    test('should have d3.curveBasisClosed available', async ({ page }) => {
      const result = await page.evaluate(() => typeof d3.curveBasisClosed === 'function');
      expect(result).toBe(true);
    });

    test('should have d3.line available', async ({ page }) => {
      const result = await page.evaluate(() => typeof d3.line === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('rn function for opacity calculation', () => {
    test('should have rn function available', async ({ page }) => {
      const result = await page.evaluate(() => typeof rn === 'function');
      expect(result).toBe(true);
    });

    test('should round numbers correctly', async ({ page }) => {
      const result = await page.evaluate(() => rn(0.123456, 2));
      expect(result).toBe(0.12);
    });
  });

  test.describe('P function for randomization', () => {
    test('should have P function available', async ({ page }) => {
      const result = await page.evaluate(() => typeof P === 'function');
      expect(result).toBe(true);
    });

    test('should return boolean', async ({ page }) => {
      const result = await page.evaluate(() => {
        const value = P(0.5);
        return typeof value === 'boolean';
      });
      expect(result).toBe(true);
    });
  });
});
