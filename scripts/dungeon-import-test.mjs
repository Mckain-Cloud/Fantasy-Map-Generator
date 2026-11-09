#!/usr/bin/env node
/**
 * Dungeon importer check: run one adventure through the dungeon-import prompt
 * at each expansion level with a registry model and compare what comes back.
 *
 *   node scripts/dungeon-import-test.mjs
 *   node scripts/dungeon-import-test.mjs --model anthropic/claude-sonnet-5-5 --adventure "json/....json"
 */

import {readFileSync} from "fs";
import "dotenv/config";
import {DungeonPreprocessor} from "../modules/ai/dungeon-preprocessor.js";
import {DungeonImporterPrompts} from "../modules/ai/dungeon-importer-prompts.js";
import {generateStructured, listModels} from "../vite-plugins/ai-client.js";
import {DEFAULT_MODEL_ID} from "../modules/ai/model-registry.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, [])
);

const modelId = args.model || DEFAULT_MODEL_ID;
const adventurePath = args.adventure || "json/Betrothed to an Ork!_cAV1nhfGpXxs.adventure.json";
const levels = (args.levels || "strict,moderate,expansive").split(",");

if (!listModels("dungeon-import").some(m => m.id === modelId)) {
  console.error(`Model ${modelId} is not available. Options: ${listModels("dungeon-import").map(m => m.id).join(", ")}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(adventurePath, "utf8"));
const preprocessed = DungeonPreprocessor.preprocessAdventure(raw);
console.log(`Adventure: ${preprocessed.meta.title} (${preprocessed.meta.estimatedTokens} est. tokens) | model: ${modelId}\n`);

const mapContext = {states: [], cultures: [], religions: [], mapWidth: 1920, mapHeight: 1080};
const results = {};

for (const level of levels) {
  const started = Date.now();
  try {
    const result = await generateStructured({
      modelId,
      system: DungeonImporterPrompts.SYSTEM_PROMPT,
      user: DungeonImporterPrompts.buildUserMessage(preprocessed, mapContext, {expansionLevel: level}),
      schema: DungeonImporterPrompts.SCHEMA,
      maxTokens: 16384,
      effort: "medium",
      schemaName: "dungeonImport"
    });
    results[level] = result;
    console.log(`OK   ${level.padEnd(9)} ${((Date.now() - started) / 1000).toFixed(1)}s  ${result.usage?.total_tokens ?? "?"} tok via ${result.provider}`);
  } catch (error) {
    console.log(`FAIL ${level.padEnd(9)} ${error.message.slice(0, 160)}`);
  }
}

const entityTypes = ["states", "cultures", "religions", "markers", "notes", "military", "diplomacy"];
console.log("\n" + "entity".padEnd(12) + levels.map(l => l.padStart(10)).join(""));
for (const key of entityTypes) {
  console.log(key.padEnd(12) + levels.map(l => String(results[l]?.data?.[key]?.length ?? "-").padStart(10)).join(""));
}
for (const key of entityTypes) {
  console.log(`\n## ${key}`);
  for (const l of levels) {
    const names = (results[l]?.data?.[key] || []).map(e => e.name || `${e.state1Name} <-> ${e.state2Name}`).join(", ") || "(none)";
    console.log(`${l.padEnd(10)}: ${names}`);
  }
}
