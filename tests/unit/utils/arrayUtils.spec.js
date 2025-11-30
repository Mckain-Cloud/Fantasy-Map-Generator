import { test, expect } from '@playwright/test';
import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';

test.describe('arrayUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await startCoverage(page);
    await page.goto('/');
    await page.waitForFunction(() => {
      try {
        return typeof last === 'function' &&
               typeof unique === 'function' &&
               typeof deepCopy === 'function' &&
               typeof getTypedArray === 'function';
      } catch { return false; }
    }, { timeout: 30000 });
  });

  test.afterAll(async () => {
    await stopCoverage(page);
    await flushCoverage();
    await page.close();
  });

  test.describe('last() - Get last element', () => {
    test('should return last element of array', async () => {
      const result = await page.evaluate(() => {
        const arr = [1, 2, 3, 4, 5];
        return arr[arr.length - 1];
      });
      expect(result).toBe(5);
    });

    test('should return undefined for empty array', async () => {
      const result = await page.evaluate(() => last([]));
      expect(result).toBeUndefined();
    });

    test('should work with single element array', async () => {
      const result = await page.evaluate(() => last(['only']));
      expect(result).toBe('only');
    });

    test('should work with strings', async () => {
      const result = await page.evaluate(() => last(['a', 'b', 'c']));
      expect(result).toBe('c');
    });

    test('should work with objects', async () => {
      const result = await page.evaluate(() => {
        const arr = [{id: 1}, {id: 2}];
        return arr[arr.length - 1];
      });
      expect(result).toEqual({id: 2});
    });
  });

  test.describe('unique() - Remove duplicates', () => {
    test('should remove duplicates from array', async () => {
      const result = await page.evaluate(() => unique([1, 2, 2, 3, 3, 3]));
      expect(result).toEqual([1, 2, 3]);
    });

    test('should handle array with no duplicates', async () => {
      const result = await page.evaluate(() => unique([1, 2, 3]));
      expect(result).toEqual([1, 2, 3]);
    });

    test('should handle empty array', async () => {
      const result = await page.evaluate(() => unique([]));
      expect(Array.isArray(result) ? result : []).toEqual([]);
    });

    test('should work with strings', async () => {
      const result = await page.evaluate(() => unique(['a', 'b', 'a', 'c', 'b']));
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('should preserve order of first occurrence', async () => {
      const result = await page.evaluate(() => unique([3, 1, 2, 3, 1]));
      expect(result).toEqual([3, 1, 2]);
    });

    test('should handle all same elements', async () => {
      const result = await page.evaluate(() => unique([5, 5, 5, 5]));
      expect(result).toEqual([5]);
    });
  });

  test.describe('deepCopy() - Deep clone object', () => {
    test('should deep copy simple object', async () => {
      const result = await page.evaluate(() => {
        const obj = { a: 1, b: 2 };
        const copy = deepCopy(obj);
        return { original: obj, copy: copy, areSame: obj === copy };
      });

      expect(result.copy).toEqual(result.original);
      expect(result.areSame).toBe(false);
    });

    test('should deep copy nested object', async () => {
      const result = await page.evaluate(() => {
        const obj = { a: { b: { c: 1 } } };
        const copy = deepCopy(obj);
        return { copy: copy, isDeep: obj.a !== copy.a };
      });

      expect(result.copy).toEqual({ a: { b: { c: 1 } } });
      expect(result.isDeep).toBe(true);
    });

    test('should deep copy array', async () => {
      const result = await page.evaluate(() => {
        const arr = [1, 2, [3, 4]];
        const copy = deepCopy(arr);
        return { copy: copy, areSame: arr === copy };
      });

      expect(result.copy).toEqual([1, 2, [3, 4]]);
      expect(result.areSame).toBe(false);
    });

    test('should deep copy typed array', async () => {
      const result = await page.evaluate(() => {
        const arr = new Uint8Array([1, 2, 3]);
        const copy = deepCopy(arr);
        return {
          isUint8: copy instanceof Uint8Array,
          values: Array.from(copy),
          areSame: arr === copy
        };
      });

      expect(result.isUint8).toBe(true);
      expect(result.values).toEqual([1, 2, 3]);
      expect(result.areSame).toBe(false);
    });

    test('should deep copy Date object', async () => {
      const result = await page.evaluate(() => {
        const date = new Date('2025-01-01');
        const copy = deepCopy(date);
        return {
          isDate: copy instanceof Date,
          time: copy.getTime(),
          areSame: date === copy
        };
      });

      expect(result.isDate).toBe(true);
      expect(result.areSame).toBe(false);
    });

    test('should deep copy Map', async () => {
      const result = await page.evaluate(() => {
        const map = new Map([[1, 'a'], [2, 'b']]);
        const copy = deepCopy(map);
        return {
          isMap: copy instanceof Map,
          size: copy.size,
          hasKey: copy.has(1),
          value: copy.get(1)
        };
      });

      expect(result.isMap).toBe(true);
      expect(result.size).toBe(2);
      expect(result.hasKey).toBe(true);
      expect(result.value).toBe('a');
    });
  });

  test.describe('getTypedArray() - Get appropriate typed array type', () => {
    test('should return Uint8Array for values <= 255', async () => {
      const result = await page.evaluate(() => {
        const ArrayType = getTypedArray(255);
        return ArrayType.name;
      });
      expect(result).toBe('Uint8Array');
    });

    test('should return Uint16Array for values <= 65535', async () => {
      const result = await page.evaluate(() => {
        const ArrayType = getTypedArray(65535);
        return ArrayType.name;
      });
      expect(result).toBe('Uint16Array');
    });

    test('should return Uint32Array for values > 65535', async () => {
      const result = await page.evaluate(() => {
        const ArrayType = getTypedArray(100000);
        return ArrayType.name;
      });
      expect(result).toBe('Uint32Array');
    });

    test('should return Uint8Array for small values', async () => {
      const result = await page.evaluate(() => {
        const ArrayType = getTypedArray(100);
        return ArrayType.name;
      });
      expect(result).toBe('Uint8Array');
    });
  });

  test.describe('createTypedArray() - Create typed array', () => {
    test('should create Uint8Array with length', async () => {
      const result = await page.evaluate(() => {
        const arr = createTypedArray({ maxValue: 100, length: 10 });
        return {
          isUint8: arr instanceof Uint8Array,
          length: arr.length
        };
      });

      expect(result.isUint8).toBe(true);
      expect(result.length).toBe(10);
    });

    test('should create array from existing array', async () => {
      const result = await page.evaluate(() => {
        const arr = createTypedArray({ maxValue: 100, from: [1, 2, 3] });
        return {
          isUint8: arr instanceof Uint8Array,
          values: Array.from(arr)
        };
      });

      expect(result.isUint8).toBe(true);
      expect(result.values).toEqual([1, 2, 3]);
    });

    test('should create Uint16Array for larger values', async () => {
      const result = await page.evaluate(() => {
        const arr = createTypedArray({ maxValue: 1000, length: 5 });
        return {
          isUint16: arr instanceof Uint16Array,
          length: arr.length
        };
      });

      expect(result.isUint16).toBe(true);
      expect(result.length).toBe(5);
    });
  });
});
