import { test, expect } from '@playwright/test';
import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';

test.describe('graphUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await startCoverage(page);
    await page.goto('/');
    await page.waitForFunction(() => {
      try {
        return typeof findGridCell === 'function' &&
               typeof getJitteredGrid === 'function' &&
               typeof rn === 'function' &&
               rn(1.234, 2) === 1.23;
      } catch { return false; }
    }, { timeout: 30000 });
  });

  test.afterAll(async () => {
    await stopCoverage(page);
    await flushCoverage();
    await page.close();
  });

  test.describe('findGridCell() - Find cell on regular grid', () => {
    test('should find cell at origin', async () => {
      const result = await page.evaluate(() => {
        if (typeof findGridCell !== 'function') return null;
        const mockGrid = {
          spacing: 10,
          cellsX: 10,
          cellsY: 10
        };
        return findGridCell(0, 0, mockGrid);
      });
      if (result !== null) {
        expect(result).toBe(0);
      }
    });

    test('should find cell at specific coordinates', async () => {
      const result = await page.evaluate(() => {
        const mockGrid = {
          spacing: 10,
          cellsX: 10,
          cellsY: 10
        };
        return findGridCell(15, 15, mockGrid);
      });
      expect(result).toBe(11);
    });

    test('should handle edge coordinates', async () => {
      const result = await page.evaluate(() => {
        const mockGrid = {
          spacing: 10,
          cellsX: 5,
          cellsY: 5
        };
        return findGridCell(49, 49, mockGrid);
      });
      expect(result).toBe(24);
    });

    test('should cap to maximum cell indices', async () => {
      const result = await page.evaluate(() => {
        const mockGrid = {
          spacing: 10,
          cellsX: 5,
          cellsY: 5
        };
        return findGridCell(100, 100, mockGrid);
      });
      expect(result).toBe(24);
    });

    test('should handle different spacing values', async () => {
      const result = await page.evaluate(() => {
        const mockGrid = {
          spacing: 20,
          cellsX: 10,
          cellsY: 10
        };
        return findGridCell(30, 40, mockGrid);
      });
      expect(result).toBe(21);
    });

    test('should handle fractional coordinates', async () => {
      const result = await page.evaluate(() => {
        const mockGrid = {
          spacing: 10,
          cellsX: 10,
          cellsY: 10
        };
        return findGridCell(15.7, 25.3, mockGrid);
      });
      expect(result).toBe(21);
    });

    test('should handle large grids', async () => {
      const result = await page.evaluate(() => {
        const mockGrid = {
          spacing: 5,
          cellsX: 100,
          cellsY: 100
        };
        return findGridCell(250, 125, mockGrid);
      });
      expect(result).toBe(2550);
    });
  });

  test.describe('getBoundaryPoints() - Get edge points', () => {
    test('should generate boundary points', async () => {
      const result = await page.evaluate(() => {
        const points = getBoundaryPoints(100, 100, 10);
        return {
          isArray: Array.isArray(points),
          length: points.length,
          firstIsArray: Array.isArray(points[0]),
          firstLength: points[0]?.length
        };
      });
      expect(result.isArray).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.firstIsArray).toBe(true);
      expect(result.firstLength).toBe(2);
    });

    test('should generate points along perimeter', async () => {
      const result = await page.evaluate(() => {
        const points = getBoundaryPoints(100, 100, 20);
        const hasTopPoints = points.some(([x, y]) => y < 0);
        const hasBottomPoints = points.some(([x, y]) => y > 100);
        const hasLeftPoints = points.some(([x, y]) => x < 0);
        const hasRightPoints = points.some(([x, y]) => x > 100);

        return {
          count: points.length,
          hasTopPoints,
          hasBottomPoints,
          hasLeftPoints,
          hasRightPoints
        };
      });

      expect(result.count).toBeGreaterThan(8);
      expect(result.hasTopPoints).toBe(true);
      expect(result.hasBottomPoints).toBe(true);
      expect(result.hasLeftPoints).toBe(true);
      expect(result.hasRightPoints).toBe(true);
    });

    test('should scale with spacing', async () => {
      const result = await page.evaluate(() => {
        const points1 = getBoundaryPoints(100, 100, 10);
        const points2 = getBoundaryPoints(100, 100, 20);
        return {
          count1: points1.length,
          count2: points2.length
        };
      });
      expect(result.count1).toBeGreaterThan(result.count2);
    });

    test('should handle rectangular dimensions', async () => {
      const result = await page.evaluate(() => {
        const points = getBoundaryPoints(200, 100, 20);
        return points.length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should handle small spacing', async () => {
      const result = await page.evaluate(() => {
        const points = getBoundaryPoints(50, 50, 5);
        return points.length;
      });
      expect(result).toBeGreaterThan(16);
    });
  });

  test.describe('getJitteredGrid() - Get jittered grid points', () => {
    test('should generate grid points', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const points = getJitteredGrid(100, 100, 20);
        return {
          isArray: Array.isArray(points),
          length: points.length,
          firstIsArray: Array.isArray(points[0]),
          firstLength: points[0]?.length
        };
      });
      expect(result.isArray).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.firstIsArray).toBe(true);
      expect(result.firstLength).toBe(2);
    });

    test('should generate points in grid pattern', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const points = getJitteredGrid(100, 100, 20);
        return points.length;
      });
      expect(result).toBeGreaterThanOrEqual(20);
      expect(result).toBeLessThanOrEqual(30);
    });

    test('should respect width and height bounds', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const points = getJitteredGrid(100, 100, 10);
        const allWithinBounds = points.every(([x, y]) => x <= 100 && y <= 100);
        return allWithinBounds;
      });
      expect(result).toBe(true);
    });

    test('should generate more points with smaller spacing', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const points1 = getJitteredGrid(100, 100, 20);
        const points2 = getJitteredGrid(100, 100, 10);
        return {
          count1: points1.length,
          count2: points2.length
        };
      });
      expect(result.count2).toBeGreaterThan(result.count1);
    });

    test('should apply jittering', async () => {
      const result = await page.evaluate(() => {
        let callCount = 0;
        Math.random = () => {
          callCount++;
          return callCount % 2 === 0 ? 0.3 : 0.7;
        };

        const points = getJitteredGrid(100, 100, 20);

        const spacing = 20;
        const radius = spacing / 2;
        const perfectGridPoints = [];
        for (let y = radius; y < 100; y += spacing) {
          for (let x = radius; x < 100; x += spacing) {
            perfectGridPoints.push([x, y]);
          }
        }

        const allPerfect = points.every(([x, y]) =>
          perfectGridPoints.some(([px, py]) => px === x && py === y)
        );

        return !allPerfect;
      });
      expect(result).toBe(true);
    });

    test('should handle rectangular grids', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const points = getJitteredGrid(200, 100, 20);
        return points.length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should handle small grids', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const points = getJitteredGrid(50, 50, 20);
        return points.length;
      });
      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(9);
    });

    test('should return points with valid coordinates', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const points = getJitteredGrid(100, 100, 10);
        const allValid = points.every(([x, y]) =>
          typeof x === 'number' &&
          typeof y === 'number' &&
          !isNaN(x) &&
          !isNaN(y)
        );
        return allValid;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Graph generation integration', () => {
    test('should have shouldRegenerateGrid function available', async () => {
      const result = await page.evaluate(() => {
        return typeof shouldRegenerateGrid === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have generateGrid function available', async () => {
      const result = await page.evaluate(() => {
        return typeof generateGrid === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have calculateVoronoi function available', async () => {
      const result = await page.evaluate(() => {
        return typeof calculateVoronoi === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have Delaunator library loaded', async () => {
      const result = await page.evaluate(() => {
        return typeof Delaunator !== 'undefined';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('isLand() and isWater() - Cell type checks', () => {
    test('should have isLand function available', async () => {
      const result = await page.evaluate(() => typeof isLand === 'function');
      expect(result).toBe(true);
    });

    test('should have isWater function available', async () => {
      const result = await page.evaluate(() => typeof isWater === 'function');
      expect(result).toBe(true);
    });

    test('isLand and isWater should be opposites for same height', async () => {
      const result = await page.evaluate(() => {
        // Create mock pack data
        window.pack = {
          cells: {
            h: [10, 15, 19, 20, 25, 50, 100]
          }
        };

        const results = [];
        for (let i = 0; i < pack.cells.h.length; i++) {
          results.push({
            h: pack.cells.h[i],
            land: isLand(i),
            water: isWater(i)
          });
        }
        return results;
      });

      for (const r of result) {
        if (r.h >= 20) {
          expect(r.land).toBe(true);
          expect(r.water).toBe(false);
        } else {
          expect(r.land).toBe(false);
          expect(r.water).toBe(true);
        }
      }
    });

    test('should classify height 20 as land', async () => {
      const result = await page.evaluate(() => {
        window.pack = { cells: { h: [20] } };
        return { land: isLand(0), water: isWater(0) };
      });
      expect(result.land).toBe(true);
      expect(result.water).toBe(false);
    });

    test('should classify height 19 as water', async () => {
      const result = await page.evaluate(() => {
        window.pack = { cells: { h: [19] } };
        return { land: isLand(0), water: isWater(0) };
      });
      expect(result.land).toBe(false);
      expect(result.water).toBe(true);
    });
  });

  test.describe('poissonDiscSampler() - Poisson disc sampling', () => {
    test('should have poissonDiscSampler function available', async () => {
      const result = await page.evaluate(() => typeof poissonDiscSampler === 'function');
      expect(result).toBe(true);
    });

    test('should generate points as a generator', async () => {
      const result = await page.evaluate(() => {
        const sampler = poissonDiscSampler(0, 0, 100, 100, 20);
        const firstPoint = sampler.next();
        return {
          done: firstPoint.done,
          hasValue: !!firstPoint.value
        };
      });
      expect(result.done).toBe(false);
      expect(result.hasValue).toBe(true);
    });

    test('should generate first point near center', async () => {
      const result = await page.evaluate(() => {
        const sampler = poissonDiscSampler(0, 0, 100, 100, 10);
        const firstPoint = sampler.next().value;
        return { x: firstPoint[0], y: firstPoint[1] };
      });
      // First point should be near center (50, 50)
      expect(result.x).toBeCloseTo(50, 0);
      expect(result.y).toBeCloseTo(50, 0);
    });

    test('should generate multiple points', async () => {
      const result = await page.evaluate(() => {
        // Use smaller radius for more points
        const sampler = poissonDiscSampler(0, 0, 100, 100, 10);
        const points = [];
        let iterations = 0;
        for (const point of sampler) {
          points.push(point);
          iterations++;
          if (iterations > 100) break; // prevent infinite loop
        }
        return points.length;
      });
      expect(result).toBeGreaterThan(1);
    });

    test('should throw error for invalid parameters', async () => {
      const result = await page.evaluate(() => {
        try {
          const sampler = poissonDiscSampler(100, 100, 0, 0, 10); // invalid: x1 < x0
          sampler.next();
          return false;
        } catch (e) {
          return true;
        }
      });
      expect(result).toBe(true);
    });

    test('should throw error for negative radius', async () => {
      const result = await page.evaluate(() => {
        try {
          const sampler = poissonDiscSampler(0, 0, 100, 100, -10);
          sampler.next();
          return false;
        } catch (e) {
          return true;
        }
      });
      expect(result).toBe(true);
    });

    test('should generate points within bounds', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 0.5;
        const sampler = poissonDiscSampler(10, 20, 110, 120, 15);
        const points = [];
        let iterations = 0;
        for (const point of sampler) {
          points.push(point);
          iterations++;
          if (iterations > 30) break;
        }
        return points.every(([x, y]) => x >= 10 && x <= 110 && y >= 20 && y <= 120);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('findGridAll() - Find cells in radius', () => {
    test('should have findGridAll function available', async () => {
      const result = await page.evaluate(() => typeof findGridAll === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('getPackPolygon() and getGridPolygon() - Get polygon points', () => {
    test('should have getPackPolygon function available', async () => {
      const result = await page.evaluate(() => typeof getPackPolygon === 'function');
      expect(result).toBe(true);
    });

    test('should have getGridPolygon function available', async () => {
      const result = await page.evaluate(() => typeof getGridPolygon === 'function');
      expect(result).toBe(true);
    });
  });
});
