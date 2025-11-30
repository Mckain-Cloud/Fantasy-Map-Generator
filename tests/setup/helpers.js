/**
 * Test Helper Functions
 * Common utilities for test setup, assertions, and operations
 */

import { TEST_MAPS } from './fixtures.js';
import { startCoverage, stopCoverage, flushCoverage } from './coverageHelpers.js';

// Re-export coverage helpers for convenience
export { startCoverage, stopCoverage, flushCoverage };

// Use the http server URL (configured in playwright.config.js)
// Serving from dist folder after build
export const APP_URL = 'http://localhost:8080/';

/**
 * Navigate to the app using HTTP server
 * Automatically starts coverage collection if enabled
 */
export async function gotoApp(page, options = {}) {
  await startCoverage(page);
  const defaultOptions = { waitUntil: 'domcontentloaded' };
  return page.goto(APP_URL, { ...defaultOptions, ...options });
}

/**
 * Wait for the application to be fully loaded and initialized
 * This includes all modules, data structures, and the initial map
 */
export async function waitForAppReady(page, timeout = 180000) {
  // Add logging to see what's happening
  await page.evaluate(() => {
    window._waitForAppReadyLog = [];
    const logInterval = setInterval(() => {
      const status = {
        time: Date.now(),
        grid: typeof window.grid !== 'undefined',
        pack: typeof window.pack !== 'undefined',
        biomesData: typeof window.biomesData !== 'undefined',
        nameBases: typeof window.nameBases !== 'undefined',
        packCells: !!(window.pack && window.pack.cells),
        packCellsI: !!(window.pack && window.pack.cells && window.pack.cells.i),
        packCellsILength: window.pack?.cells?.i?.length || 0
      };
      window._waitForAppReadyLog.push(status);
      console.log('[waitForAppReady]', JSON.stringify(status));
    }, 2000);
    window._waitForAppReadyClearInterval = () => clearInterval(logInterval);
  });

  try {
    // ES modules expose globals via window object
    await page.waitForFunction(
      () => {
        return typeof window.grid !== 'undefined' &&
               typeof window.pack !== 'undefined' &&
               typeof window.biomesData !== 'undefined' &&
               typeof window.nameBases !== 'undefined' &&
               window.pack.cells &&
               window.pack.cells.i &&
               window.pack.cells.i.length > 0;
      },
      { timeout }
    );
  } finally {
    // Stop logging
    await page.evaluate(() => {
      if (window._waitForAppReadyClearInterval) {
        window._waitForAppReadyClearInterval();
      }
    });
  }
}

/**
 * Generate a map with a specific seed and wait for completion
 */
export async function generateMap(page, seed = TEST_MAPS.medium.seed) {
  await page.evaluate((s) => {
    return new Promise((resolve) => {
      generate({ seed: s }).then(resolve);
    });
  }, seed);

  // Wait for generation to complete
  await page.waitForFunction(() => {
    return window.pack && window.pack.states && window.pack.states.length > 0;
  }, { timeout: 30000 });
}

/**
 * Get map statistics
 */
export async function getMapStats(page) {
  return page.evaluate(() => {
    return {
      states: window.pack.states.filter(s => s.i && !s.removed).length,
      burgs: window.pack.burgs.filter(b => b.i && !b.removed).length,
      cultures: window.pack.cultures.filter(c => c.i && !s.removed).length,
      religions: window.pack.religions.filter(r => r.i && !r.removed).length,
      provinces: window.pack.provinces.filter(p => p.i).length,
      markers: window.pack.markers.length,
      rivers: window.pack.rivers.filter(r => r.i).length,
      routes: window.pack.routes.length,
      cells: window.pack.cells.i.length
    };
  });
}

/**
 * Check referential integrity of the map
 */
