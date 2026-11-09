# Structured Output Schema for AI Integration

**Version:** 1.0
**Date:** 2025-11-28
**Critical Requirement:** AI must ALWAYS have full context and return valid, parseable responses

---

## Problem Statement

### Why Full Context is Critical

**Without Full Context:**
```
AI sees: "State 16 exists, State 11 exists"
User: "Make them allies"
AI response: Updates State 16's diplomacy but forgets State 11
Result: Broken referential integrity, one-way alliance
```

**With Full Context:**
```
AI sees: Complete state list, all relations, all burgs
User: "Make them allies"
AI response: Updates both State 16 and State 11 reciprocally
Result: Valid bidirectional alliance
```

### Why Structured Output is Critical

**Without Structured Output:**
```
AI response: "I've renamed Hizuna to the Broken Crown and made it enemies with Silden"
Problem: Can't parse this! Which state ID? Which neighbor ID? Have to guess.
```

**With Structured Output:**
```
AI response:
{
  "changes": [
    {"op": "update", "type": "state", "id": 16, "field": "name", "value": "Broken Crown"},
    {"op": "update", "type": "state", "id": 16, "field": "diplomacy.11", "value": "Enemy"}
  ]
}
Result: Unambiguous, parseable, validatable
```

---

## Solution: Comprehensive Context + Strict Schema

### Part 1: Always Send Complete Context

**Principle:** AI must see the ENTIRE relevant state of the world, not fragments.

#### Context Levels

**Level 1: Strategic (ALWAYS included)**
- All states (compressed)
- All major burgs (pop > 10)
- All geographic features
- All major rivers

**Level 2: Regional (query-specific)**
- All burgs in affected region
- All markers in affected region
- Cell-level detail for specific areas

**Level 3: Full Detail (rare, only when needed)**
- Complete cell data for specific operations
- Full route data
- Complete military compositions

---

## Structured Output Schemas

### Schema Version 1: Compressed JSON

**For AI Map Generator and World Builder**

```typescript
interface CompressedMapUpdate {
  version: "1.0",
  operation: "generate" | "worldbuild" | "translate" | "roleplay",
  confidence: number,  // 0.0-1.0
  reasoning: string,
  changes: CompressedChange[]
}

interface CompressedChange {
  // Compressed format: "S16|name=BrokenCrown|form=Ruin"
  entity: string,  // Compressed entity line
  op: "update" | "create" | "delete"
}

// Example response:
{
  "version": "1.0",
  "operation": "worldbuild",
  "confidence": 0.92,
  "reasoning": "Applied post-apocalyptic theme to existing geography",
  "changes": [
    {"entity": "S1|name=BrokenCrown|form=Empire", "op": "update"},
    {"entity": "S2|name=FreeCities|form=League", "op": "update"},
    {"entity": "M50|ruins|@450,320", "op": "create"},
    {"entity": "NOTE|Cataclysm|<p>100 years ago...</p>", "op": "create"}
  ]
}
```

### Schema Version 2: Structured Field Updates

**For Story Translator and Roleplay Assistant**

```typescript
interface FieldUpdate {
  version: "1.0",
  operation: "translate" | "roleplay",
  confidence: number,
  narrative_summary: string,
  changes: Change[]
}

interface Change {
  operation: "update" | "create" | "delete",
  entityType: "state" | "burg" | "marker" | "note" | "military" | "province",
  entityId?: number,       // For update/delete
  entityName?: string,     // For name-based lookup
  updates: Record<string, any>,  // Fields to change
  reasoning: string
}

// Example response:
{
  "version": "1.0",
  "operation": "translate",
  "confidence": 0.88,
  "narrative_summary": "Kingdom of Hizuna fell to undead invasion",
  "changes": [
    {
      "operation": "update",
      "entityType": "state",
      "entityId": 16,
      "updates": {
        "name": "Fallen Hizuna",
        "form": "Ruin"
      },
      "reasoning": "State conquered and collapsed"
    },
    {
      "operation": "create",
      "entityType": "marker",
      "updates": {
        "type": "undead",
        "x": 650,
        "y": 240,
        "description": "Undead horde location"
      },
      "reasoning": "Mark invasion source"
    }
  ]
}
```

---

## API Response Format Enforcement

### Method 1: JSON Mode (OpenAI, Anthropic)

```javascript
// For OpenAI
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    response_format: { type: "json_object" },  // ENFORCE JSON
    temperature: 0.7
  })
});

// For Anthropic Claude
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ]
    // Note: Anthropic doesn't have response_format yet,
    // rely on strong prompt engineering
  })
});
```

