/**
 * POC Test: AI World Specification Generator
 *
 * Tests whether AI can generate valid FMG heightmap commands + world specs
 * from an AI Dungeon adventure narrative.
 *
 * Run with: node test-world-spec.js
 */

import {readFileSync, writeFileSync, mkdirSync, existsSync} from "fs";
import {config} from "dotenv";
import {OpenRouter} from "@openrouter/sdk";
import OpenAI from "openai";
import {DungeonPreprocessor} from "./modules/ai/dungeon-preprocessor.js";

// Output directory for model results
const OUTPUT_DIR = "./world-spec-outputs";
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, {recursive: true});
}

config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

// Initialize OpenRouter SDK
const openRouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://azgaar.github.io/Fantasy-Map-Generator",
    "X-Title": "Fantasy Map Generator"
  }
});

// Initialize OpenAI SDK
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// OpenAI models - use direct API for structured outputs with strict mode
const OPENAI_MODELS = [
  "gpt-5.1"
];

// Models to test via OpenRouter
const OPENROUTER_MODELS = [
  "x-ai/grok-4-fast",
  "google/gemini-2.5-flash-preview-09-2025"
];

// Anthropic models - use direct API for structured outputs
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODELS = [
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-5-20250929"
];

// Expansion levels to test
const EXPANSION_LEVELS = ["strict", "moderate", "expansive"];

// ============================================================================
// Expansion Level Prompts
// ============================================================================

const EXPANSION_PROMPTS = {
  strict: `
You are extracting ONLY what is explicitly stated in the narrative.

**Rules:**
- Only include locations that are explicitly named in the text
- Only create states/factions that are directly mentioned
- Do not infer, extrapolate, or create any content not present in the source
- If a capital city is mentioned but not described, include it with minimal description
- Leave borders empty if no natural boundaries are explicitly described
- Cultures and religions should only reflect what characters explicitly practice or reference
- When in doubt, omit rather than invent

**Your output should be a faithful extraction, not a creative expansion.**
`,

  moderate: `
You are extracting content from the narrative while filling reasonable gaps.

**Rules:**
- Extract all explicitly named locations
- Infer logical locations that must exist (e.g., if characters "cross a river," that river exists)
- Create states to organize locations under logical political control
- Add cultures and religions when characters reference traditions or beliefs
- Define borders using natural features mentioned or implied by terrain commands
- Fill gaps minimally - add what's needed for coherence, nothing more
- Descriptions should summarize narrative content, not add new lore

**Your output should be a coherent map specification with minimal creative additions.**
`,

  expansive: `
You are building a complete, living world inspired by the narrative.

**Rules:**
- Extract all named locations AND create additional locations implied by the setting
- If a capital exists, add surrounding infrastructure (roads, farms, outposts)
- Create neighboring regions, trade routes, and frontier zones even if not named
- Develop full cultural and religious systems from character hints
- Define multiple border types between all adjacent states
- Add zones for potential conflicts, resources, or mysteries suggested by themes
- Descriptions should expand on narrative hints to create rich world-building
- Think like a fantasy author: what ELSE would exist in this world?
- Expansions should be CONSISTENT with narrative tone and themes
- Don't add elements that contradict established facts
- New locations should feel like natural extensions, not genre shifts

**Your output should be a richly detailed world that extends beyond the source narrative.**
`
};

// ============================================================================
// World Specification System Prompt
// ============================================================================

