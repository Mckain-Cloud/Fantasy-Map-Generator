#!/usr/bin/env node
/**
 * World-spec model sweep
 *
 * Runs one adventure through every world-spec model in the registry (or the
 * ones named on the command line), using exactly the code path the
 * /api/ai/world-spec endpoint uses, and writes one JSON per model into a
 * timestamped folder under world-spec-outputs/. Those files feed the
 * Playwright sweep (tests/e2e/world-spec-model-sweep.spec.js), which turns
 * each spec into a map and scores its fidelity.
 *
 *   node scripts/world-spec-model-sweep.mjs                      # all models, moderate
 *   node scripts/world-spec-model-sweep.mjs --level strict
 *   node scripts/world-spec-model-sweep.mjs --models anthropic/claude-opus-5-5,openai/gpt-6.1-sol
 *   node scripts/world-spec-model-sweep.mjs --adventure "json/Materia Medica_noheWhC3ju_G.adventure.json"
 *   node scripts/world-spec-model-sweep.mjs --out world-spec-outputs/my-run
 *   node scripts/world-spec-model-sweep.mjs --models openai/gpt-6.1-terra --effort low
 */

import {readFileSync, writeFileSync, mkdirSync} from "fs";
import path from "path";
import "dotenv/config";
import {DungeonPreprocessor} from "../modules/ai/dungeon-preprocessor.js";
import {buildSystemPrompt, buildUserMessage, getSchemaForProvider} from "../modules/ai/world-spec-prompts.js";
import {analyzeWorldSpec, getWorldSpecStats} from "../modules/ai/world-spec-validator.js";
import {listModels} from "../vite-plugins/ai-client.js";
import {generateWorldSpec} from "../vite-plugins/world-spec-service.js";

const args = parseArgs(process.argv.slice(2));
const level = args.level || "moderate";
const adventurePath = args.adventure || "json/Betrothed to an Ork!_cAV1nhfGpXxs.adventure.json";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = args.out || path.join("world-spec-outputs", `sweep-${stamp}`);
mkdirSync(outDir, {recursive: true});

const available = listModels("world-spec");
const wanted = args.models ? args.models.split(",").map(s => s.trim()) : available.map(m => m.id);
const models = wanted.map(id => available.find(m => m.id === id)).filter(Boolean);
const missing = wanted.filter(id => !available.some(m => m.id === id));
if (missing.length) console.warn(`Skipping (no key / unknown): ${missing.join(", ")}`);
if (!models.length) {
  console.error("No models available. Set ANTHROPIC_API_KEY, OPENAI_API_KEY and/or OPENROUTER_API_KEY.");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(adventurePath, "utf8"));
const preprocessed = DungeonPreprocessor.preprocessAdventure(raw);
console.log(`Adventure: ${preprocessed.meta.title} (${preprocessed.meta.estimatedTokens} est. tokens), level: ${level}`);
console.log(`Models (${models.length}): ${models.map(m => `${m.id} via ${m.route.provider}`).join(", ")}`);
console.log(`Output: ${outDir}\n`);

const summary = [];
const concurrency = Number(args.concurrency || 3);
const queue = [...models];

async function worker() {
  while (queue.length) {
    const model = queue.shift();
    const label = model.id.padEnd(32);
    const started = Date.now();
    try {
      const result = await generateWorldSpec({
        modelId: model.id,
        preprocessedAdventure: preprocessed,
        expansionLevel: level,
        effort: args.effort,
        buildSystemPrompt,
        buildUserMessage,
        getSchemaForProvider,
        analyzeWorldSpec,
        getWorldSpecStats
      });
      const file = path.join(outDir, `${model.id.replace(/[/:]/g, "_")}.json`);
      writeFileSync(file, JSON.stringify(result, null, 2));
      const s = result.stats;
      const row = {
        model: model.id,
        provider: result.provider,
        ok: true,
        valid: result.analysis.valid,
        issues: result.analysis.issues.length,
        warnings: result.analysis.warnings.length,
        features: s.terrainFeatures,
        legacyCommands: s.heightmapCmds,
        locations: s.locations,
        states: s.states,
        seconds: +result.duration,
        tokens: result.tokens,
        costUsd: result.estimatedCostUsd,
        file
      };
      summary.push(row);
      console.log(`OK   ${label} ${String(row.seconds).padStart(6)}s  ${String(row.tokens).padStart(6)} tok  $${(row.costUsd ?? 0).toFixed(3)}  features=${row.features} locations=${row.locations} states=${row.states} valid=${row.valid} issues=${row.issues}`);
    } catch (error) {
      const row = {model: model.id, ok: false, error: error.message, status: error.status, refusal: error.refusal, seconds: +((Date.now() - started) / 1000).toFixed(1)};
      summary.push(row);
      writeFileSync(path.join(outDir, `${model.id.replace(/[/:]/g, "_")}.error.json`), JSON.stringify(row, null, 2));
      console.log(`FAIL ${label} ${String(row.seconds).padStart(6)}s  ${error.message.slice(0, 160)}`);
    }
  }
}

await Promise.all(Array.from({length: Math.min(concurrency, models.length)}, worker));

summary.sort((a, b) => a.model.localeCompare(b.model));
writeFileSync(path.join(outDir, "summary.json"), JSON.stringify({adventure: adventurePath, level, generatedAt: new Date().toISOString(), results: summary}, null, 2));
console.log(`\nSummary written to ${path.join(outDir, "summary.json")}`);
console.log(`Next: SWEEP_DIR="${outDir}" npx playwright test tests/e2e/world-spec-model-sweep.spec.js`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else out[key] = true;
    }
  }
  return out;
}
