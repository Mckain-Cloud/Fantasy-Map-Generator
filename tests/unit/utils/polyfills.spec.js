import { test, expect } from '@playwright/test';

test.describe('polyfills.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('String.prototype.replaceAll()', () => {
    test('should replace all occurrences of a string', async () => {
      const result = await page.evaluate(() => {
        return 'hello world hello'.replaceAll('hello', 'hi');
      });
      expect(result).toBe('hi world hi');
    });

    test('should replace all occurrences of a character', async () => {
      const result = await page.evaluate(() => {
        return 'aaa bbb aaa'.replaceAll('a', 'x');
      });
      expect(result).toBe('xxx bbb xxx');
    });

    test('should handle empty replacement string', async () => {
      const result = await page.evaluate(() => {
        return 'test test'.replaceAll('test', '');
      });
      expect(result).toBe(' ');
    });

    test('should handle no matches', async () => {
      const result = await page.evaluate(() => {
        return 'hello world'.replaceAll('xyz', 'abc');
      });
      expect(result).toBe('hello world');
    });

    test('should work with regex', async () => {
      const result = await page.evaluate(() => {
        return 'test123test456'.replace(/\d+/g, 'X');
      });
      expect(result).toBe('testXtestX');
    });

    test('should handle special characters', async () => {
      const result = await page.evaluate(() => {
        return 'a.b.c.d'.replaceAll('.', '-');
      });
      expect(result).toBe('a-b-c-d');
    });

    test('should replace overlapping patterns', async () => {
      const result = await page.evaluate(() => {
        return 'aaaa'.replaceAll('aa', 'b');
      });
      expect(result).toBe('bb');
    });

    test('should handle empty string', async () => {
      const result = await page.evaluate(() => {
        return ''.replaceAll('a', 'b');
      });
      expect(result).toBe('');
    });

    test('should be case sensitive', async () => {
      const result = await page.evaluate(() => {
        return 'Hello hello HELLO'.replaceAll('hello', 'hi');
      });
      expect(result).toBe('Hello hi HELLO');
    });
  });

  test.describe('Array.prototype.flat()', () => {
    test('should flatten nested array one level', async () => {
      const result = await page.evaluate(() => {
        return [1, [2, 3], [4, 5]].flat();
      });
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('should flatten deeply nested arrays', async () => {
      const result = await page.evaluate(() => {
        return [1, [2, [3, [4]]]].flat();
      });
      expect(result).toEqual([1, 2, [3, [4]]]);
    });

    test('should handle empty arrays', async () => {
      const result = await page.evaluate(() => {
        return [1, [], [2, []], 3].flat();
      });
      expect(result).toEqual([1, 2, [], 3]);
    });

    test('should handle already flat array', async () => {
      const result = await page.evaluate(() => {
        return [1, 2, 3, 4].flat();
      });
      expect(result).toEqual([1, 2, 3, 4]);
    });

    test('should flatten mixed types', async () => {
      const result = await page.evaluate(() => {
        return ['a', ['b', 'c'], 'd'].flat();
      });
      expect(result).toEqual(['a', 'b', 'c', 'd']);
    });

    test('should handle nested empty arrays', async () => {
      const result = await page.evaluate(() => {
        return [[], [[]], [[[]]]].flat();
      });
      expect(result).toEqual([[], [[]]]);
    });

    test('should preserve object references', async () => {
      const result = await page.evaluate(() => {
        const obj = { a: 1 };
        const arr = [obj, [obj]].flat();
        return arr[0] === arr[1];
      });
      expect(result).toBe(true);
    });

    test('should handle single nested array', async () => {
      const result = await page.evaluate(() => {
        return [[1, 2, 3]].flat();
      });
      expect(result).toEqual([1, 2, 3]);
    });
  });

  test.describe('Array.prototype.at()', () => {
    test('should get element at positive index', async () => {
      const result = await page.evaluate(() => {
        return [1, 2, 3, 4, 5].at(2);
      });
      expect(result).toBe(3);
    });

    test('should get element at negative index', async () => {
      const result = await page.evaluate(() => {
        return [1, 2, 3, 4, 5].at(-1);
      });
      expect(result).toBe(5);
    });

    test('should get element at -2 index', async () => {
      const result = await page.evaluate(() => {
        return [1, 2, 3, 4, 5].at(-2);
      });
      expect(result).toBe(4);
    });

    test('should return undefined for out of bounds positive index', async () => {
      const result = await page.evaluate(() => {
        return [1, 2, 3].at(10);
      });
      expect(result).toBeUndefined();
    });

    test('should return undefined for out of bounds negative index', async () => {
      const result = await page.evaluate(() => {
        return [1, 2, 3].at(-10);
      });
      expect(result).toBeUndefined();
    });

    test('should get first element with at(0)', async () => {
      const result = await page.evaluate(() => {
        return ['a', 'b', 'c'].at(0);
      });
      expect(result).toBe('a');
    });

    test('should get last element with at(-1)', async () => {
      const result = await page.evaluate(() => {
        return ['a', 'b', 'c'].at(-1);
      });
      expect(result).toBe('c');
    });

    test('should handle single element array', async () => {
      const result = await page.evaluate(() => {
        return {
          at0: [42].at(0),
          atNeg1: [42].at(-1)
        };
      });
      expect(result.at0).toBe(42);
      expect(result.atNeg1).toBe(42);
    });

    test('should handle empty array', async () => {
      const result = await page.evaluate(() => {
        return [].at(0);
      });
      expect(result).toBeUndefined();
    });

    test('should work with strings in array', async () => {
      const result = await page.evaluate(() => {
        return ['first', 'second', 'third'].at(-2);
      });
      expect(result).toBe('second');
    });

    test('should work with objects in array', async () => {
      const result = await page.evaluate(() => {
        const obj = { value: 'test' };
        return [{ a: 1 }, obj, { c: 3 }].at(1);
      });
      expect(result).toEqual({ value: 'test' });
    });

    test('should handle array of mixed types', async () => {
      const result = await page.evaluate(() => {
        return [1, 'two', { three: 3 }, [4]].at(-1);
      });
      expect(result).toEqual([4]);
    });
  });

  test.describe('ReadableStream.prototype[Symbol.asyncIterator]', () => {
    test('should have async iterator on ReadableStream', async () => {
      const result = await page.evaluate(async () => {
        return typeof ReadableStream.prototype[Symbol.asyncIterator] === 'function';
      });
      expect(result).toBe(true);
    });

    test('should iterate over stream chunks', async () => {
      const result = await page.evaluate(async () => {
        const chunks = ['chunk1', 'chunk2', 'chunk3'];
        const stream = new ReadableStream({
          start(controller) {
            chunks.forEach(chunk => controller.enqueue(chunk));
            controller.close();
          }
        });

        const collected = [];
        for await (const chunk of stream) {
          collected.push(chunk);
        }
        return collected;
      });

      expect(result).toEqual(['chunk1', 'chunk2', 'chunk3']);
    });

    test('should handle empty stream', async () => {
      const result = await page.evaluate(async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.close();
          }
        });

        const collected = [];
        for await (const chunk of stream) {
          collected.push(chunk);
        }
        return collected;
      });

      expect(result).toEqual([]);
    });

    test('should handle single chunk', async () => {
      const result = await page.evaluate(async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue('single');
            controller.close();
          }
        });

        const collected = [];
        for await (const chunk of stream) {
          collected.push(chunk);
        }
        return collected;
      });

      expect(result).toEqual(['single']);
    });

    test('should break on stream error', async () => {
      const result = await page.evaluate(async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue('chunk1');
            controller.error(new Error('Test error'));
          }
        });

        try {
          const collected = [];
          for await (const chunk of stream) {
            collected.push(chunk);
          }
          return { success: true, collected };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });
  });

  test.describe('Polyfills integration', () => {
    test('should have all polyfills loaded', async () => {
      const result = await page.evaluate(() => {
        return {
          replaceAll: typeof String.prototype.replaceAll === 'function',
          flat: typeof Array.prototype.flat === 'function',
          at: typeof Array.prototype.at === 'function',
          asyncIterator: typeof ReadableStream.prototype[Symbol.asyncIterator] === 'function'
        };
      });

      expect(result.replaceAll).toBe(true);
      expect(result.flat).toBe(true);
      expect(result.at).toBe(true);
      expect(result.asyncIterator).toBe(true);
    });

    test('should work correctly when native implementation exists', async () => {
      const result = await page.evaluate(() => {
        return {
          replaceAll: 'test'.replaceAll('t', 'x'),
          flat: [1, [2]].flat(),
          at: [1, 2, 3].at(-1)
        };
      });

      expect(result.replaceAll).toBe('xesx');
      expect(result.flat).toEqual([1, 2]);
      expect(result.at).toBe(3);
    });
  });
});
