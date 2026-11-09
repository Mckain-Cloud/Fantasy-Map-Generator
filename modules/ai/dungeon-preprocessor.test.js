/**
 * AI Dungeon Preprocessor - Unit Test Suite (Vitest)
 *
 * Tests for:
 * 1. Action filtering: undone/deleted actions removed
 * 2. Story card filtering: script cards removed, deleted cards removed
 * 3. Story card grouping: correct categorization by type
 * 4. Narrative concatenation: proper formatting with type prefixes
 * 5. Validation: format detection and error handling
 * 6. Token estimation: reasonable estimates
 * 7. Edge cases: empty data, missing fields, malformed input
 *
 * Run with: npm run test:unit:ai
 */

import {describe, test, expect} from "vitest";
import {DungeonPreprocessor} from "./dungeon-preprocessor.js";

// ============================================================================
// Mock Data Factory
// ============================================================================

function createMockAdventure(options = {}) {
  return {
    data: {
      adventure: {
        title: options.title || "Test Adventure",
        description: options.description || "A test adventure",
        tags: options.tags || ["fantasy", "adventure"],
        memory: options.memory || "The hero sets out on a quest.",
        details: options.details || {instructions: {scenario: "Test scenario instructions"}},
        instructions: options.instructions || null,
        authorsNote: options.authorsNote || "Author's note here",
        storyCards: options.storyCards || [],
        actionWindow: options.actionWindow || [],
        actionCount: options.actionCount || 0
      }
    }
  };
}

function createMockAction(id, text, type = "continue", undoneAt = null, deletedAt = null) {
  return {
    id: String(id),
    text,
    type,
    undoneAt,
    deletedAt,
    imageText: null,
    imageUrl: null,
    adventureId: "12345",
    decisionId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    shareUrl: ""
  };
}

function createMockStoryCard(id, type, title, value, keys = "", deletedAt = null) {
  return {
    id: String(id),
    type,
    title,
    value,
    keys,
    useForCharacterCreation: false,
    description: "Some description",
    deletedAt
  };
}

// ============================================================================
// Action Filtering Tests
// ============================================================================

describe("DungeonPreprocessor - Action Filtering", () => {
  test("filters out undone actions", () => {
    const actions = [
      createMockAction(0, "Valid action 1", "start"),
      createMockAction(1, "Undone action", "continue", "2024-01-01T00:00:00.000Z", null),
      createMockAction(2, "Valid action 2", "continue")
    ];

    const filtered = DungeonPreprocessor.filterValidActions(actions);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.id)).toEqual(["0", "2"]);
  });

  test("filters out deleted actions", () => {
    const actions = [
      createMockAction(0, "Valid action 1", "start"),
      createMockAction(1, "Deleted action", "continue", null, "2024-01-01T00:00:00.000Z"),
      createMockAction(2, "Valid action 2", "continue")
    ];

    const filtered = DungeonPreprocessor.filterValidActions(actions);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.id)).toEqual(["0", "2"]);
  });

  test("filters out actions that are both undone and deleted", () => {
    const actions = [
      createMockAction(0, "Valid action", "start"),
      createMockAction(1, "Both undone and deleted", "continue", "2024-01-01", "2024-01-02")
    ];

    const filtered = DungeonPreprocessor.filterValidActions(actions);

    expect(filtered).toHaveLength(1);
  });

  test("strips unnecessary fields from actions", () => {
    const actions = [createMockAction(0, "Test action", "start")];

    const filtered = DungeonPreprocessor.filterValidActions(actions);

    expect(filtered[0]).toHaveProperty("id");
    expect(filtered[0]).toHaveProperty("text");
    expect(filtered[0]).toHaveProperty("type");
    expect(filtered[0]).not.toHaveProperty("imageText");
    expect(filtered[0]).not.toHaveProperty("imageUrl");
    expect(filtered[0]).not.toHaveProperty("adventureId");
    expect(filtered[0]).not.toHaveProperty("createdAt");
  });

  test("handles empty action array", () => {
    const filtered = DungeonPreprocessor.filterValidActions([]);
    expect(filtered).toEqual([]);
  });

  test("handles null/undefined action array", () => {
    expect(DungeonPreprocessor.filterValidActions(null)).toEqual([]);
    expect(DungeonPreprocessor.filterValidActions(undefined)).toEqual([]);
  });
});