### Method 2: Schema in Prompt (All Models)

```javascript
const SCHEMA_ENFORCEMENT_PROMPT = `
CRITICAL: You MUST respond with valid JSON matching this exact schema:

{
  "version": "1.0",
  "operation": "worldbuild",
  "confidence": 0.0-1.0,
  "reasoning": "string explaining your choices",
  "changes": [
    {
      "entity": "compressed entity string",
      "op": "update|create|delete"
    }
  ]
}

DO NOT include any text outside the JSON object.
DO NOT use markdown code blocks.
Return ONLY the raw JSON.

Example valid response:
{"version":"1.0","operation":"worldbuild","confidence":0.92,"reasoning":"Applied theme","changes":[{"entity":"S1|name=NewName|form=Empire","op":"update"}]}
`;
```

### Method 3: Validation + Retry Loop

```javascript
// modules/ai/structured-response-handler.js
"use strict";

window.StructuredResponseHandler = (function() {

  const MAX_RETRIES = 3;

  const parseAndValidate = async function(aiCall, schema, retries = 0) {
    try {
      const response = await aiCall();

      // Try to extract JSON from response
      const json = extractJSON(response);

      // Validate against schema
      const validation = validateSchema(json, schema);

      if (!validation.valid) {
        console.warn("Schema validation failed:", validation.errors);

        if (retries < MAX_RETRIES) {
          // Retry with error feedback
          const retryPrompt = buildRetryPrompt(response, validation.errors);
          return parseAndValidate(() => aiCall(retryPrompt), schema, retries + 1);
        } else {
          throw new Error("Max retries exceeded. Schema validation failed.");
        }
      }

      return json;

    } catch (err) {
      if (retries < MAX_RETRIES) {
        console.warn(`Parse error, retry ${retries + 1}/${MAX_RETRIES}:`, err);
        return parseAndValidate(aiCall, schema, retries + 1);
      } else {
        throw err;
      }
    }
  };

  const extractJSON = function(text) {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch (e) {
      // Maybe it's in a code block
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }

      // Maybe it's surrounded by other text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not extract valid JSON from response");
    }
  };

  const validateSchema = function(json, schema) {
    const errors = [];

    // Check required top-level fields
    if (!json.version) errors.push("Missing 'version' field");
    if (!json.operation) errors.push("Missing 'operation' field");
    if (typeof json.confidence !== 'number') errors.push("Missing or invalid 'confidence' field");
    if (!json.changes || !Array.isArray(json.changes)) errors.push("Missing or invalid 'changes' array");

    // Check each change
    if (json.changes) {
      json.changes.forEach((change, idx) => {
        if (schema === 'compressed') {
          if (!change.entity) errors.push(`Change ${idx}: missing 'entity'`);
          if (!change.op) errors.push(`Change ${idx}: missing 'op'`);
        } else if (schema === 'structured') {
          if (!change.operation) errors.push(`Change ${idx}: missing 'operation'`);
          if (!change.entityType) errors.push(`Change ${idx}: missing 'entityType'`);
          if (!change.updates) errors.push(`Change ${idx}: missing 'updates'`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  const buildRetryPrompt = function(previousResponse, errors) {
    return `Your previous response had validation errors:
${errors.join('\n')}

Previous response:
${previousResponse}

Please provide a corrected response that matches the required schema exactly.`;
  };

  return {
    parseAndValidate,
    extractJSON,
    validateSchema
  };
})();
```

---

## Complete Context Strategy

### Context Builder: Full State Inclusion