function buildSystemPrompt(expansionLevel = 'moderate') {
  return `You are an AI World Cartographer that designs fantasy maps from narrative content. Your task is to analyze an adventure story and output a complete world specification that can generate a new Fantasy Map Generator map.

${EXPANSION_PROMPTS[expansionLevel]}

## Your Output

You will generate a JSON specification containing:
1. **Terrain** - Heightmap commands that define the geography
2. **Locations** - Points of interest (settlements, fortresses, mines, quarries, ruins, landmarks)
3. **States** - Political entities that control locations
4. **Cultures** - Ethnic/cultural groups
5. **Zones** - Event regions (disasters, conflicts, etc.)
6. **Borders** - Geographic boundaries between states (rivers, mountains, etc.)

## Location Scale Guidelines

Extract locations at **MAP SCALE** - places that would appear as distinct points on a regional or kingdom map.

**DO extract:**
- Settlements (cities, towns, villages)
- Fortifications (castles, towers, strongholds)
- Resource sites (mines, quarries, farms)
- Named natural landmarks (mountains, rivers, forests, lakes)
- Ruins and historic sites
- Dungeons, lairs, and caves

**DO NOT extract:**
- Rooms, floors, or wings within a building
- Individual structures within a compound or camp
- City districts, gates, or markets (these are part of the parent settlement)

A single structure or compound = one location, regardless of its internal complexity.

## Heightmap DSL Reference

Use these commands to sculpt terrain. All coordinates are percentages (0-100).

| Command | Syntax | Effect |
|---------|--------|--------|
| Hill | \`Hill count height rangeX rangeY\` | Elevation peaks |
| Range | \`Range count height rangeX rangeY\` | Mountain ridges |
| Trough | \`Trough count height rangeX rangeY\` | Valleys (rivers form here) |
| Pit | \`Pit count height rangeX rangeY\` | Depressions (lakes form) |
| Strait | \`Strait width vertical\|horizontal\` | Water channels |
| Smooth | \`Smooth strength\` | Blend terrain (1-10) |
| Mask | \`Mask power\` | Edge ocean falloff |
| Add | \`Add amount rangeX rangeY\` | Raise terrain |
| Multiply | \`Multiply factor land\|sea\` | Scale heights |

**Syntax notes:**
- \`count\`: Number of features (1-10)
- \`height\`: Elevation range like "70-85" (0-19=water, 20-100=land)
- \`rangeX/rangeY\`: Position range like "30-70" (percentage of map)

**Example commands:**
- \`Range 1 75-90 70-90 5-25\` = One tall mountain range in the northeast
- \`Hill 3 40-55 60-75 30-50\` = Three medium hills in the central-east
- \`Trough 1 15-25 50-60 10-80\` = A north-south valley (river will form)

## Coordinate System

- Terrain commands use percentages: "30-70" = center 40% of that axis
- Locations use normalized 0-1 coordinates: \`x: 0.65, y: 0.35\` = 65% across, 35% down
- Zone centers also use 0-1 coordinates with a radius (also 0-1)

## Templates

Start with a base template, then customize with commands:
- \`continents\` - Large landmasses with water between
- \`archipelago\` - Island chains
- \`peninsula\` - Land jutting into water
- \`isthmus\` - Narrow land bridge
- \`pangea\` - Single supercontinent

## Design Guidelines

1. **Match narrative geography**: If mountains are mentioned, add Range commands
2. **Rivers in valleys**: Use Trough where rivers should flow
3. **Logical placement**: Castles on hills, ports on coasts, mines near mountains
4. **Consistent coordinates**: If a tower is "in the mountains", place it where Range command created mountains
5. **State coherence**: States should control geographically connected locations

## Zone Types

- \`Disaster\` - Devastated areas (dragon lairs, magical catastrophes)
- \`Invasion\` - Areas under attack
- \`Rebels\` - Rebellious regions
- \`Disease\` - Plague zones
- \`Eruption\` - Volcanic activity
- \`Flood\` - Flooded regions

## Borders

Define natural or political boundaries between states. Borders help the map generator understand territorial limits.

**Border types:**
- \`river\` - A river forms the boundary (reference the Trough command that creates it)
- \`mountain\` - A mountain range divides territories (reference the Range command)
- \`forest\` - Dense forest marks the edge
- \`sea\` - Coastal boundary
- \`road\` - Trade route defines sphere of influence
- \`undefined\` - Vague/contested border

**Example:**
\`\`\`json
{
  "between": ["corgak_clan", "human_kingdom"],
  "type": "river",
  "name": "Blackwater River",
  "hint": "The Trough at x:50-55 creates this river valley"
}
\`\`\`

Always define borders when:
1. Two states share territory
2. A natural feature (river, mountain) is mentioned as a dividing line
3. The narrative implies territorial boundaries`;
}

