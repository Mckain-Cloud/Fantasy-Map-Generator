/**
 * Quick test script to run the AI Dungeon importer against a real adventure
 * Uses the same SDK and pattern as the actual API
 * Run with: node test-dungeon-import.js
 */

import {readFileSync} from "fs";
import {config} from "dotenv";
import {OpenRouter} from "@openrouter/sdk";
import {DungeonPreprocessor} from "./modules/ai/dungeon-preprocessor.js";
import {DungeonImporterPrompts} from "./modules/ai/dungeon-importer-prompts.js";

config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

// Initialize OpenRouter SDK (same as api.js)
const openRouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://azgaar.github.io/Fantasy-Map-Generator",
    "X-Title": "Fantasy Map Generator"
  }
});

// Use Gemini Flash as requested
const MODEL = "google/gemini-2.5-flash";

async function runWithExpansionLevel(preprocessed, mapContext, level) {
  const userMessage = DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext, {
    expansionLevel: level
  });

  const completion = await openRouter.chat.send({
    model: MODEL,
    messages: [
      {role: "system", content: DungeonImporterPrompts.SYSTEM_PROMPT},
      {role: "user", content: userMessage}
    ],
    responseFormat: {
      type: "json_schema",
      jsonSchema: DungeonImporterPrompts.SCHEMA
    },
    temperature: 0.5,
    maxTokens: 8192,
    stream: false
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in response");

  return {
    parsed: JSON.parse(content),
    usage: completion.usage
  };
}

async function testDungeonImport() {
  // Load the orc adventure (newer version with more content)
  const adventurePath = "./json/Betrothed to an Ork!_cAV1nhfGpXxs.adventure (2).json";
  console.log(`\n📖 Loading adventure: ${adventurePath}\n`);

  const raw = JSON.parse(readFileSync(adventurePath, "utf-8"));

  // Preprocess
  console.log("🔄 Preprocessing adventure...");
  const preprocessed = DungeonPreprocessor.preprocessAdventure(raw);

  console.log(`   Title: ${preprocessed.meta.title}`);
  console.log(`   Total Actions: ${preprocessed.meta.totalActions}`);
  console.log(`   Valid Actions: ${preprocessed.meta.validActions}`);
  console.log(`   Story Cards: ${preprocessed.meta.storyCardCount}`);
  console.log(`   Estimated Tokens: ${preprocessed.meta.estimatedTokens}`);

  // Build user message with empty map context (fresh map)
  const mapContext = {
    states: [],
    cultures: [],
    religions: [],
    mapWidth: 1920,
    mapHeight: 1080
  };

  const results = {};
  const levels = ["strict", "moderate", "expansive"];

  for (const level of levels) {
    console.log(`\n🤖 Running ${level.toUpperCase()} mode...`);
    try {
      results[level] = await runWithExpansionLevel(preprocessed, mapContext, level);
      console.log(`   ✅ Done (${results[level].usage.totalTokens} tokens)`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results[level] = null;
    }
  }

  // Build comparison table
  console.log("\n" + "=".repeat(80));
  console.log("EXPANSION LEVEL COMPARISON");
  console.log("=".repeat(80));

  // Header
  console.log("\n┌─────────────────┬──────────┬──────────┬───────────┐");
  console.log("│ Entity Type     │  STRICT  │ MODERATE │ EXPANSIVE │");
  console.log("├─────────────────┼──────────┼──────────┼───────────┤");

  const entityTypes = [
    {key: "states", label: "States"},
    {key: "cultures", label: "Cultures"},
    {key: "religions", label: "Religions"},
    {key: "markers", label: "Markers"},
    {key: "notes", label: "Notes"},
    {key: "military", label: "Military"},
    {key: "diplomacy", label: "Diplomacy"}
  ];

  for (const {key, label} of entityTypes) {
    const strict = results.strict?.parsed[key]?.length ?? "-";
    const moderate = results.moderate?.parsed[key]?.length ?? "-";
    const expansive = results.expansive?.parsed[key]?.length ?? "-";
    console.log(`│ ${label.padEnd(15)} │ ${String(strict).padStart(8)} │ ${String(moderate).padStart(8)} │ ${String(expansive).padStart(9)} │`);
  }

  console.log("├─────────────────┼──────────┼──────────┼───────────┤");

  // Totals
  const getTotal = (r) => {
    if (!r) return "-";
    return entityTypes.reduce((sum, {key}) => sum + (r.parsed[key]?.length || 0), 0);
  };
  console.log(`│ ${"TOTAL".padEnd(15)} │ ${String(getTotal(results.strict)).padStart(8)} │ ${String(getTotal(results.moderate)).padStart(8)} │ ${String(getTotal(results.expansive)).padStart(9)} │`);

  console.log("├─────────────────┼──────────┼──────────┼───────────┤");

  // Token usage
  const strictTokens = results.strict?.usage.totalTokens ?? "-";
  const modTokens = results.moderate?.usage.totalTokens ?? "-";
  const expTokens = results.expansive?.usage.totalTokens ?? "-";
  console.log(`│ ${"Tokens Used".padEnd(15)} │ ${String(strictTokens).padStart(8)} │ ${String(modTokens).padStart(8)} │ ${String(expTokens).padStart(9)} │`);

  console.log("└─────────────────┴──────────┴──────────┴───────────┘");

  // Detail comparison for each entity type
  console.log("\n" + "=".repeat(80));
  console.log("DETAILED ENTITY NAMES BY MODE");
  console.log("=".repeat(80));

  for (const {key, label} of entityTypes) {
    console.log(`\n### ${label}`);
    console.log("-".repeat(40));

    for (const level of levels) {
      const entities = results[level]?.parsed[key] || [];
      const names = entities.map(e => e.name || e.state1Name + " <-> " + e.state2Name).join(", ") || "(none)";
      console.log(`${level.toUpperCase().padEnd(10)}: ${names}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("Done!");
}

testDungeonImport().catch(console.error);