```javascript
// modules/ai/context-builder.js (UPDATED)
"use strict";

window.ContextBuilder = (function() {

  const buildFullContext = function(options = {}) {
    // ALWAYS include complete state
    const context = {
      meta: {
        cells: pack.cells.i.length,
        mapName: Names.getMapName() || "Unnamed",
        seed: seed
      },

      // ALL STATES (no filtering)
      states: pack.states
        .filter(s => s.i && !s.removed)
        .map(s => ContextCompressor.compressState(s)),

      // ALL MAJOR BURGS (population > 5, plus all capitals)
      burgs: pack.burgs
        .filter(b => b.i && !b.removed && (b.population > 5 || b.capital))
        .map(b => ContextCompressor.compressBurg(b)),

      // ALL GEOGRAPHIC FEATURES
      features: pack.features
        .filter(f => f.i && f.land)
        .map(f => ContextCompressor.compressFeature(f)),

      // ALL MAJOR RIVERS (length > 100)
      rivers: pack.rivers
        .filter(r => r.i && r.length > 100)
        .map(r => ContextCompressor.compressRiver(r)),

      // ALL MARKERS
      markers: pack.markers
        .map(m => ContextCompressor.compressMarker(m)),

      // ALL CULTURES
      cultures: pack.cultures
        .filter(c => c.i && !c.removed)
        .map(c => `CL${c.i}|${c.name}|${c.type}|${c.expansionism}`),

      // ALL RELIGIONS
      religions: pack.religions
        .filter(r => r.i && !r.removed)
        .map(r => `RL${r.i}|${r.name}|${r.type}|${r.form}`)
    };

    return context;
  };

  const formatForAI = function(context) {
    let output = `MAP CONTEXT (Complete State)\n`;
    output += `Seed: ${context.meta.seed} | Cells: ${context.meta.cells}\n\n`;

    output += `=== STATES (${context.states.length}) ===\n`;
    context.states.forEach(s => output += s + '\n');

    output += `\n=== BURGS (${context.burgs.length}) ===\n`;
    context.burgs.forEach(b => output += b + '\n');

    output += `\n=== FEATURES (${context.features.length}) ===\n`;
    context.features.forEach(f => output += f + '\n');

    output += `\n=== RIVERS (${context.rivers.length}) ===\n`;
    context.rivers.forEach(r => output += r + '\n');

    output += `\n=== MARKERS (${context.markers.length}) ===\n`;
    context.markers.forEach(m => output += m + '\n');

    output += `\n=== CULTURES (${context.cultures.length}) ===\n`;
    context.cultures.forEach(c => output += c + '\n');

    output += `\n=== RELIGIONS (${context.religions.length}) ===\n`;
    context.religions.forEach(r => output += r + '\n');

    return output;
  };

  const estimateTokens = function(context) {
    const text = formatForAI(context);
    return Math.ceil(text.length / 4); // Rough estimate: 4 chars = 1 token
  };

  return {
    buildFullContext,
    formatForAI,
    estimateTokens
  };
})();
```

---

## Prompt Engineering for Reliability

### System Prompt Template

```javascript
const RELIABLE_SYSTEM_PROMPT = `You are a fantasy map world-building assistant.

CRITICAL RULES FOR RELIABILITY:
1. You have been given the COMPLETE state of the map - all states, burgs, features, etc.
2. You MUST maintain referential integrity:
   - If updating State A's diplomacy toward State B, also update State B's diplomacy toward State A
   - If moving a burg, ensure its state reference is valid
   - If creating a marker, ensure coordinates are within map bounds
3. You MUST respond with VALID JSON matching the schema exactly
4. DO NOT hallucinate entity IDs that don't exist in the context
5. DO NOT make assumptions about data not provided

COMPRESSED FORMAT REFERENCE:
States: S{id}|{name}|{form}|C{capital}|CL{culture}|N{cells}|B{burgs}|A{area}|U{urban}|R{rural}|NB[{id}:{code},...]
Burgs: B{id}|{name}|S{state}|P{pop}|{type}|@{x},{y}|F:{flags}
Features: G{id}|{type}|N{cells}|A{area}|{group}
Rivers: R{id}|{name}|{source}>{mouth}|L{length}|D{discharge}|N{cells}
Markers: M{id}|{type}|@{x},{y}
Cultures: CL{id}|{name}|{type}|{expansionism}
Religions: RL{id}|{name}|{type}|{form}

RELATION CODES: A=Ally, F=Friendly, N=Neutral, E=Enemy, R=Rival, S=Suspicion, V=Vassal, Z=Suzerain
FEATURE FLAGS: C=Capital, P=Port, W=Walls, 1=Citadel, 2=Plaza, 3=Temple, 4=Shanty

RESPONSE SCHEMA (MANDATORY):
{
  "version": "1.0",
  "operation": "worldbuild|generate|translate|roleplay",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of changes",
  "changes": [
    {
      "entity": "compressed entity line with modifications",
      "op": "update|create|delete"
    }
  ]
}

EXAMPLE RESPONSE:
{
  "version": "1.0",
  "operation": "worldbuild",
  "confidence": 0.92,
  "reasoning": "Renamed states to match post-apocalyptic theme and set hostile relations",
  "changes": [
    {"entity": "S1|name=BrokenCrown|form=Territories", "op": "update"},
    {"entity": "S1|diplomacy=2:E,3:S", "op": "update"},
    {"entity": "S2|name=FreeCities|form=League", "op": "update"},
    {"entity": "S2|diplomacy=1:E,3:N", "op": "update"},
    {"entity": "M50|ruins|@450,320", "op": "create"}
  ]
}