// ============================================================================
// Story Card Filtering Tests
// ============================================================================

describe("DungeonPreprocessor - Story Card Filtering", () => {
  test("filters out deleted story cards", () => {
    const cards = [
      createMockStoryCard(1, "character", "Hero", "The hero of the story"),
      createMockStoryCard(2, "character", "Deleted NPC", "A deleted character", "", "2024-01-01"),
      createMockStoryCard(3, "location", "Castle", "A grand castle")
    ];

    const filtered = DungeonPreprocessor.filterStoryCards(cards);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(c => c.title)).toEqual(["Hero", "Castle"]);
  });

  test("filters out Configure Auto-Cards script card", () => {
    const cards = [
      createMockStoryCard(1, "class", "Configure \nAuto-Cards", "Config settings..."),
      createMockStoryCard(2, "character", "Hero", "The hero")
    ];

    const filtered = DungeonPreprocessor.filterStoryCards(cards);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("Hero");
  });

  test("filters out Localized Languages script card", () => {
    const cards = [
      createMockStoryCard(1, "class", "Localized Languages", "Language config..."),
      createMockStoryCard(2, "location", "Town", "A small town")
    ];

    const filtered = DungeonPreprocessor.filterStoryCards(cards);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("Town");
  });

  test("strips unnecessary fields from story cards", () => {
    const cards = [createMockStoryCard(1, "character", "Hero", "The hero", "hero,protagonist")];

    const filtered = DungeonPreprocessor.filterStoryCards(cards);

    expect(filtered[0]).toHaveProperty("id");
    expect(filtered[0]).toHaveProperty("type");
    expect(filtered[0]).toHaveProperty("title");
    expect(filtered[0]).toHaveProperty("value");
    expect(filtered[0]).toHaveProperty("keys");
    expect(filtered[0]).not.toHaveProperty("useForCharacterCreation");
    expect(filtered[0]).not.toHaveProperty("description");
  });

  test("handles empty card array", () => {
    const filtered = DungeonPreprocessor.filterStoryCards([]);
    expect(filtered).toEqual([]);
  });
});

// ============================================================================
// Story Card Grouping Tests
// ============================================================================

describe("DungeonPreprocessor - Story Card Grouping", () => {
  test("groups cards by type correctly", () => {
    const cards = [
      {id: "1", type: "character", title: "Hero", value: "The hero", keys: ""},
      {id: "2", type: "character", title: "Villain", value: "The villain", keys: ""},
      {id: "3", type: "location", title: "Castle", value: "A castle", keys: ""},
      {id: "4", type: "faction", title: "Knights", value: "Noble knights", keys: ""},
      {id: "5", type: "item", title: "Sword", value: "Magic sword", keys: ""},
      {id: "6", type: "class", title: "Skill", value: "A skill", keys: ""}
    ];

    const grouped = DungeonPreprocessor.groupStoryCards(cards);

    expect(grouped.characters).toHaveLength(2);
    expect(grouped.locations).toHaveLength(1);
    expect(grouped.factions).toHaveLength(1);
    expect(grouped.items).toHaveLength(1);
    expect(grouped.classes).toHaveLength(1);
  });

  test("puts unknown types in classes group", () => {
    const cards = [{id: "1", type: "unknown_type", title: "Something", value: "Something", keys: ""}];

    const grouped = DungeonPreprocessor.groupStoryCards(cards);

    expect(grouped.classes).toHaveLength(1);
    expect(grouped.classes[0].title).toBe("Something");
  });

  test("handles cards with missing type", () => {
    const cards = [{id: "1", title: "No Type", value: "Value", keys: ""}];

    const grouped = DungeonPreprocessor.groupStoryCards(cards);

    expect(grouped.classes).toHaveLength(1);
  });

  test("handles empty array", () => {
    const grouped = DungeonPreprocessor.groupStoryCards([]);

    expect(grouped.characters).toEqual([]);
    expect(grouped.locations).toEqual([]);
    expect(grouped.factions).toEqual([]);
    expect(grouped.items).toEqual([]);
    expect(grouped.classes).toEqual([]);
  });
});

