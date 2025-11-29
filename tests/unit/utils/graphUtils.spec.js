import { test, expect } from '@playwright/test';

test.describe('graphUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
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
});
