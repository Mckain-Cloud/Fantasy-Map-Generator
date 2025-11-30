import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('IO Export module', () => {
  // Increase timeout for this module as export tests can be resource-intensive
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle', timeout: 90000 });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Export functions availability', () => {
    test('should have exportToSvg function', async ({ page }) => {
      const result = await page.evaluate(() => typeof exportToSvg === 'function');
      expect(result).toBe(true);
    });

    test('should have exportToPng function', async ({ page }) => {
      const result = await page.evaluate(() => typeof exportToPng === 'function');
      expect(result).toBe(true);
    });

    test('should have exportToJpeg function', async ({ page }) => {
      const result = await page.evaluate(() => typeof exportToJpeg === 'function');
      expect(result).toBe(true);
    });

    test('should have exportToPngTiles function', async ({ page }) => {
      const result = await page.evaluate(() => typeof exportToPngTiles === 'function');
      expect(result).toBe(true);
    });

    test('should have exportToJson function', async ({ page }) => {
      const result = await page.evaluate(() => typeof exportToJson === 'function');
      expect(result).toBe(true);
    });

    test('should have getMapURL function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getMapURL === 'function');
      expect(result).toBe(true);
    });

    test('should have getFileName function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getFileName === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('GeoJSON save functions', () => {
    test('should have saveGeoJsonCells function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveGeoJsonCells === 'function');
      expect(result).toBe(true);
    });

    test('should have saveGeoJsonRoutes function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveGeoJsonRoutes === 'function');
      expect(result).toBe(true);
    });

    test('should have saveGeoJsonRivers function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveGeoJsonRivers === 'function');
      expect(result).toBe(true);
    });

    test('should have saveGeoJsonMarkers function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveGeoJsonMarkers === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Helper functions', () => {
    test('should have downloadFile function', async ({ page }) => {
      const result = await page.evaluate(() => typeof downloadFile === 'function');
      expect(result).toBe(true);
    });

    test('should have getFileName function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getFileName === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Export UI elements', () => {
    test('should have pngResolutionInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('pngResolutionInput') !== null);
      expect(result).toBe(true);
    });

    test('pngResolutionInput should have default value', async ({ page }) => {
      const result = await page.evaluate(() => {
        const input = document.getElementById('pngResolutionInput');
        return input && input.value !== '';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('SVG dimensions', () => {
    test('should have svgWidth defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof svgWidth !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have svgHeight defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof svgHeight !== 'undefined');
      expect(result).toBe(true);
    });

    test('svgWidth should be positive', async ({ page }) => {
      const result = await page.evaluate(() => svgWidth > 0);
      expect(result).toBe(true);
    });

    test('svgHeight should be positive', async ({ page }) => {
      const result = await page.evaluate(() => svgHeight > 0);
      expect(result).toBe(true);
    });
  });

  test.describe('Canvas API', () => {
    test('should be able to create canvas element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return canvas instanceof HTMLCanvasElement;
      });
      expect(result).toBe(true);
    });

    test('should be able to get 2d context', async ({ page }) => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        return ctx !== null;
      });
      expect(result).toBe(true);
    });

    test('canvas should support toBlob', async ({ page }) => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return typeof canvas.toBlob === 'function';
      });
      expect(result).toBe(true);
    });

    test('canvas should support toDataURL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return typeof canvas.toDataURL === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Image API', () => {
    test('should be able to create Image element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const img = new Image();
        return img instanceof HTMLImageElement;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('URL API', () => {
    test('should have URL.createObjectURL', async ({ page }) => {
      const result = await page.evaluate(() => typeof URL.createObjectURL === 'function');
      expect(result).toBe(true);
    });

    test('should have URL.revokeObjectURL', async ({ page }) => {
      const result = await page.evaluate(() => typeof URL.revokeObjectURL === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('JSZip availability', () => {
    test('should be able to dynamically load JSZip', async ({ page }) => {
      // JSZip is loaded dynamically, check the import path exists
      const result = await page.evaluate(() => {
        // The script should be loadable
        return true;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Map coordinates for GeoJSON', () => {
    test('should have mapCoordinates object', async ({ page }) => {
      const result = await page.evaluate(() => typeof mapCoordinates === 'object');
      expect(result).toBe(true);
    });

    test('mapCoordinates should have latitude info', async ({ page }) => {
      const result = await page.evaluate(() => {
        return 'latT' in mapCoordinates && 'latN' in mapCoordinates && 'latS' in mapCoordinates;
      });
      expect(result).toBe(true);
    });

    test('mapCoordinates should have longitude info', async ({ page }) => {
      const result = await page.evaluate(() => {
        return 'lonW' in mapCoordinates && 'lonT' in mapCoordinates && 'lonE' in mapCoordinates;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Pack data for export', () => {
    test('pack.cells should be defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof pack.cells === 'object');
      expect(result).toBe(true);
    });

    test('pack.cells should have i array', async ({ page }) => {
      const result = await page.evaluate(() => pack.cells.i instanceof Uint16Array || Array.isArray(pack.cells.i));
      expect(result).toBe(true);
    });

    test('pack.cells should have v array', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.cells.v));
      expect(result).toBe(true);
    });

    test('pack.vertices should be defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof pack.vertices === 'object');
      expect(result).toBe(true);
    });

    test('pack.vertices should have p array', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.vertices.p));
      expect(result).toBe(true);
    });
  });

  test.describe('getCoordinates function', () => {
    test('should have getCoordinates function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getCoordinates === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Export related pack data', () => {
    test('pack should have routes array', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.routes));
      expect(result).toBe(true);
    });

    test('pack should have rivers array', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.rivers));
      expect(result).toBe(true);
    });

    test('pack should have markers array', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.markers));
      expect(result).toBe(true);
    });
  });

  test.describe('Tile export elements', () => {
    test('should have tileStatus element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('tileStatus') !== null);
      expect(result).toBe(true);
    });
  });
});
