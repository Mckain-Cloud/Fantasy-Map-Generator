/**
 * AI Dungeon Preprocessor - Integration Tests with Real Adventure Files
 *
 * Tests the preprocessor against actual AI Dungeon adventure exports to ensure
 * it handles real-world data correctly. These adventures represent various:
 * - Story lengths (14 to 329+ actions)
 * - Genres (fantasy, sci-fi, modern, etc.)
 * - Story card configurations (none, few, many with scripts)
 * - Snapshots of the same story at different times
 *
 * Run with: npm run test:unit:ai
 */

import {describe, test, expect, beforeAll} from "vitest";
import {DungeonPreprocessor} from "./dungeon-preprocessor.js";
import {readFileSync, readdirSync} from "fs";
import {join} from "path";

// ============================================================================
// Test Data Setup
// ============================================================================

const JSON_DIR = join(process.cwd(), "json");

// Get all adventure files
function getAdventureFiles() {
  try {
    const files = readdirSync(JSON_DIR);
    return files.filter(f => f.endsWith(".adventure.json")).map(f => join(JSON_DIR, f));
  } catch {
    return [];
  }
}

function loadAdventure(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function getFileName(filePath) {
  return filePath.split(/[/\\]/).pop();
}

// ============================================================================
// Integration Tests - All Adventure Files
// ============================================================================

describe("DungeonPreprocessor - Real Adventure Files Integration", () => {
  const adventureFiles = getAdventureFiles();

  test.skipIf(adventureFiles.length === 0)("should find adventure files in json folder", () => {
    expect(adventureFiles.length).toBeGreaterThan(0);
  });

  describe.skipIf(adventureFiles.length === 0)("Validation", () => {
    test.each(adventureFiles)("validates %s", filePath => {
      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.validateAdventureFormat(adventure);

      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.error(`Validation failed for ${getFileName(filePath)}: ${result.error}`);
      }
    });
  });

  describe.skipIf(adventureFiles.length === 0)("Preprocessing", () => {
    test.each(adventureFiles)("preprocesses %s without errors", filePath => {
      const adventure = loadAdventure(filePath);

      // Should not throw
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Basic structure checks
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("meta");
      expect(result).toHaveProperty("worldData");
      expect(result).toHaveProperty("narrative");

      // Meta should have required fields
      expect(result.meta).toHaveProperty("title");
      expect(result.meta).toHaveProperty("totalActions");
      expect(result.meta).toHaveProperty("validActions");
      expect(result.meta).toHaveProperty("storyCardCount");
      expect(result.meta).toHaveProperty("estimatedTokens");

      // WorldData should have all category arrays
      expect(result.worldData).toHaveProperty("characters");
      expect(result.worldData).toHaveProperty("locations");
      expect(result.worldData).toHaveProperty("factions");
      expect(result.worldData).toHaveProperty("items");
      expect(result.worldData).toHaveProperty("classes");

      expect(Array.isArray(result.worldData.characters)).toBe(true);
      expect(Array.isArray(result.worldData.locations)).toBe(true);
      expect(Array.isArray(result.worldData.factions)).toBe(true);
      expect(Array.isArray(result.worldData.items)).toBe(true);
      expect(Array.isArray(result.worldData.classes)).toBe(true);
    });

    test.each(adventureFiles)("filters undone/deleted actions in %s", filePath => {
      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Valid actions should be <= total actions
      expect(result.meta.validActions).toBeLessThanOrEqual(result.meta.totalActions);

      // If there were any actions, we should have processed some
      if (result.meta.totalActions > 0) {
        expect(result.meta.validActions).toBeGreaterThanOrEqual(0);
      }
    });

    test.each(adventureFiles)("filters script cards in %s", filePath => {
      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Check that no script cards made it through
      const allCards = [
        ...result.worldData.characters,
        ...result.worldData.locations,
        ...result.worldData.factions,
        ...result.worldData.items,
        ...result.worldData.classes
      ];

      for (const card of allCards) {
        // None of the filtered titles should be present
        const title = (card.title || "").toLowerCase();
        expect(title).not.toContain("configure");
        expect(title).not.toContain("auto-cards");
        expect(title).not.toContain("localized languages");
      }
    });

    test.each(adventureFiles)("generates non-empty narrative for %s", filePath => {
      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // If there are valid actions, narrative should not be empty
      if (result.meta.validActions > 0) {
        expect(result.narrative.length).toBeGreaterThan(0);
      }
    });

    test.each(adventureFiles)("estimates reasonable token count for %s", filePath => {
      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Token count should be positive if there's content
      if (result.narrative.length > 0 || result.meta.storyCardCount > 0) {
        expect(result.meta.estimatedTokens).toBeGreaterThan(0);
      }

      // Token count should be reasonable (not absurdly high for typical adventures)
      // Most adventures should be under 500k tokens
      expect(result.meta.estimatedTokens).toBeLessThan(500000);
    });
  });

  describe.skipIf(adventureFiles.length === 0)("Action Type Handling", () => {
    test.each(adventureFiles)("handles all action types in %s", filePath => {
      const adventure = loadAdventure(filePath);
      const raw = adventure?.data?.adventure || adventure?.adventure || adventure;
      const actions = raw?.actionWindow || [];

      // Get unique action types
      const actionTypes = new Set(actions.map(a => a.type).filter(Boolean));

      // Common action types that should be handled
      const expectedTypes = ["start", "continue", "do", "say", "story"];

      // The preprocessor should handle whatever types exist without crashing
      const result = DungeonPreprocessor.preprocessAdventure(adventure);
      expect(result).toBeDefined();

      // Log action types found for debugging
      if (actionTypes.size > 0) {
        // Just ensure we processed something
        expect(result.meta.totalActions).toBeGreaterThan(0);
      }
    });
  });

  describe.skipIf(adventureFiles.length === 0)("Story Card Grouping", () => {
    test.each(adventureFiles)("correctly groups story cards in %s", filePath => {
      const adventure = loadAdventure(filePath);
      const raw = adventure?.data?.adventure || adventure?.adventure || adventure;
      const originalCards = (raw?.storyCards || []).filter(c => !c.deletedAt);

      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Count total cards in result (excluding filtered script cards)
      const resultCardCount =
        result.worldData.characters.length +
        result.worldData.locations.length +
        result.worldData.factions.length +
        result.worldData.items.length +
        result.worldData.classes.length;

      // Result should have same or fewer cards (due to script card filtering)
      expect(resultCardCount).toBeLessThanOrEqual(originalCards.length);

      // Verify grouping by type (case-insensitive since source data varies)
      for (const card of result.worldData.characters) {
        expect(card.type.toLowerCase()).toBe("character");
      }
      for (const card of result.worldData.locations) {
        expect(card.type.toLowerCase()).toBe("location");
      }
      for (const card of result.worldData.factions) {
        expect(card.type.toLowerCase()).toBe("faction");
      }
      for (const card of result.worldData.items) {
        expect(card.type.toLowerCase()).toBe("item");
      }
    });
  });
});

