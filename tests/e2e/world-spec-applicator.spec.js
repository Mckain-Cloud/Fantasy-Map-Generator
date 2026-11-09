import {test, expect} from "@playwright/test";
import {useSharedAppPage, loadWorldSpecApplicator} from "../setup/helpers.js";

/**
 * World Spec Applicator browser tests.
 *
 * One page is shared by the whole file (see useSharedAppPage): the app loads
 * once with a tiny map, then every test runs against the already-loaded page.
 * Only the "full generation" tests regenerate the map.
 */

const TEST_WORLD_SPEC = {
  worldAnalysis: {summary: "Test world", setting: "Fantasy test realm", climate: "Temperate", themes: ["testing"]},
  terrain: {
    base: "ocean",
    template: "continents",
    features: [
      {id: "mainland", type: "landmass", points: [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85]]},
      {id: "spine", type: "mountains", points: [[0.6, 0.2], [0.75, 0.4]], height: 85, width: 0.05},
      {id: "tarn", type: "lake", points: [[0.4, 0.4]], radius: 0.04}
    ],
    heightmapCommands: [],
    climateSettings: {temperatureEquator: 27, temperatureNorthPole: -20, precipitation: "moderate"}
  },
  locations: [
    {id: "capital_city", name: "Testorium", type: "city", kind: "settlement", terrain: "plain", x: 0.5, y: 0.5, owner: "test_state", isCapital: true},
    {id: "port_town", name: "Harborville", type: "port", kind: "settlement", terrain: "coast", x: 0.17, y: 0.6, owner: "test_state", isCapital: false},
    {id: "mountain_village", name: "Peakside", type: "village", kind: "settlement", terrain: "mountain", x: 0.68, y: 0.3, owner: "test_state", isCapital: false},
    {id: "old_ruins", name: "Fallen Keep", type: "ruins", kind: "landmark", x: 0.3, y: 0.7, owner: "none", isCapital: false, description: "Ruins."}
  ],
  states: [
    {id: "test_state", name: "Testonia", form: "Kingdom", capital: "capital_city", culture: "test_culture", expansionism: 2, color: "#4488cc", locations: ["capital_city", "port_town", "mountain_village"]}
  ],
  cultures: [{id: "test_culture", name: "Testfolk", type: "Generic", base: "english"}],
  religions: [{id: "test_religion", name: "Testism", type: "Organized", form: "Monotheism", culture: "test_culture"}],
  zones: []
};

const LEGACY_SPEC = {
  ...TEST_WORLD_SPEC,
  terrain: {
    template: "continents",
    heightmapCommands: ["Hill 1 80-85 50-60 40-60", "Hill 5 20-35 20-80 20-80", "Range 1 40-60 10-20 30-70", "Smooth 3", "Mask 4"],
    climateSettings: TEST_WORLD_SPEC.terrain.climateSettings
  }
};

