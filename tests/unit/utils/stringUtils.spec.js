import { test, expect } from '@playwright/test';

test.describe('stringUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => typeof capitalize === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('round() - Round numbers in string', () => {
    test('should round numbers in string to 1 decimal by default', async () => {
      const result = await page.evaluate(() => round('Value is 3.14159'));
      expect(result).toBe('Value is 3.1');
    });

    test('should round multiple numbers in string', async () => {
      const result = await page.evaluate(() => round('x: 1.234, y: 5.678'));
      expect(result).toBe('x: 1.2, y: 5.7');
    });

    test('should round to specified decimals', async () => {
      const result = await page.evaluate(() => round('Pi is 3.14159', 3));
      expect(result).toBe('Pi is 3.142');
    });

    test('should handle negative numbers', async () => {
      const result = await page.evaluate(() => round('Temp: -15.678 degrees', 1));
      expect(result).toBe('Temp: -15.7 degrees');
    });

    test('should handle strings without numbers', async () => {
      const result = await page.evaluate(() => round('No numbers here'));
      expect(result).toBe('No numbers here');
    });

    test('should handle scientific notation', async () => {
      const result = await page.evaluate(() => round('Value: 1.23e-4', 2));
      expect(result).toBe('Value: 0');
    });
  });

  test.describe('capitalize() - Capitalize first character', () => {
    test('should capitalize first letter', async () => {
      const result = await page.evaluate(() => capitalize('hello'));
      expect(result).toBe('Hello');
    });

    test('should handle already capitalized string', async () => {
      const result = await page.evaluate(() => capitalize('Hello'));
      expect(result).toBe('Hello');
    });

    test('should handle single character', async () => {
      const result = await page.evaluate(() => capitalize('a'));
      expect(result).toBe('A');
    });

    test('should handle empty string', async () => {
      const result = await page.evaluate(() => capitalize(''));
      expect(result).toBe('');
    });

    test('should only capitalize first character', async () => {
      const result = await page.evaluate(() => capitalize('hello world'));
      expect(result).toBe('Hello world');
    });

    test('should handle numbers at start', async () => {
      const result = await page.evaluate(() => capitalize('123abc'));
      expect(result).toBe('123abc');
    });
  });

  test.describe('splitInTwo() - Split string into two parts', () => {
    test('should split simple string evenly', async () => {
      const result = await page.evaluate(() => splitInTwo('one two three four'));
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
    });

    test('should not break words', async () => {
      const result = await page.evaluate(() => splitInTwo('The quick brown fox'));
      expect(result).toHaveLength(2);
      expect(result[0].trim().length).toBeGreaterThan(0);
      expect(result[1].trim().length).toBeGreaterThan(0);
    });

    test('should handle single word', async () => {
      const result = await page.evaluate(() => splitInTwo('word'));
      expect(result).toEqual(['word']);
    });

    test('should split approximately in half', async () => {
      const result = await page.evaluate(() => splitInTwo('one two three four five six'));
      const total = result.join('').length;
      const firstHalf = result[0].length / total;
      expect(firstHalf).toBeGreaterThan(0.3);
      expect(firstHalf).toBeLessThan(0.7);
    });
  });

  test.describe('parseTransform() - Parse SVG transform', () => {
    test('should parse translate transform', async () => {
      const result = await page.evaluate(() => parseTransform('translate(100,200)'));
      expect(result[0]).toBe('100');
      expect(result[1]).toBe('200');
    });

    test('should parse full transform with rotate and scale', async () => {
      const result = await page.evaluate(() => parseTransform('translate(10,20) rotate(45,50,60) scale(2)'));
      expect(result).toHaveLength(6);
      expect(result[0]).toBe('10');
      expect(result[1]).toBe('20');
      expect(result[2]).toBe('45');
      expect(result[3]).toBe('50');
      expect(result[4]).toBe('60');
      expect(result[5]).toBe('2');
    });

    test('should return default values for empty string', async () => {
      const result = await page.evaluate(() => parseTransform(''));
      expect(result).toEqual([0, 0, 0, 0, 0, 1]);
    });

    test('should return default values for null', async () => {
      const result = await page.evaluate(() => parseTransform(null));
      expect(result).toEqual([0, 0, 0, 0, 0, 1]);
    });
  });

  test.describe('JSON.isValid() - Validate JSON string', () => {
    test('should return true for valid JSON', async () => {
      const result = await page.evaluate(() => JSON.isValid('{"key": "value"}'));
      expect(result).toBe(true);
    });

    test('should return true for valid JSON array', async () => {
      const result = await page.evaluate(() => JSON.isValid('[1, 2, 3]'));
      expect(result).toBe(true);
    });

    test('should return false for invalid JSON', async () => {
      const result = await page.evaluate(() => JSON.isValid('{key: value}'));
      expect(result).toBe(false);
    });

    test('should return false for malformed JSON', async () => {
      const result = await page.evaluate(() => JSON.isValid('{"key": }'));
      expect(result).toBe(false);
    });

    test('should return true for empty object', async () => {
      const result = await page.evaluate(() => JSON.isValid('{}'));
      expect(result).toBe(true);
    });
  });

  test.describe('JSON.safeParse() - Safe JSON parse', () => {
    test('should parse valid JSON', async () => {
      const result = await page.evaluate(() => JSON.safeParse('{"key": "value"}'));
      expect(result).toEqual({ key: 'value' });
    });

    test('should return null for invalid JSON', async () => {
      const result = await page.evaluate(() => JSON.safeParse('{invalid}'));
      expect(result).toBe(null);
    });

    test('should parse arrays', async () => {
      const result = await page.evaluate(() => JSON.safeParse('[1,2,3]'));
      expect(result).toEqual([1, 2, 3]);
    });

    test('should return null for empty string', async () => {
      const result = await page.evaluate(() => JSON.safeParse(''));
      expect(result).toBe(null);
    });
  });
});
