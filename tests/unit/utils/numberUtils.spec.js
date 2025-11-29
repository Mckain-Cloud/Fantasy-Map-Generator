import { test, expect } from '@playwright/test';

test.describe('numberUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => typeof window.rn === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('rn() - Round number', () => {
    test('should round to 0 decimals by default', async () => {
      const result = await page.evaluate(() => rn(3.14159));
      expect(result).toBe(3);
    });

    test('should round to specified decimal places', async () => {
      const result = await page.evaluate(() => rn(3.14159, 2));
      expect(result).toBe(3.14);
    });

    test('should round to 3 decimal places', async () => {
      const result = await page.evaluate(() => rn(3.14159, 3));
      expect(result).toBe(3.142);
    });

    test('should round up when >= .5', async () => {
      const result = await page.evaluate(() => rn(3.7, 0));
      expect(result).toBe(4);
    });

    test('should round down when < .5', async () => {
      const result = await page.evaluate(() => rn(3.4, 0));
      expect(result).toBe(3);
    });

    test('should handle negative numbers', async () => {
      const result = await page.evaluate(() => rn(-3.14159, 1));
      expect(result).toBe(-3.1);
    });

    test('should handle zero', async () => {
      const result = await page.evaluate(() => rn(0, 2));
      expect(result).toBe(0);
    });

    test('should handle very small numbers', async () => {
      const result = await page.evaluate(() => rn(0.000123, 5));
      expect(result).toBe(0.00012);
    });

    test('should handle very large numbers', async () => {
      const result = await page.evaluate(() => rn(123456789.987654, 2));
      expect(result).toBe(123456789.99);
    });
  });

  test.describe('minmax() - Clamp value', () => {
    test('should return value when within range', async () => {
      const result = await page.evaluate(() => minmax(5, 0, 10));
      expect(result).toBe(5);
    });

    test('should return min when value below minimum', async () => {
      const result = await page.evaluate(() => minmax(-5, 0, 10));
      expect(result).toBe(0);
    });

    test('should return max when value above maximum', async () => {
      const result = await page.evaluate(() => minmax(15, 0, 10));
      expect(result).toBe(10);
    });

    test('should handle min === max', async () => {
      const result = await page.evaluate(() => minmax(5, 5, 5));
      expect(result).toBe(5);
    });

    test('should handle negative ranges', async () => {
      const result = await page.evaluate(() => minmax(-5, -10, 0));
      expect(result).toBe(-5);
    });

    test('should clamp to lower bound in negative range', async () => {
      const result = await page.evaluate(() => minmax(-15, -10, 0));
      expect(result).toBe(-10);
    });

    test('should handle floating point ranges', async () => {
      const result = await page.evaluate(() => minmax(0.5, 0.0, 1.0));
      expect(result).toBe(0.5);
    });
  });

  test.describe('lim() - Limit to 0-100', () => {
    test('should return value when in range 0-100', async () => {
      const result = await page.evaluate(() => lim(50));
      expect(result).toBe(50);
    });

    test('should return 0 when value below 0', async () => {
      const result = await page.evaluate(() => lim(-10));
      expect(result).toBe(0);
    });

    test('should return 100 when value above 100', async () => {
      const result = await page.evaluate(() => lim(150));
      expect(result).toBe(100);
    });

    test('should handle edge value 0', async () => {
      const result = await page.evaluate(() => lim(0));
      expect(result).toBe(0);
    });

    test('should handle edge value 100', async () => {
      const result = await page.evaluate(() => lim(100));
      expect(result).toBeCloseTo(100, 5);
    });
  });

  test.describe('normalize() - Normalize to 0-1', () => {
    test('should normalize value in range', async () => {
      const result = await page.evaluate(() => normalize(5, 0, 10));
      expect(result).toBe(0.5);
    });

    test('should return 0 for min value', async () => {
      const result = await page.evaluate(() => normalize(0, 0, 10));
      expect(result).toBe(0);
    });

    test('should return 1 for max value', async () => {
      const result = await page.evaluate(() => normalize(10, 0, 10));
      expect(result).toBe(1);
    });

    test('should clamp values below range to 0', async () => {
      const result = await page.evaluate(() => normalize(-5, 0, 10));
      expect(result).toBe(0);
    });

    test('should clamp values above range to 1', async () => {
      const result = await page.evaluate(() => normalize(15, 0, 10));
      expect(result).toBe(1);
    });

    test('should handle negative ranges', async () => {
      const result = await page.evaluate(() => normalize(-5, -10, 0));
      expect(result).toBe(0.5);
    });
  });

  test.describe('lerp() - Linear interpolation', () => {
    test('should interpolate at t=0.5', async () => {
      const result = await page.evaluate(() => lerp(0, 10, 0.5));
      expect(result).toBe(5);
    });

    test('should return a when t=0', async () => {
      const result = await page.evaluate(() => lerp(0, 10, 0));
      expect(result).toBe(0);
    });

    test('should return b when t=1', async () => {
      const result = await page.evaluate(() => lerp(0, 10, 1));
      expect(result).toBeCloseTo(10, 5);
    });

    test('should interpolate at t=0.25', async () => {
      const result = await page.evaluate(() => lerp(0, 100, 0.25));
      expect(result).toBe(25);
    });

    test('should interpolate negative values', async () => {
      const result = await page.evaluate(() => lerp(-10, 10, 0.5));
      expect(result).toBe(0);
    });

    test('should extrapolate when t > 1', async () => {
      const result = await page.evaluate(() => lerp(0, 10, 1.5));
      expect(result).toBeCloseTo(15, 5);
    });

    test('should extrapolate when t < 0', async () => {
      const result = await page.evaluate(() => lerp(0, 10, -0.5));
      expect(result).toBe(-5);
    });
  });
});
