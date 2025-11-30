import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('UI Units Editor module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Units Editor dialog', () => {
    test('should have unitsEditor element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('unitsEditor') !== null);
      expect(result).toBe(true);
    });

    test('should have editUnits function', async ({ page }) => {
      const result = await page.evaluate(() => typeof editUnits === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Distance unit inputs', () => {
    test('should have distanceUnitInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('distanceUnitInput') !== null);
      expect(result).toBe(true);
    });

    test('should have distanceScaleInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('distanceScaleInput') !== null);
      expect(result).toBe(true);
    });

    test('distanceUnitInput should have options', async ({ page }) => {
      const result = await page.evaluate(() => {
        const input = document.getElementById('distanceUnitInput');
        return input && input.options && input.options.length > 0;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Height unit inputs', () => {
    test('should have heightUnit element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('heightUnit') !== null);
      expect(result).toBe(true);
    });

    test('should have heightExponentInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('heightExponentInput') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Temperature inputs', () => {
    test('should have temperatureScale element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('temperatureScale') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Population inputs', () => {
    test('should have populationRateInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('populationRateInput') !== null);
      expect(result).toBe(true);
    });

    test('should have urbanizationInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('urbanizationInput') !== null);
      expect(result).toBe(true);
    });

    test('should have urbanDensityInput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('urbanDensityInput') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Global variables', () => {
    test('should have populationRate defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof populationRate === 'number');
      expect(result).toBe(true);
    });

    test('should have urbanization defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof urbanization === 'number');
      expect(result).toBe(true);
    });

    test('should have urbanDensity defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof urbanDensity === 'number');
      expect(result).toBe(true);
    });

    test('should have distanceScale defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof distanceScale === 'number');
      expect(result).toBe(true);
    });
  });

  test.describe('Ruler buttons', () => {
    test('should have addLinearRuler button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addLinearRuler') !== null);
      expect(result).toBe(true);
    });

    test('should have addOpisometer button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addOpisometer') !== null);
      expect(result).toBe(true);
    });

    test('should have addRouteOpisometer button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addRouteOpisometer') !== null);
      expect(result).toBe(true);
    });

    test('should have addPlanimeter button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addPlanimeter') !== null);
      expect(result).toBe(true);
    });

    test('should have removeRulers button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('removeRulers') !== null);
      expect(result).toBe(true);
    });

    test('should have unitsRestore button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('unitsRestore') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Rulers module', () => {
    test('should have rulers object', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers === 'object');
      expect(result).toBe(true);
    });

    test('rulers should have data array', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(rulers.data));
      expect(result).toBe(true);
    });

    test('rulers should have create method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.create === 'function');
      expect(result).toBe(true);
    });

    test('rulers should have remove method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.remove === 'function');
      expect(result).toBe(true);
    });

    test('rulers should have undraw method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.undraw === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Ruler classes', () => {
    test('should have Ruler class', async ({ page }) => {
      const result = await page.evaluate(() => typeof Ruler === 'function');
      expect(result).toBe(true);
    });

    test('should have Opisometer class', async ({ page }) => {
      const result = await page.evaluate(() => typeof Opisometer === 'function');
      expect(result).toBe(true);
    });

    test('should have RouteOpisometer class', async ({ page }) => {
      const result = await page.evaluate(() => typeof RouteOpisometer === 'function');
      expect(result).toBe(true);
    });

    test('should have Planimeter class', async ({ page }) => {
      const result = await page.evaluate(() => typeof Planimeter === 'function');
      expect(result).toBe(true);
    });

    test('should have Rulers constructor', async ({ page }) => {
      const result = await page.evaluate(() => typeof Rulers === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('ScaleBar functions', () => {
    test('should have drawScaleBar function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawScaleBar === 'function');
      expect(result).toBe(true);
    });

    test('should have fitScaleBar function', async ({ page }) => {
      const result = await page.evaluate(() => typeof fitScaleBar === 'function');
      expect(result).toBe(true);
    });

    test('should have scaleBar element', async ({ page }) => {
      const result = await page.evaluate(() => {
        return scaleBar && typeof scaleBar.node === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Temperature functions', () => {
    test('should have calculateTemperatures function', async ({ page }) => {
      const result = await page.evaluate(() => typeof calculateTemperatures === 'function');
      expect(result).toBe(true);
    });

    test('should have drawTemperature function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawTemperature === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Grid size output', () => {
    test('should have mapSizeOutput element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('mapSizeOutput') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Lock functions', () => {
    test('should have lock function', async ({ page }) => {
      const result = await page.evaluate(() => typeof lock === 'function');
      expect(result).toBe(true);
    });

    test('should have unlock function', async ({ page }) => {
      const result = await page.evaluate(() => typeof unlock === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Route connection', () => {
    test('Routes should have isConnected function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Routes.isConnected === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Layer toggle for rulers', () => {
    test('should have toggleRulers function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggleRulers === 'function');
      expect(result).toBe(true);
    });

    test('should have layerIsOn function', async ({ page }) => {
      const result = await page.evaluate(() => typeof layerIsOn === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Modules tracking', () => {
    test('should have modules object', async ({ page }) => {
      const result = await page.evaluate(() => typeof modules === 'object');
      expect(result).toBe(true);
    });
  });

  test.describe('Graph dimensions', () => {
    test('should have graphWidth defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof graphWidth === 'number');
      expect(result).toBe(true);
    });

    test('should have graphHeight defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof graphHeight === 'number');
      expect(result).toBe(true);
    });

    test('should have svgWidth defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof svgWidth === 'number');
      expect(result).toBe(true);
    });

    test('should have svgHeight defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof svgHeight === 'number');
      expect(result).toBe(true);
    });

    test('should have scale defined', async ({ page }) => {
      const result = await page.evaluate(() => typeof scale === 'number');
      expect(result).toBe(true);
    });
  });

  test.describe('Area unit', () => {
    test('should have areaUnit element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('areaUnit') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Navigator language', () => {
    test('should have navigator.language', async ({ page }) => {
      const result = await page.evaluate(() => typeof navigator.language === 'string');
      expect(result).toBe(true);
    });
  });

  test.describe('editUnits function execution', () => {
    test('should open units editor dialog', async ({ page }) => {
      await page.evaluate(() => {
        editUnits();
      });

      // Wait a bit for dialog to initialize
      await page.waitForTimeout(100);

      const dialogOpen = await page.evaluate(() => {
        const unitsEditor = document.getElementById('unitsEditor');
        return unitsEditor && unitsEditor.open === true;
      });
      expect(dialogOpen).toBe(true);

      // Close the dialog
      await page.evaluate(() => {
        const dialog = document.getElementById('unitsEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('should set modules.editUnits flag', async ({ page }) => {
      await page.evaluate(() => {
        editUnits();
      });

      const moduleFlagSet = await page.evaluate(() => modules.editUnits === true);
      expect(moduleFlagSet).toBe(true);

      // Close the dialog
      await page.evaluate(() => {
        const dialog = document.getElementById('unitsEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });
  });

  test.describe('unitsBottom element', () => {
    test('should have unitsBottom element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('unitsBottom') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('SVG map element', () => {
    test('should have map SVG element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('map') !== null);
      expect(result).toBe(true);
    });

    test('map should have createSVGPoint method', async ({ page }) => {
      const result = await page.evaluate(() => {
        const map = document.getElementById('map');
        return map && typeof map.createSVGPoint === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Viewbox transformation', () => {
    test('viewbox should have getScreenCTM method', async ({ page }) => {
      const result = await page.evaluate(() => {
        return viewbox && viewbox.node() && typeof viewbox.node().getScreenCTM === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Dialog helper functions', () => {
    test('should have closeDialogs function', async ({ page }) => {
      const result = await page.evaluate(() => typeof closeDialogs === 'function');
      expect(result).toBe(true);
    });

    test('should have restoreDefaultEvents function', async ({ page }) => {
      const result = await page.evaluate(() => typeof restoreDefaultEvents === 'function');
      expect(result).toBe(true);
    });

    test('should have clearMainTip function', async ({ page }) => {
      const result = await page.evaluate(() => typeof clearMainTip === 'function');
      expect(result).toBe(true);
    });

    test('should have tip function', async ({ page }) => {
      const result = await page.evaluate(() => typeof tip === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('D3 drag behavior', () => {
    test('d3 should have drag function', async ({ page }) => {
      const result = await page.evaluate(() => typeof d3.drag === 'function');
      expect(result).toBe(true);
    });

    test('d3.drag should return callable', async ({ page }) => {
      const result = await page.evaluate(() => {
        const drag = d3.drag();
        return typeof drag.on === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Pack cells for route opisometer', () => {
    test('should have pack.cells', async ({ page }) => {
      const result = await page.evaluate(() => {
        return pack && pack.cells && typeof pack.cells === 'object';
      });
      expect(result).toBe(true);
    });

    test('pack.cells should have p property', async ({ page }) => {
      const result = await page.evaluate(() => {
        return pack && pack.cells && pack.cells.p;
      });
      expect(result).toBeTruthy();
    });

    test('pack.cells should have burg property', async ({ page }) => {
      const result = await page.evaluate(() => {
        return pack && pack.cells && pack.cells.burg;
      });
      expect(result).toBeTruthy();
    });
  });

  test.describe('Pack burgs', () => {
    test('should have pack.burgs', async ({ page }) => {
      const result = await page.evaluate(() => {
        return pack && Array.isArray(pack.burgs);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('FindCell function', () => {
    test('should have findCell function', async ({ page }) => {
      const result = await page.evaluate(() => typeof findCell === 'function');
      expect(result).toBe(true);
    });

    test('findCell should return a number', async ({ page }) => {
      const result = await page.evaluate(() => {
        const cell = findCell(graphWidth / 2, graphHeight / 2);
        return typeof cell === 'number';
      });
      expect(result).toBe(true);
    });
  });
});
