import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";
import {config} from "dotenv";
import {generateStructured, listModels, sendError} from "./ai-client.js";
import {toLegacyModelMap, getModel} from "../modules/ai/model-registry.js";

// Load environment variables
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = path.join(__dirname, "..", "saved-maps");

// Models come from the shared registry (modules/ai/model-registry.js) and are
// filtered by the API keys present in the environment at request time.
const hasAnyModel = feature => listModels(feature).length > 0;
const legacyModelMap = feature => toLegacyModelMap(listModels(feature));
const invalidModel = (res, model, feature) => {
  res.statusCode = 400;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({error: `Invalid model '${model}'. Available: ${listModels(feature).map(m => m.id).join(", ")}`}));
};
const notConfigured = res => {
  res.statusCode = 503;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({error: "AI service not configured (set ANTHROPIC_API_KEY, OPENAI_API_KEY and/or OPENROUTER_API_KEY)"}));
};

const SYSTEM_PROMPT = `You are an AI assistant that helps modify fantasy maps. You receive map data in a compressed format and respond with changes as a structured ChangeSet.

## Entity Types

### States (political entities)
- i: ID (number, required)
- name: Name (string, required for create)
- form: Government type (Monarchy, Republic, Theocracy, Union, Anarchy)
- capital: Capital burg ID
- culture: Culture ID
- diplomacy: Array indexed by state ID (x=self, N=Neutral, A=Ally, S=Suspicion, E=Enemy, F=Friendly, R=Rival, V=Vassal, Z=Suzerain)

### Burgs (cities/towns)
- i: ID (number, required)
- name: Name (string, required for create)
- cell: Cell ID (required for create)
- x, y: Coordinates (required for create)
- state: State ID
- population: Population points
- capital/port/walls: 1 or 0

### Cultures
- i: ID (number, required)
- name: Name (string, required for create)
- type: Culture type (Generic, River, Lake, Naval, Nomadic, Hunting, Highland)
- base: Name base ID
- code: 2-letter code

### Religions
- i: ID (number, required)
- name: Name (string, required for create)
- type: Religion type (Folk, Organized, Cult, Heresy)
- form: Deity form
- culture: Origin culture ID

### Provinces (administrative divisions)
- i: ID (number, required)
- name: Name (string, required for create)
- state: Parent state ID (required)
- burg: Capital burg ID
- formName: Title (Duchy, County, etc.)

### Rivers
- i: ID (number, required)
- name: Name (string, required for create)
- source: Source cell ID
- mouth: Mouth cell ID

### Military (armies/regiments)
- i: ID (number, required)
- state: Owner state ID (required for create)
- cell: Location cell ID (required for create)
- x, y: Coordinates (required for create)
- name: Unit name
- n: Total strength
- u: Unit composition object {infantry, cavalry, artillery, etc.}

### Markers (map pins)
- i: ID (number, required)
- type: Marker type (required for create)
- x, y: Coordinates (required for create)
- cell: Cell ID
- icon: Icon name

### Notes (text annotations)
- id: String ID like "burg1", "state2" (required)
- name: Title
- legend: HTML content

### Zones (special areas)
- i: ID (number, required)
- name: Name (string, required for create)
- type: Zone type
- cells: Array of cell IDs

## Map Data Format (compressed)
States: S{id}|{name}|{form}|C{capital}|CL{culture}|NB[neighbors]|D[diplomacy]
Burgs: B{id}|{name}|{cell}|@{x},{y}|S{state}|P{pop}|F{flags}
Military: ML{id}|S{state}|C{cell}|@{x},{y}|A{strength}|N{name}|U[units]
Cultures: CL{id}|{name}|{type}|CD{code}
Religions: RL{id}|{name}|{type}|{form}|CL{culture}
Provinces: PV{id}|{name}|S{state}|B{burg}|FN{formName}

## Important Rules
1. Only include entities you are modifying
2. For updates, only include the ID and changed fields
3. Diplomacy changes must be symmetric
4. New entities with coordinates need valid cell, x, y (use existing entity coordinates as reference)
5. Military units belong to states - use existing burg coordinates for placement
6. Return empty arrays for categories with no changes
`;

