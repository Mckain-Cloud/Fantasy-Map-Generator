import { test, expect } from '@playwright/test';
import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';

test.describe('unitUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await startCoverage(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof window.convertTemperature === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await stopCoverage(page);
    await flushCoverage();
    await page.close();
  });

  test.describe('temperatureConversionMap - Direct map access', () => {
    test('should be an object with all scale functions', async () => {
      const result = await page.evaluate(() => {
        return typeof temperatureConversionMap === 'object' &&
          typeof temperatureConversionMap['°C'] === 'function' &&
          typeof temperatureConversionMap['°F'] === 'function' &&
          typeof temperatureConversionMap['K'] === 'function' &&
          typeof temperatureConversionMap['°R'] === 'function' &&
          typeof temperatureConversionMap['°De'] === 'function' &&
          typeof temperatureConversionMap['°N'] === 'function' &&
          typeof temperatureConversionMap['°Ré'] === 'function' &&
          typeof temperatureConversionMap['°Rø'] === 'function';
      });
      expect(result).toBe(true);
    });

    test('should convert Celsius correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['°C'](25));
      expect(result).toBe('25°C');
    });

    test('should convert Fahrenheit correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['°F'](100));
      expect(result).toBe('212°F');
    });

    test('should convert Kelvin correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['K'](0));
      expect(result).toBe('273K');
    });

    test('should convert Rankine correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['°R'](0));
      // 273.15 * 9/5 = 491.67
      expect(result).toBe('492°R');
    });

    test('should convert Delisle correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['°De'](0));
      // (100 - 0) * 3/2 = 150
      expect(result).toBe('150°De');
    });

    test('should convert Newton correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['°N'](100));
      // 100 * 33/100 = 33
      expect(result).toBe('33°N');
    });

    test('should convert Réaumur correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['°Ré'](100));
      // 100 * 4/5 = 80
      expect(result).toBe('80°Ré');
    });

    test('should convert Rømer correctly via map', async () => {
      const result = await page.evaluate(() => temperatureConversionMap['°Rø'](0));
      // 0 * 21/40 + 7.5 = 7.5
      expect(result).toBe('8°Rø');
    });
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

    test('should handle extreme cold (-273°C)', async () => {
      const result = await page.evaluate(() => convertTemperature(-273, 'K'));
      expect(result).toBe('0K');
    });

    test('should handle extreme heat (1000°C)', async () => {
      const result = await page.evaluate(() => convertTemperature(1000, '°F'));
      expect(result).toBe('1832°F');
    });

    test('should handle negative temperatures in Delisle', async () => {
      const result = await page.evaluate(() => convertTemperature(200, '°De'));
      // (100 - 200) * 3/2 = -150
      expect(result).toBe('-150°De');
    });

    test('should handle boiling point conversions', async () => {
      const results = await page.evaluate(() => ({
        fahrenheit: convertTemperature(100, '°F'),
        kelvin: convertTemperature(100, 'K'),
        newton: convertTemperature(100, '°N')
      }));
      expect(results.fahrenheit).toBe('212°F');
      expect(results.kelvin).toBe('373K');
      expect(results.newton).toBe('33°N');
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

    test('should handle 10K correctly', async () => {
      const result = await page.evaluate(() => si(10000));
      expect(result).toBe('10K');
    });

    test('should handle 100K correctly', async () => {
      const result = await page.evaluate(() => si(100000));
      expect(result).toBe('100K');
    });

    test('should handle 100M correctly', async () => {
      const result = await page.evaluate(() => si(100000000));
      expect(result).toBe('100M');
    });

    test('should handle 10B correctly', async () => {
      const result = await page.evaluate(() => si(10000000000));
      expect(result).toBe('10B');
    });

    test('should handle decimals in B range', async () => {
      const result = await page.evaluate(() => si(2500000000));
      expect(result).toBe('2.5B');
    });

    test('should handle negative numbers', async () => {
      const result = await page.evaluate(() => si(-1000));
      expect(result).toBe(-1000);
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

    test('should handle decimal with B', async () => {
      const result = await page.evaluate(() => getInteger('1.5B'));
      expect(result).toBe(1500000000);
    });

    test('should handle zero', async () => {
      const result = await page.evaluate(() => getInteger('0'));
      expect(result).toBe(0);
    });

    test('should handle negative number', async () => {
      const result = await page.evaluate(() => getInteger('-500'));
      expect(result).toBe(-500);
    });

    test('should handle large plain number', async () => {
      const result = await page.evaluate(() => getInteger('999'));
      expect(result).toBe(999);
    });
  });
});
