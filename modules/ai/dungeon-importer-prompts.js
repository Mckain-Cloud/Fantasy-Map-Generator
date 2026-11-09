"use strict";

/**
 * AI Dungeon Importer - System Prompts and JSON Schema
 *
 * Prompts and schema for extracting world-building data from
 * AI Dungeon adventures to generate Fantasy Map Generator entities.
 */

// ============================================================================
// Expansion Level Prompts
// ============================================================================

const EXPANSION_PROMPTS = {
  strict: `EXPANSION LEVEL: STRICT
Only create entities that are explicitly named or described in the adventure. Do not infer, extrapolate, or create anything not directly mentioned. If only 3 cities are named, only create 3 cities. If only one faction exists, only create one faction. Stick exactly to what the source material provides.`,

  moderate: `EXPANSION LEVEL: MODERATE
Create entities explicitly mentioned in the adventure. You may also fill in reasonable gaps - for example, if a kingdom is mentioned but no capital city, you may infer one. If characters belong to an organization, create that faction. Keep additions minimal and directly supported by context.`,

  expansive: `EXPANSION LEVEL: EXPANSIVE
Create entities mentioned in the adventure and expand the world based on logical implications. Trade routes imply merchant towns, wars imply border fortifications, religions imply temples, noble houses imply estates. Flesh out the world to feel complete and lived-in while staying consistent with the adventure's tone and setting. Create additional locations, factions, and cultural details that would logically exist.`
};

// ============================================================================
// Main System Prompt
// ============================================================================

const DUNGEON_IMPORT_SYSTEM_PROMPT = `You are analyzing an AI Dungeon adventure to extract world-building data for a fantasy map generator. Your task is to identify and catalog all world elements from the narrative and story cards, then generate map entities.

## Input Format
You will receive:
1. **Adventure Metadata**: Title, description, tags, and scenario setup
2. **Memory Context**: Summary of key story elements
3. **World Data**: Organized story cards for characters, locations, factions, items
4. **Narrative**: The actual story text showing events and interactions
5. **Current Map**: Existing states, cultures, and geographic features on the map

## Your Task
Extract world-building elements and generate Fantasy Map Generator entities:

### Entity Types to Generate:
1. **States**: Political entities (kingdoms, empires, city-states, clans)
   - Map factions/organizations to states
   - Consider territorial implications from the narrative

2. **Cultures**: Ethnic/cultural groups
   - Derive from character backgrounds and faction characteristics
   - Consider language, customs, and traditions mentioned

3. **Religions**: Spiritual/magical belief systems
   - Extract from deity mentions, temples, rituals, magic systems
   - Consider folk beliefs vs organized religions

4. **Markers**: Points of interest on the map
   - Important locations: castles, ruins, dungeons, towers
   - Natural features: mountains, forests, rivers mentioned
   - Battlefields, sacred sites, mysterious locations

5. **Notes**: Lore entries for map annotations
   - Historical events mentioned in the narrative
   - Character backgrounds and relationships
   - World history and legends

6. **Military**: Army/unit positions (if conflicts mentioned)
   - Extract from battles, wars, military forces described

7. **Diplomacy**: Relations between states
   - Derive from faction relationships in the story
   - Wars, alliances, trade relationships, rivalries

## Important Guidelines
1. Use existing map states/cultures when they match adventure content
2. Create new entities only when necessary
3. Place markers near relevant existing locations when possible
4. Maintain consistency with the adventure's tone and setting
5. Include reasoning for each entity to help the user understand the connection`;

// ============================================================================
// JSON Schema for Response
// ============================================================================

const DUNGEON_IMPORT_SCHEMA = {
  name: "dungeon_import_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      worldAnalysis: {
        type: "object",
        properties: {
          summary: {type: "string"},
          setting: {type: "string"},
          themes: {type: "array", items: {type: "string"}},
          timeframe: {type: "string"}
        },
        required: ["summary", "setting", "themes", "timeframe"],
        additionalProperties: false
      },
      states: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: {type: "string", enum: ["create", "update"]},
            i: {type: "number"},
            name: {type: "string"},
            form: {type: "string"},
            description: {type: "string"},
            sourceEntity: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["action", "name", "reasoning"],
          additionalProperties: false
        }
      },
      cultures: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: {type: "string", enum: ["create", "update"]},
            i: {type: "number"},
            name: {type: "string"},
            type: {type: "string"},
            description: {type: "string"},
            sourceEntity: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["action", "name", "reasoning"],
          additionalProperties: false
        }
      },
      religions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: {type: "string", enum: ["create", "update"]},
            i: {type: "number"},
            name: {type: "string"},
            type: {type: "string"},
            form: {type: "string"},
            description: {type: "string"},
            sourceEntity: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["action", "name", "reasoning"],
          additionalProperties: false
        }
      },
      markers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {type: "string"},
            name: {type: "string"},
            icon: {type: "string"},
            nearStateId: {type: "number"},
            description: {type: "string"},
            sourceEntity: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["type", "name", "reasoning"],
          additionalProperties: false
        }
      },
      notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {type: "string"},
            name: {type: "string"},
            legend: {type: "string"},
            category: {type: "string"},
            sourceEntity: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["id", "name", "legend", "reasoning"],
          additionalProperties: false
        }
      },
      military: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {type: "string"},
            stateId: {type: "number"},
            strength: {type: "number"},
            description: {type: "string"},
            sourceEntity: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["name", "reasoning"],
          additionalProperties: false
        }
      },
      diplomacy: {
        type: "array",
        items: {
          type: "object",
          properties: {
            state1Name: {type: "string"},
            state2Name: {type: "string"},
            relation: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["state1Name", "state2Name", "relation", "reasoning"],
          additionalProperties: false
        }
      }
    },
    required: ["worldAnalysis", "states", "cultures", "religions", "markers", "notes", "military", "diplomacy"],
    additionalProperties: false
  }
};