test.describe("World Spec Applicator", () => {
  const shared = useSharedAppPage(test);

  test.beforeAll(async () => {
    await loadWorldSpecApplicator(shared.page);
  });

  test.describe("availability", () => {
    test("exposes the applicator API on window", async () => {
      const api = await shared.page.evaluate(() => Object.keys(window.WorldSpecApplicator).sort());
      expect(api).toEqual(
        expect.arrayContaining(["generateFromSpec", "validateSpec", "placeNear", "findNearestCell", "cleanupWorldSpec", "getErrors", "getWarnings"])
      );
    });

    test("HeightmapGenerator supports custom providers", async () => {
      const ok = await shared.page.evaluate(() => typeof window.HeightmapGenerator?.registerCustom === "function");
      expect(ok).toBe(true);
    });
  });

  test.describe("validation", () => {
    test("accepts a valid features spec", async () => {
      const result = await shared.page.evaluate(spec => window.WorldSpecApplicator.validateSpec(spec), TEST_WORLD_SPEC);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("accepts a legacy spec but warns about conversion", async () => {
      const result = await shared.page.evaluate(spec => window.WorldSpecApplicator.validateSpec(spec), LEGACY_SPEC);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes("legacy heightmap commands"))).toBe(true);
    });

    test("rejects spec missing required sections", async () => {
      for (const key of ["terrain", "locations", "states"]) {
        const result = await shared.page.evaluate(spec => window.WorldSpecApplicator.validateSpec(spec), {...TEST_WORLD_SPEC, [key]: undefined});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Missing '${key}' property`);
      }
    });

    test("rejects unknown terrain feature types and out-of-range points", async () => {
      const bad = {
        ...TEST_WORLD_SPEC,
        terrain: {...TEST_WORLD_SPEC.terrain, features: [{id: "x", type: "doom", points: [[1.5, 0.2]]}]}
      };
      const result = await shared.page.evaluate(spec => window.WorldSpecApplicator.validateSpec(spec), bad);
      expect(result.valid).toBe(false);
      expect(result.errors.join(" ")).toMatch(/unknown type/);
      expect(result.errors.join(" ")).toMatch(/outside the 0-1 range/);
    });

    test("warns about empty terrain", async () => {
      const result = await shared.page.evaluate(
        spec => window.WorldSpecApplicator.validateSpec(spec),
        {...TEST_WORLD_SPEC, terrain: {template: "continents", features: [], heightmapCommands: []}}
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes("No terrain features"))).toBe(true);
    });
  });

  test.describe("coordinate utilities", () => {
    test("normalizedToMapCoords maps 0-1 onto the graph size", async () => {
      const r = await shared.page.evaluate(() => {
        const A = window.WorldSpecApplicator;
        return {half: A.normalizedToMapCoords(0.5, 0.5), one: A.normalizedToMapCoords(1, 1), w: window.graphWidth, h: window.graphHeight};
      });
      expect(r.half).toEqual({x: r.w * 0.5, y: r.h * 0.5});
      expect(r.one).toEqual({x: r.w, y: r.h});
    });

    test("findNearestCell returns a valid cell", async () => {
      const cell = await shared.page.evaluate(() => window.WorldSpecApplicator.findNearestCell(0.5, 0.5));
      expect(cell).toBeGreaterThanOrEqual(0);
    });

    test("placeNear returns the exact cell when it qualifies", async () => {
      const r = await shared.page.evaluate(() => {
        const A = window.WorldSpecApplicator;
        // find some land cell and ask for its own coordinates
        const cells = window.pack.cells;
        const land = cells.i.find(i => cells.h[i] >= 20 && !cells.burg[i]);
        const [x, y] = cells.p[land];
        const placed = A.placeNear(x / window.graphWidth, y / window.graphHeight, {requireLand: true, requireFree: true});
        return {land, placed};
      });
      expect(r.placed.cell).toBe(r.land);
      expect(r.placed.exact).toBe(true);
      expect(r.placed.displacement).toBeLessThan(1);
    });

    test("placeNear moves to the nearest qualifying cell, not the best one", async () => {
      const r = await shared.page.evaluate(() => {
        const A = window.WorldSpecApplicator;
        const cells = window.pack.cells;
        // a water cell with a land neighbour
        const water = cells.i.find(i => cells.h[i] < 20 && cells.c[i].some(n => cells.h[n] >= 20));
        const [x, y] = cells.p[water];
        const placed = A.placeNear(x / window.graphWidth, y / window.graphHeight, {requireLand: true, requireFree: false});
        const spacing = Math.sqrt((window.graphWidth * window.graphHeight) / cells.i.length);
        return {isLand: cells.h[placed.cell] >= 20, cellsMoved: placed.displacement / spacing, exact: placed.exact};
      });
      expect(r.isLand).toBe(true);
      expect(r.exact).toBe(false);
      expect(r.cellsMoved).toBeLessThan(3);
    });
  });

  test.describe("location classification", () => {
    test("routes settlements to burgs and landmarks to markers", async () => {
      const r = await shared.page.evaluate(() => {
        const f = window.WorldSpecApplicator.isSettlementLocation;
        return {
          city: f({type: "city"}),
          fishingVillage: f({type: "fishing village"}),
          fortress: f({type: "fortress"}),
          ruins: f({type: "ruins"}),
          forest: f({type: "forest"}),
          lake: f({type: "lake"}),
          landmark: f({type: "landmark"}),
          explicitLandmark: f({type: "city", kind: "landmark"}),
          explicitSettlement: f({type: "ruins", kind: "settlement"}),
          unknown: f({type: "weirdplace"})
        };
      });
      expect(r).toEqual({
        city: true,
        fishingVillage: true,
        fortress: true,
        ruins: false,
        forest: false,
        lake: false,
        landmark: false,
        explicitLandmark: false,
        explicitSettlement: true,
        unknown: true
      });
    });
  });

  test.describe("seed", () => {
    test("is stable for the same spec and honours an explicit seed", async () => {
      const r = await shared.page.evaluate(spec => {
        const A = window.WorldSpecApplicator;
        return {a: A.seedFromSpec(spec), b: A.seedFromSpec(JSON.parse(JSON.stringify(spec))), c: A.seedFromSpec({...spec, seed: "fixed"})};
      }, TEST_WORLD_SPEC);
      expect(r.a).toBe(r.b);
      expect(r.c).toBe("fixed");
    });
  });

  test.describe("full generation", () => {
    test("generates from a features spec and restores the template option", async () => {
      test.setTimeout(120000);
      const r = await shared.page.evaluate(async spec => {
        const A = window.WorldSpecApplicator;
        const before = document.getElementById("templateInput").value;
        const result = await A.generateFromSpec(A.cleanupWorldSpec(JSON.parse(JSON.stringify(spec))));
        // pack drops deep-ocean cells, so measure land share on the full grid
        const landCells = Array.from(window.grid.cells.h).filter(h => h >= 20).length;
        return {
          result,
          landRatio: landCells / window.grid.cells.h.length,
          templateAfter: document.getElementById("templateInput").value,
          storedTemplate: localStorage.getItem("template"),
          customStillRegistered: window.HeightmapGenerator.hasCustom("world-spec-features"),
          before
        };
      }, TEST_WORLD_SPEC);

      expect(r.result.success).toBe(true);
      expect(r.result.terrainMode).toBe("features");
      expect(r.result.errors).toHaveLength(0);
      expect(r.landRatio).toBeGreaterThan(0.3);
      expect(r.landRatio).toBeLessThan(0.7);
      expect(r.result.stats).toMatchObject({cultures: 1, states: 1, burgs: 3, specMarkers: 1, religions: 1});
      expect(r.templateAfter).not.toBe("world-spec-features");
      expect(r.storedTemplate).not.toBe("world-spec-features");
      expect(r.customStillRegistered).toBe(false);
    });

    test("generates from a legacy DSL spec by converting it", async () => {
      test.setTimeout(120000);
      const r = await shared.page.evaluate(async spec => {
        const A = window.WorldSpecApplicator;
        const result = await A.generateFromSpec(A.cleanupWorldSpec(JSON.parse(JSON.stringify(spec))));
        return {success: result.success, mode: result.terrainMode, land: Array.from(window.pack.cells.h).filter(h => h >= 20).length};
      }, LEGACY_SPEC);
      expect(r.success).toBe(true);
      expect(r.mode).toBe("converted-dsl");
      expect(r.land).toBeGreaterThan(0);
    });

    test("getErrors/clearErrors work", async () => {
      const r = await shared.page.evaluate(() => {
        const A = window.WorldSpecApplicator;
        A.clearErrors();
        return {errors: A.getErrors(), warnings: A.getWarnings()};
      });
      expect(r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    });
  });
});