export async function checkReferentialIntegrity(page) {
  return page.evaluate(() => {
    const errors = [];

    // Check burgs reference valid states
    window.pack.burgs.forEach((burg, i) => {
      if (burg.i && !burg.removed) {
        const state = window.pack.states[burg.state];
        if (!state || state.removed) {
          errors.push(`Burg ${i} (${burg.name}) references invalid state ${burg.state}`);
        }
      }
    });

    // Check burgs reference valid cells
    window.pack.burgs.forEach((burg, i) => {
      if (burg.i && !burg.removed) {
        if (burg.cell < 0 || burg.cell >= window.pack.cells.i.length) {
          errors.push(`Burg ${i} (${burg.name}) references invalid cell ${burg.cell}`);
        }
      }
    });

    // Check cells reference valid states
    window.pack.cells.state.forEach((stateId, cellId) => {
      if (stateId > 0) {
        const state = window.pack.states[stateId];
        if (!state || state.removed) {
          errors.push(`Cell ${cellId} references invalid state ${stateId}`);
        }
      }
    });

    // Check provinces reference valid states
    window.pack.provinces.forEach((prov, i) => {
      if (prov.i) {
        const state = window.pack.states[prov.state];
        if (!state || state.removed) {
          errors.push(`Province ${i} (${prov.name}) references invalid state ${prov.state}`);
        }
      }
    });

    // Check state diplomacy references valid states
    window.pack.states.forEach((state, i) => {
      if (state.i && !state.removed && state.diplomacy) {
        state.diplomacy.forEach((relation, targetId) => {
          if (targetId > 0 && relation && relation !== 'x') {
            const target = window.pack.states[targetId];
            if (!target || target.removed) {
              errors.push(`State ${i} (${state.name}) has diplomacy with invalid state ${targetId}`);
            }
          }
        });
      }
    });

    return { valid: errors.length === 0, errors };
  });
}

/**
 * Wait for SVG rendering to complete
 */
export async function waitForRender(page, timeout = 5000) {
  await page.waitForTimeout(500); // Initial render
  await page.waitForSelector('#map svg', { timeout });

  // Wait for specific layers to be rendered
  await page.waitForFunction(() => {
    const states = document.querySelectorAll('#statesBody path');
    const burgs = document.querySelectorAll('#burgIcons circle');
    return states.length > 0 || burgs.length > 0;
  }, { timeout });
}

/**
 * Get entity by name
 */
export async function getEntityByName(page, entityType, name) {
  return page.evaluate(([type, n]) => {
    const collection = window.pack[type + 's'];
    return collection.find(e => e.name === n && !e.removed);
  }, [entityType, name]);
}

/**
 * Get entity by ID
 */
export async function getEntityById(page, entityType, id) {
  return page.evaluate(([type, i]) => {
    const collection = window.pack[type + 's'];
    return collection[i];
  }, [entityType, id]);
}

/**
 * Count entities of type
 */
export async function countEntities(page, entityType, filter = null) {
  return page.evaluate(([type, filterStr]) => {
    const collection = window.pack[type + 's'];
    let entities = collection.filter(e => e.i && !e.removed);

    if (filterStr) {
      const filterFn = new Function('e', `return ${filterStr}`);
      entities = entities.filter(filterFn);
    }

    return entities.length;
  }, [entityType, filter]);
}

/**
 * Open a UI editor dialog
 */
export async function openEditor(page, editorType) {
  const editorFunctions = {
    states: 'editStates',
    burgs: 'editBurg',
    cultures: 'editCultures',
    religions: 'editReligions',
    provinces: 'editProvinces',
    military: 'editRegiments',
    markers: 'editMarkers',
    notes: 'editNotes',
    routes: 'editRoute',
    labels: 'editLabel'
  };

  const fn = editorFunctions[editorType];
  if (!fn) throw new Error(`Unknown editor type: ${editorType}`);

  await page.evaluate((functionName) => {
    window[functionName]();
  }, fn);

  // Wait for dialog to open
  await page.waitForSelector(`.dialog:visible`, { timeout: 5000 });
}

/**
 * Close all dialogs
 */
export async function closeAllDialogs(page) {
  await page.evaluate(() => {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  });
}

/**
 * Get compressed context size in tokens
 */
export async function getContextTokenCount(page) {
  return page.evaluate(() => {
    const context = window.ContextBuilder.buildFullContext();
    return window.ContextBuilder.estimateTokens(context);
  });
}

/**
 * Apply AI changes and verify
 */