// ============================================================================
// Narrative Concatenation Tests
// ============================================================================

describe("DungeonPreprocessor - Narrative Concatenation", () => {
  test("adds correct prefix for start actions", () => {
    const actions = [{id: "0", text: "The adventure begins.", type: "start"}];

    const narrative = DungeonPreprocessor.concatenateNarrative(actions);

    expect(narrative).toBe("[SCENE] The adventure begins.");
  });

  test("adds no prefix for continue actions", () => {
    const actions = [{id: "0", text: "The story continues.", type: "continue"}];

    const narrative = DungeonPreprocessor.concatenateNarrative(actions);

    expect(narrative).toBe("The story continues.");
  });

  test("adds > prefix for say actions", () => {
    const actions = [{id: "0", text: '"Hello," you say.', type: "say"}];

    const narrative = DungeonPreprocessor.concatenateNarrative(actions);

    expect(narrative).toBe('> "Hello," you say.');
  });

  test("adds * prefix for do actions", () => {
    const actions = [{id: "0", text: "You draw your sword.", type: "do"}];

    const narrative = DungeonPreprocessor.concatenateNarrative(actions);

    expect(narrative).toBe("* You draw your sword.");
  });

  test("joins multiple actions with double newlines", () => {
    const actions = [
      {id: "0", text: "Scene begins.", type: "start"},
      {id: "1", text: "Action happens.", type: "continue"},
      {id: "2", text: "You speak.", type: "say"}
    ];

    const narrative = DungeonPreprocessor.concatenateNarrative(actions);

    expect(narrative).toBe("[SCENE] Scene begins.\n\nAction happens.\n\n> You speak.");
  });

  test("handles empty array", () => {
    const narrative = DungeonPreprocessor.concatenateNarrative([]);
    expect(narrative).toBe("");
  });

  test("handles null/undefined", () => {
    expect(DungeonPreprocessor.concatenateNarrative(null)).toBe("");
    expect(DungeonPreprocessor.concatenateNarrative(undefined)).toBe("");
  });
});

// ============================================================================
// Format Validation Tests
// ============================================================================

