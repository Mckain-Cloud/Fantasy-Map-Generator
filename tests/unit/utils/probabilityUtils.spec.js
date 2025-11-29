import { test, expect } from '@playwright/test';

test.describe('probabilityUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => typeof window.rand === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('rand() - Random integer in range', () => {
    test('should return number between min and max', async () => {
      const result = await page.evaluate(() => {
        const values = Array(100).fill(0).map(() => rand(1, 10));
        return values.every(v => v >= 1 && v <= 10);
      });

      expect(result).toBe(true);
    });

    test('should handle single parameter as max', async () => {
      const result = await page.evaluate(() => {
        const values = Array(100).fill(0).map(() => rand(5));
        return values.every(v => v >= 0 && v <= 5);
      });

      expect(result).toBe(true);
    });

    test('should return 0-1 range with no parameters', async () => {
      const result = await page.evaluate(() => {
        const value = rand();
        return value >= 0 && value < 1;
      });

      expect(result).toBe(true);
    });

    test('should include both endpoints', async () => {
      const result = await page.evaluate(() => {
        const values = Array(1000).fill(0).map(() => rand(0, 10));
        return values.includes(0) && values.includes(10);
      });

      expect(result).toBe(true);
    });

    test('should handle same min and max', async () => {
      const result = await page.evaluate(() => rand(5, 5));
      expect(result).toBe(5);
    });
  });

  test.describe('P() - Probability check', () => {
    test('should always return true for probability >= 1', async () => {
      const result = await page.evaluate(() => {
        const results = Array(100).fill(0).map(() => P(1));
        return results.every(r => r === true);
      });

      expect(result).toBe(true);
    });

    test('should always return false for probability <= 0', async () => {
      const result = await page.evaluate(() => {
        const results = Array(100).fill(0).map(() => P(0));
        return results.every(r => r === false);
      });

      expect(result).toBe(true);
    });

    test('should return mix of true/false for 0.5 probability', async () => {
      const result = await page.evaluate(() => {
        const results = Array(1000).fill(0).map(() => P(0.5));
        const trueCount = results.filter(r => r).length;
        return trueCount > 400 && trueCount < 600;
      });

      expect(result).toBe(true);
    });

    test('should have higher true rate for higher probability', async () => {
      const result = await page.evaluate(() => {
        const high = Array(1000).fill(0).map(() => P(0.9)).filter(r => r).length;
        const low = Array(1000).fill(0).map(() => P(0.1)).filter(r => r).length;
        return high > low;
      });

      expect(result).toBe(true);
    });
  });

  test.describe('each() - Modulo check function', () => {
    test('should return function that checks modulo', async () => {
      const result = await page.evaluate(() => {
        const everyThird = each(3);
        return [everyThird(0), everyThird(3), everyThird(6), everyThird(1), everyThird(2)];
      });

      expect(result).toEqual([true, true, true, false, false]);
    });

    test('should work for every 2nd', async () => {
      const result = await page.evaluate(() => {
        const everySecond = each(2);
        return [0, 1, 2, 3, 4].map(everySecond);
      });

      expect(result).toEqual([true, false, true, false, true]);
    });
  });

  test.describe('gauss() - Gaussian distribution', () => {
    test('should return values around expected value', async () => {
      const result = await page.evaluate(() => {
        const values = Array(1000).fill(0).map(() => gauss(100, 10, 0, 200, 0));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return avg > 80 && avg < 120;
      });

      expect(result).toBe(true);
    });

    test('should respect min boundary', async () => {
      const result = await page.evaluate(() => {
        const values = Array(1000).fill(0).map(() => gauss(50, 100, 20, 200, 0));
        return values.every(v => v >= 20);
      });

      expect(result).toBe(true);
    });

    test('should respect max boundary', async () => {
      const result = await page.evaluate(() => {
        const values = Array(1000).fill(0).map(() => gauss(150, 100, 0, 180, 0));
        return values.every(v => v <= 180);
      });

      expect(result).toBe(true);
    });

    test('should round to specified decimals', async () => {
      const result = await page.evaluate(() => {
        const value = gauss(100, 10, 0, 200, 2);
        const decimals = (value.toString().split('.')[1] || '').length;
        return decimals <= 2;
      });

      expect(result).toBe(true);
    });
  });

  test.describe('ra() - Random from array', () => {
    test('should return element from array', async () => {
      const result = await page.evaluate(() => {
        const arr = ['a', 'b', 'c'];
        const value = ra(arr);
        return arr.includes(value);
      });

      expect(result).toBe(true);
    });

    test('should return mix of values over many calls', async () => {
      const result = await page.evaluate(() => {
        const arr = [1, 2, 3];
        const values = Array(100).fill(0).map(() => ra(arr));
        const unique = [...new Set(values)];
        return unique.length > 1;
      });

      expect(result).toBe(true);
    });

    test('should handle single element array', async () => {
      const result = await page.evaluate(() => ra(['only']));
      expect(result).toBe('only');
    });
  });

  test.describe('rw() - Random weighted', () => {
    test('should return key from weighted object', async () => {
      const result = await page.evaluate(() => {
        const obj = { a: 10, b: 5, c: 1 };
        const value = rw(obj);
        return ['a', 'b', 'c'].includes(value);
      });

      expect(result).toBe(true);
    });

    test('should favor higher weighted keys', async () => {
      const result = await page.evaluate(() => {
        const obj = { high: 100, low: 1 };
        const values = Array(200).fill(0).map(() => rw(obj));
        const highCount = values.filter(v => v === 'high').length;
        const lowCount = values.filter(v => v === 'low').length;
        return highCount > lowCount * 10;
      });

      expect(result).toBe(true);
    });

    test('should handle single key', async () => {
      const result = await page.evaluate(() => rw({ only: 1 }));
      expect(result).toBe('only');
    });
  });

  test.describe('biased() - Biased random', () => {
    test('should return value in range', async () => {
      const result = await page.evaluate(() => {
        const values = Array(100).fill(0).map(() => biased(0, 100, 2));
        return values.every(v => v >= 0 && v <= 100);
      });

      expect(result).toBe(true);
    });

    test('should bias towards min with higher exponent', async () => {
      const result = await page.evaluate(() => {
        const biasedValues = Array(1000).fill(0).map(() => biased(0, 100, 5));
        const avg = biasedValues.reduce((a, b) => a + b, 0) / biasedValues.length;
        return avg < 40;
      });

      expect(result).toBe(true);
    });

    test('should be more uniform with exponent 1', async () => {
      const result = await page.evaluate(() => {
        const values = Array(1000).fill(0).map(() => biased(0, 100, 1));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return avg > 30 && avg < 70;
      });

      expect(result).toBe(true);
    });
  });

  test.describe('getNumberInRange() - Parse range string', () => {
    test('should parse single number', async () => {
      const result = await page.evaluate(() => getNumberInRange('5'));
      expect(result).toBe(5);
    });

    test('should parse range format', async () => {
      const result = await page.evaluate(() => {
        const values = Array(100).fill(0).map(() => getNumberInRange('1-10'));
        return values.every(v => v >= 1 && v <= 10);
      });

      expect(result).toBe(true);
    });

    test('should handle negative ranges', async () => {
      const result = await page.evaluate(() => {
        const values = Array(100).fill(0).map(() => getNumberInRange('-5-5'));
        return values.every(v => v >= -5 && v <= 5);
      });

      expect(result).toBe(true);
    });

    test('should handle float probabilities', async () => {
      const result = await page.evaluate(() => {
        const values = Array(100).fill(0).map(() => getNumberInRange('2.5'));
        return values.every(v => v === 2 || v === 3);
      });

      expect(result).toBe(true);
    });
  });

  test.describe('generateSeed() - Generate random seed', () => {
    test('should generate numeric string', async () => {
      const result = await page.evaluate(() => {
        const seed = generateSeed();
        return typeof seed === 'string' && !isNaN(Number(seed));
      });

      expect(result).toBe(true);
    });

    test('should generate different seeds', async () => {
      const result = await page.evaluate(() => {
        const seeds = [generateSeed(), generateSeed(), generateSeed()];
        const unique = [...new Set(seeds)];
        return unique.length === 3;
      });

      expect(result).toBe(true);
    });

    test('should generate numeric string up to 9 digits', async () => {
      const result = await page.evaluate(() => {
        const seed = generateSeed();
        // generateSeed returns Math.floor(Math.random() * 1e9) as string
        // Result can be 1-9 digits depending on random value
        return typeof seed === 'string' &&
               seed.length >= 1 &&
               seed.length <= 9 &&
               /^\d+$/.test(seed);
      });

      expect(result).toBe(true);
    });
  });
});
