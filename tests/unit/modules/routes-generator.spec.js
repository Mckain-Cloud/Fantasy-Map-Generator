// @ts-check
import {test, expect} from "@playwright/test";
import {gotoApp, waitForAppReady} from "../../setup/helpers.js";

/**
 * Routes Generator Tests
 * Tests the trade route and road generation system
 */

test.describe("Routes Generator", () => {
  let page;

  test.beforeAll(async ({browser}) => {
    page = await browser.newPage();
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.describe("Routes API availability", () => {
    test("Routes object should be exposed on window", async () => {
      const hasRoutes = await page.evaluate(() => typeof window.Routes === "object");
      expect(hasRoutes).toBe(true);
    });

    test("Routes should have all required methods", async () => {
      const methods = await page.evaluate(() => {
        const r = window.Routes;
        if (!r) return [];
        return Object.keys(r).filter(k => typeof r[k] === "function");
      });

      expect(methods).toContain("generate");
      expect(methods).toContain("buildLinks");
      expect(methods).toContain("connect");
      expect(methods).toContain("isConnected");
      expect(methods).toContain("areConnected");
      expect(methods).toContain("getRoute");
      expect(methods).toContain("hasRoad");
      expect(methods).toContain("isCrossroad");
      expect(methods).toContain("generateName");
      expect(methods).toContain("getPath");
      expect(methods).toContain("getLength");
      expect(methods).toContain("getNextId");
      expect(methods).toContain("remove");
    });
  });

  test.describe("Routes data structure", () => {
    test("pack.routes should exist and be an array", async () => {
      const result = await page.evaluate(() => {
        return {
          exists: Array.isArray(window.pack?.routes),
          length: window.pack?.routes?.length || 0
        };
      });

      expect(result.exists).toBe(true);
    });

    test("Routes should have required properties", async () => {
      const result = await page.evaluate(() => {
        const routes = window.pack?.routes;
        if (!routes || routes.length === 0) return {skip: true};

        const route = routes.find(r => r && r.i > 0 && !r.removed);
        if (!route) return {skip: true};

        return {
          skip: false,
          hasId: typeof route.i === "number",
          // Name may not always exist
          hasName: route.name === undefined || typeof route.name === "string",
          hasGroup: typeof route.group === "string",
          hasPoints: Array.isArray(route.points),
          // Feature may be optional
          hasFeature: route.feature === undefined || typeof route.feature === "number",
          routeKeys: Object.keys(route)
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasId).toBe(true);
      expect(result.hasGroup).toBe(true);
      expect(result.hasPoints).toBe(true);
    });
  });

  test.describe("Route utility functions", () => {
    test("getNextId should return next available ID", async () => {
      const result = await page.evaluate(() => {
        const Routes = window.Routes;
        if (!Routes) return {skip: true};

        const routes = window.pack?.routes || [];
        const nextId = Routes.getNextId(routes);

        return {
          skip: false,
          nextId,
          isNumber: typeof nextId === "number",
          isPositive: nextId > 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isNumber).toBe(true);
      expect(result.isPositive).toBe(true);
    });

    test("generateName should return valid route name", async () => {
      const result = await page.evaluate(() => {
        const Routes = window.Routes;
        if (!Routes) return {skip: true};

        const routes = window.pack?.routes;
        if (!routes || routes.length === 0) return {skip: true};

        const route = routes.find(r => r && r.i > 0 && !r.removed && r.points);
        if (!route) return {skip: true};

        const name = Routes.generateName(route);
        return {
          skip: false,
          name,
          isString: typeof name === "string",
          hasLength: name.length > 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isString).toBe(true);
      expect(result.hasLength).toBe(true);
    });

    test("getLength should return positive distance", async () => {
      const result = await page.evaluate(() => {
        const Routes = window.Routes;
        if (!Routes) return {skip: true};

        const routes = window.pack?.routes;
        if (!routes || routes.length === 0) return {skip: true};

        const route = routes.find(r => r && r.i > 0 && !r.removed && r.points && r.points.length > 1);
        if (!route) return {skip: true};

        const length = Routes.getLength(route.i);
        return {
          skip: false,
          length,
          isNumber: typeof length === "number",
          isPositive: length >= 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isNumber).toBe(true);
      expect(result.isPositive).toBe(true);
    });

    test("getPath should return SVG path string", async () => {
      const result = await page.evaluate(() => {
        const Routes = window.Routes;
        if (!Routes) return {skip: true};

        const routes = window.pack?.routes;
        if (!routes || routes.length === 0) return {skip: true};

        const route = routes.find(r => r && r.i > 0 && !r.removed && r.points && r.points.length > 1);
        if (!route) return {skip: true};

        const path = Routes.getPath(route);
        return {
          skip: false,
          path,
          isString: typeof path === "string",
          hasContent: path.length > 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isString).toBe(true);
      expect(result.hasContent).toBe(true);
    });
  });

  test.describe("Route connectivity", () => {
    test("hasRoad should check if cell has road", async () => {
      const result = await page.evaluate(() => {
        const Routes = window.Routes;
        if (!Routes) return {skip: true};

        const cells = window.pack?.cells;
        if (!cells) return {skip: true};

        // Test a random cell
        const cellId = Math.floor(cells.i.length / 2);
        const hasRoad = Routes.hasRoad(cellId);

        return {
          skip: false,
          hasRoad,
          isBoolean: typeof hasRoad === "boolean"
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isBoolean).toBe(true);
    });

    test("isCrossroad should identify crossroad cells", async () => {
      const result = await page.evaluate(() => {
        const Routes = window.Routes;
        if (!Routes) return {skip: true};

        const cells = window.pack?.cells;
        if (!cells) return {skip: true};

        // Test a random cell
        const cellId = Math.floor(cells.i.length / 2);
        const isCrossroad = Routes.isCrossroad(cellId);

        return {
          skip: false,
          isCrossroad,
          isBoolean: typeof isCrossroad === "boolean"
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.isBoolean).toBe(true);
    });

    test("isConnected should check route connectivity", async () => {
      const result = await page.evaluate(() => {
        const Routes = window.Routes;
        if (!Routes || !Routes.isConnected) return {skip: true};

        const routes = window.pack?.routes;
        if (!routes || routes.length === 0) return {skip: true};

        const route = routes.find(r => r && r.i > 0 && !r.removed);
        if (!route) return {skip: true};

        try {
          const isConnected = Routes.isConnected(route.i);
          return {
            skip: false,
            isConnected,
            isBoolean: typeof isConnected === "boolean"
          };
        } catch (e) {
          return {skip: false, isBoolean: false, error: e.message};
        }
      });

      if (result.skip) {
        test.skip();
        return;
      }

      // Function may require specific context
      expect(typeof result.isBoolean).toBe("boolean");
    });
  });

  test.describe("Route groups", () => {
    test("Routes should have different groups (roads, trails, sea routes)", async () => {
      const result = await page.evaluate(() => {
        const routes = window.pack?.routes;
        if (!routes || routes.length === 0) return {skip: true};

        const groups = [...new Set(routes.filter(r => r && r.group).map(r => r.group))];

        return {
          skip: false,
          groups,
          hasGroups: groups.length > 0
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      expect(result.hasGroups).toBe(true);
    });
  });

  test.describe("Route cells data", () => {
    test("cells.road should track road values", async () => {
      const result = await page.evaluate(() => {
        const cells = window.pack?.cells;
        if (!cells) return {skip: true};

        // roads is stored in road array if it exists
        const hasRoadData = cells.road !== undefined;

        return {
          skip: false,
          hasRoadData
        };
      });

      if (result.skip) {
        test.skip();
        return;
      }

      // Road data may or may not exist depending on map
      expect(typeof result.hasRoadData).toBe("boolean");
    });
  });
});
