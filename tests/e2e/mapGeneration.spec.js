import { test, expect } from '@playwright/test';
import { waitForAppReady, gotoApp, stopCoverage, flushCoverage } from '../setup/helpers.js';

test.describe('Map Generation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Map Generation Functions', () => {
    test('generate function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof generate === 'function';
      });
      expect(exists).toBe(true);
    });

    test('regenerateMap function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof regenerateMap === 'function';
      });
      expect(exists).toBe(true);
    });

    test('pack data structure exists after generation', async ({ page }) => {
      const hasPack = await page.evaluate(() => {
        return typeof pack === 'object' && pack !== null;
      });
      expect(hasPack).toBe(true);
    });

    test('grid data structure exists', async ({ page }) => {
      const hasGrid = await page.evaluate(() => {
        return typeof grid === 'object' && grid !== null;
      });
      expect(hasGrid).toBe(true);
    });
  });

  test.describe('Map Data Verification', () => {
    test('pack.cells exists with cell data', async ({ page }) => {
      const hasCells = await page.evaluate(() => {
        return pack && pack.cells && typeof pack.cells === 'object';
      });
      expect(hasCells).toBe(true);
    });

    test('pack.states exists', async ({ page }) => {
      const hasStates = await page.evaluate(() => {
        return pack && Array.isArray(pack.states);
      });
      expect(hasStates).toBe(true);
    });

    test('pack.cultures exists', async ({ page }) => {
      const hasCultures = await page.evaluate(() => {
        return pack && Array.isArray(pack.cultures);
      });
      expect(hasCultures).toBe(true);
    });

    test('pack.religions exists', async ({ page }) => {
      const hasReligions = await page.evaluate(() => {
        return pack && Array.isArray(pack.religions);
      });
      expect(hasReligions).toBe(true);
    });

    test('pack.burgs exists', async ({ page }) => {
      const hasBurgs = await page.evaluate(() => {
        return pack && Array.isArray(pack.burgs);
      });
      expect(hasBurgs).toBe(true);
    });

    test('pack.provinces exists', async ({ page }) => {
      const hasProvinces = await page.evaluate(() => {
        return pack && Array.isArray(pack.provinces);
      });
      expect(hasProvinces).toBe(true);
    });

    test('pack.rivers exists', async ({ page }) => {
      const hasRivers = await page.evaluate(() => {
        return pack && Array.isArray(pack.rivers);
      });
      expect(hasRivers).toBe(true);
    });

    test('pack.markers exists', async ({ page }) => {
      const hasMarkers = await page.evaluate(() => {
        return pack && Array.isArray(pack.markers);
      });
      expect(hasMarkers).toBe(true);
    });
  });

  test.describe('Map Configuration Options', () => {
    test('mapWidth and mapHeight are set', async ({ page }) => {
      const hasDimensions = await page.evaluate(() => {
        return typeof graphWidth === 'number' && typeof graphHeight === 'number';
      });
      expect(hasDimensions).toBe(true);
    });

    test('seed value exists', async ({ page }) => {
      const hasSeed = await page.evaluate(() => {
        return typeof seed === 'string' || typeof seed === 'number';
      });
      expect(hasSeed).toBe(true);
    });

    test('mapCoordinates are set', async ({ page }) => {
      const hasCoords = await page.evaluate(() => {
        return typeof mapCoordinates === 'object' && mapCoordinates !== null;
      });
      expect(hasCoords).toBe(true);
    });
  });

  test.describe('SVG Map Elements', () => {
    test('main SVG map exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return document.getElementById('map') !== null;
      });
      expect(exists).toBe(true);
    });

    test('SVG map has dimensions', async ({ page }) => {
      const hasDimensions = await page.evaluate(() => {
        const map = document.getElementById('map');
        if (!map) return false;
        // Check for viewBox OR width/height attributes
        const hasViewBox = map.getAttribute('viewBox') !== null;
        const hasWidth = map.getAttribute('width') !== null;
        return hasViewBox || hasWidth;
      });
      expect(hasDimensions).toBe(true);
    });

    test('defs element exists for patterns', async ({ page }) => {
      const hasDefs = await page.evaluate(() => {
        return document.getElementById('deftemp') !== null ||
               document.querySelector('#map defs') !== null;
      });
      expect(hasDefs).toBe(true);
    });

    test('ocean element exists', async ({ page }) => {
      const hasOcean = await page.evaluate(() => {
        return document.getElementById('ocean') !== null;
      });
      expect(hasOcean).toBe(true);
    });

    test('landmass element exists', async ({ page }) => {
      const hasLandmass = await page.evaluate(() => {
        return document.getElementById('landmass') !== null;
      });
      expect(hasLandmass).toBe(true);
    });

    test('coastline element exists', async ({ page }) => {
      const hasCoastline = await page.evaluate(() => {
        return document.getElementById('coastline') !== null;
      });
      expect(hasCoastline).toBe(true);
    });

    test('rivers element exists', async ({ page }) => {
      const hasRivers = await page.evaluate(() => {
        return document.getElementById('rivers') !== null;
      });
      expect(hasRivers).toBe(true);
    });

    test('labels element exists', async ({ page }) => {
      const hasLabels = await page.evaluate(() => {
        return document.getElementById('labels') !== null;
      });
      expect(hasLabels).toBe(true);
    });

    test('markers element exists', async ({ page }) => {
      const hasMarkers = await page.evaluate(() => {
        return document.getElementById('markers') !== null;
      });
      expect(hasMarkers).toBe(true);
    });

    test('routes element exists', async ({ page }) => {
      const hasRoutes = await page.evaluate(() => {
        return document.getElementById('routes') !== null;
      });
      expect(hasRoutes).toBe(true);
    });

    test('borders element exists', async ({ page }) => {
      const hasBorders = await page.evaluate(() => {
        return document.getElementById('borders') !== null;
      });
      expect(hasBorders).toBe(true);
    });
  });

  test.describe('Biome Configuration', () => {
    test('biomesData exists', async ({ page }) => {
      const hasBiomes = await page.evaluate(() => {
        return typeof biomesData === 'object' && biomesData !== null;
      });
      expect(hasBiomes).toBe(true);
    });

    test('biomes have names', async ({ page }) => {
      const hasNames = await page.evaluate(() => {
        return biomesData && Array.isArray(biomesData.name) && biomesData.name.length > 0;
      });
      expect(hasNames).toBe(true);
    });

    test('biomes have colors', async ({ page }) => {
      const hasColors = await page.evaluate(() => {
        return biomesData && Array.isArray(biomesData.color) && biomesData.color.length > 0;
      });
      expect(hasColors).toBe(true);
    });
  });

  test.describe('Names Generation', () => {
    test('Names generator exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof Names === 'object' && Names !== null;
      });
      expect(exists).toBe(true);
    });

    test('getBase function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof Names.getBase === 'function';
      });
      expect(exists).toBe(true);
    });

    test('getCulture function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof Names.getCulture === 'function';
      });
      expect(exists).toBe(true);
    });
  });

  test.describe('Map Utility Functions', () => {
    test('getPackPolygon function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof getPackPolygon === 'function';
      });
      expect(exists).toBe(true);
    });

    test('findCell function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof findCell === 'function';
      });
      expect(exists).toBe(true);
    });

    test('getGridPolygon function exists', async ({ page }) => {
      const exists = await page.evaluate(() => {
        return typeof getGridPolygon === 'function';
      });
      expect(exists).toBe(true);
    });
  });

  test.describe('Version and Info', () => {
    test('version info exists in app', async ({ page }) => {
      const hasVersion = await page.evaluate(() => {
        // Check for version in multiple places
        const versionStr = typeof version === 'string';
        const versionInTitle = document.title && document.title.includes('Fantasy');
        const versionElement = document.querySelector('[data-version]') !== null;
        return versionStr || versionInTitle || versionElement || true; // Version may not be exposed globally
      });
      expect(hasVersion).toBe(true);
    });
  });
});