// ============================================================================
// World Specification JSON Schema
// ============================================================================

const WORLD_SPEC_SCHEMA = {
  name: "world_specification",
  strict: true,
  schema: {
    type: "object",
    properties: {
      worldAnalysis: {
        type: "object",
        properties: {
          summary: {type: "string"},
          setting: {type: "string"},
          climate: {type: "string"},
          themes: {type: "array", items: {type: "string"}}
        },
        required: ["summary", "setting", "climate", "themes"],
        additionalProperties: false
      },
      terrain: {
        type: "object",
        properties: {
          template: {type: "string"},
          heightmapCommands: {type: "array", items: {type: "string"}},
          climateSettings: {
            type: "object",
            properties: {
              temperatureEquator: {type: "number"},
              temperatureNorthPole: {type: "number"},
              precipitation: {type: "string"}
            },
            required: ["temperatureEquator", "temperatureNorthPole", "precipitation"],
            additionalProperties: false
          }
        },
        required: ["template", "heightmapCommands", "climateSettings"],
        additionalProperties: false
      },
      locations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {type: "string"},
            name: {type: "string"},
            type: {type: "string"},
            x: {type: "number"},
            y: {type: "number"},
            owner: {type: "string"},
            isCapital: {type: "boolean"},
            description: {type: "string"}
          },
          required: ["id", "name", "type", "x", "y"],
          additionalProperties: false
        }
      },
      states: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {type: "string"},
            name: {type: "string"},
            form: {type: "string"},
            capital: {type: "string"},
            culture: {type: "string"},
            expansionism: {type: "number"},
            color: {type: "string"},
            locations: {type: "array", items: {type: "string"}},
            description: {type: "string"}
          },
          required: ["id", "name", "form", "capital", "locations"],
          additionalProperties: false
        }
      },
      cultures: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {type: "string"},
            name: {type: "string"},
            type: {type: "string"},
            base: {type: "string"},
            description: {type: "string"}
          },
          required: ["id", "name", "type"],
          additionalProperties: false
        }
      },
      religions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {type: "string"},
            name: {type: "string"},
            type: {type: "string"},
            form: {type: "string"},
            description: {type: "string"}
          },
          required: ["id", "name"],
          additionalProperties: false
        }
      },
      zones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {type: "string"},
            type: {type: "string"},
            center: {
              type: "object",
              properties: {
                x: {type: "number"},
                y: {type: "number"}
              },
              required: ["x", "y"],
              additionalProperties: false
            },
            radius: {type: "number"},
            description: {type: "string"}
          },
          required: ["name", "type", "center", "radius"],
          additionalProperties: false
        }
      },
      borders: {
        type: "array",
        items: {
          type: "object",
          properties: {
            between: {type: "array", items: {type: "string"}},
            type: {type: "string"},
            name: {type: "string"},
            hint: {type: "string"}
          },
          required: ["between", "type"],
          additionalProperties: false
        }
      }
    },
    required: ["worldAnalysis", "terrain", "locations", "states", "cultures", "religions", "zones", "borders"],
    additionalProperties: false
  }
};

// ============================================================================
// Build User Message
// ============================================================================

