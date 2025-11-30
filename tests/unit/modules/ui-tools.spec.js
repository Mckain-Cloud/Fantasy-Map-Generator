import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('UI Tools module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Tools container', () => {
    test('should have toolsContent element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('toolsContent') !== null);
      expect(result).toBe(true);
    });

    test('should have addFeature element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addFeature') !== null);
      expect(result).toBe(true);
    });

    test('should have regenerateFeature element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('regenerateFeature') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Tool functions availability', () => {
    test('should have processFeatureRegeneration function', async ({ page }) => {
      const result = await page.evaluate(() => typeof processFeatureRegeneration === 'function');
      expect(result).toBe(true);
    });

    test('should have viewCellDetails function', async ({ page }) => {
      const result = await page.evaluate(() => typeof viewCellDetails === 'function');
      expect(result).toBe(true);
    });

    test('should have overviewCharts function', async ({ page }) => {
      const result = await page.evaluate(() => typeof overviewCharts === 'function');
      expect(result).toBe(true);
    });

    test('should have openEmblemEditor function', async ({ page }) => {
      const result = await page.evaluate(() => typeof openEmblemEditor === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Edit buttons', () => {
    test('should have editHeightmapButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editHeightmapButton') !== null);
      expect(result).toBe(true);
    });

    test('should have editBiomesButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editBiomesButton') !== null);
      expect(result).toBe(true);
    });

    test('should have editStatesButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editStatesButton') !== null);
      expect(result).toBe(true);
    });

    test('should have editProvincesButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editProvincesButton') !== null);
      expect(result).toBe(true);
    });

    test('should have editCulturesButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editCulturesButton') !== null);
      expect(result).toBe(true);
    });

    test('should have editReligions', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editReligions') !== null);
      expect(result).toBe(true);
    });

    test('should have editUnitsButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editUnitsButton') !== null);
      expect(result).toBe(true);
    });

    test('should have editNotesButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editNotesButton') !== null);
      expect(result).toBe(true);
    });

    test('should have editZonesButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('editZonesButton') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Add feature buttons', () => {
    test('should have addLabel button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addLabel') !== null);
      expect(result).toBe(true);
    });

    test('should have addBurgTool button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addBurgTool') !== null);
      expect(result).toBe(true);
    });

    test('should have addRiver button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addRiver') !== null);
      expect(result).toBe(true);
    });

    test('should have addRoute button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addRoute') !== null);
      expect(result).toBe(true);
    });

    test('should have addMarker button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('addMarker') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Overview buttons', () => {
    test('should have overviewChartsButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('overviewChartsButton') !== null);
      expect(result).toBe(true);
    });

    test('should have overviewBurgsButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('overviewBurgsButton') !== null);
      expect(result).toBe(true);
    });

    test('should have overviewRoutesButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('overviewRoutesButton') !== null);
      expect(result).toBe(true);
    });

    test('should have overviewRiversButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('overviewRiversButton') !== null);
      expect(result).toBe(true);
    });

    test('should have overviewMilitaryButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('overviewMilitaryButton') !== null);
      expect(result).toBe(true);
    });

    test('should have overviewMarkersButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('overviewMarkersButton') !== null);
      expect(result).toBe(true);
    });

    test('should have overviewCellsButton', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('overviewCellsButton') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('viewCellDetails function', () => {
    test('should open cell details dialog', async ({ page }) => {
      await page.evaluate(() => {
        viewCellDetails();
      });

      const dialogOpen = await page.evaluate(() => {
        const cellInfo = document.getElementById('cellInfo');
        return cellInfo && cellInfo.open === true;
      });
      expect(dialogOpen).toBe(true);

      // Close dialog
      await page.evaluate(() => {
        const dialog = document.getElementById('cellInfo');
        if (dialog && dialog.close) dialog.close();
      });
    });
  });

  test.describe('Regenerate buttons', () => {
    test('should have regenerateStateLabels button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('regenerateStateLabels') !== null);
      expect(result).toBe(true);
    });

    test('should have regenerateReliefIcons button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('regenerateReliefIcons') !== null);
      expect(result).toBe(true);
    });

    test('should have regenerateRoutes button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('regenerateRoutes') !== null);
      expect(result).toBe(true);
    });

    test('should have regenerateRivers button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('regenerateRivers') !== null);
      expect(result).toBe(true);
    });

    test('should have regeneratePopulation button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('regeneratePopulation') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Session storage for regeneration', () => {
    test('should be able to set regenerateFeatureDontAsk', async ({ page }) => {
      const result = await page.evaluate(() => {
        sessionStorage.setItem('regenerateFeatureDontAsk', 'true');
        const value = sessionStorage.getItem('regenerateFeatureDontAsk');
        sessionStorage.removeItem('regenerateFeatureDontAsk');
        return value === 'true';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Map creation buttons', () => {
    test('should have openSubmapTool button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('openSubmapTool') !== null);
      expect(result).toBe(true);
    });

    test('should have openTransformTool button', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('openTransformTool') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('Global helper functions', () => {
    test('should have customization variable', async ({ page }) => {
      const result = await page.evaluate(() => typeof customization !== 'undefined');
      expect(result).toBe(true);
    });

    test('should have tip function', async ({ page }) => {
      const result = await page.evaluate(() => typeof tip === 'function');
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

    test('should have closeDialogs function', async ({ page }) => {
      const result = await page.evaluate(() => typeof closeDialogs === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('D3 and viewbox', () => {
    test('should have viewbox element', async ({ page }) => {
      const result = await page.evaluate(() => {
        return viewbox && typeof viewbox.style === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have findCell function', async ({ page }) => {
      const result = await page.evaluate(() => typeof findCell === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Label editing', () => {
    test('should have labels element', async ({ page }) => {
      const result = await page.evaluate(() => {
        return labels && typeof labels.select === 'function';
      });
      expect(result).toBe(true);
    });

    test('should have labelGroupSelect element', async ({ page }) => {
      const result = await page.evaluate(() => document.getElementById('labelGroupSelect') !== null);
      expect(result).toBe(true);
    });
  });

  test.describe('River editing', () => {
    test('should have Rivers module', async ({ page }) => {
      const result = await page.evaluate(() => typeof Rivers === 'object');
      expect(result).toBe(true);
    });

    test('Rivers should have getNextId function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Rivers.getNextId === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Route editing', () => {
    test('should have Routes module', async ({ page }) => {
      const result = await page.evaluate(() => typeof Routes === 'object');
      expect(result).toBe(true);
    });

    test('Routes should have generate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Routes.generate === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Marker editing', () => {
    test('should have Markers module', async ({ page }) => {
      const result = await page.evaluate(() => typeof Markers === 'object');
      expect(result).toBe(true);
    });

    test('Markers should have add function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Markers.add === 'function');
      expect(result).toBe(true);
    });

    test('Markers should have getConfig function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Markers.getConfig === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Layer toggle functions', () => {
    test('should have layerIsOn function', async ({ page }) => {
      const result = await page.evaluate(() => typeof layerIsOn === 'function');
      expect(result).toBe(true);
    });

    test('should have toggleRivers function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggleRivers === 'function');
      expect(result).toBe(true);
    });

    test('should have toggleRoutes function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggleRoutes === 'function');
      expect(result).toBe(true);
    });

    test('should have toggleMarkers function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggleMarkers === 'function');
      expect(result).toBe(true);
    });

    test('should have toggleRelief function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggleRelief === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('COA (Coat of Arms) functions', () => {
    test('should have COA object', async ({ page }) => {
      const result = await page.evaluate(() => typeof COA === 'object');
      expect(result).toBe(true);
    });

    test('COA should have generate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof COA.generate === 'function');
      expect(result).toBe(true);
    });

    test('COA should have getShield function', async ({ page }) => {
      const result = await page.evaluate(() => typeof COA.getShield === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('BurgsAndStates module', () => {
    test('should have BurgsAndStates object', async ({ page }) => {
      const result = await page.evaluate(() => typeof BurgsAndStates === 'object');
      expect(result).toBe(true);
    });

    test('BurgsAndStates should have expandStates function', async ({ page }) => {
      const result = await page.evaluate(() => typeof BurgsAndStates.expandStates === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Provinces module', () => {
    test('should have Provinces object', async ({ page }) => {
      const result = await page.evaluate(() => typeof Provinces === 'object');
      expect(result).toBe(true);
    });

    test('Provinces should have generate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Provinces.generate === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Military module', () => {
    test('should have Military object', async ({ page }) => {
      const result = await page.evaluate(() => typeof Military === 'object');
      expect(result).toBe(true);
    });

    test('Military should have generate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Military.generate === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Zones module', () => {
    test('should have Zones object', async ({ page }) => {
      const result = await page.evaluate(() => typeof Zones === 'object');
      expect(result).toBe(true);
    });

    test('Zones should have generate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Zones.generate === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Drawing functions', () => {
    test('should have drawStateLabels function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawStateLabels === 'function');
      expect(result).toBe(true);
    });

    test('should have drawReliefIcons function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawReliefIcons === 'function');
      expect(result).toBe(true);
    });

    test('should have drawRoutes function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawRoutes === 'function');
      expect(result).toBe(true);
    });

    test('should have drawRivers function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawRivers === 'function');
      expect(result).toBe(true);
    });

    test('should have drawMarker function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawMarker === 'function');
      expect(result).toBe(true);
    });

    test('should have drawEmblems function', async ({ page }) => {
      const result = await page.evaluate(() => typeof drawEmblems === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('isCtrlClick function', () => {
    test('should have isCtrlClick function', async ({ page }) => {
      const result = await page.evaluate(() => typeof isCtrlClick === 'function');
      expect(result).toBe(true);
    });
  });
});
