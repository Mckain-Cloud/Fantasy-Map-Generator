"use strict";

/**
 * AI Dungeon Adventure Preprocessor
 *
 * Transforms AI Dungeon adventure JSON exports into a cleaner format
 * suitable for LLM consumption by filtering unnecessary data and
 * organizing story content.
 */

// Script/config card titles to filter out
const FILTERED_CARD_TITLES = ["Configure", "Auto-Cards", "Localized Languages"];

/**
 * Check if a story card is a script/config card that should be filtered
 * @param {Object} card - Story card object
 * @returns {boolean} True if card should be filtered out
 */
function isScriptCard(card) {
  if (!card.title) return false;
  const title = card.title.toLowerCase();
  return FILTERED_CARD_TITLES.some(filter => title.includes(filter.toLowerCase()));
}

/**
 * Filter valid actions from actionWindow
 * Removes actions that have been undone or deleted
 * @param {Array} actions - Raw actionWindow array
 * @returns {Array} Filtered actions with only essential fields
 */
function filterValidActions(actions) {
  if (!Array.isArray(actions)) return [];

  return actions
    .filter(action => action.undoneAt === null && action.deletedAt === null)
    .map(action => ({
      id: action.id,
      text: action.text,
      type: action.type
    }));
}

/**
 * Filter and clean story cards
 * Removes deleted cards and script/config cards
 * @param {Array} cards - Raw storyCards array
 * @returns {Array} Filtered cards with only essential fields
 */
function filterStoryCards(cards) {
  if (!Array.isArray(cards)) return [];

  return cards
    .filter(card => card.deletedAt === null && !isScriptCard(card))
    .map(card => ({
      id: card.id,
      type: card.type,
      title: card.title,
      value: card.value,
      keys: card.keys
    }));
}

/**
 * Group story cards by type
 * @param {Array} cards - Filtered story cards
 * @returns {Object} Cards organized by type
 */
function groupStoryCards(cards) {
  const groups = {
    characters: [],
    locations: [],
    factions: [],
    items: [],
    classes: []
  };

  for (const card of cards) {
    const type = card.type?.toLowerCase() || "class";

    // Map AI Dungeon types to our groups
    if (type === "character") {
      groups.characters.push(card);
    } else if (type === "location") {
      groups.locations.push(card);
    } else if (type === "faction") {
      groups.factions.push(card);
    } else if (type === "item") {
      groups.items.push(card);
    } else {
      // Default to classes for "class" type and unknown types
      groups.classes.push(card);
    }
  }

  return groups;
}

/**
 * Concatenate action texts into a single narrative string
 * Adds type prefixes for context
 * @param {Array} actions - Filtered actions
 * @returns {string} Concatenated narrative
 */
function concatenateNarrative(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return "";

  return actions
    .map(action => {
      const prefix = getTypePrefix(action.type);
      return `${prefix}${action.text}`;
    })
    .join("\n\n");
}

/**
 * Get narrative prefix based on action type
 * @param {string} type - Action type
 * @returns {string} Prefix string
 */
function getTypePrefix(type) {
  const prefixes = {
    start: "[SCENE] ",
    continue: "",
    say: "> ",
    do: "* "
  };
  return prefixes[type] || "";
}

/**
 * Estimate token count for a string
 * Uses rough heuristic of ~4 characters per token
 * @param {string|Object} data - Data to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return Math.ceil(str.length / 4);
}

/**
 * Main preprocessing function
 * Transforms raw AI Dungeon adventure JSON into clean format
 * @param {Object} raw - Raw AI Dungeon adventure JSON
 * @returns {Object} Preprocessed adventure data
 */
function preprocessAdventure(raw) {
  // Handle both wrapped and unwrapped formats
  const adventure = raw?.data?.adventure || raw?.adventure || raw;

  if (!adventure) {
    throw new Error("Invalid AI Dungeon format: could not find adventure data");
  }

  // Filter and process actions
  const validActions = filterValidActions(adventure.actionWindow || []);

  // Filter and group story cards
  const filteredCards = filterStoryCards(adventure.storyCards || []);
  const worldData = groupStoryCards(filteredCards);

  // Concatenate narrative
  const narrative = concatenateNarrative(validActions);

  // Build result
  const result = {
    version: "1.0",
    meta: {
      title: adventure.title || "Untitled Adventure",
      description: adventure.description || "",
      tags: adventure.tags || [],
      totalActions: adventure.actionWindow?.length || 0,
      validActions: validActions.length,
      storyCardCount: filteredCards.length,
      estimatedTokens: 0
    },
    // Keep scenario setup info
    details: adventure.details || null,
    instructions: adventure.instructions || null,
    authorsNote: adventure.authorsNote || "",
    // Core content
    memory: adventure.memory || "",
    worldData,
    narrative
  };

  // Calculate token estimate
  result.meta.estimatedTokens = estimateTokens(result);

  return result;
}

/**
 * Validate that input is a valid AI Dungeon adventure format
 * @param {Object} raw - Raw JSON to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validateAdventureFormat(raw) {
  const adventure = raw?.data?.adventure || raw?.adventure || raw;

  if (!adventure) {
    return {valid: false, error: "Could not find adventure data in JSON"};
  }

  if (!adventure.actionWindow && !adventure.storyCards) {
    return {valid: false, error: "Missing actionWindow and storyCards - not a valid AI Dungeon export"};
  }

  return {valid: true};
}

// Export for ES modules
export const DungeonPreprocessor = {
  preprocessAdventure,
  validateAdventureFormat,
  filterValidActions,
  filterStoryCards,
  groupStoryCards,
  concatenateNarrative,
  estimateTokens,
  isScriptCard,
  FILTERED_CARD_TITLES
};

// Window exposure for browser compatibility
if (typeof window !== "undefined") {
  window.DungeonPreprocessor = DungeonPreprocessor;
}