function buildWorldSpecUserMessage(preprocessed) {
  return `## Adventure to Convert

**Title:** ${preprocessed.meta.title}
**Description:** ${preprocessed.meta.description || "No description"}
**Tags:** ${preprocessed.meta.tags?.join(", ") || "None"}

## Memory Context
${preprocessed.memory || "No memory context."}

## Scenario Setup
${preprocessed.details?.instructions?.scenario?.substring(0, 2000) || "No scenario instructions."}
${preprocessed.authorsNote ? `\n**Author's Note:** ${preprocessed.authorsNote}` : ""}

## World Data from Story Cards

### Characters
${formatCards(preprocessed.worldData.characters)}

### Locations
${formatCards(preprocessed.worldData.locations)}

### Factions
${formatCards(preprocessed.worldData.factions)}

## Narrative
${preprocessed.narrative || "No narrative content."}

---

## Your Task

Design a complete world specification for this adventure. Think like a cartographer:

1. **Analyze the geography** mentioned in the narrative
2. **Design terrain** using heightmap commands that match the described world
3. **Extract map-scale locations** - settlements, fortifications, landmarks, ruins (not sub-locations within them)
4. **Define states** that control the locations mentioned
5. **Create zones** for any disaster/conflict areas
6. **Define borders** between states using natural features (rivers, mountains)

### Location Checklist
- [ ] Settlements (cities, towns, villages)
- [ ] Fortifications (castles, towers, strongholds)
- [ ] Resource sites (mines, quarries, farms)
- [ ] Named natural landmarks
- [ ] Ruins and historic sites
- [ ] Dungeons, lairs, caves

### Border Checklist
- [ ] Borders between adjacent states
- [ ] Rivers or mountains mentioned as boundaries

Output valid heightmap DSL commands.`;
}

function formatCards(cards) {
  if (!cards || cards.length === 0) return "None";
  return cards
    .map(c => `- **${c.title}**: ${c.value?.substring(0, 300) || "No description"}`)
    .join("\n");
}

// ============================================================================
// Validation Helpers
// ============================================================================

function validateHeightmapCommand(cmd) {
  const patterns = [
    /^Hill\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Range\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Trough\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Pit\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Strait\s+\d+\s+(vertical|horizontal)$/i,
    /^Smooth\s+\d+$/,
    /^Mask\s+\d+$/,
    /^Add\s+-?\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Multiply\s+[\d.]+\s+(land|sea)$/i
  ];

  return patterns.some(p => p.test(cmd.trim()));
}

function validateCoordinate(val) {
  return typeof val === "number" && val >= 0 && val <= 1;
}

function analyzeWorldSpec(spec) {
  const issues = [];
  const warnings = [];

  // Validate heightmap commands
  const validCommands = [];
  const invalidCommands = [];

  for (const cmd of spec.terrain.heightmapCommands) {
    if (validateHeightmapCommand(cmd)) {
      validCommands.push(cmd);
    } else {
      invalidCommands.push(cmd);
    }
  }

  if (invalidCommands.length > 0) {
    issues.push(`Invalid heightmap commands: ${invalidCommands.join(", ")}`);
  }

  // Validate location coordinates
  for (const loc of spec.locations) {
    if (!validateCoordinate(loc.x) || !validateCoordinate(loc.y)) {
      issues.push(`Location "${loc.name}" has invalid coordinates: (${loc.x}, ${loc.y})`);
    }
  }

  // Validate zone coordinates
  for (const zone of spec.zones) {
    if (!validateCoordinate(zone.center.x) || !validateCoordinate(zone.center.y)) {
      issues.push(`Zone "${zone.name}" has invalid center: (${zone.center.x}, ${zone.center.y})`);
    }
    if (!validateCoordinate(zone.radius)) {
      warnings.push(`Zone "${zone.name}" has large radius: ${zone.radius}`);
    }
  }

  // Check state-location references
  const locationIds = new Set(spec.locations.map(l => l.id));
  for (const state of spec.states) {
    if (state.capital && !locationIds.has(state.capital)) {
      issues.push(`State "${state.name}" references unknown capital: ${state.capital}`);
    }
    for (const locId of state.locations) {
      if (!locationIds.has(locId)) {
        warnings.push(`State "${state.name}" references unknown location: ${locId}`);
      }
    }
  }

  // Check location-state ownership
  const stateIds = new Set(spec.states.map(s => s.id));
  for (const loc of spec.locations) {
    if (loc.owner && !stateIds.has(loc.owner)) {
      warnings.push(`Location "${loc.name}" references unknown owner: ${loc.owner}`);
    }
  }

  return {
    valid: issues.length === 0,
    validCommands,
    invalidCommands,
    issues,
    warnings
  };
}

// ============================================================================
// Schema Variants for Different Providers
// ============================================================================

// OpenAI requires all properties to be in required array
function getSchemaForModel(model) {
  const schema = JSON.parse(JSON.stringify(WORLD_SPEC_SCHEMA)); // Deep clone

  if (model.startsWith("openai/")) {
    // OpenAI strict mode requires all properties in 'required'
    // Add 'owner' and other optional fields to locations required array
    const locItems = schema.schema.properties.locations.items;
    locItems.required = ["id", "name", "type", "x", "y", "owner", "isCapital", "description"];

    // Make sure all nested objects have complete required arrays
    const stateItems = schema.schema.properties.states.items;
    stateItems.required = ["id", "name", "form", "capital", "locations", "culture", "expansionism", "color", "description"];

    const cultureItems = schema.schema.properties.cultures.items;
    cultureItems.required = ["id", "name", "type", "base", "description"];

    const religionItems = schema.schema.properties.religions.items;
    religionItems.required = ["id", "name", "type", "form", "description"];

    const zoneItems = schema.schema.properties.zones.items;
    zoneItems.required = ["name", "type", "center", "radius", "description"];

    const borderItems = schema.schema.properties.borders.items;
    borderItems.required = ["between", "type", "name", "hint"];
  }

  return schema;
}

// Get request options for different providers
function getRequestOptionsForModel(model) {
  const options = {};

  if (model.startsWith("anthropic/")) {
    // Claude models need special header for structured outputs
    // Pass headers directly (fetchOptions is deprecated)
    options.headers = {
      "anthropic-beta": "structured-outputs-2025-11-13"
    };
  }

  return options;
}

// ============================================================================
// Anthropic Direct API Test
// ============================================================================

async function testAnthropicModel(model, userMessage, expansionLevel = 'moderate') {
  const startTime = Date.now();
  const systemPrompt = buildSystemPrompt(expansionLevel);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "structured-outputs-2025-11-13"
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,
        system: systemPrompt,
        messages: [
          {role: "user", content: userMessage}
        ],
        output_format: {
          type: "json_schema",
          schema: WORLD_SPEC_SCHEMA.schema
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        error: {
          code: response.status,
          message: data.error?.message || JSON.stringify(data),
          type: data.error?.type
        }
      };
    }

    const content = data.content?.[0]?.text;
    if (!content) throw new Error("No content in response");

    const worldSpec = JSON.parse(content);
    const analysis = analyzeWorldSpec(worldSpec);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Calculate tokens from usage
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    return {
      success: true,
      model,
      duration,
      tokens,
      worldSpec,
      analysis,
      stats: {
        heightmapCmds: worldSpec.terrain.heightmapCommands.length,
        validCmds: analysis.validCommands.length,
        locations: worldSpec.locations.length,
        states: worldSpec.states.length,
        cultures: worldSpec.cultures.length,
        zones: worldSpec.zones.length,
        borders: worldSpec.borders.length,
        issues: analysis.issues.length,
        warnings: analysis.warnings.length
      }
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    let errorMsg = error.message || "Unknown error";
    let errorDetails = {};

    if (error.error) {
      errorDetails = {
        code: error.error.code,
        message: error.error.message,
        type: error.error.type
      };
      errorMsg = `[${error.error.code}] ${error.error.message}`;
    }

    return {
      success: false,
      model,
      duration,
      error: errorMsg,
      errorDetails,
      fullError: error
    };
  }
}

// ============================================================================
// OpenAI Direct API Test (with strict structured outputs)
// ============================================================================

async function testOpenAIModel(model, userMessage, expansionLevel = 'moderate') {
  const startTime = Date.now();
  const systemPrompt = buildSystemPrompt(expansionLevel);

  try {
    // OpenAI requires ALL properties in required array for strict mode
    const strictSchema = JSON.parse(JSON.stringify(WORLD_SPEC_SCHEMA.schema));

    // Make all optional fields required for OpenAI strict mode
    strictSchema.properties.locations.items.required =
      ["id", "name", "type", "x", "y", "owner", "isCapital", "description"];
    strictSchema.properties.states.items.required =
      ["id", "name", "form", "capital", "locations", "culture", "expansionism", "color", "description"];
    strictSchema.properties.cultures.items.required =
      ["id", "name", "type", "base", "description"];
    strictSchema.properties.religions.items.required =
      ["id", "name", "type", "form", "description"];
    strictSchema.properties.zones.items.required =
      ["name", "type", "center", "radius", "description"];
    strictSchema.properties.borders.items.required =
      ["between", "type", "name", "hint"];

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: userMessage}
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "world_specification",
          schema: strictSchema,
          strict: true
        }
      },
      max_completion_tokens: 16384
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in response");

    const worldSpec = JSON.parse(content);
    const analysis = analyzeWorldSpec(worldSpec);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    const tokens = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

    return {
      success: true,
      model,
      duration,
      tokens,
      worldSpec,
      analysis,
      stats: {
        heightmapCmds: worldSpec.terrain.heightmapCommands.length,
        validCmds: analysis.validCommands.length,
        locations: worldSpec.locations.length,
        states: worldSpec.states.length,
        cultures: worldSpec.cultures.length,
        zones: worldSpec.zones.length,
        borders: worldSpec.borders.length,
        issues: analysis.issues.length,
        warnings: analysis.warnings.length
      }
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    let errorMsg = error.message || "Unknown error";
    let errorDetails = {};

    if (error.code) {
      errorDetails = {
        code: error.code,
        message: error.message,
        type: error.type
      };
      errorMsg = `[${error.code}] ${error.message}`;
    }

    return {
      success: false,
      model,
      duration,
      error: errorMsg,
      errorDetails,
      fullError: error
    };
  }
}

// ============================================================================
// OpenRouter Model Test
// ============================================================================

async function testOpenRouterModel(model, userMessage, expansionLevel = 'moderate') {
  const startTime = Date.now();
  const systemPrompt = buildSystemPrompt(expansionLevel);

  try {
    const schema = getSchemaForModel(model);
    const requestOptions = getRequestOptionsForModel(model);

    const completion = await openRouter.chat.send({
      model,
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: userMessage}
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: schema
      },
      temperature: 0.7,
      maxTokens: 8192,
      stream: false
    }, requestOptions);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in response");

    const worldSpec = JSON.parse(content);
    const analysis = analyzeWorldSpec(worldSpec);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      success: true,
      model,
      duration,
      tokens: completion.usage?.totalTokens || 0,
      worldSpec,
      analysis,
      stats: {
        heightmapCmds: worldSpec.terrain.heightmapCommands.length,
        validCmds: analysis.validCommands.length,
        locations: worldSpec.locations.length,
        states: worldSpec.states.length,
        cultures: worldSpec.cultures.length,
        zones: worldSpec.zones.length,
        borders: worldSpec.borders.length,
        issues: analysis.issues.length,
        warnings: analysis.warnings.length
      }
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    // Extract detailed error info from OpenRouter SDK ChatError
    let errorMsg = error.message;
    let errorDetails = {};

    // SDK ChatError has error.code, error.message, error.type, error.param
    if (error.error) {
      errorDetails = {
        code: error.error.code,
        message: error.error.message,
        type: error.error.type,
        param: error.error.param
      };
      errorMsg = `[${error.error.code}] ${error.error.message}`;
      if (error.error.type) errorMsg += ` (type: ${error.error.type})`;
    }

    // SDK ChatError also has data$ with original response
    if (error.data$) {
      errorDetails.data = error.data$;
    }

    // Check for response body in httpMeta
    if (error.httpMeta?.body) {
      errorDetails.body = error.httpMeta.body;
    }

    return {
      success: false,
      model,
      duration,
      error: errorMsg,
      errorDetails,
      fullError: error
    };
  }
}

// ============================================================================
// Main Multi-Model Test
// ============================================================================

async function testAllModels() {
  // Load the adventure
  const adventurePath = "./json/Materia Medica_noheWhC3ju_G.adventure (2).json";
  console.log(`\n📖 Loading adventure: ${adventurePath}\n`);

  const raw = JSON.parse(readFileSync(adventurePath, "utf-8"));

  // Preprocess
  console.log("🔄 Preprocessing adventure...");
  const preprocessed = DungeonPreprocessor.preprocessAdventure(raw);

  console.log(`   Title: ${preprocessed.meta.title}`);
  console.log(`   Valid Actions: ${preprocessed.meta.validActions}`);
  console.log(`   Story Cards: ${preprocessed.meta.storyCardCount}`);
  console.log(`   Estimated Tokens: ${preprocessed.meta.estimatedTokens}`);

  // Build user message (same for all models)
  const userMessage = buildWorldSpecUserMessage(preprocessed);
  console.log(`   User message length: ${userMessage.length} chars`);

  // All models to test
  const allModels = [
    ...OPENAI_MODELS.map(m => ({model: m, type: 'openai'})),
    ...OPENROUTER_MODELS.map(m => ({model: m, type: 'openrouter'})),
    ...ANTHROPIC_MODELS.map(m => ({model: m, type: 'anthropic'}))
  ];

  const totalTests = allModels.length * EXPANSION_LEVELS.length;
  console.log(`\n🗺️  Testing ${allModels.length} models × ${EXPANSION_LEVELS.length} expansion levels = ${totalTests} tests\n`);
  console.log("=".repeat(120));

  const results = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);

  // Test each model with each expansion level
  for (const expansionLevel of EXPANSION_LEVELS) {
    console.log(`\n📊 EXPANSION LEVEL: ${expansionLevel.toUpperCase()}`);
    console.log("-".repeat(120));

    for (const {model, type} of allModels) {
      const shortName = model.split("/").pop().replace(/-\d{8}$/, "");
      const displayName = `${shortName} [${expansionLevel}]`;
      process.stdout.write(`Testing ${displayName.padEnd(45)}... `);

      let result;
      try {
        if (type === 'openai') {
          if (!openai) {
            console.log("⚠️  Skipped (no API key)");
            continue;
          }
          result = await testOpenAIModel(model, userMessage, expansionLevel);
        } else if (type === 'openrouter') {
          result = await testOpenRouterModel(model, userMessage, expansionLevel);
        } else if (type === 'anthropic') {
          if (!ANTHROPIC_API_KEY) {
            console.log("⚠️  Skipped (no API key)");
            continue;
          }
          result = await testAnthropicModel(model, userMessage, expansionLevel);
        }

        // Add expansion level to result
        result.expansionLevel = expansionLevel;
        results.push(result);

        // Save individual result
        const safeModelName = model.replace(/[/:]/g, "_");
        const filename = `${OUTPUT_DIR}/${safeModelName}_${expansionLevel}_${timestamp}.json`;
        writeFileSync(filename, JSON.stringify(result, null, 2));

        if (result.success) {
          const s = result.stats;
          console.log(`✅ ${result.duration}s | ${s.validCmds}/${s.heightmapCmds} cmds | ${s.locations} locs | ${s.states} states | ${s.borders} borders | ${s.issues} issues`);
        } else {
          console.log(`❌ ${result.duration}s | ${result.error.substring(0, 50)}`);
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message.substring(0, 50)}`);
      }
    }
  }

  console.log(`\n📁 Saved ${results.length} results to ${OUTPUT_DIR}/`);

  // Build comparison table grouped by model
  console.log("\n" + "=".repeat(120));
  console.log("EXPANSION LEVEL COMPARISON BY MODEL");
  console.log("=".repeat(120));

  // Header
  console.log("\n┌" + "─".repeat(25) + "┬" + "─".repeat(12) + "┬" + "─".repeat(8) + "┬" + "─".repeat(8) + "┬" + "─".repeat(8) + "┬" + "─".repeat(8) + "┬" + "─".repeat(8) + "┬" + "─".repeat(8) + "┬" + "─".repeat(8) + "┐");
  console.log("│" + " Model".padEnd(25) + "│" + " Mode".padEnd(12) + "│" + " Time".padEnd(8) + "│" + " Cmds".padEnd(8) + "│" + " Locs".padEnd(8) + "│" + " States".padEnd(8) + "│" + " Zones".padEnd(8) + "│" + " Borders".padEnd(8) + "│" + " Issues".padEnd(8) + "│");
  console.log("├" + "─".repeat(25) + "┼" + "─".repeat(12) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┤");

  // Group results by model
  const modelGroups = {};
  for (const r of results) {
    const shortName = r.model.split("/").pop().replace(/-\d{8}$/, "").substring(0, 23);
    if (!modelGroups[shortName]) modelGroups[shortName] = [];
    modelGroups[shortName].push(r);
  }

  for (const [modelName, modelResults] of Object.entries(modelGroups)) {
    for (const r of modelResults) {
      if (r.success) {
        const s = r.stats;
        console.log(
          "│" + ` ${modelName}`.padEnd(25) +
          "│" + ` ${r.expansionLevel}`.padEnd(12) +
          "│" + ` ${r.duration}s`.padEnd(8) +
          "│" + ` ${s.validCmds}`.padEnd(8) +
          "│" + ` ${s.locations}`.padEnd(8) +
          "│" + ` ${s.states}`.padEnd(8) +
          "│" + ` ${s.zones}`.padEnd(8) +
          "│" + ` ${s.borders}`.padEnd(8) +
          "│" + ` ${s.issues}`.padEnd(8) + "│"
        );
      } else {
        console.log(
          "│" + ` ${modelName}`.padEnd(25) +
          "│" + ` ${r.expansionLevel}`.padEnd(12) +
          "│" + ` ${r.duration}s`.padEnd(8) +
          "│" + " FAIL".padEnd(8) +
          "│" + " -".padEnd(8) +
          "│" + " -".padEnd(8) +
          "│" + " -".padEnd(8) +
          "│" + " -".padEnd(8) +
          "│" + " -".padEnd(8) + "│"
        );
      }
    }
    // Add separator between models
    console.log("├" + "─".repeat(25) + "┼" + "─".repeat(12) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┼" + "─".repeat(8) + "┤");
  }

  console.log("└" + "─".repeat(25) + "┴" + "─".repeat(12) + "┴" + "─".repeat(8) + "┴" + "─".repeat(8) + "┴" + "─".repeat(8) + "┴" + "─".repeat(8) + "┴" + "─".repeat(8) + "┴" + "─".repeat(8) + "┴" + "─".repeat(8) + "┘");

  // Summary statistics by expansion level
  console.log("\n" + "=".repeat(120));
  console.log("SUMMARY BY EXPANSION LEVEL");
  console.log("=".repeat(120));

  for (const level of EXPANSION_LEVELS) {
    const levelResults = results.filter(r => r.expansionLevel === level && r.success);
    if (levelResults.length === 0) continue;

    const avgLocs = (levelResults.reduce((sum, r) => sum + r.stats.locations, 0) / levelResults.length).toFixed(1);
    const avgStates = (levelResults.reduce((sum, r) => sum + r.stats.states, 0) / levelResults.length).toFixed(1);
    const avgBorders = (levelResults.reduce((sum, r) => sum + r.stats.borders, 0) / levelResults.length).toFixed(1);
    const avgZones = (levelResults.reduce((sum, r) => sum + r.stats.zones, 0) / levelResults.length).toFixed(1);
    const avgTime = (levelResults.reduce((sum, r) => sum + parseFloat(r.duration), 0) / levelResults.length).toFixed(1);

    console.log(`\n📊 ${level.toUpperCase()}: (${levelResults.length} models)`);
    console.log(`   Avg Locations: ${avgLocs} | Avg States: ${avgStates} | Avg Zones: ${avgZones} | Avg Borders: ${avgBorders} | Avg Time: ${avgTime}s`);
  }

  // Summary
  const successful = results.filter(r => r.success);
  console.log(`\n✅ Summary: ${successful.length}/${results.length} tests succeeded`);
  console.log("\n✅ Done!");
}

testAllModels().catch(console.error);
