/**
 * AI Data Layer - E2E Integration Tests (Playwright)
 *
 * Tests the DataLayer module within the actual FMG application.
 * Verifies integration with real pack/grid data structures.
 *
 * Run with: npx playwright test tests/e2e/ai-data-layer.spec.js
 */

import {test, expect} from "@playwright/test";
import {waitForAppReady, gotoApp, stopCoverage, flushCoverage} from "../setup/helpers.js";

test.describe("AI Data Layer E2E", () => {
  test.beforeEach(async ({page}) => {
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterEach(async ({page}) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe("Module Loading", () => {
    test("DataLayer module loads correctly", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");
        return {
          hasEncode: typeof DataLayer.encode === "object",
          hasDecode: typeof DataLayer.decode === "object",
          hasCreate: typeof DataLayer.create === "object",
          hasUpdate: typeof DataLayer.update === "object",
          hasRemove: typeof DataLayer.remove === "object",
          hasBatch: typeof DataLayer.batch === "object"
        };
      });

      expect(result.hasEncode).toBe(true);
      expect(result.hasDecode).toBe(true);
      expect(result.hasCreate).toBe(true);
      expect(result.hasUpdate).toBe(true);
      expect(result.hasRemove).toBe(true);
      expect(result.hasBatch).toBe(true);
    });

    test("validators module loads correctly", async ({page}) => {
      const result = await page.evaluate(async () => {
        const validators = await import("/modules/ai/validators.js");
        return {
          hasValidateSchema: typeof validators.validateSchema === "function",
          hasValidateReferences: typeof validators.validateReferences === "function",
          hasValidateSemantics: typeof validators.validateSemantics === "function",
          hasValidateChangeSet: typeof validators.validateChangeSet === "function"
        };
      });

      expect(result.hasValidateSchema).toBe(true);
      expect(result.hasValidateReferences).toBe(true);
      expect(result.hasValidateSemantics).toBe(true);
      expect(result.hasValidateChangeSet).toBe(true);
    });
  });

  test.describe("Encoding with Real Data", () => {
    test("encodes existing states from pack", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const states = pack.states.filter(s => s.i > 0 && !s.removed);
        if (states.length === 0) return {error: "No states"};

        const encoded = DataLayer.encode.state(states[0]);
        return {
          encoded,
          originalName: states[0].name,
          startsWithS: encoded?.startsWith("S")
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.startsWithS).toBe(true);
      expect(result.encoded).toContain(result.originalName);
    });

    test("encodes existing burgs from pack", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const burgs = pack.burgs.filter(b => b.i > 0 && !b.removed);
        if (burgs.length === 0) return {error: "No burgs"};

        const encoded = DataLayer.encode.burg(burgs[0]);
        return {
          encoded,
          originalName: burgs[0].name,
          startsWithB: encoded?.startsWith("B")
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.startsWithB).toBe(true);
      expect(result.encoded).toContain(result.originalName);
    });

    test("encodes full context", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const context = DataLayer.encode.fullContext();
        return {
          hasStates: context.states.length > 0,
          hasBurgs: context.burgs.length > 0,
          hasCultures: context.cultures.length > 0,
          stateCount: context.states.length,
          burgCount: context.burgs.length
        };
      });

      expect(result.hasStates).toBe(true);
      expect(result.hasBurgs).toBe(true);
      expect(result.hasCultures).toBe(true);
    });

    test("token estimation returns reasonable value", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const context = DataLayer.encode.fullContext();
        const tokens = DataLayer.estimateTokens(context);

        return {
          tokens,
          isReasonable: tokens > 100 && tokens < 50000
        };
      });

      expect(result.isReasonable).toBe(true);
    });
  });

  test.describe("Decoding and Round-trip", () => {
    test("state encoding is reversible", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const states = pack.states.filter(s => s.i > 0 && !s.removed);
        if (states.length === 0) return {error: "No states"};

        const original = states[0];
        const encoded = DataLayer.encode.state(original);
        const decoded = DataLayer.decode.state(encoded);

        return {
          nameMatches: decoded.name === original.name,
          idMatches: decoded.i === original.i,
          formMatches: decoded.form === original.form
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.nameMatches).toBe(true);
      expect(result.idMatches).toBe(true);
      expect(result.formMatches).toBe(true);
    });

    test("burg encoding is reversible", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const burgs = pack.burgs.filter(b => b.i > 0 && !b.removed);
        if (burgs.length === 0) return {error: "No burgs"};

        const original = burgs[0];
        const encoded = DataLayer.encode.burg(original);
        const decoded = DataLayer.decode.burg(encoded);

        return {
          nameMatches: decoded.name === original.name,
          idMatches: decoded.i === original.i,
          cellMatches: decoded.cell === original.cell
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.nameMatches).toBe(true);
      expect(result.idMatches).toBe(true);
      expect(result.cellMatches).toBe(true);
    });
  });

  test.describe("Validation with Real Data", () => {
    test("validates existing state successfully", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {validateSchema, validateReferences} = await import("/modules/ai/validators.js");

        const states = pack.states.filter(s => s.i > 0 && !s.removed);
        if (states.length === 0) return {error: "No states"};

        const state = states[0];
        const schemaErrors = validateSchema(state, "state", "update");
        const refErrors = validateReferences(state, "state", pack);

        return {
          schemaValid: schemaErrors.length === 0,
          refValid: refErrors.length === 0,
          schemaErrors,
          refErrors
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.schemaValid).toBe(true);
      expect(result.refValid).toBe(true);
    });

    test("validates existing burg successfully", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {validateSchema, validateReferences} = await import("/modules/ai/validators.js");

        const burgs = pack.burgs.filter(b => b.i > 0 && !b.removed);
        if (burgs.length === 0) return {error: "No burgs"};

        const burg = burgs[0];
        const schemaErrors = validateSchema(burg, "burg", "update");
        const refErrors = validateReferences(burg, "burg", pack);

        return {
          schemaValid: schemaErrors.length === 0,
          refValid: refErrors.length === 0,
          schemaErrors,
          refErrors
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.schemaValid).toBe(true);
      expect(result.refValid).toBe(true);
    });

    test("rejects invalid entity correctly", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {validateSchema} = await import("/modules/ai/validators.js");

        // Invalid state: missing required name
        const errors = validateSchema({i: 999, form: "Monarchy"}, "state", "create");

        return {
          hasErrors: errors.length > 0,
          hasMissingNameError: errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "name")
        };
      });

      expect(result.hasErrors).toBe(true);
      expect(result.hasMissingNameError).toBe(true);
    });

    test("rejects invalid reference", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {validateReferences} = await import("/modules/ai/validators.js");

        // Burg with non-existent state
        const errors = validateReferences({i: 1, state: 99999}, "burg", pack);

        return {
          hasErrors: errors.length > 0,
          hasInvalidRefError: errors.some(e => e.code === "INVALID_REF")
        };
      });

      expect(result.hasErrors).toBe(true);
      expect(result.hasInvalidRefError).toBe(true);
    });
  });

  test.describe("CRUD Operations (Read-only validation)", () => {
    test("create.state validates correctly", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        // Get next available state ID
        const maxId = Math.max(...pack.states.map(s => s.i));
        const newId = maxId + 1;

        // Get valid culture from existing data
        const cultures = pack.cultures.filter(c => c.i > 0 && !c.removed);

        const validState = {
          i: newId,
          name: "Test State",
          form: "Monarchy",
          culture: cultures[0]?.i || 1
        };

        const validationResult = DataLayer.create.state(validState);

        return {
          valid: validationResult.valid,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        };
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("update.state validates existing entity", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const states = pack.states.filter(s => s.i > 0 && !s.removed);
        if (states.length === 0) return {error: "No states"};

        const validationResult = DataLayer.update.state(states[0].i, {
          name: "Renamed Test State"
        });

        return {
          valid: validationResult.valid,
          errors: validationResult.errors
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.valid).toBe(true);
    });

    test("remove.state validates correctly", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const states = pack.states.filter(s => s.i > 0 && !s.removed);
        if (states.length === 0) return {error: "No states"};

        const validationResult = DataLayer.remove.state(states[0].i);

        return {
          valid: validationResult.valid,
          hasWarnings: validationResult.warnings.length > 0
        };
      });

      expect(result.error).toBeUndefined();
      expect(result.valid).toBe(true);
    });
  });

  test.describe("Batch Operations", () => {
    test("batch.validate validates a ChangeSet", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const maxStateId = Math.max(...pack.states.map(s => s.i));
        const existingBurg = pack.burgs.find(b => b.i > 0 && !b.removed);

        const changeSet = {
          create: {
            states: [{i: maxStateId + 1, name: "New Batch State", form: "Republic"}]
          },
          update: {
            burgs: existingBurg ? [{i: existingBurg.i, population: 100}] : []
          }
        };

        const validationResult = DataLayer.batch.validate(changeSet);

        return {
          valid: validationResult.valid,
          errors: validationResult.errors
        };
      });

      expect(result.valid).toBe(true);
    });

    test("batch.validate catches invalid ChangeSet", async ({page}) => {
      const result = await page.evaluate(async () => {
        const {DataLayer} = await import("/modules/ai/data-layer.js");

        const changeSet = {
          create: {
            states: [{name: "Missing ID State", form: "Monarchy"}] // Missing required 'i'
          }
        };

        const validationResult = DataLayer.batch.validate(changeSet);

        return {
          valid: validationResult.valid,
          hasErrors: validationResult.errors.length > 0
        };
      });

      expect(result.valid).toBe(false);
      expect(result.hasErrors).toBe(true);
    });
  });
});
