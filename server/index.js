import "dotenv/config";
import express from "express";
import compression from "compression";
import {fileURLToPath} from "url";
import {dirname, join} from "path";
import fs from "fs/promises";
import {generateStructured, listModels, sendError} from "../vite-plugins/ai-client.js";
import {toLegacyModelMap, getModel} from "../modules/ai/model-registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");
const MAPS_DIR = join(ROOT_DIR, "saved-maps");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(express.json({limit: "100mb"}));

// Ensure maps directory exists
await fs.mkdir(MAPS_DIR, {recursive: true});

// ============= MAP STORAGE API =============

// List all saved maps
app.get("/api/maps", async (req, res) => {
  try {
    const files = await fs.readdir(MAPS_DIR);
    const maps = await Promise.all(
      files
        .filter(f => f.endsWith(".map") || f.endsWith(".gz"))
        .map(async f => {
          const stats = await fs.stat(join(MAPS_DIR, f));
          return {
            name: f,
            size: stats.size,
            modified: stats.mtime
          };
        })
    );
    res.json({maps: maps.sort((a, b) => b.modified - a.modified)});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Get a specific map
app.get("/api/maps/:name", async (req, res) => {
  try {
    const filePath = join(MAPS_DIR, req.params.name);
    // Security: ensure path is within MAPS_DIR
    if (!filePath.startsWith(MAPS_DIR)) {
      return res.status(403).json({error: "Access denied"});
    }
    const data = await fs.readFile(filePath);
    res.type("application/octet-stream").send(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.status(404).json({error: "Map not found"});
    } else {
      res.status(500).json({error: error.message});
    }
  }
});

// Save a map
app.post("/api/maps", async (req, res) => {
  try {
    const {name, data} = req.body;
    if (!name || !data) {
      return res.status(400).json({error: "Name and data required"});
    }
    // Sanitize filename
    const safeName = name.replace(/[^a-z0-9._-]/gi, "_");
    const filename = safeName.endsWith(".map") || safeName.endsWith(".gz") ? safeName : `${safeName}.map`;
    const filePath = join(MAPS_DIR, filename);

    // Security: ensure path is within MAPS_DIR
    if (!filePath.startsWith(MAPS_DIR)) {
      return res.status(403).json({error: "Access denied"});
    }

    await fs.writeFile(filePath, data, "base64");
    res.json({success: true, filename});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Delete a map
app.delete("/api/maps/:name", async (req, res) => {
  try {
    const filePath = join(MAPS_DIR, req.params.name);
    // Security: ensure path is within MAPS_DIR
    if (!filePath.startsWith(MAPS_DIR)) {
      return res.status(403).json({error: "Access denied"});
    }
    await fs.unlink(filePath);
    res.json({success: true});
  } catch (error) {
    if (error.code === "ENOENT") {
      res.status(404).json({error: "Map not found"});
    } else {
      res.status(500).json({error: error.message});
    }
  }
});

// ============= AI MAP EDITOR API =============

// Models come from the shared registry, filtered by configured API keys

const SYSTEM_PROMPT = `You are an AI assistant that helps modify fantasy maps. You receive map data in a compressed format and respond with changes as a structured ChangeSet.

## Entity Formats

### States
- i: ID (number, required)
- name: Name (string, required for create)
- form: Government type (string: Monarchy, Republic, Theocracy, Union, Anarchy)
- capital: Capital burg ID (number)
- culture: Culture ID (number)
- neighbors: Array of neighbor state IDs
- diplomacy: Array indexed by state ID with values: x (self), N (Neutral), A (Ally), S (Suspicion), E (Enemy), F (Friendly), R (Rival), U (Unknown), V (Vassal), Z (Suzerain)

### Burgs (Cities/Towns)
- i: ID (number, required)
- name: Name (string, required for create)
- cell: Cell ID (number, required for create)
- x, y: Coordinates (numbers, required for create)
- state: State ID (number)
- population: Population points (number)
- capital: 1 if capital, 0 otherwise
- port: 1 if port, 0 otherwise
- walls: 1 if walled, 0 otherwise

### Markers
- i: ID (number, required)
- type: Marker type (string, required for create)
- x, y: Coordinates (numbers, required for create)
- cell: Cell ID (number)
- icon: Icon name (string)

## Map Data Format
States: S{id}|{name}|{form}|C{capital}|CL{culture}|N{cells}|B{burgs}|A{area}|U{urban}|R{rural}|NB[neighbors]|D[diplomacy]
Burgs: B{id}|{name}|{cell}|@{x},{y}|S{state}|P{population}|T{type}|{flags}|CL{culture}|FT{feature}
Cultures: CL{id}|{name}|{type}|B{base}|C{cells}|E{expansionism}|CD{code}
Religions: RL{id}|{name}|{type}|{form}|CL{culture}|C{cells}|CD{code}

## Important Rules
1. Only include entities you are modifying
2. For updates, only include the ID and changed fields
3. Diplomacy changes must be symmetric (if A declares war on B, B must also be at war with A)
4. New burgs need valid cell, x, y coordinates (use existing burg coordinates as reference)
5. Return empty arrays if no changes are needed for a category
`;

// JSON Schema for structured output - ChangeSet format
const CHANGESET_SCHEMA = {
  name: "changeSet",
  strict: true,
  schema: {
    type: "object",
    properties: {
      create: {
        type: "object",
        description: "Entities to create",
        properties: {
          states: {
            type: "array",
            items: {
              type: "object",
              properties: {
                i: {type: "number", description: "Unique state ID"},
                name: {type: "string", description: "State name"},
                form: {type: "string", description: "Government type"},
                capital: {type: "number", description: "Capital burg ID"},
                culture: {type: "number", description: "Culture ID"},
                color: {type: "string", description: "Hex color code"}
              },
              required: ["i", "name"],
              additionalProperties: false
            }
          },
          burgs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                i: {type: "number", description: "Unique burg ID"},
                name: {type: "string", description: "Burg name"},
                cell: {type: "number", description: "Cell ID"},
                x: {type: "number", description: "X coordinate"},
                y: {type: "number", description: "Y coordinate"},
                state: {type: "number", description: "State ID"},
                population: {type: "number", description: "Population"},
                capital: {type: "number", description: "1 if capital"},
                port: {type: "number", description: "1 if port"},
                walls: {type: "number", description: "1 if walled"}
              },
              required: ["i", "name", "cell", "x", "y"],
              additionalProperties: false
            }
          },
          markers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                i: {type: "number", description: "Unique marker ID"},
                type: {type: "string", description: "Marker type"},
                x: {type: "number", description: "X coordinate"},
                y: {type: "number", description: "Y coordinate"},
                cell: {type: "number", description: "Cell ID"},
                icon: {type: "string", description: "Icon name"}
              },
              required: ["i", "type", "x", "y"],
              additionalProperties: false
            }
          }
        },
        additionalProperties: false
      },
      update: {
        type: "object",
        description: "Entities to update (include ID and changed fields only)",
        properties: {
          states: {
            type: "array",
            items: {
              type: "object",
              properties: {
                i: {type: "number", description: "State ID to update"},
                name: {type: "string", description: "New name"},
                form: {type: "string", description: "New government type"},
                capital: {type: "number", description: "New capital burg ID"},
                culture: {type: "number", description: "New culture ID"},
                diplomacy: {
                  type: "array",
                  items: {type: "string"},
                  description: "Diplomacy array indexed by state ID"
                }
              },
              required: ["i"],
              additionalProperties: false
            }
          },
          burgs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                i: {type: "number", description: "Burg ID to update"},
                name: {type: "string", description: "New name"},
                state: {type: "number", description: "New state ID"},
                population: {type: "number", description: "New population"},
                capital: {type: "number", description: "1 if capital"},
                port: {type: "number", description: "1 if port"},
                walls: {type: "number", description: "1 if walled"}
              },
              required: ["i"],
              additionalProperties: false
            }
          },
          markers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                i: {type: "number", description: "Marker ID to update"},
                type: {type: "string", description: "New type"},
                icon: {type: "string", description: "New icon"}
              },
              required: ["i"],
              additionalProperties: false
            }
          }
        },
        additionalProperties: false
      },
      delete: {
        type: "object",
        description: "Entity IDs to delete",
        properties: {
          states: {
            type: "array",
            items: {type: "number"},
            description: "State IDs to delete"
          },
          burgs: {
            type: "array",
            items: {type: "number"},
            description: "Burg IDs to delete"
          },
          markers: {
            type: "array",
            items: {type: "number"},
            description: "Marker IDs to delete"
          }
        },
        additionalProperties: false
      }
    },
    required: ["create", "update", "delete"],
    additionalProperties: false
  }
};

