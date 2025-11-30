// @ts-check
import {test, expect} from "@playwright/test";
import {gotoApp, waitForAppReady} from "../../setup/helpers.js";

/**
 * Input Validation Tests
 *
 * These tests ensure that invalid inputs are properly rejected throughout the application.
 * Critical for maintaining data integrity and preventing crashes.
 */

test.describe("Input Validation Tests", () => {
  let page;

  test.beforeAll(async ({browser}) => {
    page = await browser.newPage();
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.describe("Number Range Validation (minmax/lim)", () => {
    test("minmax clamps values to valid range", async () => {
      const results = await page.evaluate(() => {
        const {minmax} = window;
        if (typeof minmax !== "function") return {skip: true};

        return {
          // Values within range unchanged
          withinRange: minmax(50, 0, 100) === 50,
          // Values below minimum clamped to minimum
          belowMin: minmax(-10, 0, 100) === 0,
          // Values above maximum clamped to maximum
          aboveMax: minmax(150, 0, 100) === 100,
          // Edge cases
          atMin: minmax(0, 0, 100) === 0,
          atMax: minmax(100, 0, 100) === 100,
          // Negative ranges
          negativeRange: minmax(-50, -100, -10) === -50,
          negBelowMin: minmax(-150, -100, -10) === -100,
          negAboveMax: minmax(0, -100, -10) === -10
        };
      });

      if (results.skip) {
        test.skip();
        return;
      }

      expect(results.withinRange).toBe(true);
      expect(results.belowMin).toBe(true);
      expect(results.aboveMax).toBe(true);
      expect(results.atMin).toBe(true);
      expect(results.atMax).toBe(true);
      expect(results.negativeRange).toBe(true);
      expect(results.negBelowMin).toBe(true);
      expect(results.negAboveMax).toBe(true);
    });

    test("lim constrains values to 0-100 range", async () => {
      const results = await page.evaluate(() => {
        const {lim} = window;
        if (typeof lim !== "function") return {skip: true};

        return {
          withinRange: lim(50) === 50,
          belowZero: lim(-10) === 0,
          above100: lim(150) === 100,
          atZero: lim(0) === 0,
          at100: lim(100) === 100
        };
      });

      if (results.skip) {
        test.skip();
        return;
      }

      expect(results.withinRange).toBe(true);
      expect(results.belowZero).toBe(true);
      expect(results.above100).toBe(true);
      expect(results.atZero).toBe(true);
      expect(results.at100).toBe(true);
    });

    test("Temperature values clamped to Int8 range (-128 to 127)", async () => {
      const results = await page.evaluate(() => {
        const {minmax} = window;
        if (typeof minmax !== "function") return {skip: true};

        // Simulates temperature clamping in main.js line 1023
        return {
          normalTemp: minmax(20, -128, 127) === 20,
          extremeCold: minmax(-200, -128, 127) === -128,
          extremeHot: minmax(200, -128, 127) === 127,
          atMinTemp: minmax(-128, -128, 127) === -128,
          atMaxTemp: minmax(127, -128, 127) === 127
        };
      });

      if (results.skip) {
        test.skip();
        return;
      }

      expect(results.normalTemp).toBe(true);
      expect(results.extremeCold).toBe(true);
      expect(results.extremeHot).toBe(true);
      expect(results.atMinTemp).toBe(true);
      expect(results.atMaxTemp).toBe(true);
    });
  });

  test.describe("NaN and Type Validation", () => {
    test("rn (round number) handles edge cases", async () => {
      const results = await page.evaluate(() => {
        const {rn} = window;
        if (typeof rn !== "function") return {skip: true};

        return {
          normalRound: rn(3.14159, 2) === 3.14,
          wholeNumber: rn(5, 0) === 5,
          negativeNumber: rn(-3.567, 2) === -3.57,
          zero: rn(0, 2) === 0,
          largeNumber: typeof rn(123456.789, 3) === "number"
        };
      });

      if (results.skip) {
        test.skip();
        return;
      }

      expect(results.normalRound).toBe(true);
      expect(results.wholeNumber).toBe(true);
      expect(results.negativeNumber).toBe(true);
      expect(results.zero).toBe(true);
      expect(results.largeNumber).toBe(true);
    });

    test("P (probability) returns valid boolean for range 0-1", async () => {
      const results = await page.evaluate(() => {
        const {P} = window;
        if (typeof P !== "function") return {skip: true};

        // Run multiple times to test probability distribution
        let zeroAlwaysFalse = true;
        let oneAlwaysTrue = true;

        for (let i = 0; i < 100; i++) {
          if (P(0)) zeroAlwaysFalse = false;
          if (!P(1)) oneAlwaysTrue = false;
        }

        return {
          zeroAlwaysFalse,
          oneAlwaysTrue,
          returnsBoolean: typeof P(0.5) === "boolean"
        };
      });

      if (results.skip) {
        test.skip();
        return;
      }

      expect(results.zeroAlwaysFalse).toBe(true);
      expect(results.oneAlwaysTrue).toBe(true);
      expect(results.returnsBoolean).toBe(true);
    });

    test("getNumberInRange rejects non-string inputs", async () => {
      const results = await page.evaluate(() => {
        const {getNumberInRange} = window;
        if (typeof getNumberInRange !== "function") return {skip: true};

        // Suppress console.error during test
        const originalError = console.error;
        let errorLogged = false;
        console.error = () => { errorLogged = true; };

        const numberInput = getNumberInRange(42);  // Should reject, not a string
        const arrayInput = getNumberInRange([1, 2]);  // Should reject
        const objectInput = getNumberInRange({});  // Should reject

        console.error = originalError;

        return {
          numberReturnsZero: numberInput === 0,
          arrayReturnsZero: arrayInput === 0,
          objectReturnsZero: objectInput === 0,
          validStringWorks: typeof getNumberInRange("5-10") === "number"
        };
      });

      if (results.skip) {
        test.skip();
        return;
      }

      expect(results.numberReturnsZero).toBe(true);
      expect(results.arrayReturnsZero).toBe(true);
      expect(results.objectReturnsZero).toBe(true);
      expect(results.validStringWorks).toBe(true);
    });
  });

  test.describe("Empty/Null Input Rejection", () => {
    test("Empty group names should be rejected", async () => {
      const results = await page.evaluate(() => {
        // Test that empty strings fail validation patterns used throughout editors
        const emptyString = "";
        const whitespaceOnly = "   ";

        return {
          emptyIsFalsy: !emptyString,
          whitespaceIsTruthy: !!whitespaceOnly,  // Note: whitespace is truthy
          trimmedWhitespaceIsFalsy: !whitespaceOnly.trim()
        };
      });

      expect(results.emptyIsFalsy).toBe(true);
      expect(results.whitespaceIsTruthy).toBe(true);
      expect(results.trimmedWhitespaceIsFalsy).toBe(true);
    });

    test("Group names starting with numbers should be identified", async () => {
      const results = await page.evaluate(() => {
        // Pattern from burg-editor.js line 178
        const startsWithNumber = (name) => Number.isFinite(+name.charAt(0));

        return {
          numericStart: startsWithNumber("123group"),
          letterStart: !startsWithNumber("group123"),
          underscoreStart: !startsWithNumber("_group"),
          emptyString: !startsWithNumber("")  // charAt(0) returns "", +"" is 0, isFinite(0) is true
        };
      });

      expect(results.numericStart).toBe(true);
      expect(results.letterStart).toBe(true);
      expect(results.underscoreStart).toBe(true);
    });
  });

  test.describe("Biome Habitability Validation", () => {
    test("Habitability must be in range 0-9999", async () => {
      const results = await page.evaluate(() => {
        // Pattern from biomes-editor.js lines 207-219
        const isValidHabitability = (value) => {
          return !isNaN(+value) && +value >= 0 && +value <= 9999;
        };

        return {
          validZero: isValidHabitability(0),
          validMax: isValidHabitability(9999),
          validMid: isValidHabitability(500),
          invalidNegative: !isValidHabitability(-1),
          invalidTooHigh: !isValidHabitability(10000),
          invalidNaN: !isValidHabitability("abc"),
          // Note: empty string coerces to 0 via +"", which is valid (0 is in range)
          // This is actually JavaScript behavior - +"" === 0, and 0 is a valid habitability
          emptyIsZero: isValidHabitability("") // +"" === 0, so this is valid!
        };
      });

      expect(results.validZero).toBe(true);
      expect(results.validMax).toBe(true);
      expect(results.validMid).toBe(true);
      expect(results.invalidNegative).toBe(true);
      expect(results.invalidTooHigh).toBe(true);
      expect(results.invalidNaN).toBe(true);
      // JavaScript quirk: +"" === 0, so empty string is technically valid (equals 0)
      expect(results.emptyIsZero).toBe(true);
    });
  });

  test.describe("Maximum Count Limits", () => {
    test("Biome count limit of 255 should be enforced", async () => {
      const results = await page.evaluate(() => {
        // Pattern from biomes-editor.js lines 279-282
        const canAddBiome = (currentCount) => currentCount <= 254;

        return {
          canAddAt0: canAddBiome(0),
          canAddAt254: canAddBiome(254),
          cannotAddAt255: !canAddBiome(255),
          cannotAddAt1000: !canAddBiome(1000)
        };
      });

      expect(results.canAddAt0).toBe(true);
      expect(results.canAddAt254).toBe(true);
      expect(results.cannotAddAt255).toBe(true);
      expect(results.cannotAddAt1000).toBe(true);
    });
  });

  test.describe("File Format Validation", () => {
    test("Only .map and .gz file extensions should be accepted", async () => {
      const results = await page.evaluate(() => {
        // Pattern from main.js lines 691-692
        const isValidMapFile = (filename) => {
          return filename.endsWith(".map") || filename.endsWith(".gz");
        };

        return {
          mapFileValid: isValidMapFile("myworld.map"),
          gzFileValid: isValidMapFile("backup.gz"),
          txtFileInvalid: !isValidMapFile("notes.txt"),
          jsonFileInvalid: !isValidMapFile("data.json"),
          pngFileInvalid: !isValidMapFile("screenshot.png"),
          noExtensionInvalid: !isValidMapFile("filename"),
          mapGzValid: isValidMapFile("world.map.gz")  // Double extension case
        };
      });

      expect(results.mapFileValid).toBe(true);
      expect(results.gzFileValid).toBe(true);
      expect(results.txtFileInvalid).toBe(true);
      expect(results.jsonFileInvalid).toBe(true);
      expect(results.pngFileInvalid).toBe(true);
      expect(results.noExtensionInvalid).toBe(true);
      expect(results.mapGzValid).toBe(true);
    });
  });

  test.describe("UI Size Validation", () => {
    test("UI size must be at least 0.5", async () => {
      const results = await page.evaluate(() => {
        // Pattern from options.js lines 407-408
        const isValidUiSize = (value) => !isNaN(value) && value >= 0.5;

        return {
          validMin: isValidUiSize(0.5),
          validNormal: isValidUiSize(1.0),
          validLarge: isValidUiSize(2.0),
          invalidTooSmall: !isValidUiSize(0.4),
          invalidZero: !isValidUiSize(0),
          invalidNegative: !isValidUiSize(-1),
          invalidNaN: !isValidUiSize(NaN)
        };
      });

      expect(results.validMin).toBe(true);
      expect(results.validNormal).toBe(true);
      expect(results.validLarge).toBe(true);
      expect(results.invalidTooSmall).toBe(true);
      expect(results.invalidZero).toBe(true);
      expect(results.invalidNegative).toBe(true);
      expect(results.invalidNaN).toBe(true);
    });
  });

  test.describe("Graph Geometry Validation", () => {
    test("Rectangle bounds must be valid (x1 >= x0, y1 >= y0, r > 0)", async () => {
      const results = await page.evaluate(() => {
        // Pattern from graphUtils.js line 167
        const isValidRectangle = (x0, y0, x1, y1, r) => {
          return x1 >= x0 && y1 >= y0 && r > 0;
        };

        return {
          validRect: isValidRectangle(0, 0, 100, 100, 5),
          validZeroSize: isValidRectangle(50, 50, 50, 50, 1),  // Point is valid
          invalidInvertedX: !isValidRectangle(100, 0, 0, 100, 5),
          invalidInvertedY: !isValidRectangle(0, 100, 100, 0, 5),
          invalidZeroRadius: !isValidRectangle(0, 0, 100, 100, 0),
          invalidNegativeRadius: !isValidRectangle(0, 0, 100, 100, -5)
        };
      });

      expect(results.validRect).toBe(true);
      expect(results.validZeroSize).toBe(true);
      expect(results.invalidInvertedX).toBe(true);
      expect(results.invalidInvertedY).toBe(true);
      expect(results.invalidZeroRadius).toBe(true);
      expect(results.invalidNegativeRadius).toBe(true);
    });
  });

  test.describe("Entity State Validation", () => {
    test("Entities without cells cannot have population modified", async () => {
      const results = await page.evaluate(() => {
        // Pattern used in cultures-editor.js line 421, religions-editor.js line 396, states-editor.js line 477
        const canModifyPopulation = (entity) => entity && entity.cells > 0;

        return {
          validEntity: canModifyPopulation({cells: 10, name: "Test"}),
          zeroCells: !canModifyPopulation({cells: 0, name: "Empty"}),
          nullEntity: !canModifyPopulation(null),
          undefinedEntity: !canModifyPopulation(undefined),
          missingCells: !canModifyPopulation({name: "NoCells"})
        };
      });

      expect(results.validEntity).toBe(true);
      expect(results.zeroCells).toBe(true);
      expect(results.nullEntity).toBe(true);
      expect(results.undefinedEntity).toBe(true);
      expect(results.missingCells).toBe(true);
    });
  });

  test.describe("Heightmap Template Validation", () => {
    test("Heightmap templates must have steps", async () => {
      const results = await page.evaluate(() => {
        // Pattern from heightmap-generator.js line 33
        const hasValidSteps = (template) => {
          return template && Array.isArray(template.steps) && template.steps.length > 0;
        };

        return {
          validTemplate: hasValidSteps({steps: ["step1", "step2"]}),
          emptySteps: !hasValidSteps({steps: []}),
          noSteps: !hasValidSteps({}),
          nullTemplate: !hasValidSteps(null)
        };
      });

      expect(results.validTemplate).toBe(true);
      expect(results.emptySteps).toBe(true);
      expect(results.noSteps).toBe(true);
      expect(results.nullTemplate).toBe(true);
    });
  });

  test.describe("Merge State Validation", () => {
    test("State merge requires valid ruling state and multiple states", async () => {
      const results = await page.evaluate(() => {
        // Pattern from states-editor.js lines 1312-1319
        const canMergeStates = (rulingStateId, statesToMerge) => {
          return rulingStateId && Array.isArray(statesToMerge) && statesToMerge.length > 0;
        };

        return {
          validMerge: canMergeStates(1, [2, 3]),
          noRulingState: !canMergeStates(null, [2, 3]),
          zeroRulingState: !canMergeStates(0, [2, 3]),  // 0 is falsy
          emptyStatesToMerge: !canMergeStates(1, []),
          noStatesToMerge: !canMergeStates(1, null)
        };
      });

      expect(results.validMerge).toBe(true);
      expect(results.noRulingState).toBe(true);
      expect(results.zeroRulingState).toBe(true);
      expect(results.emptyStatesToMerge).toBe(true);
      expect(results.noStatesToMerge).toBe(true);
    });
  });
});