REMEMBER:
- You see the COMPLETE map state
- Maintain ALL referential integrity
- Return VALID JSON only
- Do not hallucinate IDs`;
```

---

## Validation Pipeline

### Complete Validation Before Applying

```javascript
// modules/ai/validation-pipeline.js
"use strict";

window.ValidationPipeline = (function() {

  const validateChanges = function(changes, fullContext) {
    const errors = [];
    const warnings = [];

    for (const change of changes) {
      // 1. Parse compressed entity
      let entity;
      try {
        entity = parseCompressedEntity(change.entity);
      } catch (err) {
        errors.push(`Failed to parse entity: ${change.entity}`);
        continue;
      }

      // 2. Validate operation
      if (!['update', 'create', 'delete'].includes(change.op)) {
        errors.push(`Invalid operation: ${change.op}`);
        continue;
      }

      // 3. Validate entity exists (for update/delete)
      if (change.op !== 'create') {
        if (!entityExists(entity, fullContext)) {
          errors.push(`Entity does not exist: ${entity.type} ${entity.id}`);
          continue;
        }
      }

      // 4. Validate referential integrity
      const integrityCheck = validateReferentialIntegrity(entity, changes, fullContext);
      if (!integrityCheck.valid) {
        errors.push(...integrityCheck.errors);
      }
      warnings.push(...integrityCheck.warnings);

      // 5. Validate coordinates (if applicable)
      if (entity.x !== undefined && entity.y !== undefined) {
        if (!coordinatesInBounds(entity.x, entity.y, fullContext)) {
          errors.push(`Coordinates out of bounds: ${entity.x},${entity.y}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  };

  const validateReferentialIntegrity = function(entity, allChanges, fullContext) {
    const errors = [];
    const warnings = [];

    // Check state diplomacy reciprocity
    if (entity.type === 'state' && entity.diplomacy) {
      for (const [targetId, relation] of Object.entries(entity.diplomacy)) {
        // Find if there's a reciprocal change
        const reciprocalChange = allChanges.find(c => {
          const e = parseCompressedEntity(c.entity);
          return e.type === 'state' &&
                 e.id === parseInt(targetId) &&
                 e.diplomacy?.[entity.id];
        });

        if (!reciprocalChange) {
          warnings.push(
            `State ${entity.id} sets relation to ${targetId} as ${relation}, ` +
            `but no reciprocal relation found`
          );
        }
      }
    }

    // Check burg references valid state
    if (entity.type === 'burg' && entity.state) {
      const stateExists = fullContext.states.some(s => {
        const parsed = parseCompressedEntity(s);
        return parsed.id === entity.state;
      });

      if (!stateExists) {
        errors.push(`Burg ${entity.id} references non-existent state ${entity.state}`);
      }
    }

    // Check culture references
    if (entity.culture) {
      const cultureExists = fullContext.cultures.some(c => {
        const parsed = c.split('|');
        return parseInt(parsed[0].slice(2)) === entity.culture;
      });

      if (!cultureExists) {
        errors.push(`Entity references non-existent culture ${entity.culture}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  const entityExists = function(entity, fullContext) {
    const collection = fullContext[entity.type + 's'];
    if (!collection) return false;

    return collection.some(item => {
      const parsed = parseCompressedEntity(item);
      return parsed.id === entity.id;
    });
  };

  const coordinatesInBounds = function(x, y, fullContext) {
    // Rough bounds check based on map size
    const maxX = graphWidth || 1920;
    const maxY = graphHeight || 1080;
    return x >= 0 && x <= maxX && y >= 0 && y <= maxY;
  };

  const parseCompressedEntity = function(entityStr) {
    const parts = entityStr.split('|');
    const typeCode = parts[0][0];
    const id = parseInt(parts[0].slice(1));

    const typeMap = {
      'S': 'state',
      'B': 'burg',
      'G': 'feature',
      'R': 'river',
      'M': 'marker'
    };

    const entity = {
      type: typeMap[typeCode],
      id: id
    };

    // Parse remaining fields based on type
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      if (part.startsWith('name=')) {
        entity.name = part.slice(5);
      } else if (part.startsWith('diplomacy=')) {
        entity.diplomacy = {};
        const diplo = part.slice(10);
        diplo.split(',').forEach(rel => {
          const [id, code] = rel.split(':');
          entity.diplomacy[id] = code;
        });
      } else if (part.startsWith('S')) {
        entity.state = parseInt(part.slice(1));
      } else if (part.startsWith('CL')) {
        entity.culture = parseInt(part.slice(2));
      } else if (part.startsWith('@')) {
        const [x, y] = part.slice(1).split(',').map(Number);
        entity.x = x;
        entity.y = y;
      }
    }

    return entity;
  };

  return {
    validateChanges,
    validateReferentialIntegrity,
    entityExists,
    coordinatesInBounds
  };
})();
```

---

## Integration Example

### Complete Reliable Workflow

```javascript
// AI World Builder with full reliability

async function analyzeAndBuildWorld() {
  // 1. Build COMPLETE context
  const fullContext = ContextBuilder.buildFullContext();
  const contextText = ContextBuilder.formatForAI(fullContext);

  console.log(`Context size: ${ContextBuilder.estimateTokens(fullContext)} tokens`);

  // 2. Build prompt with schema enforcement
  const prompt = `${RELIABLE_SYSTEM_PROMPT}

${contextText}

USER REQUEST:
Theme: Post-apocalyptic recovery from magical cataclysm
Tone: Dark, hopeful rebuilding
Tech: Medieval
Magic: Medium (recovering)

Analyze the complete map context above and propose thematic changes.
Respond with valid JSON only.`;

  // 3. Call AI with structured response handling
  const response = await StructuredResponseHandler.parseAndValidate(
    async () => {
      const aiResponse = await callAI(prompt);
      return aiResponse;
    },
    'compressed' // Schema type
  );

  // 4. Validate changes against full context
  const validation = ValidationPipeline.validateChanges(
    response.changes,
    fullContext
  );

  if (!validation.valid) {
    console.error("Validation errors:", validation.errors);
    alert("AI response validation failed:\n" + validation.errors.join('\n'));
    return;
  }

  if (validation.warnings.length > 0) {
    console.warn("Validation warnings:", validation.warnings);
    const proceed = confirm(
      "Warnings detected:\n" + validation.warnings.join('\n') +
      "\n\nProceed anyway?"
    );
    if (!proceed) return;
  }

  // 5. Display to user
  displayProposedChanges(response);

  // 6. User approves
  // Then apply with MapUpdater
}
```

---

## Token Budget with Full Context

### Realistic Map Sizes

**Small Map (2,000 cells, 5 states, 25 burgs):**
```
States: 5 × 25 = 125 tokens
Burgs: 25 × 15 = 375 tokens
Features: 3 × 10 = 30 tokens
Rivers: 5 × 12 = 60 tokens
Markers: 10 × 8 = 80 tokens
Cultures: 5 × 8 = 40 tokens
Religions: 3 × 8 = 24 tokens
─────────────────────────
Total: ~750 tokens
```

**Medium Map (6,000 cells, 15 states, 60 burgs):**
```
States: 15 × 25 = 375 tokens
Burgs: 60 × 15 = 900 tokens
Features: 8 × 10 = 80 tokens
Rivers: 15 × 12 = 180 tokens
Markers: 25 × 8 = 200 tokens
Cultures: 12 × 8 = 96 tokens
Religions: 8 × 8 = 64 tokens
─────────────────────────
Total: ~1,900 tokens
```

**Large Map (20,000 cells, 30 states, 150 burgs):**
```
States: 30 × 25 = 750 tokens
Burgs: 150 × 15 = 2,250 tokens (filter to top 100 = 1,500)
Features: 15 × 10 = 150 tokens
Rivers: 30 × 12 = 360 tokens (filter to 20 = 240)
Markers: 50 × 8 = 400 tokens (filter to 40 = 320)
Cultures: 20 × 8 = 160 tokens
Religions: 12 × 8 = 96 tokens
─────────────────────────
Total: ~3,500 tokens (with filtering)
```

**Remaining Budget:**
- 65k total - 3.5k context = **61.5k for prompts and AI reasoning**
- More than enough!

---

## Summary

This approach ensures:

✅ **Complete Context**: AI always sees full map state
✅ **Referential Integrity**: Validation catches broken references
✅ **Structured Output**: Schema enforcement prevents parsing failures
✅ **Retry Logic**: Handles malformed responses gracefully
✅ **Token Efficient**: Compressed format keeps even large maps under 4k tokens
✅ **Debuggable**: Human-readable format for troubleshooting
✅ **Reliable**: Multiple validation layers prevent corruption

The AI is now operating with **full knowledge** and **strict output requirements** - exactly what you need for reliability!
