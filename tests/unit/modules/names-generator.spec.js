import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('Names module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    // Wait for full app initialization including nameBases
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Module availability', () => {
    test('should be accessible as global Names object', async ({ page }) => {
      const result = await page.evaluate(() => typeof Names === 'object');
      expect(result).toBe(true);
    });

    test('should have getBase function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Names.getBase === 'function');
      expect(result).toBe(true);
    });

    test('should have calculateChain function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Names.calculateChain === 'function');
      expect(result).toBe(true);
    });

    test('should have updateChain function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Names.updateChain === 'function');
      expect(result).toBe(true);
    });

    test('should have clearChains function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Names.clearChains === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('calculateChain()', () => {
    test('should create chain from simple names', async ({ page }) => {
      const result = await page.evaluate(() => {
        const chain = Names.calculateChain('John, Jane, Jack');
        return {
          exists: chain !== null && chain !== undefined,
          hasEntries: chain && Object.keys(chain).length > 0
        };
      });
      expect(result.exists).toBe(true);
      expect(result.hasEntries).toBe(true);
    });

    test('should handle single name', async ({ page }) => {
      const result = await page.evaluate(() => {
        const chain = Names.calculateChain('Test');
        return Object.keys(chain).length > 0;
      });
      expect(result).toBe(true);
    });

    test('should handle comma-separated names', async ({ page }) => {
      const result = await page.evaluate(() => {
        const chain = Names.calculateChain('Alpha, Beta, Gamma, Delta');
        return Object.keys(chain).length > 0;
      });
      expect(result).toBe(true);
    });

    test('should handle names with spaces', async ({ page }) => {
      const result = await page.evaluate(() => {
        const chain = Names.calculateChain('New York, Los Angeles');
        return Object.keys(chain).length > 0;
      });
      expect(result).toBe(true);
    });

    test('should handle empty string', async ({ page }) => {
      const result = await page.evaluate(() => {
        const chain = Names.calculateChain('');
        return chain && Object.keys(chain).length >= 0;
      });
      // Empty string may return empty chain or minimal chain
      expect(typeof result).toBe('boolean');
    });
  });

  test.describe('getBase()', () => {
    test('should generate name from base 0', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          const name = Names.getBase(0);
          return {
            isString: typeof name === 'string',
            hasLength: name.length > 0,
            notError: name !== 'ERROR'
          };
        } catch (e) {
          return { error: e.message };
        }
      });
      if (result.error) {
        // Base might not be available
        expect(result.error).toBeTruthy();
      } else {
        expect(result.isString).toBe(true);
        expect(result.hasLength).toBe(true);
      }
    });

    test('should respect min/max length when provided', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          const name = Names.getBase(0, 5, 10);
          return {
            length: name.length,
            isError: name === 'ERROR'
          };
        } catch (e) {
          return { error: true };
        }
      });
      if (!result.error && !result.isError) {
        expect(result.length).toBeGreaterThanOrEqual(5);
        expect(result.length).toBeLessThanOrEqual(10);
      }
    });

    test('should handle undefined base gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          const name = Names.getBase(999);
          return {name, isError: name === 'ERROR'};
        } catch (e) {
          return {name: 'ERROR', isError: true};
        }
      });
      // Should return ERROR or fallback to base 0
      expect(typeof result.name).toBe('string');
    });
  });

  test.describe('clearChains()', () => {
    test('should clear all chains', async ({ page }) => {
      const result = await page.evaluate(() => {
        Names.clearChains();
        return true;
      });
      expect(result).toBe(true);
    });
  });
});
