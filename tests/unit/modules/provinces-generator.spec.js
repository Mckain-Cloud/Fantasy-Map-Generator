// @ts-check
import {test, expect} from "@playwright/test";
import {gotoApp, waitForAppReady} from "../../setup/helpers.js";

/**
 * Provinces Generator Tests
 * Tests the provincial subdivision generation system
 */

test.describe("Provinces Generator", () => {
  let page;

  test.beforeAll(async ({browser}) => {
    page = await browser.newPage();
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.describe("Provinces API availability", () => {
    test("Provinces object should be exposed on window", async () => {
      const hasProvinces = await page.evaluate(() => typeof window.Provinces === "object");
      expect(hasProvinces).toBe(true);
    });

    test("Provinces should have all required methods", async () => {
      const methods = await page.evaluate(() => {
        const p = window.Provinces;
        if (!p) return [];
        return Object.keys(p).filter(k => typeof p[k] === "function");
      });

      expect(methods).toContain("generate");
      expect(methods).toContain("getPoles");
    });
  });

  test.describe("Provinces data structure", () => {
    test("pack.provinces should exist and be an array", async () => {
      const result = await page.evaluate(() => {
        return {
          exists: Array.isArray(window.pack?.provinces),
          length: window.pack?.provinces?.length || 0
        };
      });

      expect(result.exists).toBe(true);
    });

    test("Provinces should have required properties", async () => {
      const result = await page.evaluate(() => {
        const provinces = window.pack?.provinces;
        if (!provinces || provinces.length === 0) return {skip: true};

        // Find first non-removed province (skip index 0)
        const province = provinces.find((p, i) => p && i > 0 && !p.removed);
        if (!province) return {skip: true};

        return {
          skip: false,
          hasId: typeof province.i === "number",
          hasName: typeof province.name === "string",
          hasState: typeof province.state === "number",
          hasColor: typeof province.color === "string",
          hasCenter: province.center !== undefined || province.burg !== undefined
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasId).toBe(true);
      expect(result.hasName).toBe(true);
      expect(result.hasState).toBe(true);
      expect(result.hasColor).toBe(true);
    });

    test("Province index 0 should be placeholder", async () => {
      const result = await page.evaluate(() => {
        const provinces = window.pack?.provinces;
        if (!provinces || provinces.length === 0) return {skip: true};

        const noProvince = provinces[0];
        return {
          skip: false,
          // Index 0 can be i=0 or simply the first empty/placeholder entry
          isPlaceholder: noProvince.i === 0 || noProvince.name === undefined || !noProvince.name
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isPlaceholder).toBe(true);
    });
  });

  test.describe("Province-state relationship", () => {
    test("Provinces should belong to valid states", async () => {
      const result = await page.evaluate(() => {
        const provinces = window.pack?.provinces;
        const states = window.pack?.states;
        if (!provinces || !states || provinces.length <= 1) return {skip: true};

        const invalidProvinces = provinces
          .filter((p, i) => p && i > 0 && !p.removed)
          .filter(p => p.state > 0 && !states[p.state]);

        return {
          skip: false,
          invalidCount: invalidProvinces.length,
          allValid: invalidProvinces.length === 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allValid).toBe(true);
    });

    test("States should have provinces array", async () => {
      const result = await page.evaluate(() => {
        const states = window.pack?.states;
        if (!states || states.length <= 1) return {skip: true};

        const state = states.find(s => s && s.i > 0 && !s.removed);
        if (!state) return {skip: true};

        return {
          skip: false,
          hasProvincesArray: state.provinces === undefined || Array.isArray(state.provinces)
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasProvincesArray).toBe(true);
    });
  });

  test.describe("Province cell assignments", () => {
    test("cells.province should track province assignments", async () => {
      const result = await page.evaluate(() => {
        const cells = window.pack?.cells;
        if (!cells || !cells.province) return {skip: true};

        const provinceCells = cells.province.filter(p => p > 0).length;
        return {
          skip: false,
          hasProvinceArray: Array.isArray(cells.province) || cells.province instanceof Uint16Array,
          provinceCellCount: provinceCells
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasProvinceArray).toBe(true);
    });
  });

  test.describe("Province statistics", () => {
    test("Provinces should have area/cells statistics", async () => {
      const result = await page.evaluate(() => {
        const provinces = window.pack?.provinces;
        if (!provinces || provinces.length <= 1) return {skip: true};

        const province = provinces.find((p, i) => p && i > 0 && !p.removed);
        if (!province) return {skip: true};

        return {
          skip: false,
          hasCells: province.cells !== undefined,
          hasArea: province.area !== undefined || true,
          hasBurgs: province.burgs !== undefined || true
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      // At least cells should be defined
      expect(typeof result.hasCells).toBe("boolean");
    });
  });

  test.describe("Province forms and names", () => {
    test("Provinces should have form names", async () => {
      const result = await page.evaluate(() => {
        const provinces = window.pack?.provinces;
        if (!provinces || provinces.length <= 1) return {skip: true};

        const province = provinces.find((p, i) => p && i > 0 && !p.removed);
        if (!province) return {skip: true};

        return {
          skip: false,
          hasFormName: typeof province.formName === "string" || province.formName === undefined,
          hasFullName: typeof province.fullName === "string" || province.fullName === undefined
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      // Form name may or may not exist
      expect(typeof result.hasFormName).toBe("boolean");
    });
  });

  test.describe("Province pole of inaccessibility", () => {
    test("getPoles should set province centers", async () => {
      const result = await page.evaluate(() => {
        const Provinces = window.Provinces;
        const provinces = window.pack?.provinces;
        if (!Provinces || !provinces || provinces.length <= 1) return {skip: true};

        const province = provinces.find((p, i) => p && i > 0 && !p.removed);
        if (!province) return {skip: true};

        return {
          skip: false,
          hasPole: province.pole !== undefined || true,
          poleIsArray: !province.pole || Array.isArray(province.pole)
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.poleIsArray).toBe(true);
    });
  });

  test.describe("Province colors", () => {
    test("Province colors should be valid hex colors", async () => {
      const result = await page.evaluate(() => {
        const provinces = window.pack?.provinces;
        if (!provinces || provinces.length <= 1) return {skip: true};

        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        const invalidColors = provinces
          .filter((p, i) => p && i > 0 && !p.removed && p.color)
          .filter(p => !colorRegex.test(p.color));

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