// Entity schemas for reuse
const stateSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    name: {type: "string"},
    form: {type: "string"},
    capital: {type: "number"},
    culture: {type: "number"},
    color: {type: "string"},
    diplomacy: {type: "array", items: {type: "string"}}
  },
  required: ["i"],
  additionalProperties: false
};

const burgSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    name: {type: "string"},
    cell: {type: "number"},
    x: {type: "number"},
    y: {type: "number"},
    state: {type: "number"},
    population: {type: "number"},
    capital: {type: "number"},
    port: {type: "number"},
    walls: {type: "number"}
  },
  required: ["i"],
  additionalProperties: false
};

const cultureSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    name: {type: "string"},
    type: {type: "string"},
    base: {type: "number"},
    code: {type: "string"}
  },
  required: ["i"],
  additionalProperties: false
};

const religionSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    name: {type: "string"},
    type: {type: "string"},
    form: {type: "string"},
    culture: {type: "number"}
  },
  required: ["i"],
  additionalProperties: false
};

const provinceSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    name: {type: "string"},
    state: {type: "number"},
    burg: {type: "number"},
    formName: {type: "string"}
  },
  required: ["i"],
  additionalProperties: false
};

const riverSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    name: {type: "string"},
    source: {type: "number"},
    mouth: {type: "number"}
  },
  required: ["i"],
  additionalProperties: false
};

const militarySchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    state: {type: "number"},
    cell: {type: "number"},
    x: {type: "number"},
    y: {type: "number"},
    name: {type: "string"},
    n: {type: "number"},
    infantry: {type: "number"},
    cavalry: {type: "number"},
    artillery: {type: "number"},
    archers: {type: "number"},
    fleet: {type: "number"}
  },
  required: ["i"],
  additionalProperties: false
};

const markerSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    type: {type: "string"},
    x: {type: "number"},
    y: {type: "number"},
    cell: {type: "number"},
    icon: {type: "string"}
  },
  required: ["i"],
  additionalProperties: false
};

const noteSchema = {
  type: "object",
  properties: {
    id: {type: "string"},
    name: {type: "string"},
    legend: {type: "string"}
  },
  required: ["id"],
  additionalProperties: false
};

const zoneSchema = {
  type: "object",
  properties: {
    i: {type: "number"},
    name: {type: "string"},
    type: {type: "string"},
    cells: {type: "array", items: {type: "number"}}
  },
  required: ["i"],
  additionalProperties: false
};

const entityArrays = {
  states: {type: "array", items: stateSchema},
  burgs: {type: "array", items: burgSchema},
  cultures: {type: "array", items: cultureSchema},
  religions: {type: "array", items: religionSchema},
  provinces: {type: "array", items: provinceSchema},
  rivers: {type: "array", items: riverSchema},
  military: {type: "array", items: militarySchema},
  markers: {type: "array", items: markerSchema},
  notes: {type: "array", items: noteSchema},
  zones: {type: "array", items: zoneSchema}
};

const entityIdArrays = {
  states: {type: "array", items: {type: "number"}},
  burgs: {type: "array", items: {type: "number"}},
  cultures: {type: "array", items: {type: "number"}},
  religions: {type: "array", items: {type: "number"}},
  provinces: {type: "array", items: {type: "number"}},
  rivers: {type: "array", items: {type: "number"}},
  military: {type: "array", items: {type: "number"}},
  markers: {type: "array", items: {type: "number"}},
  notes: {type: "array", items: {type: "string"}},
  zones: {type: "array", items: {type: "number"}}
};

const CHANGESET_SCHEMA = {
  name: "changeSet",
  strict: true,
  schema: {
    type: "object",
    properties: {
      create: {
        type: "object",
        properties: entityArrays,
        required: Object.keys(entityArrays),
        additionalProperties: false
      },
      update: {
        type: "object",
        properties: entityArrays,
        required: Object.keys(entityArrays),
        additionalProperties: false
      },
      delete: {
        type: "object",
        properties: entityIdArrays,
        required: Object.keys(entityIdArrays),
        additionalProperties: false
      }
    },
    required: ["create", "update", "delete"],
    additionalProperties: false
  }
};

