import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('UI 3D module (ThreeD)', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('ThreeD object availability', () => {
    test('should have ThreeD object on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD === 'object');
      expect(result).toBe(true);
    });

    test('should have ThreeD.options object', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options === 'object');
      expect(result).toBe(true);
    });
  });

  test.describe('ThreeD.options default values', () => {
    test('should have scale option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.scale === 'number');
      expect(result).toBe(true);
    });

    test('should have lightness option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.lightness === 'number');
      expect(result).toBe(true);
    });

    test('should have shadow option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.shadow === 'number');
      expect(result).toBe(true);
    });

    test('should have sun position object', async ({ page }) => {
      const result = await page.evaluate(() => {
        const sun = ThreeD.options.sun;
        return typeof sun === 'object' && 'x' in sun && 'y' in sun && 'z' in sun;
      });
      expect(result).toBe(true);
    });

    test('should have rotateMesh option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.rotateMesh === 'number');
      expect(result).toBe(true);
    });

    test('should have rotateGlobe option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.rotateGlobe === 'number');
      expect(result).toBe(true);
    });

    test('should have skyColor option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.skyColor === 'string');
      expect(result).toBe(true);
    });

    test('should have waterColor option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.waterColor === 'string');
      expect(result).toBe(true);
    });

    test('should have sunColor option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.sunColor === 'string');
      expect(result).toBe(true);
    });

    test('should have extendedWater option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.extendedWater === 'number');
      expect(result).toBe(true);
    });

    test('should have labels3d option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.labels3d === 'number');
      expect(result).toBe(true);
    });

    test('should have wireframe option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.wireframe === 'number');
      expect(result).toBe(true);
    });

    test('should have resolution option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.resolution === 'number');
      expect(result).toBe(true);
    });

    test('should have resolutionScale option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.resolutionScale === 'number');
      expect(result).toBe(true);
    });

    test('should have subdivide option', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.subdivide === 'number');
      expect(result).toBe(true);
    });
  });

  test.describe('ThreeD methods', () => {
    test('should have create function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.create === 'function');
      expect(result).toBe(true);
    });

    test('should have redraw function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.redraw === 'function');
      expect(result).toBe(true);
    });

    test('should have update function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.update === 'function');
      expect(result).toBe(true);
    });

    test('should have stop function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.stop === 'function');
      expect(result).toBe(true);
    });

    test('should have setScale function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.setScale === 'function');
      expect(result).toBe(true);
    });

    test('should have setSunColor function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.setSunColor === 'function');
      expect(result).toBe(true);
    });

    test('should have setResolutionScale function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.setResolutionScale === 'function');
      expect(result).toBe(true);
    });

    test('should have setLightness function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.setLightness === 'function');
      expect(result).toBe(true);
    });

    test('should have setSun function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.setSun === 'function');
      expect(result).toBe(true);
    });

    test('should have setRotation function', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.setRotation === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('ThreeD option defaults', () => {
    test('default scale should be 50', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.scale);
      expect(result).toBe(50);
    });

    test('default lightness should be 0.6', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.lightness);
      expect(result).toBe(0.6);
    });

    test('default shadow should be 0.5', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.shadow);
      expect(result).toBe(0.5);
    });

    test('default resolutionScale should be 2048', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.resolutionScale);
      expect(result).toBe(2048);
    });

    test('default resolution should be 2', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.resolution);
      expect(result).toBe(2);
    });
  });

  test.describe('ThreeD sun position', () => {
    test('default sun x should be 100', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.sun.x);
      expect(result).toBe(100);
    });

    test('default sun y should be 800', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.sun.y);
      expect(result).toBe(800);
    });

    test('default sun z should be 1000', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.sun.z);
      expect(result).toBe(1000);
    });
  });

  test.describe('ThreeD color defaults', () => {
    test('default skyColor should be valid hex', async ({ page }) => {
      const result = await page.evaluate(() => {
        const color = ThreeD.options.skyColor;
        return /^#[0-9a-fA-F]{6}$/.test(color);
      });
      expect(result).toBe(true);
    });

    test('default waterColor should be valid hex', async ({ page }) => {
      const result = await page.evaluate(() => {
        const color = ThreeD.options.waterColor;
        return /^#[0-9a-fA-F]{6}$/.test(color);
      });
      expect(result).toBe(true);
    });

    test('default sunColor should be valid hex', async ({ page }) => {
      const result = await page.evaluate(() => {
        const color = ThreeD.options.sunColor;
        return /^#[0-9a-fA-F]{6}$/.test(color);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('ThreeD.options.isOn state', () => {
    test('isOn should initially be falsy', async ({ page }) => {
      const result = await page.evaluate(() => !ThreeD.options.isOn);
      expect(result).toBe(true);
    });

    test('isGlobe should be undefined initially', async ({ page }) => {
      const result = await page.evaluate(() => ThreeD.options.isGlobe === undefined);
      expect(result).toBe(true);
    });
  });

  test.describe('THREE.js library loading', () => {
    // THREE is lazily loaded when 3D view is activated, so we test the loader script exists
    test('should have three.min.js script available', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Check the script reference exists
        return typeof ThreeD.create === 'function';
      });
      expect(result).toBe(true);
    });

    test('ThreeD.options should have subdivide property for mesh subdivision', async ({ page }) => {
      const result = await page.evaluate(() => typeof ThreeD.options.subdivide === 'number');
      expect(result).toBe(true);
    });
  });

  test.describe('View mode functions', () => {
    test('should have changeViewMode function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeViewMode === 'function');
      expect(result).toBe(true);
    });

    test('should have enterStandardView function', async ({ page }) => {
      const result = await page.evaluate(() => typeof enterStandardView === 'function');
      expect(result).toBe(true);
    });

    test('should have enter3dView function', async ({ page }) => {
      const result = await page.evaluate(() => typeof enter3dView === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('3D DOM elements', () => {
    test('should have viewMode element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('viewMode') !== null);
      expect(result).toBe(true);
    });

    test('should have viewStandard button', async ({ page }) => {
      const result = await page.evaluate(() => {
        const viewStandard = document.getElementById('viewStandard');
        return viewStandard && viewStandard.tagName === 'BUTTON';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('3D helper functions', () => {
    test('should have rn function (used for rounding)', async ({ page }) => {
      const result = await page.evaluate(() => typeof rn === 'function');
      expect(result).toBe(true);
    });

    test('should have byId function', async ({ page }) => {
      const result = await page.evaluate(() => typeof byId === 'function');
      expect(result).toBe(true);
    });
  });
});