export async function applyAIChanges(page, changes) {
  const result = await page.evaluate((c) => {
    try {
      const validation = window.UpdateValidator.validate(c);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      const applied = window.MapUpdater.applyChanges(c);
      return { success: true, applied: applied.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, changes);

  return result;
}

/**
 * Save map and verify
 */
export async function saveMapToStorage(page) {
  await page.evaluate(async () => {
    const mapData = prepareMapData();
    await saveToStorage(mapData);
  });

  // Verify save occurred
  const saved = await page.evaluate(async () => {
    const blob = await window.ldb.get('lastMap');
    return !!blob;
  });

  return saved;
}

/**
 * Load map from storage
 */
export async function loadMapFromStorage(page) {
  await page.evaluate(async () => {
    const blob = await window.ldb.get('lastMap');
    const text = await blob.text();
    await loadMapOnDrag(text);
  });

  await waitForRender(page);
}

/**
 * Get SVG element count (for visual tests)
 */
export async function getSVGElementCounts(page) {
  return page.evaluate(() => {
    return {
      statePaths: document.querySelectorAll('#statesBody path').length,
      burgIcons: document.querySelectorAll('#burgIcons circle').length,
      labels: document.querySelectorAll('#labels text').length,
      markers: document.querySelectorAll('#markers use').length,
      rivers: document.querySelectorAll('#rivers path').length,
      routes: document.querySelectorAll('#roads path, #trails path').length
    };
  });
}

/**
 * Trigger a UI action (click, input, etc.)
 */
export async function triggerAction(page, selector, action = 'click', value = null) {
  if (action === 'click') {
    await page.click(selector);
  } else if (action === 'fill' && value !== null) {
    await page.fill(selector, value);
  } else if (action === 'select' && value !== null) {
    await page.selectOption(selector, value);
  }

  // Wait a bit for any async updates
  await page.waitForTimeout(100);
}

/**
 * Get current seed
 */
export async function getCurrentSeed(page) {
  return page.evaluate(() => window.seed);
}

/**
 * Check if layer is visible
 */
export async function isLayerVisible(page, layerName) {
  return page.evaluate((name) => {
    return window.layerIsOn(name);
  }, layerName);
}

/**
 * Toggle layer visibility
 */
export async function toggleLayer(page, layerName) {
  await page.evaluate((name) => {
    window[name]();
  }, layerName);
}

/**
 * Get map generation time
 */
export async function measureGenerationTime(page, seed) {
  return page.evaluate((s) => {
    const start = performance.now();
    return generate({ seed: s }).then(() => {
      return performance.now() - start;
    });
  }, seed);
}

/**
 * Create a snapshot of current map state (for comparison)
 */
export async function createMapSnapshot(page) {
  return page.evaluate(() => {
    return {
      seed: window.seed,
      states: window.pack.states
        .filter(s => s.i && !s.removed)
        .map(s => ({ i: s.i, name: s.name, cells: s.cells, burgs: s.burgs })),
      burgs: window.pack.burgs
        .filter(b => b.i && !b.removed)
        .map(b => ({ i: b.i, name: b.name, state: b.state, population: b.population })),
      cultures: window.pack.cultures
        .filter(c => c.i && !c.removed)
        .map(c => ({ i: c.i, name: c.name, type: c.type })),
      religions: window.pack.religions
        .filter(r => r.i && !r.removed)
        .map(r => ({ i: r.i, name: r.name, type: r.type }))
    };
  });
}

/**
 * Compare two snapshots
 */
export function compareSnapshots(snapshot1, snapshot2) {
  const diffs = [];

  // Compare state counts
  if (snapshot1.states.length !== snapshot2.states.length) {
    diffs.push(`State count: ${snapshot1.states.length} vs ${snapshot2.states.length}`);
  }

  // Compare first state name
  if (snapshot1.states[0]?.name !== snapshot2.states[0]?.name) {
    diffs.push(`First state: ${snapshot1.states[0]?.name} vs ${snapshot2.states[0]?.name}`);
  }

  // Compare burg counts
  if (snapshot1.burgs.length !== snapshot2.burgs.length) {
    diffs.push(`Burg count: ${snapshot1.burgs.length} vs ${snapshot2.burgs.length}`);
  }

  return { identical: diffs.length === 0, diffs };
}

/**
 * Wait for async operations to complete
 */
export async function waitForIdle(page, timeout = 1000) {
  await page.waitForTimeout(timeout);
  await page.waitForLoadState('networkidle');
}