export default function apiPlugin() {
  return {
    name: "fmg-api",
    configureServer(server) {
      // Ensure maps directory exists
      fs.mkdir(MAPS_DIR, {recursive: true}).catch(() => {});

      // Parse JSON body for POST requests
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.headers["content-type"]?.includes("application/json")) {
          let body = "";
          req.on("data", chunk => (body += chunk));
          await new Promise(resolve => req.on("end", resolve));
          try {
            req.body = JSON.parse(body);
          } catch {
            req.body = {};
          }
        }
        next();
      });

      // List maps
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "GET" && req.url === "/api/maps") {
          try {
            const files = await fs.readdir(MAPS_DIR);
            const maps = await Promise.all(
              files
                .filter(f => f.endsWith(".map") || f.endsWith(".gz"))
                .map(async f => {
                  const stats = await fs.stat(path.join(MAPS_DIR, f));
                  return {name: f, size: stats.size, modified: stats.mtime};
                })
            );
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({maps: maps.sort((a, b) => b.modified - a.modified)}));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({error: error.message}));
          }
          return;
        }
        next();
      });

      // Get specific map
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/maps\/(.+)$/);
        if (req.method === "GET" && match) {
          try {
            const filename = decodeURIComponent(match[1]);
            const filePath = path.join(MAPS_DIR, filename);
            if (!filePath.startsWith(MAPS_DIR)) {
              res.statusCode = 403;
              res.end(JSON.stringify({error: "Access denied"}));
              return;
            }
            const data = await fs.readFile(filePath);
            res.setHeader("Content-Type", "application/octet-stream");
            res.end(data);
          } catch (error) {
            res.statusCode = error.code === "ENOENT" ? 404 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: error.code === "ENOENT" ? "Map not found" : error.message}));
          }
          return;
        }
        next();
      });

      // Save map
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/maps") {
          try {
            const {name, data} = req.body || {};
            if (!name || !data) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({error: "Name and data required"}));
              return;
            }
            const safeName = name.replace(/[^a-z0-9._-]/gi, "_");
            const filename = safeName.endsWith(".map") || safeName.endsWith(".gz") ? safeName : `${safeName}.map`;
            const filePath = path.join(MAPS_DIR, filename);
            if (!filePath.startsWith(MAPS_DIR)) {
              res.statusCode = 403;
              res.end(JSON.stringify({error: "Access denied"}));
              return;
            }
            await fs.writeFile(filePath, data, "base64");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({success: true, filename}));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: error.message}));
          }
          return;
        }
        next();
      });

      // Delete map
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/maps\/(.+)$/);
        if (req.method === "DELETE" && match) {
          try {
            const filename = decodeURIComponent(match[1]);
            const filePath = path.join(MAPS_DIR, filename);
            if (!filePath.startsWith(MAPS_DIR)) {
              res.statusCode = 403;
              res.end(JSON.stringify({error: "Access denied"}));
              return;
            }
            await fs.unlink(filePath);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({success: true}));
          } catch (error) {
            res.statusCode = error.code === "ENOENT" ? 404 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: error.code === "ENOENT" ? "Map not found" : error.message}));
          }
          return;
        }
        next();
      });

      // AI Models endpoint
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "GET" && req.url === "/api/ai/models") {
          const describe = m => ({
            id: m.id,
            name: m.name,
            vendor: m.vendor,
            tier: m.tier,
            speed: m.speed,
            quality: m.quality,
            pricing: m.pricing,
            context: m.context,
            route: m.route.provider
          });
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              models: legacyModelMap("map-edit"),
              catalog: listModels("map-edit").map(describe),
              "world-spec": listModels("world-spec").map(describe)
            })
          );
          return;
        }
        next();
      });

      // AI Map Edit endpoint
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/ai/map-edit") {
          if (!hasAnyModel("map-edit")) return notConfigured(res);

          const {model, prompt, context} = req.body || {};

          if (!model || !getModel(model)) return invalidModel(res, model, "map-edit");

          if (!prompt) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "Prompt is required"}));
            return;
          }

          if (!context) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "Map context is required"}));
            return;
          }

          try {
            const userMessage = `## Current Map Data

### States
${context.states?.join("\n") || "No states"}

### Burgs (first 50)
${context.burgs?.slice(0, 50).join("\n") || "No burgs"}

### Cultures
${context.cultures?.join("\n") || "No cultures"}

### Religions
${context.religions?.join("\n") || "No religions"}

### Provinces
${context.provinces?.join("\n") || "No provinces"}

### Rivers
${context.rivers?.join("\n") || "No rivers"}

### Military Units
${context.military?.join("\n") || "No military units"}

### Markers
${context.markers?.join("\n") || "No markers"}

## User Request
${prompt}`;

            // Log the request
            console.log("\n========== AI MAP EDIT REQUEST ==========");
            console.log("Model:", model);
            console.log("Prompt:", prompt);
            console.log("Context stats:", {
              states: context.states?.length || 0,
              burgs: context.burgs?.length || 0,
              cultures: context.cultures?.length || 0,
              religions: context.religions?.length || 0,
              provinces: context.provinces?.length || 0,
              rivers: context.rivers?.length || 0,
              military: context.military?.length || 0,
              markers: context.markers?.length || 0
            });
            console.log("==========================================\n");

            // Call OpenRouter API using SDK
            const result = await generateStructured({
              modelId: model,
              system: SYSTEM_PROMPT,
              user: userMessage,
              schema: CHANGESET_SCHEMA,
              maxTokens: 8192,
              effort: "medium",
              schemaName: "AI map edit"
            });
            const changeSet = result.data;

            console.log("\n========== AI MAP EDIT RESPONSE ==========");
            console.log("Model used:", result.model, "via", result.provider, `(${(result.durationMs / 1000).toFixed(1)}s)`);
            console.log("Usage:", result.usage);
            console.log("==========================================\n");

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                changeSet,
                model: result.model,
                providerModel: result.providerModel,
                provider: result.provider,
                usage: result.usage
              })
            );
          } catch (error) {
            console.error("AI map-edit error:", error);
            sendError(res, error);
          }
          return;
        }
        next();
      });

      // AI Dungeon Preprocess endpoint
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/ai/dungeon-preprocess") {
          const {adventure} = req.body || {};

          if (!adventure) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "Adventure data is required"}));
            return;
          }

          try {
            // Import the preprocessor dynamically
            const {DungeonPreprocessor} = await import("../modules/ai/dungeon-preprocessor.js");

            // Validate format
            const validation = DungeonPreprocessor.validateAdventureFormat(adventure);
            if (!validation.valid) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({error: validation.error}));
              return;
            }

            // Preprocess the adventure
            const preprocessed = DungeonPreprocessor.preprocessAdventure(adventure);

            console.log("\n========== AI DUNGEON PREPROCESS ==========");
            console.log("Title:", preprocessed.meta.title);
            console.log("Total actions:", preprocessed.meta.totalActions);
            console.log("Valid actions:", preprocessed.meta.validActions);
            console.log("Story cards:", preprocessed.meta.storyCardCount);
            console.log("Estimated tokens:", preprocessed.meta.estimatedTokens);
            console.log("World data:", {
              characters: preprocessed.worldData.characters.length,
              locations: preprocessed.worldData.locations.length,
              factions: preprocessed.worldData.factions.length,
              items: preprocessed.worldData.items.length,
              classes: preprocessed.worldData.classes.length
            });
            console.log("============================================\n");

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({preprocessed}));
          } catch (error) {
            console.error("Dungeon preprocess error:", error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: error.message}));
          }
          return;
        }
        next();
      });

      // AI Dungeon Import endpoint
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/ai/dungeon-import") {
          if (!hasAnyModel("dungeon-import")) return notConfigured(res);

          const {model, preprocessedAdventure, context, options} = req.body || {};

          if (!model || !getModel(model)) return invalidModel(res, model, "dungeon-import");

          if (!preprocessedAdventure) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "Preprocessed adventure data is required"}));
            return;
          }

          if (!context) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "Map context is required"}));
            return;
          }

          try {
            // Import the prompts module dynamically
            const {DungeonImporterPrompts} = await import("../modules/ai/dungeon-importer-prompts.js");

            // Build the user message
            const userMessage = DungeonImporterPrompts.buildUserMessage(preprocessedAdventure, context, options || {});

            console.log("\n========== AI DUNGEON IMPORT REQUEST ==========");
            console.log("Model:", model);
            console.log("Adventure:", preprocessedAdventure.meta?.title);
            console.log("Expansion Level:", options?.expansionLevel || "moderate");
            console.log("Context stats:", {
              states: context.states?.length || 0,
              cultures: context.cultures?.length || 0,
              religions: context.religions?.length || 0
            });
            console.log("User message length:", userMessage.length);
            console.log("===============================================\n");

            const result = await generateStructured({
              modelId: model,
              system: DungeonImporterPrompts.SYSTEM_PROMPT,
              user: userMessage,
              schema: DungeonImporterPrompts.SCHEMA,
              maxTokens: 16384,
              effort: "medium",
              schemaName: "AI dungeon import"
            });
            const importResult = result.data;

            console.log("\n========== AI DUNGEON IMPORT RESPONSE ==========");
            console.log("Model used:", result.model, "via", result.provider, `(${(result.durationMs / 1000).toFixed(1)}s)`);
            console.log("Usage:", result.usage);
            console.log("==========================================\n");

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                importResult,
                model: result.model,
                providerModel: result.providerModel,
                provider: result.provider,
                usage: result.usage
              })
            );
          } catch (error) {
            console.error("AI dungeon-import error:", error);
            sendError(res, error);
          }
          return;
        }
        next();
      });

      // AI World Spec endpoint (generates world specification from narrative)
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/ai/world-spec") {
          const {model, preprocessedAdventure, expansionLevel = "strict", effort} = req.body || {};

          if (!hasAnyModel("world-spec")) return notConfigured(res);
          const modelInfo = getModel(model);
          if (!model || !modelInfo || !modelInfo.features.includes("world-spec")) return invalidModel(res, model, "world-spec");

          if (!preprocessedAdventure) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "Preprocessed adventure data is required"}));
            return;
          }

          const validExpansionLevels = ["strict", "moderate", "expansive"];
          if (!validExpansionLevels.includes(expansionLevel)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: `Invalid expansion level. Available: ${validExpansionLevels.join(", ")}`}));
            return;
          }

          try {
            const {buildSystemPrompt, buildUserMessage, getSchemaForProvider} = await import(
              "../modules/ai/world-spec-prompts.js"
            );
            const {analyzeWorldSpec, getWorldSpecStats} = await import("../modules/ai/world-spec-validator.js");
            const {generateWorldSpec} = await import("./world-spec-service.js");

            const result = await generateWorldSpec({
              modelId: modelInfo.id,
              preprocessedAdventure,
              expansionLevel,
              effort,
              buildSystemPrompt,
              buildUserMessage,
              getSchemaForProvider,
              analyzeWorldSpec,
              getWorldSpecStats
            });

            console.log("\n========== AI WORLD SPEC RESPONSE ==========");
            console.log("Model:", result.model, "via", result.provider, `(${result.duration}s)`);
            console.log("Usage:", result.usage);
            console.log("Stats:", result.stats);
            console.log("Analysis valid:", result.analysis.valid);
            if (result.analysis.issues.length > 0) console.log("Issues:", result.analysis.issues);
            if (result.analysis.warnings.length > 0) console.log("Warnings:", result.analysis.warnings);
            console.log("=============================================\n");

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (error) {
            console.error("AI world-spec error:", error);
            sendError(res, error);
          }
          return;
        }
        next();
      });

      // AI World Build endpoint
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/ai/world-build") {
          if (!hasAnyModel("world-builder")) return notConfigured(res);

          const {model, worldConcept, theme, tone, techLevel, magicLevel, context} = req.body || {};

          if (!model || !getModel(model)) return invalidModel(res, model, "world-builder");

          if (!worldConcept) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "World concept is required"}));
            return;
          }

          if (!context) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: "Map context is required"}));
            return;
          }

          try {
            const userMessage = `## World Concept
${worldConcept}

## Preferences
- Theme: ${theme || "classic fantasy"}
- Tone: ${tone || "heroic"}
- Technology Level: ${techLevel || "medieval"}
- Magic Level: ${magicLevel || "common"}

## Current Map Data

### States
${context.states?.join("\n") || "No states"}

### Burgs (first 50)
${context.burgs?.slice(0, 50).join("\n") || "No burgs"}

### Cultures
${context.cultures?.join("\n") || "No cultures"}

### Religions
${context.religions?.join("\n") || "No religions"}

### Geography Summary
- Map dimensions: ${context.mapWidth || "unknown"} x ${context.mapHeight || "unknown"}
- Total states: ${context.states?.length || 0}
- Total burgs: ${context.burgs?.length || 0}
- Total cultures: ${context.cultures?.length || 0}

Transform this randomly generated map into a cohesive, thematically consistent world that matches the concept and preferences above. Rename all states and cultures appropriately, establish realistic diplomatic relations based on geography, add meaningful markers and rich lore notes.`;

            console.log("\n========== AI WORLD BUILD REQUEST ==========");
            console.log("Model:", model);
            console.log("World Concept:", worldConcept);
            console.log("Preferences:", {theme, tone, techLevel, magicLevel});
            console.log("Context stats:", {
              states: context.states?.length || 0,
              burgs: context.burgs?.length || 0,
              cultures: context.cultures?.length || 0
            });
            console.log("=============================================\n");

            // World Builder System Prompt
            const WORLD_BUILDER_SYSTEM_PROMPT = `You are a world-building AI assistant for a fantasy map generator. Your task is to transform a randomly generated map into a thematically coherent, story-rich world based on the user's concept and preferences.

You will receive:
1. A world concept/description from the user
2. Theme/tone/technology/magic preferences
3. Current map data including states, cultures, geography

Your response must be a valid JSON object with this exact structure. Be comprehensive and creative.`;

            // World Builder Schema
            const WORLD_BUILDER_SCHEMA = {
              name: "world_build_response",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  geographicAnalysis: {
                    type: "object",
                    properties: {
                      summary: {type: "string"},
                      majorFeatures: {type: "array", items: {type: "string"}},
                      strategicLocations: {type: "array", items: {type: "string"}}
                    },
                    required: ["summary", "majorFeatures", "strategicLocations"],
                    additionalProperties: false
                  },
                  stateChanges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        stateId: {type: "number"},
                        newName: {type: "string"},
                        form: {type: "string"},
                        description: {type: "string"},
                        reasoning: {type: "string"}
                      },
                      required: ["stateId", "newName"],
                      additionalProperties: false
                    }
                  },
                  cultureChanges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cultureId: {type: "number"},
                        newName: {type: "string"},
                        type: {type: "string"},
                        description: {type: "string"}
                      },
                      required: ["cultureId", "newName"],
                      additionalProperties: false
                    }
                  },
                  diplomacyChanges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        state1Id: {type: "number"},
                        state2Id: {type: "number"},
                        relation: {type: "string"},
                        reasoning: {type: "string"}
                      },
                      required: ["state1Id", "state2Id", "relation"],
                      additionalProperties: false
                    }
                  },
                  markersToAdd: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {type: "string"},
                        nearStateId: {type: "number"},
                        name: {type: "string"},
                        noteContent: {type: "string"}
                      },
                      required: ["type", "name"],
                      additionalProperties: false
                    }
                  },
                  notesToAdd: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {type: "string"},
                        name: {type: "string"},
                        legend: {type: "string"}
                      },
                      required: ["id", "name", "legend"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["geographicAnalysis", "stateChanges", "cultureChanges", "diplomacyChanges", "markersToAdd", "notesToAdd"],
                additionalProperties: false
              }
            };

            const result = await generateStructured({
              modelId: model,
              system: WORLD_BUILDER_SYSTEM_PROMPT,
              user: userMessage,
              schema: WORLD_BUILDER_SCHEMA,
              maxTokens: 16384,
              effort: "medium",
              schemaName: "AI world build"
            });
            const worldBuild = result.data;

            console.log("\n========== AI WORLD BUILD RESPONSE ==========");
            console.log("Model used:", result.model, "via", result.provider, `(${(result.durationMs / 1000).toFixed(1)}s)`);
            console.log("Usage:", result.usage);
            console.log("==========================================\n");

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                worldBuild,
                model: result.model,
                providerModel: result.providerModel,
                provider: result.provider,
                usage: result.usage
              })
            );
          } catch (error) {
            console.error("AI world-build error:", error);
            sendError(res, error);
          }
          return;
        }
        next();
      });
    }
  };
}