// ============================================================================
// User Message Builder
// ============================================================================

/**
 * Build the user message for the AI from preprocessed adventure data
 * @param {Object} preprocessed - Preprocessed adventure from DungeonPreprocessor
 * @param {Object} mapContext - Current map context from DataLayer
 * @param {Object} options - Import options
 * @returns {string} Formatted user message
 */
function buildUserMessage(preprocessed, mapContext, options = {}) {
  const expansionLevel = options.expansionLevel || "moderate";
  const expansionPrompt = EXPANSION_PROMPTS[expansionLevel] || EXPANSION_PROMPTS.moderate;

  let message = `## Adventure Information

**Title:** ${preprocessed.meta.title}
**Description:** ${preprocessed.meta.description || "No description"}
**Tags:** ${preprocessed.meta.tags?.join(", ") || "None"}

## Memory Context
${preprocessed.memory || "No memory context provided."}

## Scenario Setup
${formatDetails(preprocessed.details)}
${preprocessed.authorsNote ? `\n**Author's Note:** ${preprocessed.authorsNote}` : ""}

## World Data from Story Cards

### Characters (${preprocessed.worldData.characters.length})
${formatCards(preprocessed.worldData.characters)}

### Locations (${preprocessed.worldData.locations.length})
${formatCards(preprocessed.worldData.locations)}

### Factions (${preprocessed.worldData.factions.length})
${formatCards(preprocessed.worldData.factions)}

### Items (${preprocessed.worldData.items.length})
${formatCards(preprocessed.worldData.items)}

### Other (${preprocessed.worldData.classes.length})
${formatCards(preprocessed.worldData.classes)}

## Narrative
${preprocessed.narrative || "No narrative content."}

---

## Current Map State

### Existing States
${mapContext.states?.join("\n") || "No existing states"}

### Existing Cultures
${mapContext.cultures?.join("\n") || "No existing cultures"}

### Existing Religions
${mapContext.religions?.join("\n") || "No existing religions"}

### Map Info
- Dimensions: ${mapContext.mapWidth || "unknown"} x ${mapContext.mapHeight || "unknown"}
- Total states: ${mapContext.states?.length || 0}
- Total cultures: ${mapContext.cultures?.length || 0}

---

${expansionPrompt}

## Entity Types to Include
${formatEntityOptions(options)}

Please analyze the adventure and generate map entities. Include reasoning for each entity to explain its connection to the source material.`;

  return message;
}

/**
 * Format story cards for display
 */
function formatCards(cards) {
  if (!cards || cards.length === 0) return "None";

  return cards
    .map(card => {
      let text = `**${card.title}** (${card.type || "unknown"})`;
      if (card.keys) text += `\n  Keywords: ${card.keys}`;
      if (card.value) text += `\n  ${card.value.substring(0, 500)}${card.value.length > 500 ? "..." : ""}`;
      return text;
    })
    .join("\n\n");
}

/**
 * Format scenario details
 */
function formatDetails(details) {
  if (!details) return "No scenario details.";

  let text = "";
  if (details.instructions?.scenario) {
    text += `**Scenario Instructions:**\n${details.instructions.scenario.substring(0, 1000)}`;
  }
  if (details.storySummary) {
    text += `\n\n**Story Summary:** ${details.storySummary}`;
  }
  return text || "No scenario details.";
}

/**
 * Format entity options for the prompt
 */
function formatEntityOptions(options) {
  const types = [];
  if (options.includeStates !== false) types.push("- States (political entities)");
  if (options.includeCultures !== false) types.push("- Cultures (ethnic/cultural groups)");
  if (options.includeReligions !== false) types.push("- Religions (belief systems)");
  if (options.includeMarkers !== false) types.push("- Markers (points of interest)");
  if (options.includeNotes !== false) types.push("- Notes (lore entries)");
  if (options.includeMilitary !== false) types.push("- Military (if wars/armies mentioned)");
  if (options.includeDiplomacy !== false) types.push("- Diplomacy (faction relations)");

  return types.join("\n") || "All entity types";
}

// ============================================================================
// Exports
// ============================================================================

export const DungeonImporterPrompts = {
  SYSTEM_PROMPT: DUNGEON_IMPORT_SYSTEM_PROMPT,
  EXPANSION_PROMPTS,
  SCHEMA: DUNGEON_IMPORT_SCHEMA,
  buildUserMessage
};

// Window exposure for browser compatibility
if (typeof window !== "undefined") {
  window.DungeonImporterPrompts = DungeonImporterPrompts;
}
