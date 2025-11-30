import { test, expect } from '@playwright/test';
import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';

test.describe('pathUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await startCoverage(page);
    await page.goto('/');
    await page.waitForFunction(
      () => typeof window.getFillPath === 'function',
      { timeout: 30000 }
    );
  });

  test.afterAll(async () => {
    await stopCoverage(page);
    await flushCoverage();
    await page.close();
  });

  test.describe('getFillPath() - Generate SVG fill path', () => {
    test('should create path from vertex chain', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100]
          ]
        };
        const vertexChain = [0, 1, 2, 3];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result).toContain('M');
      expect(result).toContain('L');
      expect(result).toContain('Z');
      expect(result).toContain('100,0');
    });

    test('should start with M command', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [[10, 20], [30, 40], [50, 60]]
        };
        const vertexChain = [0, 1, 2];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result.trim()).toMatch(/^M/);
    });

    test('should end with Z command', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [[0, 0], [10, 10], [20, 0]]
        };
        const vertexChain = [0, 1, 2];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result.trim()).toMatch(/Z$/);
    });

    test('should include all points', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [10, 20],
            [30, 40],
            [50, 60]
          ]
        };
        const vertexChain = [0, 1, 2];
        const path = getFillPath(mockVertices, vertexChain);
        return {
          path,
          hasFirst: path.includes('10,20'),
          hasSecond: path.includes('30,40'),
          hasThird: path.includes('50,60')
        };
      });

      expect(result.hasFirst).toBe(true);
      expect(result.hasSecond).toBe(true);
      expect(result.hasThird).toBe(true);
    });

    test('should handle triangular path', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0],
            [100, 0],
            [50, 100]
          ]
        };
        const vertexChain = [0, 1, 2];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result).toContain('M');
      expect(result).toContain('L');
      expect(result).toContain('Z');
    });

    test('should handle single point chain', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [[50, 50]]
        };
        const vertexChain = [0];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result).toContain('M50,50');
      expect(result).toContain('Z');
    });

    test('should handle large polygon', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0], [20, 0], [40, 0], [60, 0], [80, 0],
            [80, 20], [80, 40], [80, 60], [80, 80],
            [60, 80], [40, 80], [20, 80], [0, 80],
            [0, 60], [0, 40], [0, 20]
          ]
        };
        const vertexChain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        const path = getFillPath(mockVertices, vertexChain);
        return {
          hasM: path.includes('M'),
          hasL: path.includes('L'),
          hasZ: path.includes('Z'),
          length: path.length
        };
      });

      expect(result.hasM).toBe(true);
      expect(result.hasL).toBe(true);
      expect(result.hasZ).toBe(true);
      expect(result.length).toBeGreaterThan(20);
    });
  });

  test.describe('getBorderPath() - Generate border path with discontinuities', () => {
    test('should create border path', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0],
            [100, 0],
            [200, 0],
            [300, 0]
          ]
        };
        const vertexChain = [0, 1, 2, 3];
        const discontinue = () => false;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    test('should start with M when first vertex is not discontinued', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [[10, 20], [30, 40], [50, 60]]
        };
        const vertexChain = [0, 1, 2];
        const discontinue = () => false;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      expect(result).toMatch(/^M/);
    });

    test('should handle discontinuities', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0],
            [10, 10],
            [20, 20],
            [30, 30]
          ]
        };
        const vertexChain = [0, 1, 2, 3];
        const discontinue = (vertexId) => vertexId === 1;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      expect(result).toBeTruthy();
      const mCount = (result.match(/M/g) || []).length;
      expect(mCount).toBeGreaterThan(1);
    });

    test('should skip discontinued vertices', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0],
            [10, 10],
            [20, 20]
          ]
        };
        const vertexChain = [0, 1, 2];
        const discontinue = (vertexId) => vertexId === 1;
        const path = getBorderPath(mockVertices, vertexChain, discontinue);
        return {
          path,
          hasFirst: path.includes('0,0'),
          hasSecond: path.includes('10,10'),
          hasThird: path.includes('20,20')
        };
      });

      expect(result.hasFirst).toBe(true);
      expect(result.hasSecond).toBe(false);
      expect(result.hasThird).toBe(true);
    });

    test('should handle all discontinued vertices', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [[0, 0], [10, 10], [20, 20]]
        };
        const vertexChain = [0, 1, 2];
        const discontinue = () => true;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      expect(result).toBe('');
    });

    test('should handle no discontinued vertices', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0],
            [10, 10],
            [20, 20],
            [30, 30]
          ]
        };
        const vertexChain = [0, 1, 2, 3];
        const discontinue = () => false;
        const path = getBorderPath(mockVertices, vertexChain, discontinue);
        const mCount = (path.match(/M/g) || []).length;
        return mCount;
      });

      expect(result).toBe(1);
    });

    test('should use L commands for continuous segments', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [
            [0, 0],
            [10, 10],
            [20, 20]
          ]
        };
        const vertexChain = [0, 1, 2];
        const discontinue = () => false;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      expect(result.length).toBeGreaterThan(0);
    });
  });

  test.describe('Path utility functions availability', () => {
    test('should have getIsolines function available', async () => {
      const result = await page.evaluate(() => {
        return typeof getIsolines === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have getVertexPath function available', async () => {
      const result = await page.evaluate(() => {
        return typeof getVertexPath === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have getPolesOfInaccessibility function available', async () => {
      const result = await page.evaluate(() => {
        return typeof getPolesOfInaccessibility === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have connectVertices function available', async () => {
      const result = await page.evaluate(() => {
        return typeof connectVertices === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have findPath function available', async () => {
      const result = await page.evaluate(() => {
        return typeof findPath === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have restorePath function available', async () => {
      const result = await page.evaluate(() => {
        return typeof restorePath === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('restorePath() - Restore path from exit to start', () => {
    test('should restore simple path', async () => {
      const result = await page.evaluate(() => {
        const from = [null, 0, 1, 2];
        const path = restorePath(3, 0, from);
        return path;
      });

      expect(result).toEqual([0, 1, 2, 3]);
    });

    test('should restore longer path', async () => {
      const result = await page.evaluate(() => {
        const from = [null, 0, 1, 2, 3, 4];
        const path = restorePath(5, 0, from);
        return path;
      });

      expect(result).toEqual([0, 1, 2, 3, 4, 5]);
    });

    test('should handle direct connection', async () => {
      const result = await page.evaluate(() => {
        const from = [null, 0];
        const path = restorePath(1, 0, from);
        return path;
      });

      expect(result).toEqual([0, 1]);
    });

    test('should handle branching paths', async () => {
      const result = await page.evaluate(() => {
        const from = [null, 0, 1, 1, 3];
        const path = restorePath(4, 0, from);
        return path;
      });

      expect(result).toEqual([0, 1, 3, 4]);
    });

    test('should return path in correct order', async () => {
      const result = await page.evaluate(() => {
        const from = [null, 0, 1, 2];
        const path = restorePath(3, 0, from);
        return {
          path,
          first: path[0],
          last: path[path.length - 1]
        };
      });

      expect(result.first).toBe(0);
      expect(result.last).toBe(3);
    });

    test('should handle same start and exit', async () => {
      const result = await page.evaluate(() => {
        const from = [null];
        const path = restorePath(0, 0, from);
        return path;
      });

      expect(result).toEqual([0]);
    });

    test('should handle longer non-linear path', async () => {
      const result = await page.evaluate(() => {
        const from = [null, 0, 0, 2, 2, 4];
        const path = restorePath(5, 0, from);
        return path;
      });

      expect(result).toEqual([0, 2, 4, 5]);
    });
  });

  test.describe('getFillPath() edge cases', () => {
    test('should handle two-point chain', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = { p: [[0, 0], [100, 100]] };
        const vertexChain = [0, 1];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result).toContain('M');
      expect(result).toContain('L');
      expect(result).toContain('Z');
    });

    test('should handle decimal coordinates', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = { p: [[1.5, 2.5], [3.5, 4.5], [5.5, 6.5]] };
        const vertexChain = [0, 1, 2];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result).toContain('1.5,2.5');
    });

    test('should handle negative coordinates', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = { p: [[-10, -20], [10, 20], [-10, 20]] };
        const vertexChain = [0, 1, 2];
        return getFillPath(mockVertices, vertexChain);
      });

      expect(result).toContain('-10,-20');
      expect(result).toContain('10,20');
    });
  });

  test.describe('getBorderPath() edge cases', () => {
    test('should handle empty vertex chain', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = { p: [[0, 0], [10, 10]] };
        const vertexChain = [];
        const discontinue = () => false;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      expect(result).toBe('');
    });

    test('should handle single vertex', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = { p: [[50, 50]] };
        const vertexChain = [0];
        const discontinue = () => false;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      expect(result).toContain('M');
      expect(result).toContain('50,50');
    });

    test('should handle alternating discontinuities', async () => {
      const result = await page.evaluate(() => {
        const mockVertices = {
          p: [[0, 0], [10, 10], [20, 20], [30, 30], [40, 40]]
        };
        const vertexChain = [0, 1, 2, 3, 4];
        const discontinue = (vertexId) => vertexId % 2 === 1;
        return getBorderPath(mockVertices, vertexChain, discontinue);
      });

      const mCount = (result.match(/M/g) || []).length;
      expect(mCount).toBe(3); // vertices 0, 2, 4 each start a new M
    });
  });
});
