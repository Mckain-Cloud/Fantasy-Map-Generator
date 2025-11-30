import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('UI Options module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Options panel functions', () => {
    test('should have showOptions function', async ({ page }) => {
      const result = await page.evaluate(() => typeof showOptions === 'function');
      expect(result).toBe(true);
    });

    test('should have hideOptions function', async ({ page }) => {
      const result = await page.evaluate(() => typeof hideOptions === 'function');
      expect(result).toBe(true);
    });

    test('should have toggleOptions function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggleOptions === 'function');
      expect(result).toBe(true);
    });

    test('should have fitMapToScreen function', async ({ page }) => {
      const result = await page.evaluate(() => typeof fitMapToScreen === 'function');
      expect(result).toBe(true);
    });

    test('should have applyGraphSize function', async ({ page }) => {
      const result = await page.evaluate(() => typeof applyGraphSize === 'function');
      expect(result).toBe(true);
    });

    test('should have applyStoredOptions function', async ({ page }) => {
      const result = await page.evaluate(() => typeof applyStoredOptions === 'function');
      expect(result).toBe(true);
    });

    test('should have randomizeOptions function', async ({ page }) => {
      const result = await page.evaluate(() => typeof randomizeOptions === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Options DOM elements', () => {
    test('should have options element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('options');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have optionsContainer element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('optionsContainer');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have optionsTrigger element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('optionsTrigger');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have optionsContent element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('optionsContent');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have regenerate element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('regenerate');
        return element !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Options tabs', () => {
    test('should have layersTab element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('layersTab');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have styleTab element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('styleTab');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have optionsTab element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('optionsTab');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have toolsTab element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('toolsTab');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have aboutTab element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('aboutTab');
        return element !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Map size inputs', () => {
    test('should have mapWidthInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('mapWidthInput');
        return element !== null && element.tagName === 'INPUT';
      });
      expect(result).toBe(true);
    });

    test('should have mapHeightInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('mapHeightInput');
        return element !== null && element.tagName === 'INPUT';
      });
      expect(result).toBe(true);
    });

    test('mapWidthInput should have numeric value', async ({ page }) => {
      const result = await page.evaluate(() => {
        const value = +document.getElementById('mapWidthInput').value;
        return !isNaN(value) && value > 0;
      });
      expect(result).toBe(true);
    });

    test('mapHeightInput should have numeric value', async ({ page }) => {
      const result = await page.evaluate(() => {
        const value = +document.getElementById('mapHeightInput').value;
        return !isNaN(value) && value > 0;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('cellsDensityMap', () => {
    test('should have changeCellsDensity function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeCellsDensity === 'function');
      expect(result).toBe(true);
    });

    test('should have getCellsDensityColor function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getCellsDensityColor === 'function');
      expect(result).toBe(true);
    });

    test('getCellsDensityColor should return red for high density', async ({ page }) => {
      const result = await page.evaluate(() => getCellsDensityColor(60000));
      expect(result).toBe('#b12117');
    });

    test('getCellsDensityColor should return yellow for non-default density', async ({ page }) => {
      const result = await page.evaluate(() => getCellsDensityColor(20000));
      expect(result).toBe('#dfdf12');
    });

    test('getCellsDensityColor should return green for default density', async ({ page }) => {
      const result = await page.evaluate(() => getCellsDensityColor(10000));
      expect(result).toBe('#053305');
    });
  });

  test.describe('Points/cells input', () => {
    test('should have pointsInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('pointsInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have pointsOutputFormatted element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('pointsOutputFormatted');
        return element !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Culture settings', () => {
    test('should have culturesSet element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('culturesSet');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have culturesInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('culturesInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have changeCultureSet function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeCultureSet === 'function');
      expect(result).toBe(true);
    });

    test('should have randomizeCultureSet function', async ({ page }) => {
      const result = await page.evaluate(() => typeof randomizeCultureSet === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('State settings', () => {
    test('should have statesNumber element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('statesNumber');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have changeStatesNumber function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeStatesNumber === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Zoom settings', () => {
    test('should have zoomExtentMin element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('zoomExtentMin');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have zoomExtentMax element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('zoomExtentMax');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have changeZoomExtent function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeZoomExtent === 'function');
      expect(result).toBe(true);
    });

    test('should have restoreDefaultZoomExtent function', async ({ page }) => {
      const result = await page.evaluate(() => typeof restoreDefaultZoomExtent === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Theme settings', () => {
    test('should have themeColorInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('themeColorInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have themeHueInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('themeHueInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have transparencyInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('transparencyInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have changeDialogsTheme function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeDialogsTheme === 'function');
      expect(result).toBe(true);
    });

    test('should have changeThemeHue function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeThemeHue === 'function');
      expect(result).toBe(true);
    });

    test('should have restoreDefaultThemeColor function', async ({ page }) => {
      const result = await page.evaluate(() => typeof restoreDefaultThemeColor === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('UI size settings', () => {
    test('should have uiSize element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('uiSize');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have changeUiSize function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeUiSize === 'function');
      expect(result).toBe(true);
    });

    test('should have getUImaxSize function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getUImaxSize === 'function');
      expect(result).toBe(true);
    });

    test('getUImaxSize should return positive number', async ({ page }) => {
      const result = await page.evaluate(() => {
        const maxSize = getUImaxSize();
        return typeof maxSize === 'number' && maxSize > 0;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Era and year settings', () => {
    test('should have yearInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('yearInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have eraInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('eraInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have generateEra function', async ({ page }) => {
      const result = await page.evaluate(() => typeof generateEra === 'function');
      expect(result).toBe(true);
    });

    test('should have changeYear function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeYear === 'function');
      expect(result).toBe(true);
    });

    test('should have changeEra function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeEra === 'function');
      expect(result).toBe(true);
    });

    test('options.year should be set', async ({ page }) => {
      const result = await page.evaluate(() => typeof options.year === 'number');
      expect(result).toBe(true);
    });

    test('options.era should be set', async ({ page }) => {
      const result = await page.evaluate(() => typeof options.era === 'string');
      expect(result).toBe(true);
    });
  });

  test.describe('Template settings', () => {
    test('should have templateInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('templateInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have randomizeHeightmapTemplate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof randomizeHeightmapTemplate === 'function');
      expect(result).toBe(true);
    });

    test('should have openTemplateSelectionDialog function', async ({ page }) => {
      const result = await page.evaluate(() => typeof openTemplateSelectionDialog === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Seed settings', () => {
    test('should have optionsSeed element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('optionsSeed');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have generateMapWithSeed function', async ({ page }) => {
      const result = await page.evaluate(() => typeof generateMapWithSeed === 'function');
      expect(result).toBe(true);
    });

    test('should have showSeedHistoryDialog function', async ({ page }) => {
      const result = await page.evaluate(() => typeof showSeedHistoryDialog === 'function');
      expect(result).toBe(true);
    });

    test('should have copyMapURL function', async ({ page }) => {
      const result = await page.evaluate(() => typeof copyMapURL === 'function');
      expect(result).toBe(true);
    });

    test('should have restoreSeed function', async ({ page }) => {
      const result = await page.evaluate(() => typeof restoreSeed === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Save/Load/Export functions', () => {
    test('should have showSavePane function', async ({ page }) => {
      const result = await page.evaluate(() => typeof showSavePane === 'function');
      expect(result).toBe(true);
    });

    test('should have showLoadPane function', async ({ page }) => {
      const result = await page.evaluate(() => typeof showLoadPane === 'function');
      expect(result).toBe(true);
    });

    test('should have showExportPane function', async ({ page }) => {
      const result = await page.evaluate(() => typeof showExportPane === 'function');
      expect(result).toBe(true);
    });

    test('should have exportToJson function', async ({ page }) => {
      const result = await page.evaluate(() => typeof exportToJson === 'function');
      expect(result).toBe(true);
    });

    test('should have loadURL function', async ({ page }) => {
      const result = await page.evaluate(() => typeof loadURL === 'function');
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

    test('should have toggle3dOptions function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggle3dOptions === 'function');
      expect(result).toBe(true);
    });

    test('should have viewMode element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('viewMode');
        return element !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Rendering settings', () => {
    test('should have shapeRendering element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('shapeRendering');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have setRendering function', async ({ page }) => {
      const result = await page.evaluate(() => typeof setRendering === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Sticked menu buttons', () => {
    test('should have sticked element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('sticked');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have newMapButton element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('newMapButton');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have saveButton element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('saveButton');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have exportButton element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('exportButton');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have loadButton element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('loadButton');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have zoomReset element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('zoomReset');
        return element !== null;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Emblem shape settings', () => {
    test('should have emblemShape element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('emblemShape');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('should have changeEmblemShape function', async ({ page }) => {
      const result = await page.evaluate(() => typeof changeEmblemShape === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Translation settings', () => {
    test('should have loadGoogleTranslate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof loadGoogleTranslate === 'function');
      expect(result).toBe(true);
    });

    test('should have resetLanguage function', async ({ page }) => {
      const result = await page.evaluate(() => typeof resetLanguage === 'function');
      expect(result).toBe(true);
    });

    test('should have initGoogleTranslate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof initGoogleTranslate === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Tiles export', () => {
    test('should have openExportToPngTiles function', async ({ page }) => {
      const result = await page.evaluate(() => typeof openExportToPngTiles === 'function');
      expect(result).toBe(true);
    });

    test('should have updateTilesOptions function', async ({ page }) => {
      const result = await page.evaluate(() => typeof updateTilesOptions === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Helper functions', () => {
    test('should have storeValueIfRequired function', async ({ page }) => {
      const result = await page.evaluate(() => typeof storeValueIfRequired === 'function');
      expect(result).toBe(true);
    });

    test('should have updateOutputToFollowInput function', async ({ page }) => {
      const result = await page.evaluate(() => typeof updateOutputToFollowInput === 'function');
      expect(result).toBe(true);
    });

    test('should have restoreDefaultCanvasSize function', async ({ page }) => {
      const result = await page.evaluate(() => typeof restoreDefaultCanvasSize === 'function');
      expect(result).toBe(true);
    });

    test('should have mapSizeInputChange function', async ({ page }) => {
      const result = await page.evaluate(() => typeof mapSizeInputChange === 'function');
      expect(result).toBe(true);
    });

    test('should have toggleTranslateExtent function', async ({ page }) => {
      const result = await page.evaluate(() => typeof toggleTranslateExtent === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Dropbox integration', () => {
    test('should have connectToDropbox function', async ({ page }) => {
      const result = await page.evaluate(() => typeof connectToDropbox === 'function');
      expect(result).toBe(true);
    });
  });
});
