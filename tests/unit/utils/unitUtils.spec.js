import { test, expect } from '@playwright/test';

test.describe('unitUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => typeof window.convertTemperature === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('convertTemperature() - Convert temperature scales', () => {
    test('should convert Celsius to Fahrenheit', async () => {
      const result = await page.evaluate(() => convertTemperature(0, '°F'));
      expect(result).toBe('32°F');
    });

    test('should convert Celsius to Kelvin', async () => {
      const result = await page.evaluate(() => convertTemperature(0, 'K'));
      expect(result).toBe('273K');
    });

    test('should keep Celsius as-is', async () => {
      const result = await page.evaluate(() => convertTemperature(25, '°C'));
      expect(result).toBe('25°C');
    });

    test('should convert 100°C to 212°F', async () => {
      const result = await page.evaluate(() => convertTemperature(100, '°F'));
      expect(result).toBe('212°F');
    });

    test('should convert -40°C to -40°F', async () => {
      const result = await page.evaluate(() => convertTemperature(-40, '°F'));
      expect(result).toBe('-40°F');
    });

    test('should convert to Rankine', async () => {
      const result = await page.evaluate(() => convertTemperature(0, '°R'));
      expect(result).toContain('°R');
    });

    test('should convert to Delisle', async () => {
      const result = await page.evaluate(() => convertTemperature(0, '°De'));
      expect(result).toContain('°De');
    });

    test('should convert to Newton', async () => {
      const result = await page.evaluate(() => convertTemperature(0, '°N'));
      expect(result).toContain('°N');
    });

    test('should convert to Réaumur', async () => {
      const result = await page.evaluate(() => convertTemperature(0, '°Ré'));
      expect(result).toContain('°Ré');
    });

    test('should convert to Rømer', async () => {
      const result = await page.evaluate(() => convertTemperature(0, '°Rø'));
      expect(result).toContain('°Rø');
    });
  });

  test.describe('si() - Convert to SI suffix', () => {
    test('should add B suffix for billions', async () => {
      const result = await page.evaluate(() => si(2000000000));
      expect(result).toBe('2B');
    });

    test('should add M suffix for millions', async () => {
      const result = await page.evaluate(() => si(5000000));
      expect(result).toBe('5M');
    });

    test('should add K suffix for thousands', async () => {
      const result = await page.evaluate(() => si(3000));
      expect(result).toBe('3K');
    });

    test('should return number as-is for < 1000', async () => {
      const result = await page.evaluate(() => si(500));
      expect(result).toBe(500);
    });

    test('should handle edge case 1000', async () => {
      const result = await page.evaluate(() => si(1000));
      expect(result).toBe('1K');
    });

    test('should round appropriately for M', async () => {
      const result = await page.evaluate(() => si(1500000));
      expect(result).toBe('1.5M');
    });

    test('should handle zero', async () => {
      const result = await page.evaluate(() => si(0));
      expect(result).toBe(0);
    });
  });

  test.describe('getInteger() - Parse SI suffix', () => {
    test('should parse K suffix', async () => {
      const result = await page.evaluate(() => getInteger('5K'));
      expect(result).toBe(5000);
    });

    test('should parse M suffix', async () => {
      const result = await page.evaluate(() => getInteger('3M'));
      expect(result).toBe(3000000);
    });

    test('should parse B suffix', async () => {
      const result = await page.evaluate(() => getInteger('2B'));
      expect(result).toBe(2000000000);
    });

    test('should parse plain number', async () => {
      const result = await page.evaluate(() => getInteger('500'));
      expect(result).toBe(500);
    });

    test('should handle decimal with K', async () => {
      const result = await page.evaluate(() => getInteger('2.5K'));
      expect(result).toBe(2500);
    });

    test('should handle decimal with M', async () => {
      const result = await page.evaluate(() => getInteger('1.5M'));
      expect(result).toBe(1500000);
    });
  });
});
