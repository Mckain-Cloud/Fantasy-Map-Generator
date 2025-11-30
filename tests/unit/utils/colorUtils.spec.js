import { test, expect } from '@playwright/test';
import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';

test.describe('colorUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await startCoverage(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof window.toHEX === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await stopCoverage(page);
    await flushCoverage();
    await page.close();
  });

  test.describe('toHEX() - Convert RGB to HEX', () => {
    test('should convert rgb() to hex', async () => {
      const result = await page.evaluate(() => toHEX('rgb(255, 0, 0)'));
      expect(result).toBe('#ff0000');
    });

    test('should convert rgba() to hex (ignore alpha)', async () => {
      const result = await page.evaluate(() => toHEX('rgba(0, 255, 0, 0.5)'));
      expect(result).toBe('#00ff00');
    });

    test('should return hex as-is if already hex', async () => {
      const result = await page.evaluate(() => toHEX('#ff0000'));
      expect(result).toBe('#ff0000');
    });

    test('should handle white color', async () => {
      const result = await page.evaluate(() => toHEX('rgb(255, 255, 255)'));
      expect(result).toBe('#ffffff');
    });

    test('should handle black color', async () => {
      const result = await page.evaluate(() => toHEX('rgb(0, 0, 0)'));
      expect(result).toBe('#000000');
    });

    test('should return empty string for invalid input', async () => {
      const result = await page.evaluate(() => toHEX('invalid'));
      expect(result).toBe('');
    });

    test('should handle rgb with spaces', async () => {
      const result = await page.evaluate(() => toHEX('rgb( 128 , 128 , 128 )'));
      expect(result).toBe('#808080');
    });
  });

  test.describe('getColors() - Get color palette', () => {
    test('should return array of specified length', async () => {
      const result = await page.evaluate(() => getColors(5));
      expect(result).toHaveLength(5);
    });

    test('should return all hex colors', async () => {
      const result = await page.evaluate(() => getColors(3));
      result.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('should use predefined colors for first 12', async () => {
      const result = await page.evaluate(() => {
        const colors = getColors(12);
        return colors.every(c => c.match(/^#[0-9a-f]{6}$/i));
      });
      expect(result).toBe(true);
    });

    test('should generate rainbow colors for > 12', async () => {
      const result = await page.evaluate(() => getColors(20));
      expect(result).toHaveLength(20);
    });

    test('should return single color for n=1', async () => {
      const result = await page.evaluate(() => getColors(1));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  test.describe('getRandomColor() - Get random color', () => {
    test('should return hex color', async () => {
      const result = await page.evaluate(() => getRandomColor());
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    test('should return different colors on multiple calls', async () => {
      const result = await page.evaluate(() => {
        const colors = [
          getRandomColor(),
          getRandomColor(),
          getRandomColor(),
          getRandomColor(),
          getRandomColor()
        ];
        const unique = [...new Set(colors)];
        return unique.length > 1;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('getMixedColor() - Mix colors', () => {
    test('should return hex color', async () => {
      const result = await page.evaluate(() => getMixedColor('#ff0000'));
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    test('should mix with random color', async () => {
      const result = await page.evaluate(() => {
        const original = '#ff0000';
        const mixed = getMixedColor(original);
        return original !== mixed;
      });
      expect(result).toBe(true);
    });

    test('should accept mix ratio parameter', async () => {
      const result = await page.evaluate(() => getMixedColor('#000000', 0.5));
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    test('should accept brightness parameter', async () => {
      const result = await page.evaluate(() => getMixedColor('#000000', 0.2, 0.8));
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    test('should generate random color if input is not hex', async () => {
      const result = await page.evaluate(() => getMixedColor('not-a-color'));
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
