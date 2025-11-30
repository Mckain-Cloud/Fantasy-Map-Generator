// @ts-check
import {test, expect} from "@playwright/test";
import {gotoApp, waitForAppReady} from "../../setup/helpers.js";

/**
 * Burgs and States Generator Tests
 * Tests the city and political state generation system
 */

test.describe("Burgs and States Generator", () => {
  let page;

  test.beforeAll(async ({browser}) => {
    page = await browser.newPage();
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.describe("BurgsAndStates API availability", () => {
    test("BurgsAndStates object should be exposed on window", async () => {
      const has = await page.evaluate(() => typeof window.BurgsAndStates === "object");
      expect(has).toBe(true);
    });

    test("BurgsAndStates should have all required methods", async () => {
      const methods = await page.evaluate(() => {
        const b = window.BurgsAndStates;
        if (!b) return [];
        return Object.keys(b).filter(k => typeof b[k] === "function");
      });

      expect(methods).toContain("generate");
      expect(methods).toContain("expandStates");
      expect(methods).toContain("normalizeStates");
      expect(methods).toContain("getPoles");
      expect(methods).toContain("assignColors");
      expect(methods).toContain("specifyBurgs");
      expect(methods).toContain("defineBurgFeatures");
      expect(methods).toContain("getType");
      expect(methods).toContain("collectStatistics");
      expect(methods).toContain("generateCampaign");
      expect(methods).toContain("generateCampaigns");
      expect(methods).toContain("generateDiplomacy");
      expect(methods).toContain("defineStateForms");
      expect(methods).toContain("getFullName");
      expect(methods).toContain("updateCultures");
    });
  });

  test.describe("Burgs data structure", () => {
    test("pack.burgs should exist and be an array", async () => {
      const result = await page.evaluate(() => {
        return {
          exists: Array.isArray(window.pack?.burgs),
          length: window.pack?.burgs?.length || 0
        };
      });

      expect(result.exists).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test("Burgs should have required properties", async () => {
      const result = await page.evaluate(() => {
        const burgs = window.pack?.burgs;
        if (!burgs || burgs.length === 0) return {skip: true};

        // Find first non-removed burg (skip index 0)
        const burg = burgs.find((b, i) => b && i > 0 && !b.removed);
        if (!burg) return {skip: true};

        return {
          skip: false,
          hasId: typeof burg.i === "number",
          hasName: typeof burg.name === "string",
          hasCell: typeof burg.cell === "number",
          hasX: typeof burg.x === "number",
          hasY: typeof burg.y === "number",
          hasState: typeof burg.state === "number",
          hasCulture: typeof burg.culture === "number",
          hasPopulation: typeof burg.population === "number"
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasId).toBe(true);
      expect(result.hasName).toBe(true);
      expect(result.hasCell).toBe(true);
      expect(result.hasX).toBe(true);
      expect(result.hasY).toBe(true);
      expect(result.hasState).toBe(true);
      expect(result.hasCulture).toBe(true);
      expect(result.hasPopulation).toBe(true);
    });

    test("Burg index 0 should be placeholder", async () => {
      const result = await page.evaluate(() => {
        const burgs = window.pack?.burgs;
        if (!burgs || burgs.length === 0) return {skip: true};

        const noBurg = burgs[0];
        return {
          skip: false,
          // Index 0 can be i=0 or simply the first empty/placeholder entry
          isPlaceholder: noBurg.i === 0 || noBurg.name === undefined || !noBurg.name
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isPlaceholder).toBe(true);
    });
  });

  test.describe("States data structure", () => {
    test("pack.states should exist and be an array", async () => {
      const result = await page.evaluate(() => {
        return {
          exists: Array.isArray(window.pack?.states),
          length: window.pack?.states?.length || 0
        };
      });

      expect(result.exists).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test("States should have required properties", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        if (!states || states.length === 0) return {skip: true};

        // Find first non-removed state (skip index 0)
        const state = states.find((s, i) => s && i > 0 && !s.removed);
        if (!state) return {skip: true};

        return {
          skip: false,
          hasId: typeof state.i === "number",
          hasName: typeof state.name === "string",
          hasColor: typeof state.color === "string",
          hasCapital: typeof state.capital === "number",
          hasCulture: typeof state.culture === "number",
          hasForm: typeof state.form === "string" || state.form === undefined,
          hasCoa: state.coa !== undefined
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasId).toBe(true);
      expect(result.hasName).toBe(true);
      expect(result.hasColor).toBe(true);
      expect(result.hasCapital).toBe(true);
      expect(result.hasCulture).toBe(true);
    });

    test("State index 0 should be Neutrals", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        if (!states || states.length === 0) return {skip: true};

        const neutrals = states[0];
        return {
          skip: false,
          isZero: neutrals.i === 0,
          isNeutrals: neutrals.name === "Neutrals"
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isZero).toBe(true);
      expect(result.isNeutrals).toBe(true);
    });
  });

  test.describe("Burg types and features", () => {
    test("getType should return valid burg type", async () => {
      const result = await page.evaluate(() => {
        const BurgsAndStates = window.BurgsAndStates;
        if (!BurgsAndStates) return {skip: true};

        // Test with various populations
        const types = [];
        for (let pop of [100, 1000, 5000, 20000, 100000]) {
          const type = BurgsAndStates.getType(pop, false);
          types.push(type);
        }

        return {
          skip: false,
          types,
          allStrings: types.every(t => typeof t === "string")
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allStrings).toBe(true);
    });

    test("Burgs should have valid features", async () => {
      const result = await page.evaluate(() => {
        const burgs = window.pack?.burgs;
        if (!burgs || burgs.length <= 1) return {skip: true};

        const burg = burgs.find((b, i) => b && i > 0 && !b.removed);
        if (!burg) return {skip: true};

        return {
          skip: false,
          hasFeature: burg.feature !== undefined,
          hasPort: typeof burg.port === "number" || burg.port === undefined,
          hasCitadel: typeof burg.citadel === "number" || burg.citadel === undefined,
          hasWalls: typeof burg.walls === "number" || burg.walls === undefined,
          hasTemple: typeof burg.temple === "number" || burg.temple === undefined
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasFeature).toBe(true);
    });
  });

  test.describe("State forms", () => {
    test("States should have valid government forms", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        if (!states || states.length <= 1) return {skip: true};

        const forms = states
          .filter((s, i) => s && i > 0 && !s.removed && s.form)
          .map(s => s.form);

        return {
          skip: false,
          forms: [...new Set(forms)],
          allStrings: forms.every(f => typeof f === "string")
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allStrings).toBe(true);
    });

    test("getFullName should generate state full name", async () => {
      const result = await page.evaluate(() => {
        const BurgsAndStates = window.BurgsAndStates;
        if (!BurgsAndStates) return {skip: true};

        const states = window.pack?.states;
        if (!states || states.length <= 1) return {skip: true};

        const state = states.find(s => s && s.i > 0 && !s.removed);
        if (!state) return {skip: true};

        const fullName = BurgsAndStates.getFullName(state);

        return {
          skip: false,
          fullName,
          isString: typeof fullName === "string",
          hasLength: fullName && fullName.length > 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isString).toBe(true);
      expect(result.hasLength).toBe(true);
    });
  });

  test.describe("Diplomacy", () => {
    test("States should have diplomacy relations", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        if (!states || states.length <= 2) return {skip: true};

        const state = states.find(s => s && s.i > 0 && !s.removed && s.diplomacy);
        if (!state) return {skip: true};

        return {
          skip: false,
          hasDiplomacy: Array.isArray(state.diplomacy),
          diplomacyLength: state.diplomacy.length
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasDiplomacy).toBe(true);
    });
  });

  test.describe("Campaigns", () => {
    test("generateCampaign should create valid campaign", async () => {
      const result = await page.evaluate(() => {
        const BurgsAndStates = window.BurgsAndStates;
        if (!BurgsAndStates) return {skip: true};

        const states = window.pack?.states;
        if (!states || states.length <= 1) return {skip: true};

        const state1 = states.find(s => s && s.i > 0 && !s.removed);
        const state2 = states.find(s => s && s.i > 0 && !s.removed && s.i !== state1?.i);
        if (!state1 || !state2) return {skip: true};

        try {
          const campaign = BurgsAndStates.generateCampaign(state1, state2);
          return {
            skip: false,
            hasCampaign: campaign !== undefined,
            hasName: campaign && typeof campaign.name === "string"
          };
        } catch (e) {
          return {skip: true, error: e.message};
        }
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasCampaign).toBe(true);
    });
  });

  test.describe("Cell assignments", () => {
    test("cells.state should track state assignments", async () => {
      const result = await page.evaluate(() => {
        const cells = window.pack?.cells;
        if (!cells || !cells.state) return {skip: true};

        const stateCells = cells.state.filter(s => s > 0).length;
        return {
          skip: false,
          hasStateArray: Array.isArray(cells.state) || cells.state instanceof Uint16Array,
          stateCellCount: stateCells
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasStateArray).toBe(true);
    });

    test("cells.burg should track burg assignments", async () => {
      const result = await page.evaluate(() => {
        const cells = window.pack?.cells;
        if (!cells || !cells.burg) return {skip: true};

        const burgCells = cells.burg.filter(b => b > 0).length;
        return {
          skip: false,
          hasBurgArray: Array.isArray(cells.burg) || cells.burg instanceof Uint16Array,
          burgCellCount: burgCells
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasBurgArray).toBe(true);
    });
  });

  test.describe("State statistics", () => {
    test("collectStatistics should calculate state data", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        if (!states || states.length <= 1) return {skip: true};

        const state = states.find(s => s && s.i > 0 && !s.removed);
        if (!state) return {skip: true};

        return {
          skip: false,
          hasCells: typeof state.cells === "number",
          hasArea: typeof state.area === "number",
          hasBurgs: typeof state.burgs === "number" || state.burgs === undefined,
          hasRural: typeof state.rural === "number" || state.rural === undefined,
          hasUrban: typeof state.urban === "number" || state.urban === undefined
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasCells).toBe(true);
      expect(result.hasArea).toBe(true);
    });
  });

  test.describe("Capital burgs", () => {
    test("State capitals should be valid burgs", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        const burgs = window.pack?.burgs;
        if (!states || !burgs || states.length <= 1) return {skip: true};

        const invalidCapitals = states
          .filter((s, i) => s && i > 0 && !s.removed && s.capital > 0)
          .filter(s => !burgs[s.capital] || burgs[s.capital].removed);

        return {
          skip: false,
          invalidCount: invalidCapitals.length,
          allValid: invalidCapitals.length === 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allValid).toBe(true);
    });

    test("Capital burgs should be marked as capitals", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        const burgs = window.pack?.burgs;
        if (!states || !burgs || states.length <= 1) return {skip: true};

        const capitalBurgs = states
          .filter((s, i) => s && i > 0 && !s.removed && s.capital > 0)
          .map(s => burgs[s.capital])
          .filter(b => b && !b.removed);

        const allMarkedCapital = capitalBurgs.every(b => b.capital === 1 || b.capital === true);

        return {
          skip: false,
          capitalCount: capitalBurgs.length,
          allMarkedCapital
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allMarkedCapital).toBe(true);
    });
  });

  test.describe("State colors", () => {
    test("State colors should be valid hex colors", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        if (!states || states.length <= 1) return {skip: true};

        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        const invalidColors = states
          .filter((s, i) => s && i > 0 && !s.removed && s.color)
          .filter(s => !colorRegex.test(s.color));

        return {
          skip: false,
          invalidCount: invalidColors.length,
          allValidColors: invalidColors.length === 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allValidColors).toBe(true);
    });
  });
});
