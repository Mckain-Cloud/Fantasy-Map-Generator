import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('UI Layers module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Layer preset functions', () => {
    test('should have getDefaultPresets function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getDefaultPresets === 'function');
      expect(result).toBe(true);
    });

    test('should have applyLayersPreset function', async ({ page }) => {
      const result = await page.evaluate(() => typeof applyLayersPreset === 'function');
      expect(result).toBe(true);
    });

    test('should have setLayersPreset function', async ({ page }) => {
      const result = await page.evaluate(() => typeof setLayersPreset === 'function');
      expect(result).toBe(true);
    });

    test('should have handleLayersPresetChange function', async ({ page }) => {
      const result = await page.evaluate(() => typeof handleLayersPresetChange === 'function');
      expect(result).toBe(true);
    });

    test('should have savePreset function', async ({ page }) => {
      const result = await page.evaluate(() => typeof savePreset === 'function');
      expect(result).toBe(true);
    });

    test('should have removePreset function', async ({ page }) => {
      const result = await page.evaluate(() => typeof removePreset === 'function');
      expect(result).toBe(true);
    });

    test('should have getCurrentPreset function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getCurrentPreset === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('getDefaultPresets() - Default presets', () => {
    test('should return object with preset names', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return typeof presets === 'object';
      });
      expect(result).toBe(true);
    });

    test('should have political preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.political);
      });
      expect(result).toBe(true);
    });

    test('should have cultural preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.cultural);
      });
      expect(result).toBe(true);
    });

    test('should have religions preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.religions);
      });
      expect(result).toBe(true);
    });

    test('should have provinces preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.provinces);
      });
      expect(result).toBe(true);
    });

    test('should have biomes preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.biomes);
      });
      expect(result).toBe(true);
    });

    test('should have heightmap preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.heightmap);
      });
      expect(result).toBe(true);
    });

    test('should have physical preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.physical);
      });
      expect(result).toBe(true);
    });

    test('should have poi preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.poi);
      });
      expect(result).toBe(true);
    });

    test('should have military preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.military);
      });
      expect(result).toBe(true);
    });

    test('should have emblems preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.emblems);
      });
      expect(result).toBe(true);
    });

    test('should have landmass preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return Array.isArray(presets.landmass);
      });
      expect(result).toBe(true);
    });

    test('presets should contain toggle layer names', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return presets.political.every(layer => layer.startsWith('toggle'));
      });
      expect(result).toBe(true);
    });
  });

  test.describe('layerIsOn() - Check layer state', () => {
    test('should have layerIsOn function', async ({ page }) => {
      const result = await page.evaluate(() => typeof layerIsOn === 'function');
      expect(result).toBe(true);
    });

    test('should return boolean', async ({ page }) => {
      const result = await page.evaluate(() => typeof layerIsOn('toggleStates') === 'boolean');
      expect(result).toBe(true);
    });
  });

  test.describe('Layer drawing functions', () => {
    test('should have drawLayers function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawLayers === 'function');
      expect(result).toBe(true);
    });

    test('should have drawFeatures function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawFeatures === 'function');
      expect(result).toBe(true);
    });

    test('should have drawTexture function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawTexture === 'function');
      expect(result).toBe(true);
    });

    test('should have drawHeightmap function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawHeightmap === 'function');
      expect(result).toBe(true);
    });

  });

  test.describe('UI elements for layers', () => {
    test('should have removePresetButton element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('removePresetButton');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have savePresetButton element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('savePresetButton');
        return element !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Layer toggle elements', () => {
    test('should have toggleBorders element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('toggleBorders');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have toggleRivers element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('toggleRivers');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have toggleLabels element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('toggleLabels');
        return element !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('getDefaultPresets returns preset data', () => {
    test('getDefaultPresets should have political preset', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return 'political' in presets && 'cultural' in presets;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('localStorage integration', () => {
    test('should handle preset storage', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Check that localStorage operations work
        const key = 'preset';
        const testValue = 'political';
        localStorage.setItem(key, testValue);
        const retrieved = localStorage.getItem(key);
        return retrieved === testValue;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Political preset layers', () => {
    test('political preset should include toggleStates', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return presets.political.includes('toggleStates');
      });
      expect(result).toBe(true);
    });

    test('political preset should include toggleBorders', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return presets.political.includes('toggleBorders');
      });
      expect(result).toBe(true);
    });

    test('political preset should include toggleLabels', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return presets.political.includes('toggleLabels');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Biomes preset layers', () => {
    test('biomes preset should include toggleBiomes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return presets.biomes.includes('toggleBiomes');
      });
      expect(result).toBe(true);
    });

    test('biomes preset should include toggleRivers', async ({ page }) => {
      const result = await page.evaluate(() => {
        const presets = getDefaultPresets();
        return presets.biomes.includes('toggleRivers');
      });
      expect(result).toBe(true);
    });
  });
});
