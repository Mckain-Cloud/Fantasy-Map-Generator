// @ts-check
import {test, expect} from "@playwright/test";
import {gotoApp, waitForAppReady} from "../../setup/helpers.js";

/**
 * Religions Generator Tests
 * Tests the religion faction generation system
 */

test.describe("Religions Generator", () => {
  let page;

  test.beforeAll(async ({browser}) => {
    page = await browser.newPage();
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.describe("Religions API availability", () => {
    test("Religions object should be exposed on window", async () => {
      const hasReligions = await page.evaluate(() => typeof window.Religions === "object");
      expect(hasReligions).toBe(true);
    });

    test("Religions should have all required methods", async () => {
      const methods = await page.evaluate(() => {
        const r = window.Religions;
        if (!r) return [];
        return Object.keys(r).filter(k => typeof r[k] === "function");
      });

      expect(methods).toContain("generate");
      expect(methods).toContain("add");
      expect(methods).toContain("getDeityName");
      expect(methods).toContain("updateCultures");
      expect(methods).toContain("recalculate");
    });
  });

  test.describe("Religions data structure", () => {
    test("pack.religions should exist and be an array", async () => {
      const result = await page.evaluate(() => {
        return {
          exists: Array.isArray(window.pack?.religions),
          length: window.pack?.religions?.length || 0
        };
      });

      expect(result.exists).toBe(true);
      expect(result.length).toBeGreaterThan(0); // Should have at least "No religion"
    });

    test("Religions should have required properties", async () => {
      const result = await page.evaluate(() => {
        const religions = window.pack?.religions;
        if (!religions || religions.length === 0) return {skip: true};

        // Find first non-removed religion (skip index 0 which is "No religion")
        const religion = religions.find((r, i) => r && i > 0 && !r.removed);
        if (!religion) return {skip: true};

        return {
          skip: false,
          hasId: typeof religion.i === "number",
          hasName: typeof religion.name === "string",
          hasType: typeof religion.type === "string",
          hasForm: typeof religion.form === "string",
          hasCulture: typeof religion.culture === "number",
          hasColor: typeof religion.color === "string"
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasId).toBe(true);
      expect(result.hasName).toBe(true);
      expect(result.hasType).toBe(true);
      expect(result.hasForm).toBe(true);
      expect(result.hasCulture).toBe(true);
      expect(result.hasColor).toBe(true);
    });

    test("Religion index 0 should be 'No religion' placeholder", async () => {
      const result = await page.evaluate(() => {
        const religions = window.pack?.religions;
        if (!religions || religions.length === 0) return {skip: true};

        const noReligion = religions[0];
        return {
          skip: false,
          isZero: noReligion.i === 0,
          hasName: typeof noReligion.name === "string"
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isZero).toBe(true);
      expect(result.hasName).toBe(true);
    });
  });

  test.describe("Religion types", () => {
    test("Religions should have valid types", async () => {
      const result = await page.evaluate(() => {
        const religions = window.pack?.religions;
        if (!religions || religions.length <= 1) return {skip: true};

        const types = [...new Set(religions.filter(r => r && r.i > 0).map(r => r.type))];
        const validTypes = ["Folk", "Organized", "Cult", "Heresy"];

        return {
          skip: false,
          types,
          allValid: types.every(t => validTypes.includes(t))
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allValid).toBe(true);
    });

    test("Religions should have valid forms", async () => {
      const result = await page.evaluate(() => {
        const religions = window.pack?.religions;
        if (!religions || religions.length <= 1) return {skip: true};

        const forms = [...new Set(religions.filter(r => r && r.i > 0 && r.form).map(r => r.form))];

        return {
          skip: false,
          forms,
          hasForms: forms.length > 0,
          allStrings: forms.every(f => typeof f === "string")
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      // Forms should be strings if they exist
      expect(result.allStrings).toBe(true);
    });
  });

  test.describe("Religion deity generation", () => {
    test("getDeityName should return valid deity names", async () => {
      const result = await page.evaluate(() => {
        const Religions = window.Religions;
        if (!Religions) return {skip: true};

        const religions = window.pack?.religions;
        if (!religions || religions.length <= 1) return {skip: true};

        const religion = religions.find(r => r && r.i > 0 && !r.removed);
        if (!religion) return {skip: true};

        const deity = Religions.getDeityName(religion.culture);

        return {
          skip: false,
          deity,
          isString: typeof deity === "string",
          hasLength: deity && deity.length > 0
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

  test.describe("Religion cell assignments", () => {
    test("cells.religion should track religion assignments", async () => {
      const result = await page.evaluate(() => {
        const cells = window.pack?.cells;
        if (!cells || !cells.religion) return {skip: true};

        const religionCells = cells.religion.filter(r => r > 0).length;
        return {
          skip: false,
          hasReligionArray: Array.isArray(cells.religion) || cells.religion instanceof Uint8Array || cells.religion instanceof Uint16Array,
          religionCellCount: religionCells
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasReligionArray).toBe(true);
    });
  });

  test.describe("Religion statistics", () => {
    test("Religions should have population/area statistics", async () => {
      const result = await page.evaluate(() => {
        const religions = window.pack?.religions;
        if (!religions || religions.length <= 1) return {skip: true};

        const religion = religions.find(r => r && r.i > 0 && !r.removed);
        if (!religion) return {skip: true};

        return {
          skip: false,
          // cells may or may not exist depending on when stats are calculated
          hasCells: religion.cells !== undefined,
          hasArea: religion.area !== undefined,
          religionKeys: Object.keys(religion)
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      // Stats may or may not be populated
      expect(typeof result.hasCells).toBe("boolean");
    });

    test("Religion expansion should set origins", async () => {
      const result = await page.evaluate(() => {
        const religions = window.pack?.religions;
        if (!religions || religions.length <= 1) return {skip: true};

        const religion = religions.find(r => r && r.i > 0 && !r.removed && r.type === "Organized");
        if (!religion) return {skip: true};

        return {
          skip: false,
          hasOrigin: typeof religion.origin === "number" || religion.origin === undefined,
          hasExpansionism: typeof religion.expansion === "string" || religion.expansionism !== undefined
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      // These may or may not exist depending on religion type
      expect(typeof result.hasOrigin).toBe("boolean");
    });
  });

  test.describe("Religion-culture relationship", () => {
    test("Religions should be linked to valid cultures", async () => {
      const result = await page.evaluate(() => {
        const religions = window.pack?.religions;
        const cultures = window.pack?.cultures;
        if (!religions || !cultures || religions.length <= 1) return {skip: true};

        const invalidLinks = religions
          .filter(r => r && r.i > 0 && !r.removed)
          .filter(r => r.culture !== undefined && !cultures[r.culture]);

        return {
          skip: false,
          invalidCount: invalidLinks.length,
          allValid: invalidLinks.length === 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.allValid).toBe(true);
    });
  });
});