// Get available models
app.get("/api/ai/models", (req, res) => {
  const models = listModels("map-edit");
  if (!models.length) {
    return res.status(503).json({error: "AI service not configured (set ANTHROPIC_API_KEY, OPENAI_API_KEY and/or OPENROUTER_API_KEY)"});
  }
  const describe = m => ({id: m.id, name: m.name, vendor: m.vendor, tier: m.tier, speed: m.speed, quality: m.quality, pricing: m.pricing, route: m.route.provider});
  res.json({models: toLegacyModelMap(models), catalog: models.map(describe), "world-spec": listModels("world-spec").map(describe)});
});

// Generate map changes
app.post("/api/ai/map-edit", async (req, res) => {
  if (!listModels("map-edit").length) {
    return res.status(503).json({error: "AI service not configured (set ANTHROPIC_API_KEY, OPENAI_API_KEY and/or OPENROUTER_API_KEY)"});
  }

  const {model, prompt, context} = req.body;

  if (!model || !getModel(model)) {
    return res.status(400).json({error: `Invalid model. Available: ${listModels("map-edit").map(m => m.id).join(", ")}`});
  }

  if (!prompt) {
    return res.status(400).json({error: "Prompt is required"});
  }

  if (!context) {
    return res.status(400).json({error: "Map context is required"});
  }

  try {
    const userMessage = `## Current Map Data

### States
${context.states?.join("\n") || "No states"}

### Burgs (showing first 50)
${context.burgs?.slice(0, 50).join("\n") || "No burgs"}

### Cultures
${context.cultures?.join("\n") || "No cultures"}

### Religions
${context.religions?.join("\n") || "No religions"}

## User Request
${prompt}`;

    const result = await generateStructured({
      modelId: model,
      system: SYSTEM_PROMPT,
      user: userMessage,
      schema: CHANGESET_SCHEMA,
      maxTokens: 8192,
      effort: "medium",
      schemaName: "changeSet"
    });

    res.json({
      changeSet: result.data,
      model: result.model,
      providerModel: result.providerModel,
      provider: result.provider,
      usage: result.usage
    });
  } catch (error) {
    console.error("AI map-edit error:", error);
    sendError(res, error);
  }
});

// ============= STATIC FILE SERVING =============

// In production, serve the built dist folder
// In development, use Vite dev server instead
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(ROOT_DIR, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(join(ROOT_DIR, "dist", "index.html"));
  });
} else {
  // Development: serve source files directly
  app.use(express.static(ROOT_DIR));
}

app.listen(PORT, () => {
  console.log(`Fantasy Map Generator server running on http://localhost:${PORT}`);
  console.log(`Maps directory: ${MAPS_DIR}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("Note: For development with HMR, use 'npm run dev' instead");
  }
});