describe("DungeonPreprocessor - Format Validation", () => {
  test("validates correct AI Dungeon format", () => {
    const adventure = createMockAdventure({
      actionWindow: [createMockAction(0, "Test", "start")],
      storyCards: [createMockStoryCard(1, "character", "Hero", "The hero")]
    });

    const result = DungeonPreprocessor.validateAdventureFormat(adventure);

    expect(result.valid).toBe(true);
  });

  test("rejects missing adventure data", () => {
    const result = DungeonPreprocessor.validateAdventureFormat({});

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing actionWindow and storyCards");
  });

  test("rejects adventure without actionWindow and storyCards", () => {
    const result = DungeonPreprocessor.validateAdventureFormat({data: {adventure: {title: "Test"}}});

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing actionWindow and storyCards");
  });

  test("accepts adventure with only actionWindow", () => {
    const adventure = {data: {adventure: {actionWindow: []}}};
    const result = DungeonPreprocessor.validateAdventureFormat(adventure);
    expect(result.valid).toBe(true);
  });

  test("accepts adventure with only storyCards", () => {
    const adventure = {data: {adventure: {storyCards: []}}};
    const result = DungeonPreprocessor.validateAdventureFormat(adventure);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Full Preprocessing Tests
// ============================================================================

describe("DungeonPreprocessor - Full Preprocessing", () => {
  test("preprocesses complete adventure correctly", () => {
    const adventure = createMockAdventure({
      title: "Epic Quest",
      description: "An epic adventure",
      tags: ["fantasy", "quest"],
      memory: "The hero seeks the artifact.",
      storyCards: [
        createMockStoryCard(1, "character", "Hero", "The brave hero", "hero,brave"),
        createMockStoryCard(2, "location", "Castle", "A grand castle"),
        createMockStoryCard(3, "faction", "Knights", "Noble knights")
      ],
      actionWindow: [
        createMockAction(0, "You awaken in a dark cave.", "start"),
        createMockAction(1, "A light flickers in the distance.", "continue"),
        createMockAction(2, "This action was undone", "do", "2024-01-01", null),
        createMockAction(3, '"Who goes there?" you call out.', "say")
      ]
    });

    const result = DungeonPreprocessor.preprocessAdventure(adventure);

    expect(result.version).toBe("1.0");
    expect(result.meta.title).toBe("Epic Quest");
    expect(result.meta.description).toBe("An epic adventure");
    expect(result.meta.tags).toEqual(["fantasy", "quest"]);
    expect(result.meta.totalActions).toBe(4);
    expect(result.meta.validActions).toBe(3);
    expect(result.meta.storyCardCount).toBe(3);
    expect(result.meta.estimatedTokens).toBeGreaterThan(0);
    expect(result.memory).toBe("The hero seeks the artifact.");
    expect(result.worldData.characters).toHaveLength(1);
    expect(result.worldData.locations).toHaveLength(1);
    expect(result.worldData.factions).toHaveLength(1);
    expect(result.narrative).toContain("[SCENE] You awaken");
    expect(result.narrative).not.toContain("undone");
  });

  test("handles unwrapped adventure format", () => {
    const adventure = {
      title: "Direct Adventure",
      storyCards: [createMockStoryCard(1, "character", "Hero", "The hero")],
      actionWindow: [createMockAction(0, "Start", "start")]
    };

    const result = DungeonPreprocessor.preprocessAdventure(adventure);

    expect(result.meta.title).toBe("Direct Adventure");
  });

  test("returns empty result for minimal input", () => {
    // Empty object gets processed with defaults
    const result = DungeonPreprocessor.preprocessAdventure({});

    expect(result.meta.title).toBe("Untitled Adventure");
    expect(result.meta.validActions).toBe(0);
    expect(result.meta.storyCardCount).toBe(0);
  });

  test("preserves details, instructions, and authorsNote", () => {
    const adventure = createMockAdventure({
      details: {instructions: {scenario: "Custom instructions"}},
      instructions: "Direct instructions",
      authorsNote: "Author note"
    });

    const result = DungeonPreprocessor.preprocessAdventure(adventure);

    expect(result.details).toEqual({instructions: {scenario: "Custom instructions"}});
    expect(result.instructions).toBe("Direct instructions");
    expect(result.authorsNote).toBe("Author note");
  });
});

// ============================================================================
// Token Estimation Tests
// ============================================================================

describe("DungeonPreprocessor - Token Estimation", () => {
  test("estimates tokens for string", () => {
    const text = "This is a test string with some words.";
    const tokens = DungeonPreprocessor.estimateTokens(text);

    // ~4 chars per token, 38 chars should be ~10 tokens
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(20);
  });

  test("estimates tokens for object", () => {
    const obj = {name: "Test", value: "Some longer text here"};
    const tokens = DungeonPreprocessor.estimateTokens(obj);

    expect(tokens).toBeGreaterThan(0);
  });
});

// ============================================================================
// Script Card Detection Tests
// ============================================================================

describe("DungeonPreprocessor - Script Card Detection", () => {
  test("detects Configure card", () => {
    const card = {title: "Configure \nAuto-Cards"};
    expect(DungeonPreprocessor.isScriptCard(card)).toBe(true);
  });

  test("detects Auto-Cards variations", () => {
    expect(DungeonPreprocessor.isScriptCard({title: "auto-cards settings"})).toBe(true);
    expect(DungeonPreprocessor.isScriptCard({title: "AUTO-CARDS"})).toBe(true);
  });

  test("detects Localized Languages", () => {
    expect(DungeonPreprocessor.isScriptCard({title: "Localized Languages"})).toBe(true);
  });

  test("does not detect regular cards", () => {
    expect(DungeonPreprocessor.isScriptCard({title: "Hero"})).toBe(false);
    expect(DungeonPreprocessor.isScriptCard({title: "Dark Castle"})).toBe(false);
  });

  test("handles missing title", () => {
    expect(DungeonPreprocessor.isScriptCard({})).toBe(false);
    expect(DungeonPreprocessor.isScriptCard({title: null})).toBe(false);
  });
});