// ============================================================================
// Specific Adventure Tests - Known Characteristics
// ============================================================================

describe("DungeonPreprocessor - Specific Adventure Characteristics", () => {
  const adventureFiles = getAdventureFiles();

  // Find specific adventures by partial name match
  const findAdventure = partial =>
    adventureFiles.find(f => getFileName(f).toLowerCase().includes(partial.toLowerCase()));

  describe("Adventures without story cards", () => {
    test("Your abusive significant other - minimal adventure with no story cards", () => {
      const filePath = findAdventure("abusive significant other");
      if (!filePath) return; // Skip if file not found

      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // This adventure has no story cards
      expect(result.meta.storyCardCount).toBe(0);
      expect(result.worldData.characters).toHaveLength(0);
      expect(result.worldData.locations).toHaveLength(0);

      // But it should still have actions and narrative
      expect(result.meta.validActions).toBeGreaterThan(0);
      expect(result.narrative.length).toBeGreaterThan(0);
    });

    test("Fantasy Daelyss - longer adventure with no story cards", () => {
      const filePath = findAdventure("Fantasy Daelyss");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Should have many actions but no story cards
      expect(result.meta.storyCardCount).toBe(0);
      expect(result.meta.totalActions).toBeGreaterThan(100);

      // Should have rich memory content
      expect(result.memory.length).toBeGreaterThan(0);
    });
  });

  describe("Adventures with story cards and scripts", () => {
    test("The world of Ivaros - filters Auto-Cards and Localized Languages", () => {
      const filePath = findAdventure("Ivaros");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Should have filtered out script cards
      const allTitles = [
        ...result.worldData.characters,
        ...result.worldData.locations,
        ...result.worldData.factions,
        ...result.worldData.items,
        ...result.worldData.classes
      ].map(c => c.title);

      // Script cards should be filtered
      expect(allTitles.some(t => t.includes("Auto-Cards"))).toBe(false);
      expect(allTitles.some(t => t.includes("Localized Languages"))).toBe(false);

      // But real content cards should remain
      expect(allTitles.some(t => t.includes("Ivaros") || t.includes("Capital"))).toBe(true);
    });
  });

  describe("Adventures with undone actions", () => {
    test("Fantasy Daelyss - filters undone actions correctly", () => {
      const filePath = findAdventure("Fantasy Daelyss");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const raw = adventure?.data?.adventure || adventure?.adventure || adventure;
      const actions = raw?.actionWindow || [];

      // Count undone actions in original
      const undoneCount = actions.filter(a => a.undoneAt).length;

      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Valid actions should be total minus undone (approximately)
      expect(result.meta.validActions).toBeLessThanOrEqual(result.meta.totalActions - undoneCount);

      // Narrative should not contain content from undone actions
      // (This is harder to verify without knowing specific undone content)
      expect(result.narrative).toBeDefined();
    });
  });

  describe("Different genres", () => {
    test("Cybria Sci-Fi City - handles sci-fi themed adventure", () => {
      const filePath = findAdventure("Cybria");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Should process without errors regardless of genre
      expect(result.version).toBe("1.0");
      expect(result.meta.title).toContain("Cybria");
    });

    test("Pathfinder The Fall of Kenabres - handles tabletop-style adventure", () => {
      const filePath = findAdventure("Kenabres");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      expect(result.version).toBe("1.0");
      expect(result.meta.title).toContain("Pathfinder");
    });
  });

  describe("Story snapshots at different times", () => {
    test("Emily is turned - both snapshots should process correctly", () => {
      const snapshots = adventureFiles.filter(f => getFileName(f).toLowerCase().includes("emily is turned"));

      expect(snapshots.length).toBeGreaterThanOrEqual(1);

      for (const filePath of snapshots) {
        const adventure = loadAdventure(filePath);
        const result = DungeonPreprocessor.preprocessAdventure(adventure);

        expect(result.version).toBe("1.0");
        expect(result.meta.title).toContain("Emily");
      }
    });
  });

  describe("Edge cases from real data", () => {
    test("handles adventures with gameState containing AutoCards config", () => {
      const filePath = findAdventure("Ivaros");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const raw = adventure?.data?.adventure || adventure?.adventure || adventure;

      // This adventure has gameState with AutoCards
      expect(raw.gameState).toBeDefined();
      expect(raw.gameState.AutoCards).toBeDefined();

      // Should still preprocess correctly
      const result = DungeonPreprocessor.preprocessAdventure(adventure);
      expect(result).toBeDefined();
    });

    test("handles adventures with complex details.instructions", () => {
      const filePath = findAdventure("Ivaros");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      // Should preserve details structure
      expect(result.details).toBeDefined();
      if (result.details?.instructions?.scenario) {
        expect(typeof result.details.instructions.scenario).toBe("string");
      }
    });

    test("handles adventures with empty storyCards array", () => {
      const filePath = findAdventure("abusive");
      if (!filePath) return;

      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      expect(result.worldData.characters).toEqual([]);
      expect(result.worldData.locations).toEqual([]);
    });
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe("DungeonPreprocessor - Performance", () => {
  const adventureFiles = getAdventureFiles();

  test.skipIf(adventureFiles.length === 0)("processes all adventures in reasonable time", () => {
    const startTime = Date.now();

    for (const filePath of adventureFiles) {
      const adventure = loadAdventure(filePath);
      DungeonPreprocessor.preprocessAdventure(adventure);
    }

    const elapsed = Date.now() - startTime;

    // All adventures should process in under 5 seconds total
    expect(elapsed).toBeLessThan(5000);
  });

  test("largest adventure processes in under 1 second", () => {
    // Find the largest file
    const adventureFiles = getAdventureFiles();
    if (adventureFiles.length === 0) return;

    let largestFile = adventureFiles[0];
    let largestSize = 0;

    for (const filePath of adventureFiles) {
      const content = readFileSync(filePath, "utf-8");
      if (content.length > largestSize) {
        largestSize = content.length;
        largestFile = filePath;
      }
    }

    const adventure = loadAdventure(largestFile);
    const startTime = Date.now();
    DungeonPreprocessor.preprocessAdventure(adventure);
    const elapsed = Date.now() - startTime;

    // Even the largest adventure should process in under 1 second
    expect(elapsed).toBeLessThan(1000);
  });
});

// ============================================================================
// Data Integrity Tests
// ============================================================================

describe("DungeonPreprocessor - Data Integrity", () => {
  const adventureFiles = getAdventureFiles();

  test.skipIf(adventureFiles.length === 0).each(adventureFiles)("preserves essential metadata in %s", filePath => {
    const adventure = loadAdventure(filePath);
    const raw = adventure?.data?.adventure || adventure?.adventure || adventure;
    const result = DungeonPreprocessor.preprocessAdventure(adventure);

    // Title should be preserved
    if (raw.title) {
      expect(result.meta.title).toBe(raw.title);
    }

    // Description should be preserved
    if (raw.description) {
      expect(result.meta.description).toBe(raw.description);
    }

    // Tags should be preserved
    if (raw.tags && raw.tags.length > 0) {
      expect(result.meta.tags).toEqual(raw.tags);
    }

    // Memory should be preserved
    if (raw.memory) {
      expect(result.memory).toBe(raw.memory);
    }

    // Authors note should be preserved
    if (raw.authorsNote) {
      expect(result.authorsNote).toBe(raw.authorsNote);
    }
  });

  test.skipIf(adventureFiles.length === 0).each(adventureFiles)(
    "strips unnecessary fields from cards in %s",
    filePath => {
      const adventure = loadAdventure(filePath);
      const result = DungeonPreprocessor.preprocessAdventure(adventure);

      const allCards = [
        ...result.worldData.characters,
        ...result.worldData.locations,
        ...result.worldData.factions,
        ...result.worldData.items,
        ...result.worldData.classes
      ];

      for (const card of allCards) {
        // Should have essential fields
        expect(card).toHaveProperty("id");
        expect(card).toHaveProperty("type");
        expect(card).toHaveProperty("title");
        expect(card).toHaveProperty("value");

        // Should NOT have unnecessary fields
        expect(card).not.toHaveProperty("useForCharacterCreation");
        expect(card).not.toHaveProperty("description");
        expect(card).not.toHaveProperty("deletedAt");
      }
    }
  );
});
