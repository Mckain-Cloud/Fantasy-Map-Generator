import { test, expect } from '@playwright/test';
import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';

test.describe('functionUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await startCoverage(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof window.rollups === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await stopCoverage(page);
    await flushCoverage();
    await page.close();
  });

  test.describe('dist2() - Calculate squared distance', () => {
    test('should calculate squared distance between two points', async () => {
      const result = await page.evaluate(() => dist2([0, 0], [3, 4]));
      expect(result).toBe(25);
    });

    test('should calculate distance for same point', async () => {
      const result = await page.evaluate(() => dist2([5, 5], [5, 5]));
      expect(result).toBe(0);
    });

    test('should handle negative coordinates', async () => {
      const result = await page.evaluate(() => dist2([-1, -1], [2, 3]));
      expect(result).toBe(25);
    });

    test('should handle decimal coordinates', async () => {
      const result = await page.evaluate(() => dist2([0.5, 0.5], [1.5, 1.5]));
      expect(result).toBe(2);
    });

    test('should calculate horizontal distance', async () => {
      const result = await page.evaluate(() => dist2([0, 0], [5, 0]));
      expect(result).toBe(25);
    });

    test('should calculate vertical distance', async () => {
      const result = await page.evaluate(() => dist2([0, 0], [0, 5]));
      expect(result).toBe(25);
    });

    test('should handle large coordinates', async () => {
      const result = await page.evaluate(() => dist2([100, 200], [103, 204]));
      expect(result).toBe(25);
    });

    test('should be commutative', async () => {
      const result = await page.evaluate(() => {
        const d1 = dist2([1, 2], [4, 6]);
        const d2 = dist2([4, 6], [1, 2]);
        return { d1, d2 };
      });
      expect(result.d1).toBe(result.d2);
    });
  });

  test.describe('rollups() - Group and reduce values', () => {
    test('should group by single key and count', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: 1 },
          { type: 'A', value: 2 },
          { type: 'B', value: 3 }
        ];
        const grouped = rollups(
          data,
          v => v.length,
          d => d.type
        );
        return Array.from(grouped);
      });
      expect(result).toEqual([
        ['A', 2],
        ['B', 1]
      ]);
    });

    test('should group by single key and sum', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: 1 },
          { type: 'A', value: 2 },
          { type: 'B', value: 3 }
        ];
        const grouped = rollups(
          data,
          v => v.reduce((sum, d) => sum + d.value, 0),
          d => d.type
        );
        return Array.from(grouped);
      });
      expect(result).toEqual([
        ['A', 3],
        ['B', 3]
      ]);
    });

    test('should group by multiple keys', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { category: 'X', type: 'A', value: 1 },
          { category: 'X', type: 'B', value: 2 },
          { category: 'Y', type: 'A', value: 3 }
        ];
        const grouped = rollups(
          data,
          v => v.length,
          d => d.category,
          d => d.type
        );
        return Array.from(grouped).map(([k, v]) => [k, Array.from(v)]);
      });
      expect(result).toEqual([
        ['X', [['A', 1], ['B', 1]]],
        ['Y', [['A', 1]]]
      ]);
    });

    test('should handle empty array', async () => {
      const result = await page.evaluate(() => {
        const grouped = rollups([], v => v.length, d => d.type);
        return Array.from(grouped);
      });
      expect(result).toEqual([]);
    });

    test('should handle single item', async () => {
      const result = await page.evaluate(() => {
        const data = [{ type: 'A', value: 1 }];
        const grouped = rollups(data, v => v.length, d => d.type);
        return Array.from(grouped);
      });
      expect(result).toEqual([['A', 1]]);
    });

    test('should preserve key types', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { id: 1, value: 'a' },
          { id: 1, value: 'b' },
          { id: 2, value: 'c' }
        ];
        const grouped = rollups(data, v => v.length, d => d.id);
        return Array.from(grouped);
      });
      expect(result).toEqual([
        [1, 2],
        [2, 1]
      ]);
    });

    test('should handle custom reduce functions', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: 1 },
          { type: 'A', value: 5 },
          { type: 'B', value: 3 }
        ];
        const grouped = rollups(
          data,
          v => Math.max(...v.map(d => d.value)),
          d => d.type
        );
        return Array.from(grouped);
      });
      expect(result).toEqual([
        ['A', 5],
        ['B', 3]
      ]);
    });
  });

  test.describe('nest() - Nested grouping', () => {
    test('should create nested groups with single key', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: 1 },
          { type: 'A', value: 2 },
          { type: 'B', value: 3 }
        ];
        const nested = nest(
          data,
          map => Array.from(map),
          values => values.length,
          [d => d.type]
        );
        return nested;
      });
      expect(result).toEqual([
        ['A', 2],
        ['B', 1]
      ]);
    });

    test('should create nested groups with multiple keys', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { category: 'X', type: 'A', value: 1 },
          { category: 'X', type: 'B', value: 2 },
          { category: 'Y', type: 'A', value: 3 }
        ];
        const nested = nest(
          data,
          map => Array.from(map),
          values => values.length,
          [d => d.category, d => d.type]
        );
        return nested.map(([k, v]) => [k, Array.from(v)]);
      });
      expect(result).toEqual([
        ['X', [['A', 1], ['B', 1]]],
        ['Y', [['A', 1]]]
      ]);
    });

    test('should handle empty data', async () => {
      const result = await page.evaluate(() => {
        const nested = nest(
          [],
          map => Array.from(map),
          values => values.length,
          [d => d.type]
        );
        return Array.isArray(nested) ? nested.length : 0;
      });
      expect(result).toBe(0);
    });

    test('should use custom map function', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: 1 },
          { type: 'B', value: 2 }
        ];
        const nested = nest(
          data,
          map => Object.fromEntries(map),
          values => values.length,
          [d => d.type]
        );
        return nested;
      });
      expect(result).toEqual({ A: 1, B: 1 });
    });

    test('should use custom reduce function', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: 1 },
          { type: 'A', value: 2 },
          { type: 'B', value: 3 }
        ];
        const nested = nest(
          data,
          map => Array.from(map),
          values => values.reduce((sum, d) => sum + d.value, 0),
          [d => d.type]
        );
        return nested;
      });
      expect(result).toEqual([
        ['A', 3],
        ['B', 3]
      ]);
    });

    test('should handle three levels of nesting', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { a: '1', b: 'X', c: 'I', value: 1 },
          { a: '1', b: 'X', c: 'II', value: 2 },
          { a: '1', b: 'Y', c: 'I', value: 3 },
          { a: '2', b: 'X', c: 'I', value: 4 }
        ];
        const nested = nest(
          data,
          map => Array.from(map),
          values => values.length,
          [d => d.a, d => d.b, d => d.c]
        );
        return Array.from(nested).map(([k1, v1]) => [
          k1,
          Array.from(v1).map(([k2, v2]) => [
            k2,
            Array.from(v2)
          ])
        ]);
      });
      expect(result).toEqual([
        ['1', [
          ['X', [['I', 1], ['II', 1]]],
          ['Y', [['I', 1]]]
        ]],
        ['2', [
          ['X', [['I', 1]]]
        ]]
      ]);
    });

    test('should handle no keys (apply reduce to all)', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { value: 1 },
          { value: 2 },
          { value: 3 }
        ];
        const nested = nest(
          data,
          map => Array.from(map),
          values => values.reduce((sum, d) => sum + d.value, 0),
          []
        );
        return nested;
      });
      expect(result).toBe(6);
    });

    test('should handle keys returning same value for all items', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: 1 },
          { type: 'A', value: 2 },
          { type: 'A', value: 3 }
        ];
        const nested = nest(
          data,
          map => Array.from(map),
          values => values.length,
          [d => d.type]
        );
        return nested;
      });
      expect(result).toEqual([['A', 3]]);
    });

    test('should handle numeric keys', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { id: 1, value: 'a' },
          { id: 2, value: 'b' },
          { id: 1, value: 'c' }
        ];
        const nested = nest(
          data,
          map => Array.from(map),
          values => values.map(d => d.value).join(','),
          [d => d.id]
        );
        return nested;
      });
      expect(result).toEqual([[1, 'a,c'], [2, 'b']]);
    });
  });

  test.describe('rollups() edge cases', () => {
    test('should handle objects with undefined values', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { type: 'A', value: undefined },
          { type: 'A', value: 1 },
          { type: 'B', value: null }
        ];
        const grouped = rollups(data, v => v.length, d => d.type);
        return Array.from(grouped);
      });
      expect(result).toEqual([['A', 2], ['B', 1]]);
    });

    test('should handle keying by complex expression', async () => {
      const result = await page.evaluate(() => {
        const data = [
          { x: 1, y: 2 },
          { x: 1, y: 2 },
          { x: 3, y: 4 }
        ];
        const grouped = rollups(data, v => v.length, d => `${d.x},${d.y}`);
        return Array.from(grouped);
      });
      expect(result).toEqual([['1,2', 2], ['3,4', 1]]);
    });

    test('should handle index parameter in key function', async () => {
      const result = await page.evaluate(() => {
        const data = ['a', 'b', 'c', 'd', 'e'];
        const grouped = rollups(data, v => v.join(''), (d, i) => i % 2);
        return Array.from(grouped);
      });
      expect(result).toEqual([[0, 'ace'], [1, 'bd']]);
    });
  });

  test.describe('dist2() edge cases', () => {
    test('should handle very large numbers', async () => {
      const result = await page.evaluate(() => dist2([0, 0], [1000000, 1000000]));
      expect(result).toBe(2e12);
    });

    test('should handle floating point precision', async () => {
      const result = await page.evaluate(() => dist2([0.1, 0.1], [0.2, 0.2]));
      // (0.1)^2 + (0.1)^2 = 0.02
      expect(result).toBeCloseTo(0.02, 10);
    });
  });
});
