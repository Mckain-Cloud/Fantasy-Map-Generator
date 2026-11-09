/**
 * AI Dungeon Importer Prompts - Unit Tests (Vitest)
 *
 * Tests for:
 * 1. SYSTEM_PROMPT existence and structure
 * 2. EXPANSION_PROMPTS variants (strict, moderate, expansive)
 * 3. SCHEMA structure and validation
 * 4. buildUserMessage function output formatting
 *
 * Run with: npm run test:unit:ai
 */

import {describe, test, expect} from "vitest";
import {DungeonImporterPrompts} from "./dungeon-importer-prompts.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("DungeonImporterPrompts - Constants", () => {
  describe("SYSTEM_PROMPT", () => {
    test("should be a non-empty string", () => {
      expect(typeof DungeonImporterPrompts.SYSTEM_PROMPT).toBe("string");
      expect(DungeonImporterPrompts.SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    test("should contain key instructions", () => {
      const prompt = DungeonImporterPrompts.SYSTEM_PROMPT;

      expect(prompt).toContain("AI Dungeon");
      expect(prompt).toContain("fantasy map generator");
    });

    test("should list entity types to generate", () => {
      const prompt = DungeonImporterPrompts.SYSTEM_PROMPT;

      expect(prompt).toContain("States");
      expect(prompt).toContain("Cultures");
      expect(prompt).toContain("Religions");
      expect(prompt).toContain("Markers");
      expect(prompt).toContain("Notes");
      expect(prompt).toContain("Military");
      expect(prompt).toContain("Diplomacy");
    });

    test("should describe input format", () => {
      const prompt = DungeonImporterPrompts.SYSTEM_PROMPT;

      expect(prompt).toContain("Adventure Metadata");
      expect(prompt).toContain("Memory Context");
      expect(prompt).toContain("World Data");
      expect(prompt).toContain("Narrative");
    });
  });

  describe("EXPANSION_PROMPTS", () => {
    test("should have all three expansion levels", () => {
      expect(DungeonImporterPrompts.EXPANSION_PROMPTS).toHaveProperty("strict");
      expect(DungeonImporterPrompts.EXPANSION_PROMPTS).toHaveProperty("moderate");
      expect(DungeonImporterPrompts.EXPANSION_PROMPTS).toHaveProperty("expansive");
    });

    test("strict prompt should emphasize only explicit content", () => {
      const strict = DungeonImporterPrompts.EXPANSION_PROMPTS.strict;

      expect(strict).toContain("STRICT");
      expect(strict).toContain("explicitly");
      expect(strict).toMatch(/do not (infer|extrapolate|create)/i);
    });

    test("moderate prompt should allow reasonable gaps", () => {
      const moderate = DungeonImporterPrompts.EXPANSION_PROMPTS.moderate;

      expect(moderate).toContain("MODERATE");
      expect(moderate).toContain("reasonable gaps");
      expect(moderate).toContain("minimal");
    });

    test("expansive prompt should encourage world-building", () => {
      const expansive = DungeonImporterPrompts.EXPANSION_PROMPTS.expansive;

      expect(expansive).toContain("EXPANSIVE");
      expect(expansive).toContain("logical implications");
      expect(expansive).toContain("complete");
    });
  });

  describe("SCHEMA", () => {
    test("should have valid JSON Schema structure", () => {
      const schema = DungeonImporterPrompts.SCHEMA;

      expect(schema).toHaveProperty("name", "dungeon_import_response");
      expect(schema).toHaveProperty("strict", true);
      expect(schema).toHaveProperty("schema");
      expect(schema.schema).toHaveProperty("type", "object");
      expect(schema.schema).toHaveProperty("properties");
      expect(schema.schema).toHaveProperty("required");
    });

    test("should require worldAnalysis", () => {
      const props = DungeonImporterPrompts.SCHEMA.schema.properties;
      const required = DungeonImporterPrompts.SCHEMA.schema.required;

      expect(props).toHaveProperty("worldAnalysis");
      expect(required).toContain("worldAnalysis");
    });

    test("should require all entity arrays", () => {
      const required = DungeonImporterPrompts.SCHEMA.schema.required;

      expect(required).toContain("states");
      expect(required).toContain("cultures");
      expect(required).toContain("religions");
      expect(required).toContain("markers");
      expect(required).toContain("notes");
      expect(required).toContain("military");
      expect(required).toContain("diplomacy");
    });

    test("worldAnalysis should have required fields", () => {
      const worldAnalysis = DungeonImporterPrompts.SCHEMA.schema.properties.worldAnalysis;

      expect(worldAnalysis.required).toContain("summary");
      expect(worldAnalysis.required).toContain("setting");
      expect(worldAnalysis.required).toContain("themes");
      expect(worldAnalysis.required).toContain("timeframe");
    });

    test("states schema should have action enum", () => {
      const states = DungeonImporterPrompts.SCHEMA.schema.properties.states;

      expect(states.type).toBe("array");
      expect(states.items.properties.action.enum).toContain("create");
      expect(states.items.properties.action.enum).toContain("update");
    });

    test("diplomacy schema should require state names and relation", () => {
      const diplomacy = DungeonImporterPrompts.SCHEMA.schema.properties.diplomacy;

      expect(diplomacy.items.required).toContain("state1Name");
      expect(diplomacy.items.required).toContain("state2Name");
      expect(diplomacy.items.required).toContain("relation");
      expect(diplomacy.items.required).toContain("reasoning");
    });
  });
});

// ============================================================================
// buildUserMessage Tests
// ============================================================================

describe("DungeonImporterPrompts - buildUserMessage", () => {
  // Helper to create mock preprocessed data
  function createMockPreprocessed(overrides = {}) {
    return {
      meta: {
        title: overrides.title || "Test Adventure",
        description: overrides.description || "A test description",
        tags: overrides.tags || ["fantasy", "quest"]
      },
      memory: overrides.memory || "The hero remembers the quest.",
      details: overrides.details || {
        instructions: {scenario: "Test scenario instructions"}
      },
      authorsNote: overrides.authorsNote || "Test author note",
      worldData: overrides.worldData || {
        characters: [{title: "Hero", type: "character", keys: "hero", value: "The brave hero"}],
        locations: [{title: "Castle", type: "location", keys: "castle", value: "A grand castle"}],
        factions: [{title: "Knights", type: "faction", keys: "knights", value: "Noble knights"}],
        items: [{title: "Sword", type: "item", keys: "sword", value: "Magic sword"}],
        classes: []
      },
      narrative: overrides.narrative || "[SCENE] The adventure begins.\n\nThe hero ventures forth."
    };
  }

  // Helper to create mock map context
  function createMockMapContext(overrides = {}) {
    return {
      states: overrides.states || ["1: Kingdom of Test", "2: Duchy of Example"],
      cultures: overrides.cultures || ["1: Human Culture", "2: Elven Culture"],
      religions: overrides.religions || ["1: Temple of Light"],
      mapWidth: overrides.mapWidth || 1920,
      mapHeight: overrides.mapHeight || 1080
    };
  }

  test("should return a string", () => {
    const preprocessed = createMockPreprocessed();
    const mapContext = createMockMapContext();

    const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(100);
  });

  test("should include adventure metadata", () => {
    const preprocessed = createMockPreprocessed({
      title: "Epic Quest",
      description: "An epic adventure",
      tags: ["epic", "fantasy"]
    });
    const mapContext = createMockMapContext();

    const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

    expect(message).toContain("Epic Quest");
    expect(message).toContain("An epic adventure");
    expect(message).toContain("epic, fantasy");
  });

  test("should include memory context", () => {
    const preprocessed = createMockPreprocessed({
      memory: "The hero remembers their fallen comrades."
    });
    const mapContext = createMockMapContext();

    const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

    expect(message).toContain("The hero remembers their fallen comrades.");
  });

  test("should include world data cards", () => {
    const preprocessed = createMockPreprocessed({
      worldData: {
        characters: [{title: "Sir Galahad", type: "character", keys: "knight", value: "Noble knight"}],
        locations: [{title: "Dragon Keep", type: "location", keys: "castle", value: "Dark fortress"}],
        factions: [],
        items: [],
        classes: []
      }
    });
    const mapContext = createMockMapContext();

    const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

    expect(message).toContain("Sir Galahad");
    expect(message).toContain("Dragon Keep");
    expect(message).toContain("Characters (1)");
    expect(message).toContain("Locations (1)");
  });

  test("should include narrative content", () => {
    const preprocessed = createMockPreprocessed({
      narrative: "[SCENE] The battle begins.\n\n* You draw your sword."
    });
    const mapContext = createMockMapContext();

    const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

    expect(message).toContain("The battle begins");
    expect(message).toContain("draw your sword");
  });

  test("should include map context", () => {
    const preprocessed = createMockPreprocessed();
    const mapContext = createMockMapContext({
      states: ["1: Empire of the Sun", "2: Northern Kingdom"],
      cultures: ["1: Desert Nomads"],
      mapWidth: 3000,
      mapHeight: 2000
    });

    const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

    expect(message).toContain("Empire of the Sun");
    expect(message).toContain("Northern Kingdom");
    expect(message).toContain("Desert Nomads");
    expect(message).toContain("3000");
    expect(message).toContain("2000");
  });

  describe("Expansion levels", () => {
    test("should default to moderate expansion", () => {
      const preprocessed = createMockPreprocessed();
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext, {});

      expect(message).toContain("MODERATE");
    });

    test("should use strict expansion when specified", () => {
      const preprocessed = createMockPreprocessed();
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext, {
        expansionLevel: "strict"
      });

      expect(message).toContain("STRICT");
      expect(message).not.toContain("MODERATE");
    });

    test("should use expansive expansion when specified", () => {
      const preprocessed = createMockPreprocessed();
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext, {
        expansionLevel: "expansive"
      });

      expect(message).toContain("EXPANSIVE");
    });
  });

  describe("Entity options", () => {
    test("should include all entity types by default", () => {
      const preprocessed = createMockPreprocessed();
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext, {});

      expect(message).toContain("States");
      expect(message).toContain("Cultures");
      expect(message).toContain("Religions");
      expect(message).toContain("Markers");
      expect(message).toContain("Notes");
      expect(message).toContain("Military");
      expect(message).toContain("Diplomacy");
    });

    test("should handle missing options gracefully", () => {
      const preprocessed = createMockPreprocessed();
      const mapContext = createMockMapContext();

      // Should not throw with undefined options
      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

      expect(typeof message).toBe("string");
    });
  });

  describe("Edge cases", () => {
    test("should handle empty world data", () => {
      const preprocessed = createMockPreprocessed({
        worldData: {
          characters: [],
          locations: [],
          factions: [],
          items: [],
          classes: []
        }
      });
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

      expect(message).toContain("Characters (0)");
      expect(message).toContain("None");
    });

    test("should handle missing map context properties", () => {
      const preprocessed = createMockPreprocessed();
      const mapContext = {
        states: null,
        cultures: undefined
      };

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

      expect(message).toContain("No existing states");
      expect(message).toContain("No existing cultures");
    });

    test("should handle empty narrative", () => {
      const preprocessed = createMockPreprocessed({
        narrative: ""
      });
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

      // Empty narrative results in empty string in the Narrative section
      expect(message).toContain("## Narrative");
      // Should still produce valid output
      expect(typeof message).toBe("string");
    });

    test("should truncate long card values", () => {
      const longValue = "A".repeat(1000);
      const preprocessed = createMockPreprocessed({
        worldData: {
          characters: [{title: "Hero", type: "character", keys: "", value: longValue}],
          locations: [],
          factions: [],
          items: [],
          classes: []
        }
      });
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

      // Should truncate at 500 chars with ellipsis
      expect(message).toContain("...");
      expect(message.includes(longValue)).toBe(false);
    });

    test("should handle missing details/instructions", () => {
      const preprocessed = createMockPreprocessed({
        details: null
      });
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

      // Should still produce valid output even with null details
      expect(message).toContain("## Scenario Setup");
      expect(typeof message).toBe("string");
    });

    test("should include authorsNote when present", () => {
      const preprocessed = createMockPreprocessed({
        authorsNote: "Important author note about the story"
      });
      const mapContext = createMockMapContext();

      const message = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext);

      expect(message).toContain("Important author note about the story");
    });
  });
});
