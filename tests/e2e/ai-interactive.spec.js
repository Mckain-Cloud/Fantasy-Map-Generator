// @ts-check
import {test, expect} from "@playwright/test";

/**
 * Interactive AI Testing
 *
 * This test generates a map and exposes functions to interact with
 * the AI Data Layer for manual/interactive testing.
 */

test.describe("AI Interactive Testing", () => {
  test("generate map and extract context for AI testing", async ({page}) => {
    // Increase timeout for map generation
    test.setTimeout(120000);

    await page.goto("/");

    // Wait for map generation
    await page.waitForFunction(() => window.pack?.states?.length > 1, {timeout: 90000});

    // Load the DataLayer module
    const DataLayer = await page.evaluate(async () => {
      const module = await import("/modules/ai/data-layer.js");
      window.DataLayer = module.DataLayer;
      return true;
    });

    expect(DataLayer).toBe(true);

    // Get encoded full context
    const context = await page.evaluate(() => {
      return window.DataLayer.encode.fullContext(window.pack, {
        includeRoutes: false,
        includeZones: false
      });
    });

    console.log("\n" + "=".repeat(80));
    console.log("MAP CONTEXT FOR AI TESTING");
    console.log("=".repeat(80));
    console.log("\n--- STATES ---");
    if (Array.isArray(context.states)) {
      context.states.forEach(s => console.log(s));
    } else {
      console.log(context.states);
    }
    console.log("\n--- BURGS (first 10) ---");
    if (Array.isArray(context.burgs)) {
      context.burgs.slice(0, 10).forEach(b => console.log(b));
    } else {
      console.log(context.burgs);
    }
    console.log("\n--- CULTURES ---");
    if (Array.isArray(context.cultures)) {
      context.cultures.forEach(c => console.log(c));
    } else {
      console.log(context.cultures);
    }
    console.log("\n--- RELIGIONS ---");
    if (Array.isArray(context.religions)) {
      context.religions.forEach(r => console.log(r));
    } else {
      console.log(context.religions);
    }
    console.log("=".repeat(80));

    // Get summary stats
    const stats = await page.evaluate(() => {
      const p = window.pack;
      return {
        states: p.states.filter(s => s.i && !s.removed).length,
        burgs: p.burgs.filter(b => b.i && !b.removed).length,
        cultures: p.cultures.filter(c => c.i && !c.removed).length,
        religions: p.religions.filter(r => r.i && !r.removed).length,
        provinces: p.provinces?.filter(p => p.i && !p.removed).length || 0,
        rivers: p.rivers?.length || 0
      };
    });

    console.log("\n--- STATS ---");
    console.log(JSON.stringify(stats, null, 2));

    // Test a sample AI response
    const sampleAIResponse = {
      update: {
        states: [
          {i: 1, name: "AI_RENAMED_STATE"}
        ]
      }
    };

    const validationResult = await page.evaluate((response) => {
      const {validateSchema, validateReferences, validateSemantics} = window.DataLayer._test || {};

      // Use the batch validator
      return window.DataLayer.batch.validate(response, window.pack);
    }, sampleAIResponse);

    console.log("\n--- SAMPLE AI RESPONSE VALIDATION ---");
    console.log("Response:", JSON.stringify(sampleAIResponse));
    console.log("Validation:", JSON.stringify(validationResult, null, 2));

    expect(validationResult.valid).toBe(true);
  });

  test("test AI response scenarios", async ({page}) => {
    test.setTimeout(120000);

    await page.goto("/");
    await page.waitForFunction(() => window.pack?.states?.length > 1, {timeout: 90000});

    await page.evaluate(async () => {
      const module = await import("/modules/ai/data-layer.js");
      window.DataLayer = module.DataLayer;
    });

    // Scenario 1: Rename a state
    const renameResult = await page.evaluate(() => {
      const state1 = window.pack.states[1];
      if (!state1 || state1.removed) return {skip: true};

      const response = {
        update: {
          states: [{i: state1.i, name: "Kingdom of Testing"}]
        }
      };
      return {
        original: state1.name,
        response,
        validation: window.DataLayer.batch.validate(response, window.pack)
      };
    });

    console.log("\n--- SCENARIO 1: Rename State ---");
    console.log(JSON.stringify(renameResult, null, 2));

    // Scenario 2: Create a new marker
    const markerResult = await page.evaluate(() => {
      const response = {
        create: {
          markers: [{i: 999, type: "capitals", x: 500, y: 500, cell: 1000}]
        }
      };
      return {
        response,
        validation: window.DataLayer.batch.validate(response, window.pack)
      };
    });

    console.log("\n--- SCENARIO 2: Create Marker ---");
    console.log(JSON.stringify(markerResult, null, 2));

    // Scenario 3: Invalid reference (should fail)
    const invalidResult = await page.evaluate(() => {
      const response = {
        update: {
          burgs: [{i: 1, state: 9999}]  // Non-existent state
        }
      };
      return {
        response,
        validation: window.DataLayer.batch.validate(response, window.pack)
      };
    });

    console.log("\n--- SCENARIO 3: Invalid Reference (should fail) ---");
    console.log(JSON.stringify(invalidResult, null, 2));

    expect(renameResult.validation?.valid).toBe(true);
    // Invalid reference should now fail validation
    expect(invalidResult.validation?.valid).toBe(false);
    expect(invalidResult.validation?.errors?.some(e => e.code === "INVALID_REF")).toBe(true);
    console.log("Invalid ref correctly rejected:", !invalidResult.validation?.valid);
  });
});
