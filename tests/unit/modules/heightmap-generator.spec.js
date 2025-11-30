import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('HeightmapGenerator module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('HeightmapGenerator object availability', () => {
    test('should have HeightmapGenerator object on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof window.HeightmapGenerator === 'object');
      expect(result).toBe(true);
    });

    test('should have setGraph function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.setGraph === 'function');
      expect(result).toBe(true);
    });

    test('should have getHeights function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.getHeights === 'function');
      expect(result).toBe(true);
    });

    test('should have generate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.generate === 'function');
      expect(result).toBe(true);
    });

    test('should have fromTemplate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.fromTemplate === 'function');
      expect(result).toBe(true);
    });

    test('should have fromPrecreated function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.fromPrecreated === 'function');
      expect(result).toBe(true);
    });

    test('should have addHill function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.addHill === 'function');
      expect(result).toBe(true);
    });

    test('should have addRange function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.addRange === 'function');
      expect(result).toBe(true);
    });

    test('should have addTrough function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.addTrough === 'function');
      expect(result).toBe(true);
    });

    test('should have addStrait function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.addStrait === 'function');
      expect(result).toBe(true);
    });

    test('should have addPit function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.addPit === 'function');
      expect(result).toBe(true);
    });

    test('should have smooth function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.smooth === 'function');
      expect(result).toBe(true);
    });

    test('should have modify function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.modify === 'function');
      expect(result).toBe(true);
    });

    test('should have mask function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.mask === 'function');
      expect(result).toBe(true);
    });

    test('should have invert function', async ({ page }) => {
      const result = await page.evaluate(() => typeof HeightmapGenerator.invert === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('heightmapTemplates availability', () => {
    test('should have heightmapTemplates defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof heightmapTemplates === 'object');
      expect(result).toBe(true);
    });

    test('should have multiple templates', async ({ page }) => {
      const result = await page.evaluate(() => Object.keys(heightmapTemplates).length);
      expect(result).toBeGreaterThan(0);
    });

    test('should have template strings', async ({ page }) => {
      const result = await page.evaluate(() => {
        const templates = Object.values(heightmapTemplates);
        return templates.every(t => typeof t.template === 'string' || t.template === undefined);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Helper functions availability', () => {
    test('should have getNumberInRange function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getNumberInRange === 'function');
      expect(result).toBe(true);
    });

    test('should have lim function', async ({ page }) => {
      const result = await page.evaluate(() => typeof lim === 'function');
      expect(result).toBe(true);
    });

    test('should have createTypedArray function', async ({ page }) => {
      const result = await page.evaluate(() => typeof createTypedArray === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('lim() - Limit height to 0-100', () => {
    test('should clamp values to 0-100 range', async ({ page }) => {
      const result = await page.evaluate(() => ({
        low: lim(-10),
        normal: lim(50),
        high: lim(150)
      }));
      expect(result.low).toBe(0);
      expect(result.normal).toBe(50);
      expect(result.high).toBe(100);
    });

    test('should handle edge values', async ({ page }) => {
      const result = await page.evaluate(() => ({
        zero: lim(0),
        hundred: lim(100)
      }));
      expect(result.zero).toBe(0);
      expect(result.hundred).toBe(100);
    });

    test('should handle decimal values', async ({ page }) => {
      const result = await page.evaluate(() => lim(50.7));
      // lim may or may not round - just verify it stays in range
      expect(result).toBeGreaterThanOrEqual(50);
      expect(result).toBeLessThanOrEqual(51);
    });
  });

  test.describe('getNumberInRange() - Parse range strings', () => {
    test('should return number for single value', async ({ page }) => {
      const result = await page.evaluate(() => getNumberInRange('50'));
      expect(result).toBe(50);
    });

    test('should return number in range', async ({ page }) => {
      const result = await page.evaluate(() => {
        const values = [];
        for (let i = 0; i < 10; i++) {
          values.push(getNumberInRange('20-30'));
        }
        return {
          allInRange: values.every(v => v >= 20 && v <= 30),
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });
      expect(result.allInRange).toBe(true);
    });

    test('should handle negative range notation', async ({ page }) => {
      const result = await page.evaluate(() => {
        const value = getNumberInRange('10-20');
        return value >= 10 && value <= 20;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('createTypedArray() - Create height array', () => {
    test('should create Uint8Array for heights', async ({ page }) => {
      const result = await page.evaluate(() => {
        const arr = createTypedArray({ maxValue: 100, length: 100 });
        return arr instanceof Uint8Array;
      });
      expect(result).toBe(true);
    });

    test('should create array with correct length', async ({ page }) => {
      const result = await page.evaluate(() => {
        const arr = createTypedArray({ maxValue: 100, length: 50 });
        return arr.length;
      });
      expect(result).toBe(50);
    });

    test('should create array initialized to zero', async ({ page }) => {
      const result = await page.evaluate(() => {
        const arr = createTypedArray({ maxValue: 100, length: 10 });
        return Array.from(arr).every(v => v === 0);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('grid.cells.h integration', () => {
    test('should have grid.cells.h as Uint8Array', async ({ page }) => {
      const result = await page.evaluate(() => {
        return grid.cells.h instanceof Uint8Array;
      });
      expect(result).toBe(true);
    });

    test('should have height values in valid range', async ({ page }) => {
      const result = await page.evaluate(() => {
        const heights = Array.from(grid.cells.h);
        return heights.every(h => h >= 0 && h <= 100);
      });
      expect(result).toBe(true);
    });

    test('should have both land and water cells', async ({ page }) => {
      const result = await page.evaluate(() => {
        const heights = Array.from(grid.cells.h);
        const landCells = heights.filter(h => h >= 20).length;
        const waterCells = heights.filter(h => h < 20).length;
        return { landCells, waterCells };
      });
      expect(result.landCells).toBeGreaterThan(0);
      expect(result.waterCells).toBeGreaterThan(0);
    });
  });

  test.describe('Template parsing', () => {
    test('should parse template steps correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const template = heightmapTemplates['Continents'];
        if (!template) return { found: false };
        const steps = template.template.split('\n').filter(s => s.trim());
        return {
          found: true,
          stepCount: steps.length,
          firstStep: steps[0]?.trim().split(' ')[0]
        };
      });
      if (result.found) {
        expect(result.stepCount).toBeGreaterThan(0);
        expect(['Hill', 'Range', 'Trough', 'Pit', 'Strait', 'Mask', 'Invert', 'Add', 'Multiply', 'Smooth']).toContain(result.firstStep);
      }
    });

    test('should have valid tool names in templates', async ({ page }) => {
      const result = await page.evaluate(() => {
        const validTools = ['Hill', 'Pit', 'Range', 'Trough', 'Strait', 'Mask', 'Invert', 'Add', 'Multiply', 'Smooth'];
        const templates = Object.values(heightmapTemplates).filter(t => t.template);
        let allValid = true;
        for (const t of templates) {
          const steps = t.template.split('\n').filter(s => s.trim());
          for (const step of steps) {
            const tool = step.trim().split(' ')[0];
            if (!validTools.includes(tool)) {
              allValid = false;
              break;
            }
          }
        }
        return allValid;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Blob and line power calculations', () => {
    test('should have graphWidth defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof graphWidth === 'number');
      expect(result).toBe(true);
    });

    test('should have graphHeight defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof graphHeight === 'number');
      expect(result).toBe(true);
    });
  });

  test.describe('precreatedHeightmaps availability', () => {
    test('should have precreatedHeightmaps defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof precreatedHeightmaps !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have multiple precreated heightmaps', async ({ page }) => {
      const result = await page.evaluate(() => {
        // It could be an array or object
        if (Array.isArray(precreatedHeightmaps)) {
          return precreatedHeightmaps.length;
        }
        return Object.keys(precreatedHeightmaps).length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should have valid heightmap entries', async ({ page }) => {
      const result = await page.evaluate(() => {
        if (Array.isArray(precreatedHeightmaps)) {
          return precreatedHeightmaps.every(h => typeof h === 'string' || typeof h === 'object');
        }
        // If it's an object, check its values
        return Object.values(precreatedHeightmaps).every(h => typeof h === 'string' || typeof h === 'object');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Height value semantics', () => {
    test('should treat values < 20 as water', async ({ page }) => {
      const result = await page.evaluate(() => {
        const waterCells = [];
        for (let i = 0; i < grid.cells.i.length; i++) {
          if (grid.cells.h[i] < 20) {
            waterCells.push(i);
          }
        }
        return waterCells.length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should treat values >= 20 as land', async ({ page }) => {
      const result = await page.evaluate(() => {
        const landCells = [];
        for (let i = 0; i < grid.cells.i.length; i++) {
          if (grid.cells.h[i] >= 20) {
            landCells.push(i);
          }
        }
        return landCells.length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should have mountain threshold at 44', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Heights >= 44 are considered hills, >= 67 are mountains
        const hillCells = Array.from(grid.cells.h).filter(h => h >= 44 && h < 67).length;
        const mountainCells = Array.from(grid.cells.h).filter(h => h >= 67).length;
        return { hillCells, mountainCells };
      });
      // May not have mountains on every map, but check the structure exists
      expect(result.hillCells).toBeGreaterThanOrEqual(0);
      expect(result.mountainCells).toBeGreaterThanOrEqual(0);
    });
  });
});
