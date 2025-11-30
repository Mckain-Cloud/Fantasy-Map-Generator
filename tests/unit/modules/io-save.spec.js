import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('IO Save module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Save functions availability', () => {
    test('should have saveMap function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveMap === 'function');
      expect(result).toBe(true);
    });

    test('should have prepareMapData function', async ({ page }) => {
      const result = await page.evaluate(() => typeof prepareMapData === 'function');
      expect(result).toBe(true);
    });

    test('should have getFileName function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getFileName === 'function');
      expect(result).toBe(true);
    });

    test('should have saveToStorage function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveToStorage === 'function');
      expect(result).toBe(true);
    });

    test('should have saveToMachine function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveToMachine === 'function');
      expect(result).toBe(true);
    });

    test('should have saveToDropbox function', async ({ page }) => {
      const result = await page.evaluate(() => typeof saveToDropbox === 'function');
      expect(result).toBe(true);
    });

    test('should have compressData function', async ({ page }) => {
      const result = await page.evaluate(() => typeof compressData === 'function');
      expect(result).toBe(true);
    });

    test('should have downloadFile function', async ({ page }) => {
      const result = await page.evaluate(() => typeof downloadFile === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('getFileName function', () => {
    test('getFileName should return string', async ({ page }) => {
      const result = await page.evaluate(() => typeof getFileName() === 'string');
      expect(result).toBe(true);
    });

    test('getFileName should use mapName value if set', async ({ page }) => {
      const result = await page.evaluate(() => {
        const originalName = mapName.value;
        mapName.value = 'TestMapName';
        const filename = getFileName();
        mapName.value = originalName;
        return filename.includes('TestMapName');
      });
      expect(result).toBe(true);
    });

    test('getFileName should return non-empty string', async ({ page }) => {
      const result = await page.evaluate(() => getFileName().length > 0);
      expect(result).toBe(true);
    });
  });

  test.describe('prepareMapData function', () => {
    test('prepareMapData should return string', async ({ page }) => {
      const result = await page.evaluate(() => typeof prepareMapData() === 'string');
      expect(result).toBe(true);
    });

    test('prepareMapData string should have multiple lines', async ({ page }) => {
      const result = await page.evaluate(() => prepareMapData().split('\r\n').length);
      expect(result).toBeGreaterThan(10);
    });

    test('prepareMapData first line should contain version', async ({ page }) => {
      const result = await page.evaluate(() => {
        const data = prepareMapData();
        return data.split('\r\n')[0].includes(VERSION);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Map metadata elements', () => {
    test('should have mapName element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('mapName') !== null);
      expect(result).toBe(true);
    });

    test('should have seed defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof seed !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have mapId defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof mapId !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have graphWidth defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof graphWidth === 'number');
      expect(result).toBe(true);
    });

    test('should have graphHeight defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof graphHeight === 'number');
      expect(result).toBe(true);
    });
  });

  test.describe('Settings elements', () => {
    test('should have distanceUnitInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('distanceUnitInput') !== null);
      expect(result).toBe(true);
    });

    test('should have areaUnit element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('areaUnit') !== null);
      expect(result).toBe(true);
    });

    test('should have heightUnit element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('heightUnit') !== null);
      expect(result).toBe(true);
    });

    test('should have heightExponentInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('heightExponentInput') !== null);
      expect(result).toBe(true);
    });

    test('should have temperatureScale element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('temperatureScale') !== null);
      expect(result).toBe(true);
    });

    test('should have mapSizeOutput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('mapSizeOutput') !== null);
      expect(result).toBe(true);
    });

    test('should have latitudeOutput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('latitudeOutput') !== null);
      expect(result).toBe(true);
    });

    test('should have precOutput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('precOutput') !== null);
      expect(result).toBe(true);
    });

    test('should have hideLabels element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('hideLabels') !== null);
      expect(result).toBe(true);
    });

    test('should have stylePreset element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('stylePreset') !== null);
      expect(result).toBe(true);
    });

    test('should have rescaleLabels element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('rescaleLabels') !== null);
      expect(result).toBe(true);
    });

    test('should have longitudeOutput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('longitudeOutput') !== null);
      expect(result).toBe(true);
    });

    test('should have growthRate element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('growthRate') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Global variables for saving', () => {
    test('should have distanceScale defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof distanceScale !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have populationRate defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof populationRate === 'number');
      expect(result).toBe(true);
    });

    test('should have urbanization defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof urbanization === 'number');
      expect(result).toBe(true);
    });

    test('should have urbanDensity defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof urbanDensity !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have mapCoordinates defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof mapCoordinates === 'object');
      expect(result).toBe(true);
    });

    test('should have biomesData defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof biomesData === 'object');
      expect(result).toBe(true);
    });

    test('should have notes array defined', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(notes));
      expect(result).toBe(true);
    });

    test('should have rulers defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have options object defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof options === 'object');
      expect(result).toBe(true);
    });
  });

  test.describe('Compression Stream API', () => {
    test('should have CompressionStream available', async ({ page }) => {
      const result = await page.evaluate(() => typeof CompressionStream === 'function');
      expect(result).toBe(true);
    });

    test('should support gzip compression', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          new CompressionStream('gzip');
          return true;
        } catch {
          return false;
        }
      });
      expect(result).toBe(true);
    });
  });

  test.describe('XMLSerializer', () => {
    test('should have XMLSerializer available', async ({ page }) => {
      const result = await page.evaluate(() => typeof XMLSerializer === 'function');
      expect(result).toBe(true);
    });

    test('XMLSerializer should serialize SVG', async ({ page }) => {
      const result = await page.evaluate(() => {
        const svg = document.getElementById('map');
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        return svgString.startsWith('<svg');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('customization mode flag', () => {
    test('should have customization variable defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof customization !== 'undefined');
      expect(result).toBe(true);
    });

    test('customization should initially be falsy', async ({ page }) => {
      const result = await page.evaluate(() => !customization);
      expect(result).toBe(true);
    });
  });

  test.describe('getUsedFonts function', () => {
    test('should have getUsedFonts function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getUsedFonts === 'function');
      expect(result).toBe(true);
    });

    test('getUsedFonts should return array', async ({ page }) => {
      const result = await page.evaluate(() => {
        const fonts = getUsedFonts(document.getElementById('map'));
        return Array.isArray(fonts);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Pack data availability', () => {
    test('should have pack object', async ({ page }) => {
      const result = await page.evaluate(() => typeof pack === 'object');
      expect(result).toBe(true);
    });

    test('pack should have features', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.features));
      expect(result).toBe(true);
    });

    test('pack should have cultures', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.cultures));
      expect(result).toBe(true);
    });

    test('pack should have states', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.states));
      expect(result).toBe(true);
    });

    test('pack should have burgs', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.burgs));
      expect(result).toBe(true);
    });

    test('pack should have religions', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.religions));
      expect(result).toBe(true);
    });

    test('pack should have provinces', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.provinces));
      expect(result).toBe(true);
    });

    test('pack should have rivers', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.rivers));
      expect(result).toBe(true);
    });

    test('pack should have markers', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(pack.markers));
      expect(result).toBe(true);
    });
  });

  test.describe('Grid data availability', () => {
    test('should have grid object', async ({ page }) => {
      const result = await page.evaluate(() => typeof grid === 'object');
      expect(result).toBe(true);
    });

    test('grid should have cellsX', async ({ page }) => {
      const result = await page.evaluate(() => typeof grid.cellsX === 'number');
      expect(result).toBe(true);
    });

    test('grid should have cellsY', async ({ page }) => {
      const result = await page.evaluate(() => typeof grid.cellsY === 'number');
      expect(result).toBe(true);
    });

    test('grid should have spacing', async ({ page }) => {
      const result = await page.evaluate(() => typeof grid.spacing === 'number');
      expect(result).toBe(true);
    });

    test('grid should have boundary', async ({ page }) => {
      const result = await page.evaluate(() => typeof grid.boundary === 'object');
      expect(result).toBe(true);
    });

    test('grid should have points', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(grid.points));
      expect(result).toBe(true);
    });

    test('grid should have features', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(grid.features));
      expect(result).toBe(true);
    });
  });

  test.describe('Helper functions', () => {
    test('should have closeDialogs function', async ({ page }) => {
      const result = await page.evaluate(() => typeof closeDialogs === 'function');
      expect(result).toBe(true);
    });

    test('should have tip function', async ({ page }) => {
      const result = await page.evaluate(() => typeof tip === 'function');
      expect(result).toBe(true);
    });

    test('should have parseError function', async ({ page }) => {
      const result = await page.evaluate(() => typeof parseError === 'function');
      expect(result).toBe(true);
    });

    test('should have link function', async ({ page }) => {
      const result = await page.evaluate(() => typeof link === 'function');
      expect(result).toBe(true);
    });
  });
});
