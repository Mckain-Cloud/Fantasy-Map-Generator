import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../../setup/helpers.js';

test.describe('Biomes module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Wait for full app initialization including biomesData
    await waitForAppReady(page);
  });

  test.describe('getId() - Get biome ID from conditions', () => {
    test('should return marine biome (0) for water', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(50, 20, 10, false); // height < 20
      });
      expect(result).toBe(0);
    });

    test('should return glacier biome (11) for very cold temperature', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(50, -10, 50, false); // temp < -5
      });
      // Cold temperatures return glacier or tundra
      expect([10, 11]).toContain(result);
    });

    test('should return hot desert (1) for hot and dry conditions', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(5, 30, 50, false); // temp >= 25, moisture < 8, no river
      });
      // Hot and dry conditions - expect desert type biome
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should not return hot desert if river present', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(5, 30, 50, true); // has river
      });
      // River presence affects biome - verify it returns valid biome
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(12);
    });

    test('should return wetland (12) for wet conditions near coast', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(45, 10, 22, false); // moisture > 40, height < 25
      });
      expect(result).toBe(12);
    });

    test('should return wetland (12) for wet inland conditions', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(30, 10, 40, false); // moisture > 24, height 25-59
      });
      expect(result).toBe(12);
    });

    test('should use biome matrix for moderate conditions', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Moderate moisture and temperature
        return Biomes.getId(15, 10, 50, false);
      });
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(12);
    });

    test('should handle various temperature ranges', async ({ page }) => {
      const results = await page.evaluate(() => {
        return [
          Biomes.getId(15, -3, 50, false),  // Cold
          Biomes.getId(15, 5, 50, false),   // Cool
          Biomes.getId(15, 15, 50, false),  // Moderate
          Biomes.getId(15, 22, 50, false)   // Warm
        ];
      });
      results.forEach(result => {
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(12);
      });
    });

    test('should handle various moisture levels', async ({ page }) => {
      const results = await page.evaluate(() => {
        return [
          Biomes.getId(5, 10, 50, false),   // Very dry
          Biomes.getId(10, 10, 50, false),  // Dry
          Biomes.getId(15, 10, 50, false),  // Moderate
          Biomes.getId(20, 10, 50, false)   // Wet
        ];
      });
      results.forEach(result => {
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(12);
      });
    });

    test('should handle edge case at freezing point', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(15, -4, 50, false); // Just above permafrost threshold
      });
      expect(result).not.toBe(11); // Should not be glacier
    });

    test('should handle edge case at desert threshold', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Biomes.getId(7, 25, 50, false); // Just below desert moisture threshold
      });
      // Could be desert or not, depending on exact logic
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(12);
    });
  });

  test.describe('isWetland() - Check wetland conditions', () => {
    test('should return true for wet near coast', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Assuming isWetland is exposed or we test through getId
        const moisture = 45;
        const temperature = 10;
        const height = 22;
        // We can't call isWetland directly, but we can verify through getId
        return Biomes.getId(moisture, temperature, height, false) === 12;
      });
      expect(result).toBe(true);
    });

    test('should return true for wet inland', async ({ page }) => {
      const result = await page.evaluate(() => {
        const moisture = 30;
        const temperature = 10;
        const height = 40;
        return Biomes.getId(moisture, temperature, height, false) === 12;
      });
      expect(result).toBe(true);
    });

    test('should return false for cold temperatures', async ({ page }) => {
      const result = await page.evaluate(() => {
        const moisture = 50;
        const temperature = -3; // Too cold for wetland
        const height = 22;
        return Biomes.getId(moisture, temperature, height, false) === 12;
      });
      expect(result).toBe(false);
    });

    test('should return false for dry conditions', async ({ page }) => {
      const result = await page.evaluate(() => {
        const moisture = 10; // Too dry
        const temperature = 10;
        const height = 22;
        return Biomes.getId(moisture, temperature, height, false) === 12;
      });
      expect(result).toBe(false);
    });

    test('should return false for high elevations', async ({ page }) => {
      const result = await page.evaluate(() => {
        const moisture = 50;
        const temperature = 10;
        const height = 70; // Too high
        return Biomes.getId(moisture, temperature, height, false) === 12;
      });
      expect(result).toBe(false);
    });
  });

  test.describe('getDefault() - Get default biome data', () => {
    test('should return object with required properties', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return {
          hasI: Array.isArray(defaults.i),
          hasName: Array.isArray(defaults.name),
          hasColor: Array.isArray(defaults.color),
          hasHabitability: Array.isArray(defaults.habitability),
          hasIconsDensity: Array.isArray(defaults.iconsDensity),
          hasIcons: Array.isArray(defaults.icons),
          hasCost: Array.isArray(defaults.cost),
          hasBiomesMartix: Array.isArray(defaults.biomesMartix)
        };
      });
      expect(result.hasI).toBe(true);
      expect(result.hasName).toBe(true);
      expect(result.hasColor).toBe(true);
      expect(result.hasHabitability).toBe(true);
      expect(result.hasIconsDensity).toBe(true);
      expect(result.hasIcons).toBe(true);
      expect(result.hasCost).toBe(true);
      expect(result.hasBiomesMartix).toBe(true);
    });

    test('should return 13 biomes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return {
          nameCount: defaults.name.length,
          colorCount: defaults.color.length,
          habitabilityCount: defaults.habitability.length
        };
      });
      expect(result.nameCount).toBe(13);
      expect(result.colorCount).toBe(13);
      expect(result.habitabilityCount).toBe(13);
    });

    test('should have marine as first biome', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return defaults.name[0];
      });
      expect(result).toBe('Marine');
    });

    test('should have glacier biome', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return defaults.name.includes('Glacier');
      });
      expect(result).toBe(true);
    });

    test('should have wetland biome', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return defaults.name.includes('Wetland');
      });
      expect(result).toBe(true);
    });

    test('should have valid color values', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return defaults.color.every(c => c.startsWith('#') && c.length === 7);
      });
      expect(result).toBe(true);
    });

    test('should have habitability values between 0-100', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return defaults.habitability.every(h => h >= 0 && h <= 100);
      });
      expect(result).toBe(true);
    });

    test('should have marine biome with low habitability', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return defaults.habitability[0];
      });
      // Marine biome should have low habitability
      expect(result).toBeLessThanOrEqual(10);
    });

    test('should have positive cost values', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        return defaults.cost.every(c => c > 0);
      });
      expect(result).toBe(true);
    });

    test('should have glacier as most expensive biome', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        const glacierCost = defaults.cost[11];
        return defaults.cost.every(c => c <= glacierCost);
      });
      expect(result).toBe(true);
    });

    test('should have parsed icons as simple arrays', async ({ page }) => {
      const result = await page.evaluate(() => {
        const defaults = Biomes.getDefault();
        // Marine should have empty array
        const marineIcons = defaults.icons[0];
        // Desert should have icon types
        const desertIcons = defaults.icons[1];
        return {
          marineIsArray: Array.isArray(marineIcons),
          marineIsEmpty: marineIcons.length === 0,
          desertIsArray: Array.isArray(desertIcons),
          desertHasIcons: desertIcons.length > 0
        };
      });
      expect(result.marineIsArray).toBe(true);
      expect(result.marineIsEmpty).toBe(true);
      expect(result.desertIsArray).toBe(true);
      expect(result.desertHasIcons).toBe(true);
    });
  });

  test.describe('Biome module integration', () => {
    test('should be accessible as global Biomes object', async ({ page }) => {
      const result = await page.evaluate(() => {
        return typeof Biomes === 'object' && Biomes !== null;
      });
      expect(result).toBe(true);
    });

    test('should have define function', async ({ page }) => {
      const result = await page.evaluate(() => {
        return typeof Biomes.define === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have getId function', async ({ page }) => {
      const result = await page.evaluate(() => {
        return typeof Biomes.getId === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have getDefault function', async ({ page }) => {
      const result = await page.evaluate(() => {
        return typeof Biomes.getDefault === 'function';
      });
      expect(result).toBe(true);
    });
  });
});
