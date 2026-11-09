# Fantasy Map Generator - AI Integration Specification

**Version:** 1.0
**Date:** 2025-11-28
**Target Implementation Model:** Claude Opus
**Prepared by:** Claude Sonnet (Architecture Analysis)

---

## Executive Summary

This specification defines the integration of AI-powered storytelling and roleplay features into Azgaar's Fantasy Map Generator. The integration will enable users to:

1. **Generate maps from narrative prompts** ("Create a volcanic archipelago with warring city-states" → complete map)
2. **Enhance existing maps with AI-directed world-building** (Add nations, cultures, conflicts to random maps)
3. **Translate narrative events into map changes** ("The kingdom fell to invaders" → update state ownership)
4. **Generate contextual lore** for map entities (states, cities, markers)
5. **Conduct roleplay sessions** with AI that understands and updates the map
6. **Create quests and events** based on map geography and current state

**Key Architectural Decision:** Leverage existing `modules/ui/ai-generator.js` infrastructure for pure client-side JavaScript implementation. No backend server or Python bridge required.

---

## Table of Contents

1. [Existing Infrastructure Analysis](#1-existing-infrastructure-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Feature Specifications](#3-feature-specifications)
   - 3.1 [Story Translator](#31-feature-story-translator)
   - 3.2 [Roleplay Assistant](#32-feature-roleplay-assistant)
   - 3.3 [Enhanced Notes AI](#33-feature-enhanced-notes-ai)
   - 3.4 [Quest Generator](#34-feature-quest-generator)
   - **3.5 [AI Map Generator (NEW)](#35-feature-ai-map-generator-new)**
   - **3.6 [AI World Builder (NEW)](#36-feature-ai-world-builder-new)**
4. [Data Models](#4-data-models)
5. [Implementation Phases](#5-implementation-phases)
6. [API Integration](#6-api-integration)
7. [Context Management Strategy](#7-context-management-strategy)
8. [UI Components](#8-ui-components)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment & Integration](#10-deployment--integration)

---

## 1. Existing Infrastructure Analysis

### 1.1 Current AI Module (`modules/ui/ai-generator.js`)

**Location:** `C:\Users\Cameron\WebstormProjects\Fantasy-Map-Generator\modules\ui\ai-generator.js`

**Capabilities:**
- Supports OpenAI, Anthropic, and Ollama APIs
- Streaming response handling via Server-Sent Events (SSE)
- Temperature control (0.0-2.0)
- API key management in localStorage
- Generic prompt interface

**Current Integration:**
```javascript
// Used in modules/ui/notes-editor.js
generateWithAi(defaultPrompt, onApply) {
  // Opens dialog with model selector, temperature, prompt
  // Calls onApply(generatedText) when user clicks "Apply"
}
```

**Function Signature:**
```javascript
function generateWithAi(defaultPrompt, onApply, entity = {}, preset = "")
```

**Parameters:**
- `defaultPrompt` (string): Initial prompt text
- `onApply` (function): Callback receiving generated text
- `entity` (object): Context entity data
- `preset` (string): Preset identifier

**Implementation Pattern:**
```javascript
// Dialog structure
<div id="aiGenerator" class="dialog">
  <textarea id="aiPrompt"></textarea>
  <select id="aiModel"></select>           <!-- OpenAI/Anthropic/Ollama -->
  <input type="range" id="aiTemperature">  <!-- 0-2 -->
  <input id="aiApiKey">                     <!-- API key -->
  <button id="aiGenerate">Generate</button>
  <div id="aiResponse"></div>
  <button id="aiApply">Apply</button>
</div>
```

**Key Functions:**
```javascript
generateWithAi()              // Main entry point
loadModelOptions()             // Populate model dropdown
handleGenerate()               // API call handler
handleStreamResponse()         // SSE streaming
applyGeneratedText()           // Callback invocation
```

### 1.2 Global Data Structures

All map data is globally accessible:

```javascript
// Main data container
pack = {
  cells: {...},           // Voronoi cells (Uint8Array/Uint16Array/Float32Array)
  burgs: [...],           // Settlements array
  states: [...],          // Nations/kingdoms array
  cultures: [...],        // Cultural regions array
  religions: [...],       // Religion systems array
  provinces: [...],       // Administrative divisions
  rivers: [...],          // River systems
  routes: [...],          // Roads/trade routes
  markers: [...],         // Points of interest
  features: [...]         // Geographic features (landmasses, lakes)
};

grid = {
  cells: {...},           // Heightmap grid
  features: [...]         // Terrain features
};

notes = [...];            // User annotations with rich text
biomesData = {...};       // Biome definitions
nameBases = [...];        // Name generation data
```

**Data Access Pattern:**
```javascript
// Example: Get all state names
const stateNames = pack.states.map(s => s.name);

// Example: Find burg by name
const burg = pack.burgs.find(b => b.name === "Kaki");

// Example: Get state's military units
const military = pack.states[16].military;
```

### 1.3 Rendering & UI Framework

**D3.js v5** for SVG manipulation:
```javascript
d3.select("#states").selectAll("path")  // State polygons
d3.select("#labels").selectAll("text")  // Labels
```

**jQuery 3.1.1** for UI:
```javascript
$("#myDialog").dialog("open");           // Open dialog
```

**Event System:**
```javascript
// Click handlers in modules/ui/editors.js
svg.on("click", function() {
  const point = d3.mouse(this);
  const cell = findCell(point[0], point[1]);
  // Open editor for clicked entity
});
```

### 1.4 Module Registration Pattern

**IIFE Pattern:**
```javascript
"use strict";

window.MyModule = (function () {
  // Private variables
  let internalState = {};

  // Private functions
  const helperFunction = function() { /* ... */ };

  // Public API
  return {
    publicFunction: function() { /* ... */ },
    anotherFunction: helperFunction
  };
})();
```

**Registration in `index.html`:**
```html
<script src="modules/my-module.js?v=1.108.1"></script>
```

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                               │
│  "The kingdom of Eldoria fell to the undead. Fort Emberwatch    │
│   was destroyed and the capital was evacuated."                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STORY TRANSLATOR MODULE                       │
│  • Extract narrative intent                                     │
│  • Identify affected entities (states, burgs, markers)          │
│  • Generate structured update commands                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONTEXT BUILDER MODULE                        │
│  • Build strategic map summary (~15k tokens)                    │
│  • Extract relevant regional detail (~30k tokens)               │
│  • Format entity references for AI                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI API CALL (via ai-generator.js)             │
│  • Use existing OpenAI/Anthropic/Ollama integration             │
│  • Stream response to UI                                        │
│  • Parse structured JSON response                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   UPDATE VALIDATOR MODULE                       │
│  • Validate entity IDs exist                                    │
│  • Check referential integrity                                  │
│  • Prevent invalid state transitions                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   UPDATE PREVIEW UI                             │
│  • Show proposed changes in table format                        │
│  • Highlight affected map regions                               │
│  • User approval required before apply                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ (User clicks "Apply")
┌─────────────────────────────────────────────────────────────────┐
│                   MAP UPDATER MODULE                            │
│  • Apply changes to pack.states, pack.burgs, etc.               │
│  • Update statistics (population, area, etc.)                   │
│  • Add markers for significant events                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RENDERER                                      │
│  • Redraw affected layers (states, burgs, markers)              │
│  • Update labels and icons                                      │
│  • Trigger map refresh                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Dependencies

```
Story Translator
    ├── Depends on: AI Generator (existing)
    ├── Depends on: Context Builder (new)
    └── Depends on: Update Validator (new)

Context Builder
    ├── Reads from: pack.states, pack.burgs, pack.cultures, etc.
    └── No external dependencies

Update Validator
    ├── Reads from: pack.* globals
    └── No external dependencies

Map Updater
    ├── Writes to: pack.* globals
    ├── Calls: drawStates(), drawBurgs(), drawMarkers() (existing)
    └── Depends on: Update Validator

Roleplay Assistant
    ├── Depends on: Story Translator
    ├── Depends on: Context Builder
    └── Manages conversation history
```

### 2.3 File Structure

**New Modules to Create:**

```
modules/
├── ui/
│   ├── story-translator.js          // Story-to-map translation UI
│   ├── roleplay-assistant.js        // Chat-based roleplay interface
│   ├── quest-generator.js           // Quest/event generator
│   └── lore-generator.js            // Lore/history generator
├── ai/
│   ├── context-builder.js           // Smart context extraction
│   ├── prompt-templates.js          // Reusable prompt templates
│   ├── update-validator.js          // Validate AI-generated updates
│   └── map-updater.js               // Apply updates to map data
└── utils/
    └── entity-resolver.js           // Name → ID resolution
```

**Existing Modules to Extend:**

```
modules/ui/
├── ai-generator.js                  // Add streaming JSON support
├── notes-editor.js                  // Add entity-specific prompts
└── editors.js                       // Add AI menu items
```

---

## 3. Feature Specifications

### 3.1 Feature: Story Translator

**Description:** Convert narrative events into structured map updates.

**User Workflow:**
1. User clicks "Tools" → "Story Translator"
2. Dialog opens with textarea for narrative input
3. User types or pastes narrative (e.g., "The kingdom of Hizuna fell to the undead")
4. User clicks "Translate to Map Changes"
5. AI analyzes narrative + map context
6. Preview shows proposed changes in table format
7. User reviews and clicks "Apply to Map"
8. Map updates, layers redraw

**UI Mockup:**

```
┌───────────────────────────────────────────────────────────────┐
│  Story Translator                                       [X]   │
├───────────────────────────────────────────────────────────────┤
│  Narrative:                                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ The siege of Fort Emberwatch lasted three months.      │ │
│  │ Eventually, the undead broke through and razed the     │ │
│  │ fortification. The Hizunan defenders fled south to     │ │
│  │ the capital, Kaki.                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [ Translate to Map Changes ]                                │
│                                                               │
│  Proposed Changes:                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Entity Type │ Entity Name      │ Change                 │ │
│  ├─────────────┼──────────────────┼────────────────────────┤ │
│  │ Burg        │ Fort Emberwatch  │ Mark as ruined         │ │
│  │ Marker      │ (new)            │ Add "ruins" marker     │ │
│  │ Burg        │ Kaki             │ +500 population        │ │
│  │ Note        │ (new)            │ Add siege narrative    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Confidence: 85%                                              │
│                                                               │
│  [ Apply to Map ]  [ Regenerate ]  [ Cancel ]                │
└───────────────────────────────────────────────────────────────┘
```

**Implementation Approach:**

**1. Prompt Design:**

```javascript
// modules/ai/prompt-templates.js
const STORY_TRANSLATOR_SYSTEM_PROMPT = `You are a map update assistant for a fantasy world map.
Your task is to analyze narrative events and identify which map entities need updates.

RULES:
- Only suggest changes explicitly mentioned or strongly implied in the narrative
- Provide confidence scores (0.0-1.0) for each change
- Return valid JSON matching the schema below
- Use entity IDs when possible, or names for name-based lookup

AVAILABLE ENTITY TYPES:
- state (kingdoms/nations)
- burg (cities/towns/fortifications)
- province (administrative regions)
- marker (points of interest)
- note (annotations)
- military (army units)

AVAILABLE OPERATIONS:
- update (modify existing entity)
- create (add new entity)
- delete (remove entity)
- rename (change entity name)

RESPONSE SCHEMA:
{
  "changes": [
    {
      "operation": "update|create|delete|rename",
      "entityType": "state|burg|province|marker|note|military",
      "entityId": 123,              // Use if known
      "entityName": "Fort Ember",   // Use if ID unknown
      "updates": {                  // Fields to change
        "population": 0,
        "removed": true,
        "type": "Ruins"
      },
      "confidence": 0.85,
      "reasoning": "Narrative states fort was razed"
    }
  ],
  "narrative_summary": "Brief summary of events",
  "affected_regions": ["Hizuna", "Emberwatch region"]
}`;

const buildStoryTranslatorPrompt = (narrative, mapContext) => {
  return `${STORY_TRANSLATOR_SYSTEM_PROMPT}

CURRENT MAP CONTEXT:
${mapContext}

NARRATIVE EVENT:
${narrative}

Analyze the narrative and return JSON with proposed map changes.`;
};
```

**2. Context Building:**

```javascript
// modules/ai/context-builder.js
function buildStrategicSummary() {
  const states = pack.states
    .filter(s => s.i && !s.removed)
    .map(s => ({
      id: s.i,
      name: s.name,
      form: s.form,
      capital: pack.burgs[s.capital]?.name,
      neighbors: s.neighbors?.map(n => pack.states[n]?.name).filter(Boolean),
      area: s.area,
      cells: s.cells,
      burgs: s.burgs,
      military: s.military?.length || 0
    }));

  const burgs = pack.burgs
    .filter(b => b.i && !b.removed)
    .map(b => ({
      id: b.i,
      name: b.name,
      state: pack.states[b.state]?.name,
      population: b.population,
      type: b.type,
      capital: b.capital === 1,
      port: b.port === 1
    }));

  const markers = pack.markers
    .filter(m => m.i)
    .map(m => ({
      id: m.i,
      type: m.type,
      icon: m.icon,
      x: m.x,
      y: m.y
    }));

  return JSON.stringify({ states, burgs, markers }, null, 2);
}

function buildRegionalContext(cellIds) {
  // Extract detailed info for specific region
  const cells = cellIds.map(id => pack.cells[id]);
  const burgsInRegion = pack.burgs.filter(b => cellIds.includes(b.cell));
  const statesInRegion = new Set(cells.map(c => c.state));

  return { cells, burgs: burgsInRegion, states: Array.from(statesInRegion) };
}
```

**3. Update Validation:**

```javascript
// modules/ai/update-validator.js
window.UpdateValidator = (function() {

  const validate = function(changes) {
    const errors = [];
    const warnings = [];

    for (const change of changes) {
      // Check entity exists (for updates/deletes)
      if (change.operation !== 'create') {
        if (!entityExists(change.entityType, change.entityId, change.entityName)) {
          errors.push(`Entity not found: ${change.entityType} ${change.entityName || change.entityId}`);
          continue;
        }
      }

      // Check required fields
      if (change.operation === 'create' && !hasRequiredFields(change)) {
        errors.push(`Missing required fields for creating ${change.entityType}`);
      }

      // Check referential integrity
      if (change.updates?.state) {
        if (!pack.states[change.updates.state]) {
          errors.push(`Invalid state ID: ${change.updates.state}`);
        }
      }

      // Warn on large population changes
      if (change.updates?.population) {
        const entity = resolveEntity(change.entityType, change.entityId, change.entityName);
        const delta = Math.abs(change.updates.population - entity.population);
        if (delta > entity.population * 0.5) {
          warnings.push(`Large population change for ${change.entityName}: ${delta.toFixed(1)}`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  const entityExists = function(type, id, name) {
    if (id) {
      return pack[type + 's']?.[id] && !pack[type + 's'][id].removed;
    }
    if (name) {
      return pack[type + 's']?.find(e => e.name === name && !e.removed);
    }
    return false;
  };

  const resolveEntity = function(type, id, name) {
    if (id) return pack[type + 's'][id];
    return pack[type + 's'].find(e => e.name === name && !e.removed);
  };

  return { validate, entityExists, resolveEntity };
})();
```

**4. Map Updater:**

```javascript
// modules/ai/map-updater.js
window.MapUpdater = (function() {

  const applyChanges = function(changes) {
    const appliedChanges = [];

    for (const change of changes) {
      try {
        switch (change.operation) {
          case 'update':
            applyUpdate(change);
            break;
          case 'create':
            applyCreate(change);
            break;
          case 'delete':
            applyDelete(change);
            break;
          case 'rename':
            applyRename(change);
            break;
        }
        appliedChanges.push(change);
      } catch (err) {
        console.error(`Failed to apply change:`, change, err);
      }
    }

    // Redraw affected layers
    if (layerIsOn("toggleStates")) drawStates();
    if (layerIsOn("toggleBurgs")) drawBurgs();
    if (layerIsOn("toggleLabels")) drawLabels();
    if (layerIsOn("toggleMarkers")) drawMarkers();

    return appliedChanges;
  };

  const applyUpdate = function(change) {
    const entity = UpdateValidator.resolveEntity(
      change.entityType,
      change.entityId,
      change.entityName
    );

    Object.assign(entity, change.updates);

    // Update related statistics
    if (change.entityType === 'burg' && change.updates.population) {
      updateStateStatistics(entity.state);
    }
  };

  const applyCreate = function(change) {
    switch (change.entityType) {
      case 'marker':
        createMarker(change.updates);
        break;
      case 'note':
        createNote(change.updates);
        break;
      case 'burg':
        createBurg(change.updates);
        break;
    }
  };

  const createMarker = function(data) {
    const cell = findCell(data.x, data.y);
    pack.markers.push({
      i: pack.markers.length,
      icon: data.icon || "❓",
      type: data.type || "custom",
      x: data.x,
      y: data.y,
      cell: cell,
      lock: false
    });
  };

  const createNote = function(data) {
    if (!notes) notes = [];
    notes.push({
      id: `note${Date.now()}`,
      name: data.name || "Untitled",
      legend: data.legend || ""
    });
  };

  const updateStateStatistics = function(stateId) {
    const state = pack.states[stateId];
    const stateBurgs = pack.burgs.filter(b => b.state === stateId && !b.removed);
    state.burgs = stateBurgs.length;
    state.urban = stateBurgs.reduce((sum, b) => sum + b.population, 0);
  };

  return { applyChanges };
})();
```

**5. UI Implementation:**

```javascript
// modules/ui/story-translator.js
"use strict";

window.StoryTranslator = (function() {

  let currentChanges = [];

  const open = function() {
    $("#storyTranslator").dialog({
      title: "Story Translator",
      width: 700,
      height: 600,
      position: { my: "center", at: "center", of: "svg" },
      buttons: {}
    });
  };

  const translate = async function() {
    const narrative = $("#stNarrative").val();
    if (!narrative) {
      tip("Please enter a narrative first", false, "error");
      return;
    }

    // Build context
    const mapContext = ContextBuilder.buildStrategicSummary();
    const prompt = PromptTemplates.buildStoryTranslatorPrompt(narrative, mapContext);

    // Call AI
    $("#stStatus").text("Analyzing narrative...");
    $("#stTranslate").prop("disabled", true);

    try {
      const response = await callAI(prompt);
      const result = JSON.parse(response);

      currentChanges = result.changes;
      displayChanges(result);

      $("#stApply").prop("disabled", false);
    } catch (err) {
      console.error("Translation error:", err);
      tip("Failed to translate narrative", false, "error");
    } finally {
      $("#stTranslate").prop("disabled", false);
      $("#stStatus").text("");
    }
  };

  const displayChanges = function(result) {
    let html = `<p><strong>Summary:</strong> ${result.narrative_summary}</p>`;
    html += `<p><strong>Affected Regions:</strong> ${result.affected_regions.join(", ")}</p>`;

    html += `<table class="table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Entity</th>
          <th>Operation</th>
          <th>Changes</th>
          <th>Confidence</th>
        </tr>
      </thead>
      <tbody>`;

    for (const change of result.changes) {
      const updates = Object.entries(change.updates || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const confidenceColor = change.confidence > 0.7 ? "green" : "orange";

      html += `<tr>
        <td>${change.entityType}</td>
        <td>${change.entityName || change.entityId}</td>
        <td>${change.operation}</td>
        <td>${updates}</td>
        <td style="color: ${confidenceColor}">${(change.confidence * 100).toFixed(0)}%</td>
      </tr>`;
    }

    html += `</tbody></table>`;
    $("#stChanges").html(html);
  };

  const applyToMap = function() {
    // Validate changes
    const validation = UpdateValidator.validate(currentChanges);

    if (!validation.valid) {
      alert("Validation errors:\n" + validation.errors.join("\n"));
      return;
    }

    if (validation.warnings.length > 0) {
      const proceed = confirm(
        "Warnings:\n" + validation.warnings.join("\n") + "\n\nProceed anyway?"
      );
      if (!proceed) return;
    }

    // Apply changes
    const applied = MapUpdater.applyChanges(currentChanges);
    tip(`Applied ${applied.length} changes to map`, true, "success");

    // Close dialog
    $("#storyTranslator").dialog("close");
  };

  const callAI = async function(prompt) {
    return new Promise((resolve, reject) => {
      // Use existing ai-generator.js infrastructure
      // This is simplified - actual implementation would use streaming
      generateWithAi(prompt, (response) => {
        resolve(response);
      });
    });
  };

  return { open, translate, applyToMap };
})();
```

**HTML Addition to `index.html`:**

```html
<!-- Story Translator Dialog -->
<div id="storyTranslator" class="dialog stable" style="display: none;">
  <label>Narrative:
    <textarea id="stNarrative" rows="8" style="width: 100%;"
              placeholder="Enter your narrative here. Example: The kingdom of Hizuna fell to the undead after a brutal siege."></textarea>
  </label>

  <button id="stTranslate" class="btn" onclick="StoryTranslator.translate()">
    Translate to Map Changes
  </button>

  <div id="stStatus" style="font-style: italic; color: gray;"></div>

  <div id="stChanges" style="margin-top: 20px; max-height: 300px; overflow-y: auto;"></div>

  <div style="margin-top: 20px;">
    <button id="stApply" class="btn" onclick="StoryTranslator.applyToMap()" disabled>
      Apply to Map
    </button>
    <button class="btn" onclick="$('#storyTranslator').dialog('close')">
      Cancel
    </button>
  </div>
</div>
```

**Menu Item Addition:**

```javascript
// In modules/ui/editors.js or main.js
// Add to Tools menu
<li id="storyTranslatorTool" onclick="StoryTranslator.open()">Story Translator</li>
```

---

### 3.2 Feature: Roleplay Assistant

**Description:** Chat-based AI assistant for interactive roleplay sessions that understand and update the map.

**User Workflow:**
1. User clicks "Tools" → "Roleplay Assistant"
2. Chat dialog opens with conversation history
3. User types roleplay message ("I travel to Fort Emberwatch")
4. AI responds with narrative + map context
5. If AI detects map changes, shows "Apply Changes" button
6. User reviews proposed changes and applies
7. Conversation continues with updated map state

**UI Mockup:**

```
┌───────────────────────────────────────────────────────────────┐
│  Roleplay Assistant                                     [X]   │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ User: I travel to Fort Emberwatch to investigate the   │ │
│  │       ruins.                                            │ │
│  │                                                         │ │
│  │ AI: As you approach Fort Emberwatch, the devastation   │ │
│  │     becomes apparent. The once-mighty fortification    │ │
│  │     now lies in ruins, its walls crumbled. You spot    │ │
│  │     undead patrols in the distance.                    │ │
│  │                                                         │ │
│  │     [Map Update Available: Add "Undead Patrol" marker] │ │
│  │                                                         │ │
│  │ User: I cast a detection spell to find survivors.      │ │
│  │                                                         │ │
│  │ AI: Your spell reveals faint life signs in the         │ │
│  │     basement of the fortress. You find 12 survivors    │ │
│  │     hiding in the catacombs.                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Type your message...                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [ Send ]  [ Apply Pending Changes (2) ]  [ Clear History ] │
└───────────────────────────────────────────────────────────────┘
```

**Implementation Approach:**

**1. Prompt Design:**

```javascript
// modules/ai/prompt-templates.js
const ROLEPLAY_SYSTEM_PROMPT = `You are a Dungeon Master assistant for a fantasy world roleplay session.
You have access to the current map state and can suggest map updates based on the narrative.

CAPABILITIES:
- Respond to player actions with narrative descriptions
- Suggest map changes when events occur (mark locations, update entities)
- Use map context to inform your responses (mention nearby burgs, terrain, states)
- Maintain consistency with established lore and map state

RESPONSE FORMAT:
When suggesting map changes, use special markers in your response:

[MAP_UPDATE:create:marker:{"type":"undead","icon":"💀","x":650,"y":240,"description":"Undead patrol"}]

Available map update types:
- [MAP_UPDATE:update:burg:{updates}]
- [MAP_UPDATE:create:marker:{data}]
- [MAP_UPDATE:create:note:{data}]
- [MAP_UPDATE:update:state:{updates}]

RULES:
- Only suggest map updates for significant narrative events
- Keep responses immersive and in-character
- Reference specific locations from the map when relevant
- Don't break character or explain mechanics unless asked`;

const buildRoleplayPrompt = (mapContext, conversationHistory, userMessage) => {
  let historyText = conversationHistory
    .slice(-10) // Last 10 messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join("\n\n");

  return `${ROLEPLAY_SYSTEM_PROMPT}

CURRENT MAP STATE:
${mapContext}

CONVERSATION HISTORY:
${historyText}

PLAYER ACTION:
${userMessage}

Respond in character as the Dungeon Master. Use [MAP_UPDATE:...] markers if map changes are needed.`;
};
```

**2. Conversation Manager:**

```javascript
// modules/ui/roleplay-assistant.js
"use strict";

window.RoleplayAssistant = (function() {

  let conversationHistory = [];
  let pendingUpdates = [];

  const open = function() {
    $("#roleplayAssistant").dialog({
      title: "Roleplay Assistant",
      width: 800,
      height: 700,
      position: { my: "center", at: "center", of: "svg" }
    });

    loadHistory();
    renderConversation();
  };

  const sendMessage = async function() {
    const input = $("#rpInput").val().trim();
    if (!input) return;

    // Add user message to history
    conversationHistory.push({ role: "User", content: input });
    $("#rpInput").val("");
    renderConversation();

    // Show typing indicator
    $("#rpTyping").show();

    try {
      // Build context
      const mapContext = ContextBuilder.buildStrategicSummary();
      const prompt = PromptTemplates.buildRoleplayPrompt(
        mapContext,
        conversationHistory,
        input
      );

      // Call AI
      const response = await callAI(prompt);

      // Extract map updates from response
      const { narrative, updates } = extractMapUpdates(response);

      // Add AI response to history
      conversationHistory.push({ role: "AI", content: narrative });

      // Store pending updates
      if (updates.length > 0) {
        pendingUpdates.push(...updates);
        $("#rpApplyChanges").text(`Apply Pending Changes (${pendingUpdates.length})`);
        $("#rpApplyChanges").prop("disabled", false);
      }

      renderConversation();

    } catch (err) {
      console.error("Roleplay error:", err);
      tip("Failed to get AI response", false, "error");
    } finally {
      $("#rpTyping").hide();
    }
  };

  const extractMapUpdates = function(response) {
    const updatePattern = /\[MAP_UPDATE:([^:]+):([^:]+):({[^}]+})\]/g;
    let narrative = response;
    const updates = [];

    let match;
    while ((match = updatePattern.exec(response)) !== null) {
      const [fullMatch, operation, entityType, dataJson] = match;

      try {
        const data = JSON.parse(dataJson);
        updates.push({
          operation,
          entityType,
          ...data
        });

        // Remove marker from narrative
        narrative = narrative.replace(fullMatch, "");
      } catch (err) {
        console.error("Failed to parse map update:", match, err);
      }
    }

    return { narrative: narrative.trim(), updates };
  };

  const renderConversation = function() {
    let html = "";

    for (const msg of conversationHistory) {
      const className = msg.role === "User" ? "rp-user" : "rp-ai";
      html += `<div class="${className}">
        <strong>${msg.role}:</strong> ${msg.content}
      </div>`;
    }

    $("#rpConversation").html(html);

    // Scroll to bottom
    const container = document.getElementById("rpConversation");
    container.scrollTop = container.scrollHeight;

    // Save history
    saveHistory();
  };

  const applyPendingChanges = function() {
    if (pendingUpdates.length === 0) return;

    // Validate
    const validation = UpdateValidator.validate(pendingUpdates);
    if (!validation.valid) {
      alert("Validation errors:\n" + validation.errors.join("\n"));
      return;
    }

    // Apply
    MapUpdater.applyChanges(pendingUpdates);
    tip(`Applied ${pendingUpdates.length} changes`, true, "success");

    // Clear pending
    pendingUpdates = [];
    $("#rpApplyChanges").text("Apply Pending Changes");
    $("#rpApplyChanges").prop("disabled", true);
  };

  const clearHistory = function() {
    if (!confirm("Clear conversation history?")) return;

    conversationHistory = [];
    pendingUpdates = [];
    renderConversation();
    localStorage.removeItem("roleplayHistory");
  };

  const saveHistory = function() {
    try {
      localStorage.setItem("roleplayHistory", JSON.stringify(conversationHistory));
    } catch (err) {
      console.error("Failed to save history:", err);
    }
  };

  const loadHistory = function() {
    try {
      const saved = localStorage.getItem("roleplayHistory");
      if (saved) {
        conversationHistory = JSON.parse(saved);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const callAI = async function(prompt) {
    return new Promise((resolve, reject) => {
      // Use existing ai-generator.js
      // In production, would integrate streaming
      generateWithAi(prompt, resolve);
    });
  };

  return {
    open,
    sendMessage,
    applyPendingChanges,
    clearHistory
  };
})();
```

**HTML Addition:**

```html
<!-- Roleplay Assistant Dialog -->
<div id="roleplayAssistant" class="dialog stable" style="display: none;">
  <div id="rpConversation" style="height: 450px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; background: #f9f9f9;">
    <!-- Messages rendered here -->
  </div>

  <div id="rpTyping" style="display: none; font-style: italic; color: gray; margin-bottom: 10px;">
    AI is typing...
  </div>

  <textarea id="rpInput" rows="3" style="width: 100%; margin-bottom: 10px;"
            placeholder="Describe your action..."></textarea>

  <button class="btn" onclick="RoleplayAssistant.sendMessage()">Send</button>
  <button id="rpApplyChanges" class="btn" onclick="RoleplayAssistant.applyPendingChanges()" disabled>
    Apply Pending Changes
  </button>
  <button class="btn" onclick="RoleplayAssistant.clearHistory()">Clear History</button>
  <button class="btn" onclick="$('#roleplayAssistant').dialog('close')">Close</button>
</div>
```

**CSS Additions:**

```html
<style>
.rp-user {
  background: #e3f2fd;
  padding: 10px;
  margin: 5px 0;
  border-radius: 5px;
  border-left: 4px solid #2196f3;
}

.rp-ai {
  background: #f1f8e9;
  padding: 10px;
  margin: 5px 0;
  border-radius: 5px;
  border-left: 4px solid #8bc34a;
}
</style>
```

---

### 3.3 Feature: Enhanced Notes AI

**Description:** Extend existing notes AI with entity-specific prompt templates.

**Current Implementation:**
```javascript
// modules/ui/notes-editor.js line 147
generateWithAi(defaultPrompt, onApply);
```

**Enhancement:**

```javascript
// modules/ui/notes-editor.js
const generateNoteForEntity = function(entityType, entityId) {
  let entity, prompt;

  switch (entityType) {
    case 'burg':
      entity = pack.burgs[entityId];
      prompt = `Generate a detailed description for the settlement of ${entity.name}.
        Context:
        - Type: ${entity.type}
        - Population: ${entity.population.toFixed(1)}
        - State: ${pack.states[entity.state]?.name}
        - Culture: ${pack.cultures[entity.culture]?.name}
        - Port: ${entity.port ? 'Yes' : 'No'}
        - Capital: ${entity.capital ? 'Yes' : 'No'}

        Include: architecture, notable buildings, local culture, economy, and points of interest.
        Format as HTML paragraphs.`;
      break;

    case 'state':
      entity = pack.states[entityId];
      prompt = `Generate a historical background for the nation of ${entity.name} (${entity.fullName}).
        Context:
        - Government: ${entity.form}
        - Capital: ${pack.burgs[entity.capital]?.name}
        - Area: ${entity.area} sq mi
        - Population: Urban ${entity.urban.toFixed(1)}, Rural ${entity.rural.toFixed(1)}
        - Neighbors: ${entity.neighbors?.map(n => pack.states[n]?.name).join(", ")}
        - Culture: ${pack.cultures[entity.culture]?.name}

        Include: founding history, ruling dynasty, major conflicts, and current political situation.
        Format as HTML paragraphs.`;
      break;

    case 'marker':
      entity = pack.markers[entityId];
      prompt = `Generate an encounter or event description for a ${entity.type} marker.
        Context:
        - Type: ${entity.type}
        - Icon: ${entity.icon}
        - Nearby burgs: ${getNearbyBurgs(entity.cell).map(b => b.name).join(", ")}

        Create an immersive description of what adventurers might find here.
        Format as HTML paragraphs.`;
      break;
  }

  generateWithAi(prompt, (text) => {
    // Apply to note legend
    $("#noteLegend").val(text);
  }, entity, `generate_${entityType}`);
};
```

---

### 3.4 Feature: Quest Generator

**Description:** Generate quests based on map geography, state conflicts, and markers.

**User Workflow:**
1. User right-clicks on map region or marker
2. Context menu: "Generate Quest Here"
3. Dialog shows AI-generated quest
4. Quest includes: Objective, locations, NPCs, rewards
5. User can add quest markers to map

**Implementation Approach:**

```javascript
// modules/ui/quest-generator.js
"use strict";

window.QuestGenerator = (function() {

  const generateForLocation = async function(x, y) {
    const cell = findCell(x, y);
    const burg = pack.burgs.find(b => b.cell === cell);
    const state = pack.states[pack.cells.state[cell]];
    const nearbyMarkers = pack.markers.filter(m => {
      const dist = Math.hypot(m.x - x, m.y - y);
      return dist < 100; // Within 100 units
    });

    const prompt = `Generate a fantasy quest for this location:
      Location: ${burg?.name || "Wilderness"}
      State: ${state?.name}
      Nearby: ${burg ? getNearbyBurgs(cell).map(b => b.name).join(", ") : "Remote area"}
      Points of Interest: ${nearbyMarkers.map(m => m.type).join(", ") || "None"}

      Include:
      - Quest Title
      - Quest Giver NPC (name, role, motivation)
      - Objective (clear goal)
      - 3-5 specific locations to visit (use real map locations if possible)
      - Obstacles/challenges
      - Reward
      - Optional side objectives

      Format as JSON:
      {
        "title": "...",
        "questGiver": {"name": "...", "role": "...", "motivation": "..."},
        "objective": "...",
        "locations": [{"name": "...", "x": 0, "y": 0, "description": "..."}],
        "obstacles": ["...", "..."],
        "reward": "...",
        "sideObjectives": ["..."]
      }`;

    const response = await callAI(prompt);
    const quest = JSON.parse(response);

    displayQuest(quest);
  };

  const displayQuest = function(quest) {
    let html = `<h3>${quest.title}</h3>`;
    html += `<p><strong>Quest Giver:</strong> ${quest.questGiver.name} (${quest.questGiver.role})</p>`;
    html += `<p><strong>Motivation:</strong> ${quest.questGiver.motivation}</p>`;
    html += `<p><strong>Objective:</strong> ${quest.objective}</p>`;

    html += `<h4>Locations:</h4><ul>`;
    for (const loc of quest.locations) {
      html += `<li><strong>${loc.name}</strong> - ${loc.description}</li>`;
    }
    html += `</ul>`;

    html += `<h4>Obstacles:</h4><ul>`;
    for (const obs of quest.obstacles) {
      html += `<li>${obs}</li>`;
    }
    html += `</ul>`;

    html += `<p><strong>Reward:</strong> ${quest.reward}</p>`;

    if (quest.sideObjectives?.length > 0) {
      html += `<h4>Side Objectives:</h4><ul>`;
      for (const side of quest.sideObjectives) {
        html += `<li>${side}</li>`;
      }
      html += `</ul>`;
    }

    $("#questDisplay").html(html);
    $("#questGenerator").dialog("open");

    // Store for adding markers
    currentQuest = quest;
  };

  const addQuestMarkers = function() {
    for (const loc of currentQuest.locations) {
      if (loc.x && loc.y) {
        MapUpdater.applyChanges([{
          operation: "create",
          entityType: "marker",
          updates: {
            type: "quest",
            icon: "⚔️",
            x: loc.x,
            y: loc.y,
            description: loc.name
          }
        }]);
      }
    }

    tip("Quest markers added to map", true, "success");
  };

  let currentQuest = null;

  return { generateForLocation, addQuestMarkers };
})();
```

---

### 3.5 Feature: AI Map Generator (NEW)

**Description:** Generate complete maps from narrative prompts, translating story concepts into geography, terrain, and basic civilization.

**User Workflow:**
1. User clicks "File" → "New Map with AI"
2. Dialog opens with prompt input
3. User describes desired world (e.g., "A volcanic archipelago with three warring island kingdoms")
4. AI analyzes prompt and generates:
   - Heightmap template instructions
   - Geographic features (islands, continents, lakes)
   - Basic civilization placement guidance
5. Map generates with AI-directed parameters
6. User reviews and regenerates if needed

**UI Mockup:**

```
┌───────────────────────────────────────────────────────────────┐
│  AI Map Generator                                       [X]   │
├───────────────────────────────────────────────────────────────┤
│  Describe Your World:                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ A volcanic archipelago in the southern seas, with      │ │
│  │ three warring island kingdoms. The largest island has  │ │
│  │ an active volcano. Tropical climate with frequent      │ │
│  │ monsoons.                                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Optional Details:                                            │
│  Map Size: [Medium ▼]    Landmass: [40% ▼]                   │
│  Climate: [Tropical ▼]   Fantasy Level: [Medium ▼]           │
│                                                               │
│  [ Generate Map ]                                             │
│                                                               │
│  AI Interpretation:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Detected Features:                                      │ │
│  │ • Multiple islands (archipelago)                        │ │
│  │ • Volcanic terrain on main island                       │ │
│  │ • 3 states (kingdoms)                                   │ │
│  │ • Tropical temperature profile                          │ │
│  │ • High precipitation                                    │ │
│  │                                                         │ │
│  │ Heightmap Strategy:                                     │ │
│  │ • Base ocean terrain                                    │ │
│  │ • Add 5-7 island clusters                               │ │
│  │ • Add volcano (Hill tool, high peak)                    │ │
│  │ • Smooth coastal transitions                            │ │
│  │                                                         │ │
│  │ Civilization Plan:                                      │ │
│  │ • 3 states, naval/island type                           │ │
│  │ • Capitals on largest islands                           │ │
│  │ • Defensive relations (warring)                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Confidence: 92%                                              │
│                                                               │
│  [ Proceed ]  [ Refine Prompt ]  [ Cancel ]                  │
└───────────────────────────────────────────────────────────────┘
```

**Implementation Approach:**

**1. Prompt Analysis System:**

```javascript
// modules/ai/prompt-templates.js
const AI_MAP_GENERATOR_SYSTEM_PROMPT = `You are a fantasy map design assistant.
Analyze user prompts and translate them into concrete map generation parameters.

CAPABILITIES:
- Interpret geographic descriptions (mountains, islands, continents, rivers, lakes)
- Detect climate requirements (tropical, arctic, temperate, arid)
- Identify civilization characteristics (number of nations, cultures, conflicts)
- Generate heightmap template instructions
- Configure world parameters

HEIGHTMAP TOOLS AVAILABLE:
- Hill x y strength radius - Creates elevated terrain
- Pit x y strength radius - Creates depression
- Range x1 y1 x2 y2 - Creates mountain range between points
- Trough x1 y1 x2 y2 - Creates valley/trench
- Strait x y - Creates narrow water passage
- Mask percentage - Converts percentage of lowest land to water
- Add value percentage - Adds value to percentage of cells
- Multiply value percentage - Multiplies percentage of cells by value
- Smooth iterations - Smooths terrain

RESPONSE SCHEMA:
{
  "interpretation": {
    "geography": ["volcanic archipelago", "tropical climate"],
    "states": 3,
    "cultures": 3,
    "features": ["volcano", "islands"],
    "climate": "tropical",
    "conflicts": ["warring kingdoms"]
  },
  "worldOptions": {
    "temperatureEquator": 25,
    "temperatureNorthPole": -5,
    "temperatureSouthPole": -10,
    "mapSize": "medium",
    "landmassPercentage": 40
  },
  "heightmapTemplate": "Hill 0.5 0.5 0.8 0.3\\nHill 0.3 0.4 0.7 0.15\\nHill 0.7 0.6 0.7 0.15\\n...",
  "civilizationConfig": {
    "stateCount": 3,
    "stateType": "Naval",
    "cultureCount": 3,
    "initialDiplomacy": "hostile",
    "capitalPlacement": "coastal"
  },
  "confidence": 0.92,
  "reasoning": "Prompt clearly describes archipelago with volcanic activity..."
}`;

const buildMapGeneratorPrompt = (userPrompt, options = {}) => {
  return `${AI_MAP_GENERATOR_SYSTEM_PROMPT}

USER PROMPT:
${userPrompt}

${options.mapSize ? `Preferred Map Size: ${options.mapSize}` : ""}
${options.landmass ? `Preferred Land Percentage: ${options.landmass}%` : ""}
${options.climate ? `Preferred Climate: ${options.climate}` : ""}

Analyze the prompt and return JSON with map generation configuration.`;
};
```

**2. Main Generator Module:**

```javascript
// modules/ui/ai-map-generator.js
"use strict";

window.AIMapGenerator = (function() {

  let currentConfig = null;

  const open = function() {
    $("#aiMapGenerator").dialog({
      title: "AI Map Generator",
      width: 800,
      height: 700,
      position: { my: "center", at: "center", of: "svg" }
    });
  };

  const generateConfig = async function() {
    const userPrompt = $("#aimgPrompt").val().trim();
    if (!userPrompt) {
      tip("Please describe your desired world", false, "error");
      return;
    }

    // Get optional parameters
    const options = {
      mapSize: $("#aimgSize").val(),
      landmass: $("#aimgLandmass").val(),
      climate: $("#aimgClimate").val(),
      fantasyLevel: $("#aimgFantasy").val()
    };

    $("#aimgStatus").text("Analyzing prompt with AI...");
    $("#aimgGenerate").prop("disabled", true);

    try {
      const prompt = PromptTemplates.buildMapGeneratorPrompt(userPrompt, options);
      const response = await callAI(prompt);
      const config = JSON.parse(response);

      currentConfig = config;
      displayInterpretation(config);

      $("#aimgProceed").prop("disabled", false);
    } catch (err) {
      console.error("Map generation error:", err);
      tip("Failed to analyze prompt", false, "error");
    } finally {
      $("#aimgGenerate").prop("disabled", false);
      $("#aimgStatus").text("");
    }
  };

  const displayInterpretation = function(config) {
    let html = `<div class="ai-interpretation">`;

    html += `<h4>Detected Features:</h4><ul>`;
    for (const feature of config.interpretation.geography) {
      html += `<li>${feature}</li>`;
    }
    html += `</ul>`;

    html += `<h4>World Configuration:</h4><ul>`;
    html += `<li>Temperature Range: ${config.worldOptions.temperatureEquator}°C (equator) to ${config.worldOptions.temperatureNorthPole}°C (pole)</li>`;
    html += `<li>Land Coverage: ${config.worldOptions.landmassPercentage}%</li>`;
    html += `<li>Map Size: ${config.worldOptions.mapSize}</li>`;
    html += `</ul>`;

    if (config.heightmapTemplate) {
      const steps = config.heightmapTemplate.split('\n').length;
      html += `<h4>Heightmap Strategy:</h4>`;
      html += `<p>${steps} terrain modification steps</p>`;
      html += `<details><summary>View Template</summary><pre>${config.heightmapTemplate}</pre></details>`;
    }

    html += `<h4>Civilization Plan:</h4><ul>`;
    html += `<li>States: ${config.civilizationConfig.stateCount}</li>`;
    html += `<li>State Type: ${config.civilizationConfig.stateType || "Mixed"}</li>`;
    html += `<li>Cultures: ${config.civilizationConfig.cultureCount}</li>`;
    html += `<li>Initial Relations: ${config.civilizationConfig.initialDiplomacy}</li>`;
    html += `</ul>`;

    html += `<p><strong>Confidence:</strong> ${(config.confidence * 100).toFixed(0)}%</p>`;
    html += `<p><em>${config.reasoning}</em></p>`;

    html += `</div>`;

    $("#aimgInterpretation").html(html);
  };

  const proceedWithGeneration = async function() {
    if (!currentConfig) return;

    $("#aiMapGenerator").dialog("close");

    // Show loading
    showUploadMessage();

    try {
      // Apply world options
      applyWorldOptions(currentConfig.worldOptions);

      // Create custom heightmap template
      const templateId = await createCustomTemplate(currentConfig.heightmapTemplate);

      // Generate map with custom template
      await generate({
        templateId: templateId,
        seed: generateSeed()
      });

      // Post-process: Apply civilization config
      await applyCivilizationConfig(currentConfig.civilizationConfig);

      hideUploadMessage();
      tip("AI-generated map created successfully!", true, "success");

    } catch (err) {
      console.error("Map generation failed:", err);
      hideUploadMessage();
      tip("Map generation failed", false, "error");
    }
  };

  const applyWorldOptions = function(opts) {
    // Set temperature profile
    if (opts.temperatureEquator) options.temperatureEquator = opts.temperatureEquator;
    if (opts.temperatureNorthPole) options.temperatureNorthPole = opts.temperatureNorthPole;
    if (opts.temperatureSouthPole) options.temperatureSouthPole = opts.temperatureSouthPole;

    // Set map size
    if (opts.mapSize) {
      const sizeMap = {
        small: { width: 1024, height: 576 },
        medium: { width: 1920, height: 1080 },
        large: { width: 3840, height: 2160 }
      };
      const size = sizeMap[opts.mapSize.toLowerCase()];
      if (size) {
        graphWidth = size.width;
        graphHeight = size.height;
      }
    }
  };

  const createCustomTemplate = async function(templateString) {
    // Register as temporary custom template
    const templateId = `ai_generated_${Date.now()}`;

    if (!window.heightmapTemplates) window.heightmapTemplates = {};
    window.heightmapTemplates[templateId] = {
      name: "AI Generated",
      template: templateString
    };

    // Set as active template
    $("#templateInput").val(templateId);

    return templateId;
  };

  const applyCivilizationConfig = async function(config) {
    // This runs after base map generation
    // Modify the generated states/cultures to match user intent

    if (config.stateCount) {
      // Adjust number of states
      const currentStates = pack.states.filter(s => s.i && !s.removed).length;

      if (currentStates > config.stateCount) {
        // Merge excess states
        await mergeStates(currentStates - config.stateCount);
      } else if (currentStates < config.stateCount) {
        // Split states or add new ones
        await addStates(config.stateCount - currentStates);
      }
    }

    if (config.stateType) {
      // Set all states to specific type
      pack.states.forEach(state => {
        if (state.i && !state.removed) {
          state.type = config.stateType;
        }
      });
    }

    if (config.initialDiplomacy) {
      // Set diplomacy relations
      applyDiplomacyPattern(config.initialDiplomacy);
    }

    // Redraw
    if (layerIsOn("toggleStates")) drawStates();
    if (layerIsOn("toggleBurgs")) drawBurgs();
  };

  const applyDiplomacyPattern = function(pattern) {
    const states = pack.states.filter(s => s.i && !s.removed);

    switch (pattern) {
      case "hostile":
      case "warring":
        // Set all neighbors as enemies
        states.forEach(state => {
          if (!state.diplomacy) state.diplomacy = [];
          state.neighbors?.forEach(neighborId => {
            state.diplomacy[neighborId] = "Enemy";
          });
        });
        break;

      case "peaceful":
      case "allied":
        // Set all neighbors as allies
        states.forEach(state => {
          if (!state.diplomacy) state.diplomacy = [];
          state.neighbors?.forEach(neighborId => {
            state.diplomacy[neighborId] = "Ally";
          });
        });
        break;

      case "mixed":
      case "neutral":
        // Set to neutral
        states.forEach(state => {
          if (!state.diplomacy) state.diplomacy = [];
          state.neighbors?.forEach(neighborId => {
            state.diplomacy[neighborId] = "Neutral";
          });
        });
        break;
    }
  };

  const mergeStates = async function(count) {
    // Merge smallest states into neighbors
    const states = pack.states
      .filter(s => s.i && !s.removed)
      .sort((a, b) => a.cells - b.cells);

    for (let i = 0; i < count && i < states.length; i++) {
      const stateToMerge = states[i];
      const neighbor = stateToMerge.neighbors?.[0];

      if (neighbor) {
        // Transfer all cells to neighbor
        pack.cells.state.forEach((s, cellId) => {
          if (s === stateToMerge.i) {
            pack.cells.state[cellId] = neighbor;
          }
        });

        // Mark as removed
        stateToMerge.removed = true;
      }
    }

    // Recalculate state statistics
    BurgsAndStates.collectStatistics();
  };

  const addStates = async function(count) {
    // Split largest states or add new ones in unclaimed territory
    // This is complex - for MVP, just log warning
    console.warn(`AI requested ${count} additional states - not yet implemented`);
  };

  const callAI = async function(prompt) {
    return new Promise((resolve, reject) => {
      generateWithAi(prompt, resolve);
    });
  };

  return {
    open,
    generateConfig,
    proceedWithGeneration
  };
})();
```

**3. HTML Dialog:**

```html
<div id="aiMapGenerator" class="dialog stable" style="display: none;">
  <div class="aimg-header">
    <p>Describe your desired world, and AI will generate a map to match.</p>
  </div>

  <label for="aimgPrompt">Describe Your World:</label>
  <textarea id="aimgPrompt" rows="6" placeholder="Example: A volcanic archipelago in the southern seas, with three warring island kingdoms. The largest island has an active volcano. Tropical climate with frequent monsoons."></textarea>

  <div class="aimg-options">
    <label>Map Size:
      <select id="aimgSize">
        <option value="small">Small</option>
        <option value="medium" selected>Medium</option>
        <option value="large">Large</option>
      </select>
    </label>

    <label>Landmass:
      <select id="aimgLandmass">
        <option value="20">20%</option>
        <option value="30">30%</option>
        <option value="40" selected>40%</option>
        <option value="50">50%</option>
        <option value="60">60%</option>
      </select>
    </label>

    <label>Climate:
      <select id="aimgClimate">
        <option value="">Auto-detect</option>
        <option value="tropical">Tropical</option>
        <option value="temperate">Temperate</option>
        <option value="cold">Cold</option>
        <option value="arid">Arid</option>
      </select>
    </label>

    <label>Fantasy Level:
      <select id="aimgFantasy">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
      </select>
    </label>
  </div>

  <button id="aimgGenerate" class="btn btn-primary" onclick="AIMapGenerator.generateConfig()">
    Generate Configuration
  </button>
  <span id="aimgStatus" class="aimg-status"></span>

  <div id="aimgInterpretation" class="aimg-interpretation"></div>

  <div class="aimg-footer">
    <button id="aimgProceed" class="btn btn-success" onclick="AIMapGenerator.proceedWithGeneration()" disabled>
      Proceed with Map Generation
    </button>
    <button class="btn btn-secondary" onclick="$('#aiMapGenerator').dialog('close')">
      Cancel
    </button>
  </div>
</div>
```

---

### 3.6 Feature: AI World Builder (NEW)

**Description:** Enhance existing (randomly generated) maps with AI-directed world-building - adding nations, cultures, conflicts, and narrative coherence.

**User Workflow:**
1. User generates random map (standard workflow)
2. User clicks "Tools" → "AI World Builder"
3. Dialog opens with world concept prompt
4. User describes desired world theme/setting
5. AI analyzes existing geography and adds:
   - Named states with thematic coherence
   - Cultures aligned with geography
   - Diplomatic relations matching narrative
   - Military conflicts
   - Points of interest (markers)
   - Historical notes
6. User reviews proposed changes
7. User applies to map

**UI Mockup:**

```
┌───────────────────────────────────────────────────────────────┐
│  AI World Builder                                       [X]   │
├───────────────────────────────────────────────────────────────┤
│  Current Map: Unnamed (6,234 cells, 5 states, 38 cities)     │
│                                                               │
│  World Concept:                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ A world recovering from a great cataclysm 100 years    │ │
│  │ ago. The northern empire fractured into competing      │ │
│  │ city-states. Ancient ruins hold forgotten magic.      │ │
│  │ Undead plague threatens from the dark forests.        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Theme: [Fantasy ▼]   Tone: [Dark/Serious ▼]                 │
│  Tech Level: [Medieval ▼]   Magic: [Medium ▼]                │
│                                                               │
│  [ Analyze Map & Build World ]                                │
│                                                               │
│  Geographic Analysis:                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • 1 large continent (northern region)                   │ │
│  │ • Mountain range dividing east/west                     │ │
│  │ • Dense forests in southeast                            │ │
│  │ • Major river system through center                     │ │
│  │ • Coastal plains in west                                │ │
│  │ • 5 existing states (will be renamed/themed)            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Proposed Changes:                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ STATES (Renamed & Themed):                              │ │
│  │ • State 1 → "The Broken Crown" (former imperial core)   │ │
│  │ • State 2 → "Free Cities of Ashmar" (merchant league)   │ │
│  │ • State 3 → "Kingdom of the Vale" (agricultural)        │ │
│  │ • State 4 → "Thornwood Dominion" (forest elves)         │ │
│  │ • State 5 → "Coastal Baronies" (naval power)            │ │
│  │                                                         │ │
│  │ DIPLOMACY:                                              │ │
│  │ • Broken Crown vs Free Cities: Rival (trade conflict)   │ │
│  │ • Thornwood vs all: Suspicion (isolationist)            │ │
│  │ • Kingdom of Vale vs Coastal: Ally (defensive pact)     │ │
│  │                                                         │ │
│  │ MARKERS ADDED (18 total):                               │ │
│  │ • 6x Ancient Ruins (scattered, cataclysm sites)         │ │
│  │ • 4x Undead Threat (in Thornwood forests)               │ │
│  │ • 3x Magical Anomaly (former imperial sites)            │ │
│  │ • 2x Dungeon (lost vaults)                              │ │
│  │ • 3x Sacred Site (pre-cataclysm temples)                │ │
│  │                                                         │ │
│  │ CULTURES:                                               │ │
│  │ • Imperial Remnants (Broken Crown)                      │ │
│  │ • Merchant Cosmopolitan (Free Cities)                   │ │
│  │ • Pastoral Folk (Kingdom of Vale)                       │ │
│  │ • Elven Forest-Dwellers (Thornwood)                     │ │
│  │ • Coastal Mariners (Baronies)                           │ │
│  │                                                         │ │
│  │ NOTES CREATED (5):                                      │ │
│  │ • "The Great Cataclysm" (historical overview)           │ │
│  │ • "The Fall of the Empire" (political history)          │ │
│  │ • "The Undead Plague" (ongoing threat)                  │ │
│  │ • "Lost Magic of the Ancients" (lore)                   │ │
│  │ • "Current Year: 1147 AC" (timeline)                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [ Apply World-Building ]  [ Regenerate ]  [ Cancel ]        │
└───────────────────────────────────────────────────────────────┘
```

**Implementation Approach:**

**1. Prompt Design:**

```javascript
// modules/ai/prompt-templates.js
const AI_WORLD_BUILDER_SYSTEM_PROMPT = `You are a fantasy world-building assistant.
Given an existing map's geography and a world concept, enhance it with:
- Thematically coherent state/kingdom names and descriptions
- Cultural identities matching geography
- Diplomatic relations matching narrative
- Points of interest (markers) that support the theme
- Historical notes establishing lore

CURRENT MAP DATA:
{geography}

AVAILABLE MARKER TYPES:
volcanoes, hot springs, waterfalls, caves, ore deposits, bridges, roads, passes,
mines, sources, wells, lakes, inns, lighthouses, portals, rifts, sacred forests,
sacred mountains, temples, shrines, statues, circuses, jousts, fairs, markets,
stadiums, libraries, towers, amphitheatres, ruins, dungeons, monsters, brigands,
pirates, dragons

RESPONSE SCHEMA:
{
  "geographicAnalysis": {
    "continents": 1,
    "majorFeatures": ["mountain range", "river system"],
    "biomes": ["forest", "plains", "mountains"],
    "existingStates": 5
  },
  "stateChanges": [
    {
      "stateId": 1,
      "newName": "The Broken Crown",
      "fullName": "The Broken Crown Territories",
      "form": "Empire",
      "description": "Former imperial heartland, now fractured...",
      "cultureName": "Imperial Remnants"
    }
  ],
  "diplomacyChanges": [
    {
      "state1": "The Broken Crown",
      "state2": "Free Cities of Ashmar",
      "relation": "Rival",
      "reasoning": "Economic competition over trade routes"
    }
  ],
  "markersToAdd": [
    {
      "type": "ruins",
      "nearBurg": "Capital name",
      "description": "Shattered Imperial Palace",
      "reasoning": "Site of the cataclysm"
    }
  ],
  "notesToAdd": [
    {
      "name": "The Great Cataclysm",
      "legend": "<p>One hundred years ago...</p>",
      "reasoning": "Establishes world history"
    }
  ],
  "militaryConflicts": [
    {
      "attacker": "The Broken Crown",
      "defender": "Free Cities of Ashmar",
      "status": "Cold War",
      "description": "Border skirmishes over disputed trade routes"
    }
  ],
  "confidence": 0.88,
  "thematicCoherence": "High - geography supports post-apocalyptic recovery narrative"
}`;

const buildWorldBuilderPrompt = (worldConcept, mapData, options = {}) => {
  const geography = JSON.stringify({
    states: mapData.states.map(s => ({
      id: s.i,
      name: s.name,
      cells: s.cells,
      neighbors: s.neighbors,
      capital: mapData.burgs.find(b => b.i === s.capital)?.name
    })),
    burgs: mapData.burgs.slice(0, 20).map(b => ({ // Top 20 cities
      name: b.name,
      population: b.population,
      type: b.type
    })),
    features: mapData.features.map(f => ({
      type: f.type,
      cells: f.cells
    }))
  }, null, 2);

  return `${AI_WORLD_BUILDER_SYSTEM_PROMPT.replace('{geography}', geography)}

WORLD CONCEPT:
${worldConcept}

THEME: ${options.theme || "Fantasy"}
TONE: ${options.tone || "Balanced"}
TECH LEVEL: ${options.techLevel || "Medieval"}
MAGIC LEVEL: ${options.magic || "Medium"}

Analyze the map and return JSON with world-building enhancements.`;
};
```

**2. World Builder Module:**

```javascript
// modules/ui/ai-world-builder.js
"use strict";

window.AIWorldBuilder = (function() {

  let currentPlan = null;

  const open = function() {
    $("#aiWorldBuilder").dialog({
      title: "AI World Builder",
      width: 900,
      height: 800,
      position: { my: "center", at: "center", of: "svg" }
    });

    displayCurrentMap();
  };

  const displayCurrentMap = function() {
    const stateCount = pack.states.filter(s => s.i && !s.removed).length;
    const burgCount = pack.burgs.filter(b => b.i && !b.removed).length;
    const cellCount = pack.cells.i.length;

    $("#awbCurrentMap").text(
      `Unnamed (${cellCount.toLocaleString()} cells, ${stateCount} states, ${burgCount} cities)`
    );
  };

  const analyzeAndBuild = async function() {
    const worldConcept = $("#awbConcept").val().trim();
    if (!worldConcept) {
      tip("Please describe your world concept", false, "error");
      return;
    }

    const options = {
      theme: $("#awbTheme").val(),
      tone: $("#awbTone").val(),
      techLevel: $("#awbTech").val(),
      magic: $("#awbMagic").val()
    };

    $("#awbStatus").text("Analyzing geography and building world...");
    $("#awbAnalyze").prop("disabled", true);

    try {
      // Build map data summary
      const mapData = {
        states: pack.states.filter(s => s.i && !s.removed),
        burgs: pack.burgs.filter(b => b.i && !b.removed),
        features: pack.features.filter(f => f.i)
      };

      const prompt = PromptTemplates.buildWorldBuilderPrompt(worldConcept, mapData, options);
      const response = await callAI(prompt);
      const plan = JSON.parse(response);

      currentPlan = plan;
      displayPlan(plan);

      $("#awbApply").prop("disabled", false);

    } catch (err) {
      console.error("World-building error:", err);
      tip("Failed to generate world plan", false, "error");
    } finally {
      $("#awbAnalyze").prop("disabled", false);
      $("#awbStatus").text("");
    }
  };

  const displayPlan = function(plan) {
    let html = `<div class="awb-plan">`;

    // Geographic analysis
    html += `<h4>Geographic Analysis:</h4><ul>`;
    html += `<li>${plan.geographicAnalysis.continents} continent(s)</li>`;
    html += `<li>Major features: ${plan.geographicAnalysis.majorFeatures.join(", ")}</li>`;
    html += `<li>Biomes: ${plan.geographicAnalysis.biomes.join(", ")}</li>`;
    html += `<li>${plan.geographicAnalysis.existingStates} existing states</li>`;
    html += `</ul>`;

    // State changes
    html += `<h4>States (Renamed & Themed):</h4><ul>`;
    for (const change of plan.stateChanges) {
      html += `<li><strong>${change.newName}</strong> (${change.form}) - ${change.description}</li>`;
    }
    html += `</ul>`;

    // Diplomacy
    html += `<h4>Diplomacy:</h4><ul>`;
    for (const diplo of plan.diplomacyChanges) {
      html += `<li>${diplo.state1} vs ${diplo.state2}: <strong>${diplo.relation}</strong> - ${diplo.reasoning}</li>`;
    }
    html += `</ul>`;

    // Markers
    html += `<h4>Markers Added (${plan.markersToAdd.length} total):</h4>`;
    const markerGroups = {};
    plan.markersToAdd.forEach(m => {
      if (!markerGroups[m.type]) markerGroups[m.type] = 0;
      markerGroups[m.type]++;
    });
    html += `<ul>`;
    for (const [type, count] of Object.entries(markerGroups)) {
      html += `<li>${count}x ${type}</li>`;
    }
    html += `</ul>`;

    // Notes
    html += `<h4>Notes Created (${plan.notesToAdd.length}):</h4><ul>`;
    for (const note of plan.notesToAdd) {
      html += `<li><strong>${note.name}</strong> - ${note.reasoning}</li>`;
    }
    html += `</ul>`;

    // Conflicts
    if (plan.militaryConflicts?.length > 0) {
      html += `<h4>Military Conflicts:</h4><ul>`;
      for (const conflict of plan.militaryConflicts) {
        html += `<li>${conflict.attacker} vs ${conflict.defender}: ${conflict.status} - ${conflict.description}</li>`;
      }
      html += `</ul>`;
    }

    html += `<p><strong>Thematic Coherence:</strong> ${plan.thematicCoherence}</p>`;
    html += `<p><strong>Confidence:</strong> ${(plan.confidence * 100).toFixed(0)}%</p>`;

    html += `</div>`;

    $("#awbPlan").html(html);
  };

  const applyWorldBuilding = function() {
    if (!currentPlan) return;

    const changes = [];

    // Apply state changes
    for (const change of currentPlan.stateChanges) {
      const state = pack.states[change.stateId];
      if (!state) continue;

      changes.push({
        operation: "update",
        entityType: "state",
        entityId: change.stateId,
        updates: {
          name: change.newName,
          fullName: change.fullName,
          form: change.form
        }
      });

      // Update culture name if provided
      if (change.cultureName) {
        const culture = pack.cultures[state.culture];
        if (culture) {
          culture.name = change.cultureName;
        }
      }
    }

    // Apply diplomacy
    for (const diplo of currentPlan.diplomacyChanges) {
      const state1 = pack.states.find(s => s.name === diplo.state1 || s.i === diplo.state1);
      const state2 = pack.states.find(s => s.name === diplo.state2 || s.i === diplo.state2);

      if (state1 && state2) {
        if (!state1.diplomacy) state1.diplomacy = [];
        if (!state2.diplomacy) state2.diplomacy = [];

        state1.diplomacy[state2.i] = diplo.relation;

        // Reciprocal
        const reciprocal = {
          "Ally": "Ally",
          "Enemy": "Enemy",
          "Rival": "Rival",
          "Neutral": "Neutral",
          "Vassal": "Suzerain",
          "Suzerain": "Vassal"
        };
        state2.diplomacy[state1.i] = reciprocal[diplo.relation] || diplo.relation;
      }
    }

    // Add markers
    for (const marker of currentPlan.markersToAdd) {
      const burg = pack.burgs.find(b => b.name === marker.nearBurg);
      let x, y;

      if (burg) {
        // Place near specified burg
        x = burg.x + (Math.random() - 0.5) * 50;
        y = burg.y + (Math.random() - 0.5) * 50;
      } else {
        // Random location on land
        const landCells = pack.cells.i.filter(i => pack.cells.h[i] >= 20);
        const randomCell = landCells[Math.floor(Math.random() * landCells.length)];
        [x, y] = pack.cells.p[randomCell];
      }

      changes.push({
        operation: "create",
        entityType: "marker",
        updates: {
          type: marker.type,
          icon: getMarkerIcon(marker.type),
          x: x,
          y: y,
          description: marker.description
        }
      });
    }

    // Add notes
    for (const note of currentPlan.notesToAdd) {
      if (!notes) notes = [];
      notes.push({
        id: `note${Date.now()}_${Math.random()}`,
        name: note.name,
        legend: note.legend
      });
    }

    // Apply all changes
    MapUpdater.applyChanges(changes);

    // Redraw
    if (layerIsOn("toggleStates")) drawStates();
    if (layerIsOn("toggleBurgs")) drawBurgs();
    if (layerIsOn("toggleLabels")) drawLabels();
    if (layerIsOn("toggleMarkers")) drawMarkers();

    tip(`Applied world-building: ${changes.length} changes`, true, "success");

    $("#aiWorldBuilder").dialog("close");
  };

  const getMarkerIcon = function(type) {
    const icons = {
      ruins: "🏚️",
      dungeon: "⚔️",
      volcano: "🌋",
      temple: "🛕",
      cave: "🕳️",
      monster: "👹",
      dragon: "🐉",
      portal: "🌀",
      sacred_forest: "🌲",
      tower: "🗼",
      library: "📚"
    };
    return icons[type] || "❓";
  };

  const callAI = async function(prompt) {
    return new Promise((resolve, reject) => {
      generateWithAi(prompt, resolve);
    });
  };

  return {
    open,
    analyzeAndBuild,
    applyWorldBuilding
  };
})();
```

**3. HTML Dialog:**

```html
<div id="aiWorldBuilder" class="dialog stable" style="display: none;">
  <div class="awb-header">
    <p>Current Map: <strong><span id="awbCurrentMap"></span></strong></p>
    <p>Enhance your randomly generated map with AI-directed world-building.</p>
  </div>

  <label for="awbConcept">World Concept:</label>
  <textarea id="awbConcept" rows="5" placeholder="Example: A world recovering from a great cataclysm 100 years ago. The northern empire fractured into competing city-states. Ancient ruins hold forgotten magic. Undead plague threatens from the dark forests."></textarea>

  <div class="awb-options">
    <label>Theme:
      <select id="awbTheme">
        <option value="fantasy" selected>Fantasy</option>
        <option value="dark-fantasy">Dark Fantasy</option>
        <option value="high-fantasy">High Fantasy</option>
        <option value="low-fantasy">Low Fantasy</option>
        <option value="post-apocalyptic">Post-Apocalyptic</option>
        <option value="historical">Historical</option>
      </select>
    </label>

    <label>Tone:
      <select id="awbTone">
        <option value="light">Light/Comedic</option>
        <option value="balanced" selected>Balanced</option>
        <option value="dark">Dark/Serious</option>
        <option value="grim">Grim/Hopeless</option>
      </select>
    </label>

    <label>Tech Level:
      <select id="awbTech">
        <option value="stone-age">Stone Age</option>
        <option value="bronze-age">Bronze Age</option>
        <option value="medieval" selected>Medieval</option>
        <option value="renaissance">Renaissance</option>
        <option value="industrial">Industrial</option>
        <option value="modern">Modern</option>
      </select>
    </label>

    <label>Magic Level:
      <select id="awbMagic">
        <option value="none">None</option>
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
        <option value="very-high">Very High</option>
      </select>
    </label>
  </div>

  <button id="awbAnalyze" class="btn btn-primary" onclick="AIWorldBuilder.analyzeAndBuild()">
    Analyze Map & Build World
  </button>
  <span id="awbStatus" class="awb-status"></span>

  <div id="awbPlan" class="awb-plan"></div>

  <div class="awb-footer">
    <button id="awbApply" class="btn btn-success" onclick="AIWorldBuilder.applyWorldBuilding()" disabled>
      Apply World-Building
    </button>
    <button class="btn btn-secondary" onclick="AIWorldBuilder.analyzeAndBuild()">
      Regenerate
    </button>
    <button class="btn btn-secondary" onclick="$('#aiWorldBuilder').dialog('close')">
      Cancel
    </button>
  </div>
</div>
```

**4. Menu Integration:**

```html
<!-- File Menu -->
<li id="fileMenu" class="menu-item dropdown">
  <span>File</span>
  <ul class="dropdown-content">
    <li onclick="regenerateMap()">New Map</li>
    <li onclick="AIMapGenerator.open()">New Map with AI</li>  <!-- NEW -->
    <!-- ... -->
  </ul>
</li>

<!-- Tools Menu -->
<li id="toolsMenu" class="menu-item dropdown">
  <span>Tools</span>
  <ul class="dropdown-content">
    <!-- ... existing tools ... -->
    <li class="menu-divider"></li>
    <li class="menu-section">AI Tools</li>
    <li onclick="AIWorldBuilder.open()">AI World Builder</li>  <!-- NEW -->
    <li onclick="StoryTranslator.open()">Story Translator</li>
    <li onclick="RoleplayAssistant.open()">Roleplay Assistant</li>
    <!-- ... -->
  </ul>
</li>
```

---

## 4. Data Models

### 4.1 Map Update Schema

**JSON Schema for AI-generated map updates:**

```javascript
const MAP_UPDATE_SCHEMA = {
  "type": "object",
  "properties": {
    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "operation": {
            "type": "string",
            "enum": ["create", "update", "delete", "rename"]
          },
          "entityType": {
            "type": "string",
            "enum": ["state", "burg", "province", "marker", "note", "military", "river", "route"]
          },
          "entityId": {
            "type": "number",
            "description": "Numeric ID of entity (if known)"
          },
          "entityName": {
            "type": "string",
            "description": "Name of entity (for name-based lookup)"
          },
          "updates": {
            "type": "object",
            "description": "Fields to update/create",
            "additionalProperties": true
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Confidence score 0.0-1.0"
          },
          "reasoning": {
            "type": "string",
            "description": "Explanation of why this change is suggested"
          }
        },
        "required": ["operation", "entityType", "confidence"]
      }
    },
    "narrative_summary": {
      "type": "string",
      "description": "Brief summary of narrative events"
    },
    "affected_regions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Names of affected regions/states"
    }
  },
  "required": ["changes"]
};
```

### 4.2 Entity Update Schemas

**Burg (Settlement) Updates:**
```javascript
{
  "operation": "update",
  "entityType": "burg",
  "entityId": 16,
  "updates": {
    "population": 0,           // Set to 0 for destroyed
    "removed": true,           // Mark as removed
    "type": "Ruins",           // Change type
    "walls": 0,                // Remove walls
    "citadel": 0              // Remove citadel
  },
  "confidence": 0.9,
  "reasoning": "Narrative states fort was razed"
}
```

**State Updates:**
```javascript
{
  "operation": "update",
  "entityType": "state",
  "entityName": "Hizuna",
  "updates": {
    "form": "Ruin",           // Fallen state
    "diplomacy": {            // Update relations
      "11": "Enemy"
    }
  },
  "confidence": 0.85,
  "reasoning": "Kingdom fell to invaders"
}
```

**Marker Creation:**
```javascript
{
  "operation": "create",
  "entityType": "marker",
  "updates": {
    "type": "ruins",
    "icon": "🏚️",
    "x": 650.0,
    "y": 240.0,
    "description": "Ruins of Fort Emberwatch"
  },
  "confidence": 1.0,
  "reasoning": "Marking significant location"
}
```

**Note Creation:**
```javascript
{
  "operation": "create",
  "entityType": "note",
  "updates": {
    "name": "Siege of Fort Emberwatch",
    "legend": "<p>The siege lasted three months...</p>"
  },
  "confidence": 1.0,
  "reasoning": "Recording historical event"
}
```

**Military Unit Update:**
```javascript
{
  "operation": "update",
  "entityType": "military",
  "entityId": 0,               // Regiment ID
  "updates": {
    "x": 650.0,
    "y": 240.0,
    "cell": 1248,
    "u": {                     // Unit composition
      "infantry": 500,
      "archers": 200,
      "cavalry": 100
    },
    "a": 800                   // Total strength
  },
  "confidence": 0.8,
  "reasoning": "Army moved to new location"
}
```

### 4.3 Context Summary Format

**Strategic Summary (15k tokens):**
```javascript
{
  "states": [
    {
      "id": 16,
      "name": "Hizuna",
      "form": "Union",
      "capital": "Kaki",
      "neighbors": ["Akeshia", "Silden"],
      "area": 20175,
      "cells": 204,
      "burgs": 38,
      "military": 5
    }
  ],
  "burgs": [
    {
      "id": 16,
      "name": "Kaki",
      "state": "Hizuna",
      "population": 55.7,
      "type": "Naval",
      "capital": true,
      "port": true
    }
  ],
  "markers": [
    {
      "id": 0,
      "type": "volcano",
      "icon": "🌋",
      "nearBurg": "Kaki"
    }
  ],
  "religions": [
    {
      "id": 1,
      "name": "Moonlight",
      "type": "Folk",
      "culture": "Shwazen"
    }
  ]
}
```

**Regional Detail (30k tokens):**
```javascript
{
  "focus": {
    "centerX": 650,
    "centerY": 240,
    "radius": 100
  },
  "cells": [
    {
      "id": 1248,
      "biome": "Temperate broadleaf forest",
      "height": 20,
      "state": "Hizuna",
      "burg": "Kaki",
      "routes": ["road", "trail"]
    }
  ],
  "burgsDetailed": [
    {
      "id": 16,
      "name": "Kaki",
      "population": 55.7,
      "buildings": {
        "citadel": true,
        "walls": true,
        "temple": true,
        "plaza": true
      },
      "coa": "..."
    }
  ]
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals:**
- Create core AI infrastructure modules
- Extend existing AI generator for structured JSON responses
- Build context builder for token-efficient summaries
- Implement update validator

**Tasks:**
1. Create `modules/ai/context-builder.js`
   - `buildStrategicSummary()` - 15k token summary
   - `buildRegionalContext(x, y, radius)` - Focused detail
   - Token counting utilities

2. Create `modules/ai/prompt-templates.js`
   - Story translator prompts
   - Roleplay assistant prompts
   - Quest generator prompts
   - Lore generator prompts
   - **AI Map Generator prompts (NEW)**
   - **AI World Builder prompts (NEW)**

3. Create `modules/ai/update-validator.js`
   - Schema validation
   - Entity existence checks
   - Referential integrity validation
   - Warning system for large changes

4. Create `modules/ai/map-updater.js`
   - Apply state/burg/marker/note updates
   - Update statistics
   - Trigger layer redraws

5. Extend `modules/ui/ai-generator.js`
   - Add JSON parsing mode
   - Add streaming JSON support
   - Add error recovery

**Testing:**
- Unit tests for context builder (token limits)
- Validation tests with sample update JSONs
- Integration test: Manual JSON → Map Updater

**Deliverables:**
- 4 new modules (context-builder, prompt-templates, update-validator, map-updater)
- Extended ai-generator with JSON support
- Test suite

---

### Phase 2: Story Translator (Week 3-4)

**Goals:**
- Implement story-to-map translation UI
- Build entity name resolution
- Create change preview interface
- User approval workflow

**Tasks:**
1. Create `modules/ui/story-translator.js`
   - Dialog UI
   - Narrative input
   - AI translation call
   - Change preview table
   - Apply to map workflow

2. Create `modules/utils/entity-resolver.js`
   - Name → ID resolution for states
   - Name → ID resolution for burgs
   - Fuzzy matching for typos
   - Disambiguation UI

3. Add HTML dialog to `index.html`
   - Textarea for narrative
   - Translate button
   - Changes preview table
   - Apply/Cancel buttons

4. Add menu item to Tools menu

**Testing:**
- Test narrative: "Kingdom of X fell to Y"
- Test narrative: "City Z was destroyed by dragons"
- Test narrative: "Army moved from A to B"
- Edge case: Non-existent entities
- Edge case: Ambiguous names

**Deliverables:**
- Story Translator UI fully functional
- Integration with existing AI generator
- User documentation

---

### Phase 3: Roleplay Assistant (Week 5-6)

**Goals:**
- Implement chat-based roleplay interface
- Conversation history management
- Map update extraction from narrative responses
- Pending changes approval system

**Tasks:**
1. Create `modules/ui/roleplay-assistant.js`
   - Chat dialog UI
   - Conversation history rendering
   - Message sending/receiving
   - Map update detection
   - Pending changes UI

2. Implement conversation persistence
   - localStorage history
   - Session management
   - Clear history option

3. Add HTML dialog to `index.html`
   - Chat message container
   - Input textarea
   - Send button
   - Apply changes button

4. CSS styling for chat messages
   - User messages (blue)
   - AI messages (green)
   - Map update indicators

**Testing:**
- Test conversation flow
- Test map update extraction
- Test pending changes approval
- Test history persistence
- Test edge cases (malformed updates)

**Deliverables:**
- Roleplay Assistant fully functional
- Conversation history working
- Map updates from chat tested

---

### Phase 4: AI-Directed Generation Features (Week 7-9) **NEW**

**Goals:**
- Implement AI Map Generator (prompt-to-map)
- Implement AI World Builder (enhance existing maps)
- Integrate with existing map generation workflow

**Tasks:**
1. Create `modules/ui/ai-map-generator.js`
   - Prompt analysis dialog
   - Heightmap template generation from prompts
   - World options configuration
   - Civilization config application
   - Custom template registration

2. Create `modules/ui/ai-world-builder.js`
   - Geographic analysis
   - State renaming and theming
   - Diplomacy configuration
   - Marker placement
   - Historical note generation

3. Integration with core map generation
   - Hook into `generate()` function
   - Custom heightmap template support
   - Post-generation civilization adjustment
   - State merging/splitting utilities

4. Add HTML dialogs to `index.html`
   - AI Map Generator dialog
   - AI World Builder dialog

5. Update menu system
   - Add "New Map with AI" to File menu
   - Add "AI World Builder" to Tools menu

**Testing:**
- Test various narrative prompts (archipelago, continental, mountain kingdoms, etc.)
- Test heightmap template generation accuracy
- Test world-building on different map sizes
- Test state/culture coherence with themes
- Edge cases: Impossible geographies, conflicting requirements

**Deliverables:**
- AI Map Generator fully functional
- AI World Builder fully functional
- Integration with existing workflow
- User documentation for both features

---

### Phase 5: Enhanced Features (Week 10-11)

**Goals:**
- Extend notes editor with entity-specific prompts
- Implement quest generator
- Create lore generator for states/cultures
- Polish UI and UX

**Tasks:**
1. Extend `modules/ui/notes-editor.js`
   - Entity-specific prompt templates
   - Auto-populate context from selected entity
   - Preset buttons for common use cases

2. Create `modules/ui/quest-generator.js`
   - Generate quests from map locations
   - Quest JSON schema
   - Quest marker creation
   - Quest tracking

3. Create `modules/ui/lore-generator.js`
   - State history generation
   - Culture lore generation
   - Religion mythology generation
   - War/campaign narratives

4. UI polish
   - Loading indicators
   - Error messages
   - Success confirmations
   - Keyboard shortcuts

**Testing:**
- Test entity-specific notes
- Test quest generation for various locations
- Test lore generation for states
- UX testing with real users

**Deliverables:**
- Enhanced Notes Editor
- Quest Generator
- Lore Generator
- Polished UI/UX

---

### Phase 6: Testing & Documentation (Week 12-13)

**Goals:**
- Comprehensive testing
- User documentation
- Developer documentation
- Performance optimization

**Tasks:**
1. Testing
   - Unit tests for all modules
   - Integration tests
   - E2E tests for complete workflows
   - Performance testing (large maps)

2. Documentation
   - User guide (how to use each feature)
   - Developer guide (how to extend)
   - API documentation
   - Example prompts library

3. Performance optimization
   - Context size optimization
   - Token usage monitoring
   - Response streaming improvements
   - Caching strategies

4. Bug fixes and polish

**Deliverables:**
- Test suite with >80% coverage
- Complete user documentation
- Developer documentation
- Performance benchmarks

---

## 6. API Integration

### 6.1 Existing AI Generator Integration

**Current Implementation** (`modules/ui/ai-generator.js`):

```javascript
// API call structure
const callOpenAI = async function(prompt, model, temperature) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
      stream: true
    })
  });

  // Stream handling
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            appendToResponse(content);
          }
        } catch (err) {
          // Skip parsing errors
        }
      }
    }
  }
};
```

**Similar structure for Anthropic** (`callAnthropic`):

```javascript
const callAnthropic = async function(prompt, model, temperature) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
      stream: true
    })
  });

  // Stream handling similar to OpenAI
};
```

### 6.2 Extensions Needed

**1. Structured JSON Response Mode:**

```javascript
// modules/ui/ai-generator.js extension
const callAIWithJSONMode = async function(prompt, model, temperature, onChunk) {
  let buffer = "";

  const originalOnChunk = onChunk;
  const jsonOnChunk = (chunk) => {
    buffer += chunk;

    // Try parsing accumulated buffer
    try {
      const parsed = JSON.parse(buffer);
      return parsed; // Valid JSON complete
    } catch (err) {
      // Not complete yet, continue
      if (originalOnChunk) originalOnChunk(chunk);
      return null;
    }
  };

  return callAI(prompt, model, temperature, jsonOnChunk);
};
```

**2. System Message Support:**

```javascript
const callAIWithSystem = async function(systemPrompt, userPrompt, model, temperature) {
  // For Anthropic
  if (model.includes("claude")) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: temperature
      })
    });
  }

  // For OpenAI
  if (model.includes("gpt")) {
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: temperature
      })
    });
  }
};
```

**3. Conversation History Support (for Roleplay Assistant):**

```javascript
const callAIWithHistory = async function(systemPrompt, history, newMessage, model, temperature) {
  const messages = history.map(msg => ({
    role: msg.role === "User" ? "user" : "assistant",
    content: msg.content
  }));

  messages.push({ role: "user", content: newMessage });

  if (model.includes("claude")) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: messages,
        temperature: temperature
      })
    });
  }

  // Similar for OpenAI with system message prepended
};
```

### 6.3 Token Usage Tracking

**Add token counter:**

```javascript
// modules/ai/token-counter.js
"use strict";

window.TokenCounter = (function() {

  // Rough estimation: 1 token ≈ 4 characters for English
  const estimate = function(text) {
    return Math.ceil(text.length / 4);
  };

  // Track usage
  let usage = {
    input: 0,
    output: 0,
    total: 0
  };

  const track = function(input, output) {
    const inputTokens = estimate(input);
    const outputTokens = estimate(output);

    usage.input += inputTokens;
    usage.output += outputTokens;
    usage.total += inputTokens + outputTokens;

    console.log(`Tokens: ${inputTokens} input + ${outputTokens} output = ${inputTokens + outputTokens} total`);

    return { input: inputTokens, output: outputTokens };
  };

  const getUsage = function() {
    return { ...usage };
  };

  const reset = function() {
    usage = { input: 0, output: 0, total: 0 };
  };

  return { estimate, track, getUsage, reset };
})();
```

**Integration:**

```javascript
// Before AI call
const inputTokens = TokenCounter.estimate(prompt);
console.log(`Sending ${inputTokens} tokens to AI`);

// After AI response
TokenCounter.track(prompt, response);
```

---

## 7. Context Management Strategy

### 7.1 Token Budget

**Target Context Budget:** 65k tokens (33% of 200k Claude context)

**Breakdown:**
- Strategic summary: ~15k tokens (always included)
- Relevant detail: ~30k tokens (query-specific)
- Prompt/instructions: ~5k tokens
- Response space: ~15k tokens
- **Total:** ~65k tokens

### 7.2 Strategic Summary

**Content:**
```javascript
// modules/ai/context-builder.js
const buildStrategicSummary = function() {
  const summary = {
    mapInfo: {
      size: `${grid.cellsX} × ${grid.cellsY}`,
      scale: `${scale} miles per unit`,
      seed: seed,
      year: options.year || 0
    },
    states: pack.states
      .filter(s => s.i && !s.removed)
      .map(s => ({
        id: s.i,
        name: s.name,
        form: s.form,
        capital: pack.burgs[s.capital]?.name,
        culture: pack.cultures[s.culture]?.name,
        religion: pack.religions[s.religion]?.name,
        area: s.area,
        population: (s.urban + s.rural).toFixed(1),
        burgs: s.burgs,
        military: s.military?.length || 0,
        neighbors: s.neighbors?.map(n => pack.states[n]?.name).filter(Boolean)
      })),
    burgs: pack.burgs
      .filter(b => b.i && !b.removed)
      .filter(b => b.population > 10 || b.capital) // Only major settlements
      .map(b => ({
        id: b.i,
        name: b.name,
        state: pack.states[b.state]?.name,
        population: b.population.toFixed(1),
        type: b.type,
        capital: b.capital === 1
      })),
    cultures: pack.cultures
      .filter(c => c.i && !c.removed)
      .map(c => ({
        id: c.i,
        name: c.name,
        type: c.type,
        color: c.color
      })),
    religions: pack.religions
      .filter(r => r.i && !r.removed)
      .map(r => ({
        id: r.i,
        name: r.name,
        type: r.type,
        form: r.form,
        culture: pack.cultures[r.culture]?.name
      })),
    markers: pack.markers
      .map(m => ({
        type: m.type,
        nearBurg: getNearestBurg(m.cell)?.name
      }))
  };

  return JSON.stringify(summary, null, 2);
};
```

**Token Estimate:** ~15,000 tokens for typical map

### 7.3 Relevant Detail Extraction

**Location-based context:**

```javascript
const buildRegionalContext = function(x, y, radius = 100) {
  const centerCell = findCell(x, y);
  const cellsInRadius = [];

  // BFS to find cells within radius
  const queue = [centerCell];
  const visited = new Set();

  while (queue.length > 0) {
    const cellId = queue.shift();
    if (visited.has(cellId)) continue;

    const cell = pack.cells;
    const cellX = cell.p[cellId][0];
    const cellY = cell.p[cellId][1];
    const dist = Math.hypot(cellX - x, cellY - y);

    if (dist > radius) continue;

    visited.add(cellId);
    cellsInRadius.push(cellId);

    cell.c[cellId].forEach(neighbor => {
      if (!visited.has(neighbor)) queue.push(neighbor);
    });
  }

  // Extract detailed info for these cells
  const burgsInRegion = pack.burgs.filter(b => cellsInRadius.includes(b.cell) && !b.removed);
  const statesInRegion = new Set(cellsInRadius.map(id => pack.cells.state[id]));
  const markersInRegion = pack.markers.filter(m => cellsInRadius.includes(m.cell));

  const context = {
    focus: { x, y, radius },
    cells: cellsInRadius.length,
    burgs: burgsInRegion.map(b => ({
      id: b.i,
      name: b.name,
      population: b.population.toFixed(1),
      type: b.type,
      buildings: {
        citadel: b.citadel,
        walls: b.walls,
        temple: b.temple,
        plaza: b.plaza
      }
    })),
    states: Array.from(statesInRegion)
      .filter(id => id > 0)
      .map(id => ({
        id,
        name: pack.states[id].name,
        form: pack.states[id].form
      })),
    markers: markersInRegion.map(m => ({
      type: m.type,
      icon: m.icon
    }))
  };

  return JSON.stringify(context, null, 2);
};
```

**Token Estimate:** ~30,000 tokens for 100-unit radius

### 7.4 Entity-based Context

**When user asks about specific entity:**

```javascript
const buildEntityContext = function(entityType, entityId) {
  switch (entityType) {
    case 'state':
      return buildStateContext(entityId);
    case 'burg':
      return buildBurgContext(entityId);
    case 'culture':
      return buildCultureContext(entityId);
    default:
      return "{}";
  }
};

const buildStateContext = function(stateId) {
  const state = pack.states[stateId];
  const stateBurgs = pack.burgs.filter(b => b.state === stateId && !b.removed);
  const stateProvinces = pack.provinces.filter(p => p.state === stateId);
  const stateMilitary = state.military || [];

  return JSON.stringify({
    state: {
      id: state.i,
      name: state.name,
      fullName: state.fullName,
      form: state.form,
      capital: pack.burgs[state.capital]?.name,
      culture: pack.cultures[state.culture],
      religion: pack.religions[state.religion],
      area: state.area,
      population: {
        urban: state.urban.toFixed(1),
        rural: state.rural.toFixed(1),
        total: (state.urban + state.rural).toFixed(1)
      },
      diplomacy: state.diplomacy?.map((rel, i) => ({
        withState: pack.states[i]?.name,
        relation: rel
      })).filter(d => d.withState),
      coa: state.coa
    },
    burgs: stateBurgs.map(b => ({
      id: b.i,
      name: b.name,
      population: b.population.toFixed(1),
      type: b.type,
      capital: b.capital === 1,
      port: b.port === 1,
      buildings: {
        citadel: b.citadel,
        walls: b.walls,
        temple: b.temple,
        plaza: b.plaza
      }
    })),
    provinces: stateProvinces.map(p => ({
      id: p.i,
      name: p.fullName,
      capital: pack.burgs[p.burg]?.name
    })),
    military: stateMilitary.map(m => ({
      id: m.i,
      name: m.name,
      strength: m.a,
      location: pack.burgs.find(b => b.cell === m.cell)?.name || "Field",
      composition: m.u
    }))
  }, null, 2);
};
```

**Token Estimate:** ~5,000-10,000 tokens per state

### 7.5 Context Caching Strategy

**For repetitive queries, cache context:**

```javascript
// modules/ai/context-cache.js
"use strict";

window.ContextCache = (function() {

  const cache = new Map();
  const TTL = 5 * 60 * 1000; // 5 minutes

  const get = function(key) {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > TTL) {
      cache.delete(key);
      return null;
    }

    return entry.value;
  };

  const set = function(key, value) {
    cache.set(key, {
      value,
      timestamp: Date.now()
    });
  };

  const clear = function() {
    cache.clear();
  };

  // Invalidate cache when map changes
  const invalidate = function() {
    cache.clear();
  };

  return { get, set, clear, invalidate };
})();

// Hook into map update
const originalApplyChanges = MapUpdater.applyChanges;
MapUpdater.applyChanges = function(changes) {
  const result = originalApplyChanges(changes);
  ContextCache.invalidate();
  return result;
};
```

---

## 8. UI Components

### 8.1 Story Translator Dialog

**HTML:**

```html
<div id="storyTranslator" class="dialog stable" style="display: none;">
  <div class="st-header">
    <p>
      Translate narrative events into map changes. Describe what happened in your world,
      and AI will suggest corresponding updates to states, cities, and markers.
    </p>
  </div>

  <div class="st-input">
    <label for="stNarrative">Narrative:</label>
    <textarea id="stNarrative" rows="8" placeholder="Example: The kingdom of Hizuna fell to the undead after a brutal three-month siege. The capital was evacuated, and Fort Emberwatch was razed to the ground."></textarea>
  </div>

  <div class="st-controls">
    <button id="stTranslate" class="btn btn-primary" onclick="StoryTranslator.translate()">
      Translate to Map Changes
    </button>
    <span id="stStatus" class="st-status"></span>
  </div>

  <div id="stChanges" class="st-changes">
    <!-- Populated by displayChanges() -->
  </div>

  <div class="st-footer">
    <button id="stApply" class="btn btn-success" onclick="StoryTranslator.applyToMap()" disabled>
      Apply to Map
    </button>
    <button class="btn btn-secondary" onclick="$('#storyTranslator').dialog('close')">
      Cancel
    </button>
  </div>
</div>
```

**CSS:**

```css
#storyTranslator {
  font-family: Arial, sans-serif;
}

.st-header {
  background: #f0f0f0;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.st-input label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

.st-input textarea {
  width: 100%;
  font-family: inherit;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 8px;
}

.st-controls {
  margin: 15px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.st-status {
  font-style: italic;
  color: #666;
}

.st-changes {
  max-height: 300px;
  overflow-y: auto;
  margin: 15px 0;
}

.st-changes table {
  width: 100%;
  border-collapse: collapse;
}

.st-changes th,
.st-changes td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.st-changes th {
  background: #4CAF50;
  color: white;
}

.st-changes tr:nth-child(even) {
  background: #f9f9f9;
}

.st-footer {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-success {
  background: #4CAF50;
  color: white;
}

.btn-secondary {
  background: #757575;
  color: white;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

### 8.2 Roleplay Assistant Dialog

**HTML:**

```html
<div id="roleplayAssistant" class="dialog stable" style="display: none;">
  <div class="rp-header">
    <p>
      Interactive roleplay assistant. Describe your actions, and AI will respond
      as the Dungeon Master, updating the map as your story unfolds.
    </p>
  </div>

  <div id="rpConversation" class="rp-conversation">
    <!-- Messages rendered here -->
  </div>

  <div id="rpTyping" class="rp-typing" style="display: none;">
    <span class="typing-indicator">AI is typing</span>
    <span class="typing-dots">
      <span>.</span><span>.</span><span>.</span>
    </span>
  </div>

  <div class="rp-input-container">
    <textarea id="rpInput" rows="3" placeholder="Describe your action..."></textarea>
    <button class="btn btn-primary" onclick="RoleplayAssistant.sendMessage()">
      Send
    </button>
  </div>

  <div class="rp-footer">
    <button id="rpApplyChanges" class="btn btn-warning" onclick="RoleplayAssistant.applyPendingChanges()" disabled>
      Apply Pending Changes
    </button>
    <button class="btn btn-secondary" onclick="RoleplayAssistant.clearHistory()">
      Clear History
    </button>
    <button class="btn btn-secondary" onclick="$('#roleplayAssistant').dialog('close')">
      Close
    </button>
  </div>
</div>
```

**CSS:**

```css
#roleplayAssistant {
  display: flex;
  flex-direction: column;
  height: 700px;
}

.rp-header {
  background: #e3f2fd;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.rp-conversation {
  flex-grow: 1;
  overflow-y: auto;
  border: 1px solid #ccc;
  padding: 10px;
  background: #fafafa;
  margin-bottom: 10px;
}

.rp-user {
  background: #e3f2fd;
  padding: 10px;
  margin: 8px 0;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.rp-ai {
  background: #f1f8e9;
  padding: 10px;
  margin: 8px 0;
  border-radius: 8px;
  border-left: 4px solid #8bc34a;
}

.rp-user strong,
.rp-ai strong {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  opacity: 0.7;
}

.rp-typing {
  font-style: italic;
  color: #666;
  padding: 5px 10px;
  flex-shrink: 0;
}

.typing-dots {
  display: inline-block;
  animation: typingDots 1.5s infinite;
}

@keyframes typingDots {
  0%, 20% { opacity: 0.2; }
  40% { opacity: 1; }
  100% { opacity: 0.2; }
}

.rp-input-container {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.rp-input-container textarea {
  flex-grow: 1;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  font-family: inherit;
  resize: none;
}

.rp-footer {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-warning {
  background: #ff9800;
  color: white;
}
```

### 8.3 Quest Generator Dialog

**HTML:**

```html
<div id="questGenerator" class="dialog stable" style="display: none;">
  <div class="qg-header">
    <p>AI-generated quest based on selected map location and current world state.</p>
  </div>

  <div id="questDisplay" class="qg-content">
    <!-- Quest details rendered here -->
  </div>

  <div class="qg-footer">
    <button class="btn btn-success" onclick="QuestGenerator.addQuestMarkers()">
      Add Quest Markers to Map
    </button>
    <button class="btn btn-primary" onclick="QuestGenerator.saveAsNote()">
      Save as Note
    </button>
    <button class="btn btn-secondary" onclick="QuestGenerator.regenerate()">
      Regenerate
    </button>
    <button class="btn btn-secondary" onclick="$('#questGenerator').dialog('close')">
      Close
    </button>
  </div>
</div>
```

**CSS:**

```css
.qg-header {
  background: #fff3e0;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.qg-content {
  max-height: 500px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ddd;
  background: #fafafa;
  margin-bottom: 15px;
}

.qg-content h3 {
  color: #d84315;
  margin-top: 0;
}

.qg-content h4 {
  color: #f57c00;
  margin-top: 15px;
  margin-bottom: 5px;
}

.qg-content ul {
  list-style: none;
  padding-left: 0;
}

.qg-content li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.qg-content li:last-child {
  border-bottom: none;
}

.qg-footer {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

### 8.4 Menu Integration

**Add to Tools menu in `index.html`:**

```html
<li id="toolsMenu" class="menu-item dropdown">
  <span>Tools</span>
  <ul class="dropdown-content">
    <!-- Existing items -->
    <li onclick="editHeightmap()">Heightmap Editor</li>
    <li onclick="editBiomes()">Biomes Editor</li>
    <!-- ... -->

    <!-- AI Tools Section -->
    <li class="menu-divider"></li>
    <li class="menu-section">AI Tools</li>
    <li onclick="StoryTranslator.open()">Story Translator</li>
    <li onclick="RoleplayAssistant.open()">Roleplay Assistant</li>
    <li onclick="QuestGenerator.openForMap()">Quest Generator</li>
    <li onclick="LoreGenerator.open()">Lore Generator</li>
  </ul>
</li>
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test Framework:** Use browser-based testing or simple console tests

**Example Test Suite:**

```javascript
// tests/context-builder.test.js
const testContextBuilder = function() {
  console.group("Context Builder Tests");

  // Test 1: Strategic summary token count
  const summary = ContextBuilder.buildStrategicSummary();
  const tokens = TokenCounter.estimate(summary);
  console.assert(
    tokens < 20000,
    `Strategic summary too large: ${tokens} tokens (limit: 20k)`
  );
  console.log(`✓ Strategic summary size: ${tokens} tokens`);

  // Test 2: Regional context
  const regional = ContextBuilder.buildRegionalContext(500, 400, 100);
  const regionalTokens = TokenCounter.estimate(regional);
  console.assert(
    regionalTokens < 35000,
    `Regional context too large: ${regionalTokens} tokens (limit: 35k)`
  );
  console.log(`✓ Regional context size: ${regionalTokens} tokens`);

  // Test 3: Entity context
  const stateContext = ContextBuilder.buildEntityContext('state', 1);
  const stateTokens = TokenCounter.estimate(stateContext);
  console.assert(
    stateTokens < 15000,
    `State context too large: ${stateTokens} tokens (limit: 15k)`
  );
  console.log(`✓ State context size: ${stateTokens} tokens`);

  console.groupEnd();
};

// tests/update-validator.test.js
const testUpdateValidator = function() {
  console.group("Update Validator Tests");

  // Test 1: Valid update
  const validUpdate = {
    operation: "update",
    entityType: "burg",
    entityId: 1,
    updates: { population: 10 },
    confidence: 0.9
  };
  const result1 = UpdateValidator.validate([validUpdate]);
  console.assert(result1.valid, "Valid update should pass");
  console.log("✓ Valid update passes");

  // Test 2: Invalid entity ID
  const invalidUpdate = {
    operation: "update",
    entityType: "burg",
    entityId: 99999,
    updates: { population: 10 },
    confidence: 0.9
  };
  const result2 = UpdateValidator.validate([invalidUpdate]);
  console.assert(!result2.valid, "Invalid entity should fail");
  console.log("✓ Invalid entity ID fails");

  // Test 3: Missing required fields
  const missingFields = {
    operation: "create",
    entityType: "burg",
    confidence: 0.9
  };
  const result3 = UpdateValidator.validate([missingFields]);
  console.assert(!result3.valid, "Missing fields should fail");
  console.log("✓ Missing required fields fails");

  console.groupEnd();
};

// Run all tests
const runAllTests = function() {
  testContextBuilder();
  testUpdateValidator();
  // Add more test suites...
};
```

### 9.2 Integration Tests

**Test Scenarios:**

1. **Story Translation Flow**
   ```javascript
   const testStoryTranslation = async function() {
     // 1. Open dialog
     StoryTranslator.open();

     // 2. Enter narrative
     $("#stNarrative").val("The kingdom of Eldoria fell to the undead.");

     // 3. Translate
     await StoryTranslator.translate();

     // 4. Verify changes proposed
     console.assert(
       currentChanges.length > 0,
       "Should propose at least one change"
     );

     // 5. Apply changes
     StoryTranslator.applyToMap();

     // 6. Verify map updated
     // Check that relevant entities were modified
   };
   ```

2. **Roleplay Session Flow**
   ```javascript
   const testRoleplaySession = async function() {
     // 1. Open dialog
     RoleplayAssistant.open();

     // 2. Send message
     $("#rpInput").val("I travel to the nearest city.");
     await RoleplayAssistant.sendMessage();

     // 3. Verify response
     console.assert(
       conversationHistory.length === 2,
       "Should have user + AI message"
     );

     // 4. Check for map updates
     if (pendingUpdates.length > 0) {
       RoleplayAssistant.applyPendingChanges();
     }
   };
   ```

3. **Context Size Validation**
   ```javascript
   const testContextSizes = function() {
     const strategic = ContextBuilder.buildStrategicSummary();
     const regional = ContextBuilder.buildRegionalContext(500, 400, 100);

     const totalTokens =
       TokenCounter.estimate(strategic) +
       TokenCounter.estimate(regional) +
       5000; // Prompt overhead

     console.assert(
       totalTokens < 65000,
       `Total context too large: ${totalTokens} tokens (limit: 65k)`
     );
   };
   ```

### 9.3 E2E Tests

**User Workflows:**

1. **Complete Story Translation**
   - Load map
   - Open Story Translator
   - Enter multi-paragraph narrative
   - Review proposed changes
   - Apply to map
   - Verify visual updates
   - Export map
   - Reload and verify persistence

2. **Roleplay Session with Map Updates**
   - Load map
   - Open Roleplay Assistant
   - Conduct 10-message conversation
   - Apply 3 map updates during conversation
   - Verify map changes
   - Clear history
   - Start new session

3. **Quest Generation to Completion**
   - Load map
   - Right-click on location
   - Generate quest
   - Add quest markers
   - Save quest as note
   - Verify markers appear
   - Export map with quest data

### 9.4 Performance Tests

**Metrics to Track:**

1. **Context Generation Time**
   ```javascript
   const benchmarkContextGeneration = function() {
     const iterations = 100;

     console.time("Strategic Summary");
     for (let i = 0; i < iterations; i++) {
       ContextBuilder.buildStrategicSummary();
     }
     console.timeEnd("Strategic Summary");

     console.time("Regional Context");
     for (let i = 0; i < iterations; i++) {
       ContextBuilder.buildRegionalContext(500, 400, 100);
     }
     console.timeEnd("Regional Context");
   };
   ```

2. **Map Update Application Time**
   ```javascript
   const benchmarkMapUpdates = function() {
     const testUpdates = [
       { operation: "update", entityType: "burg", entityId: 1, updates: { population: 10 } },
       { operation: "create", entityType: "marker", updates: { type: "test", x: 100, y: 100 } }
     ];

     console.time("Apply 2 Updates");
     MapUpdater.applyChanges(testUpdates);
     console.timeEnd("Apply 2 Updates");
   };
   ```

3. **Memory Usage**
   ```javascript
   const measureMemoryUsage = function() {
     if (performance.memory) {
       const before = performance.memory.usedJSHeapSize;

       // Generate large context
       ContextBuilder.buildStrategicSummary();
       ContextBuilder.buildRegionalContext(500, 400, 200);

       const after = performance.memory.usedJSHeapSize;
       const delta = (after - before) / 1024 / 1024; // MB

       console.log(`Memory delta: ${delta.toFixed(2)} MB`);
     }
   };
   ```

---

## 10. Deployment & Integration

### 10.1 File Checklist

**New Files to Add:**

```
modules/ai/
├── context-builder.js        ✓ Context extraction
├── prompt-templates.js       ✓ Reusable prompts
├── update-validator.js       ✓ Update validation
├── map-updater.js            ✓ Apply updates
└── token-counter.js          ✓ Token tracking

modules/ui/
├── story-translator.js       ✓ Story translation UI
├── roleplay-assistant.js     ✓ Roleplay chat UI
├── quest-generator.js        ✓ Quest generation
└── lore-generator.js         ✓ Lore generation

modules/utils/
└── entity-resolver.js        ✓ Name → ID resolution

tests/
├── context-builder.test.js   ✓ Unit tests
├── update-validator.test.js  ✓ Validation tests
└── integration.test.js       ✓ E2E tests
```

**Modified Files:**

```
index.html                    ✓ Add dialog HTML, menu items
modules/ui/ai-generator.js    ✓ Extend for JSON mode, system messages
modules/ui/notes-editor.js    ✓ Add entity-specific prompts
main.js                       ✓ Register new modules (if needed)
```

### 10.2 Version Control

**Git Workflow:**

```bash
# Create feature branch
git checkout -b feature/ai-integration

# Commit by phase
git commit -m "Phase 1: Add core AI infrastructure modules"
git commit -m "Phase 2: Implement Story Translator UI"
git commit -m "Phase 3: Add Roleplay Assistant"
git commit -m "Phase 4: Enhance Notes Editor and add generators"
git commit -m "Phase 5: Add tests and documentation"

# Merge to main
git checkout master
git merge feature/ai-integration
```

### 10.3 Registration in index.html

**Add script tags:**

```html
<!-- AI Infrastructure -->
<script src="modules/ai/context-builder.js?v=1.109.0"></script>
<script src="modules/ai/prompt-templates.js?v=1.109.0"></script>
<script src="modules/ai/update-validator.js?v=1.109.0"></script>
<script src="modules/ai/map-updater.js?v=1.109.0"></script>
<script src="modules/ai/token-counter.js?v=1.109.0"></script>

<!-- AI UI -->
<script src="modules/ui/story-translator.js?v=1.109.0"></script>
<script src="modules/ui/roleplay-assistant.js?v=1.109.0"></script>
<script src="modules/ui/quest-generator.js?v=1.109.0"></script>
<script src="modules/ui/lore-generator.js?v=1.109.0"></script>

<!-- Utilities -->
<script src="modules/utils/entity-resolver.js?v=1.109.0"></script>
```

**Add dialog HTML (before closing `</body>`):**

```html
<!-- Story Translator Dialog -->
<div id="storyTranslator" class="dialog stable" style="display: none;">
  <!-- HTML from section 8.1 -->
</div>

<!-- Roleplay Assistant Dialog -->
<div id="roleplayAssistant" class="dialog stable" style="display: none;">
  <!-- HTML from section 8.2 -->
</div>

<!-- Quest Generator Dialog -->
<div id="questGenerator" class="dialog stable" style="display: none;">
  <!-- HTML from section 8.3 -->
</div>

<!-- Lore Generator Dialog -->
<div id="loreGenerator" class="dialog stable" style="display: none;">
  <!-- Similar to above -->
</div>
```

### 10.4 Initialization

**Add initialization code to `main.js` or create `ai-init.js`:**

```javascript
// ai-init.js
"use strict";

// Initialize AI modules on page load
document.addEventListener("DOMContentLoaded", function() {

  // Check if AI API keys are configured
  const openaiKey = localStorage.getItem("openaiApiKey");
  const anthropicKey = localStorage.getItem("anthropicApiKey");

  if (!openaiKey && !anthropicKey) {
    console.warn("No AI API keys configured. AI features will require API key input.");
  }

  // Initialize dialog positions
  $("#storyTranslator").dialog({
    autoOpen: false,
    width: 700,
    height: 600,
    position: { my: "center", at: "center", of: "svg" }
  });

  $("#roleplayAssistant").dialog({
    autoOpen: false,
    width: 800,
    height: 700,
    position: { my: "center", at: "center", of: "svg" }
  });

  $("#questGenerator").dialog({
    autoOpen: false,
    width: 700,
    height: 650,
    position: { my: "center", at: "center", of: "svg" }
  });

  // Load roleplay history if exists
  RoleplayAssistant.loadHistory?.();

  console.log("AI integration modules loaded successfully");
});
```

### 10.5 User Documentation

**Create `docs/AI-FEATURES.md`:**

```markdown
# AI Features Guide

## Story Translator

**Purpose:** Convert narrative events into map changes.

**How to Use:**
1. Click Tools → Story Translator
2. Type or paste your narrative
3. Click "Translate to Map Changes"
4. Review proposed changes in the table
5. Click "Apply to Map" to update

**Example Narrative:**
> The kingdom of Hizuna fell to the undead after a brutal siege.
> Fort Emberwatch was destroyed, and the survivors fled to the capital.

**Tips:**
- Be specific about locations and entities
- Mention outcomes clearly (destroyed, conquered, evacuated, etc.)
- Use names from your map for better accuracy

---

## Roleplay Assistant

**Purpose:** Interactive AI Dungeon Master for roleplay sessions.

**How to Use:**
1. Click Tools → Roleplay Assistant
2. Describe your action in the input box
3. Click "Send" or press Enter
4. AI responds as the Dungeon Master
5. If map updates are suggested, click "Apply Pending Changes"

**Example Session:**
- **You:** I travel to the nearest city
- **AI:** You arrive at Kaki, a bustling naval port...
- **You:** I search for rumors at the tavern
- **AI:** The bartender mentions undead sightings near Fort Emberwatch...

**Tips:**
- Conversation history is saved automatically
- Use "Clear History" to start a new session
- Review pending changes before applying

---

## Quest Generator

**Purpose:** Generate quests based on map locations.

**How to Use:**
1. Right-click on the map
2. Select "Generate Quest Here"
3. AI creates a quest based on the location
4. Click "Add Quest Markers" to place markers
5. Click "Save as Note" to record the quest

**Quest Structure:**
- Quest Title
- Quest Giver (NPC)
- Objective
- Locations to visit
- Obstacles
- Reward

---

## Enhanced Notes

**Purpose:** Generate lore and descriptions for map entities.

**How to Use:**
1. Open an editor (Burgs, States, etc.)
2. Select an entity
3. Click "Generate with AI" in the Notes section
4. AI generates contextual description
5. Click "Apply" to save

**Entity Types:**
- **Burgs:** Architecture, culture, economy
- **States:** History, politics, conflicts
- **Markers:** Encounters, events
- **Custom:** Any prompt you provide
```

---

## Appendix A: Prompt Engineering Best Practices

### A.1 Structured Output Prompts

**Key Principles:**
1. **Be explicit about JSON schema**
2. **Provide examples**
3. **Request reasoning**
4. **Set confidence thresholds**

**Example:**

```javascript
const prompt = `You are a map update assistant. Analyze the narrative and return JSON.

RESPONSE SCHEMA:
{
  "changes": [
    {
      "operation": "update|create|delete",
      "entityType": "state|burg|marker",
      "entityId": 123,
      "updates": { "field": "value" },
      "confidence": 0.85,
      "reasoning": "Explanation"
    }
  ]
}

EXAMPLE:
Narrative: "The city of Kaki was destroyed by fire."
Response:
{
  "changes": [{
    "operation": "update",
    "entityType": "burg",
    "entityName": "Kaki",
    "updates": { "population": 0, "removed": true },
    "confidence": 0.95,
    "reasoning": "Narrative explicitly states destruction"
  }]
}

CURRENT MAP: ${mapContext}

NARRATIVE: ${userNarrative}

Return only valid JSON.`;
```

### A.2 Context Compression

**Techniques:**
1. **Summarize** instead of including full data
2. **Filter** to only relevant entities
3. **Abbreviate** field names in JSON
4. **Omit** null/default values

**Example:**

```javascript
// Bad: Full data (50k tokens)
const fullBurg = {
  i: 16,
  cell: 1248,
  x: 642.71234,
  y: 231.77891,
  state: 16,
  culture: 14,
  name: "Kaki",
  feature: 4,
  capital: 1,
  port: 1,
  population: 55.741283,
  type: "Naval",
  citadel: 1,
  plaza: 1,
  walls: 1,
  temple: 1,
  shanty: 0,
  // ... 20 more fields
};

// Good: Compressed (15k tokens)
const summary = {
  i: 16,
  n: "Kaki",           // name
  s: "Hizuna",         // state name
  p: 55.7,             // population (rounded)
  t: "Naval",          // type
  c: true,             // capital
  f: ["citadel", "walls", "temple"]  // features
};
```

### A.3 Error Recovery

**Handling malformed AI responses:**

```javascript
const parseAIResponse = function(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    // Try extracting JSON from markdown code blocks
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err2) {
        console.error("Failed to parse JSON from code block");
      }
    }

    // Try fixing common issues
    let fixed = text
      .replace(/'/g, '"')          // Single quotes → double
      .replace(/,(\s*[}\]])/g, '$1')  // Trailing commas
      .replace(/(\w+):/g, '"$1":');   // Unquoted keys

    try {
      return JSON.parse(fixed);
    } catch (err3) {
      console.error("Could not parse AI response as JSON:", text);
      throw new Error("Invalid AI response format");
    }
  }
};
```

---

## Appendix B: Token Budget Reference

### B.1 Typical Map Data Sizes

**Small Map (2,000 cells):**
- Strategic Summary: ~8k tokens
- Regional Context (100 units): ~15k tokens
- Entity Detail: ~3k tokens
- **Total:** ~26k tokens

**Medium Map (6,500 cells):**
- Strategic Summary: ~15k tokens
- Regional Context (100 units): ~30k tokens
- Entity Detail: ~5k tokens
- **Total:** ~50k tokens

**Large Map (20,000 cells):**
- Strategic Summary: ~25k tokens
- Regional Context (100 units): ~50k tokens
- Entity Detail: ~8k tokens
- **Total:** ~83k tokens (exceeds budget)

**Solution for Large Maps:**
- Reduce regional radius to 50 units
- Filter to major burgs only (population > 20)
- Abbreviate field names
- Target: ~60k tokens

### B.2 Response Token Allocation

**Typical AI Responses:**
- Story translation: 1k-3k tokens (JSON)
- Roleplay message: 500-1k tokens (narrative)
- Quest generation: 2k-4k tokens (JSON)
- Lore generation: 1k-5k tokens (rich text)

**Safety Margin:**
- Request `max_tokens: 8192` for structured responses
- Request `max_tokens: 4096` for narrative responses
- Leave 15k tokens buffer for safety

---

## Appendix C: Example Prompts Library

### C.1 Story Translator Examples

**Conquest:**
```
Narrative: "The Hizunan Union invaded the neighboring kingdom of Silden,
capturing three major cities and installing a puppet government."

Expected Changes:
- Update cells along border: state → Hizuna
- Update Silden: diplomacy["Hizuna"] → "Vassal"
- Update Hizuna: diplomacy["Silden"] → "Suzerain"
- Create note: "Hizunan Conquest of Silden"
```

**Natural Disaster:**
```
Narrative: "A volcanic eruption destroyed the city of Ashton and covered
the surrounding farmland in ash, forcing thousands to flee."

Expected Changes:
- Update Ashton: population → 0, removed → true
- Create marker: type "volcano", near Ashton
- Nearby burgs: population +10% (refugees)
- Create note: "Ashton Disaster"
```

**Alliance:**
```
Narrative: "The kingdoms of Hizuna and Akeshia formed a military alliance
against the growing undead threat from the north."

Expected Changes:
- Update Hizuna: diplomacy["Akeshia"] → "Ally"
- Update Akeshia: diplomacy["Hizuna"] → "Ally"
- Create marker: type "undead", north of both kingdoms
```

### C.2 Roleplay Assistant Examples

**Travel:**
```
User: I travel from Kaki to Fort Emberwatch.
AI: You journey northeast along the coastal road. After two days of travel,
you arrive at the ruins of Fort Emberwatch. The once-mighty fortress now
lies in shambles, its walls crumbled. Undead patrols can be seen in the
distance. What do you do?

[MAP_UPDATE:create:marker:{"type":"undead","icon":"💀","x":680,"y":250}]
```

**Combat:**
```
User: I attack the undead patrol with my fire spell.
AI: Your fireball erupts among the undead, destroying several skeletal
warriors. The remaining undead flee back toward the ruins. You notice
something glinting in the ash—a sealed letter bearing the crest of Hizuna.

[No map update needed]
```

**Discovery:**
```
User: I open the sealed letter.
AI: The letter is from the former commander of Fort Emberwatch, dated
three months ago. It warns of a massive undead army gathering in the
Darkwood Forest, led by a powerful necromancer. The commander planned
to send reinforcements but never had the chance.

[MAP_UPDATE:create:marker:{"type":"custom","icon":"🏚️","x":680,"y":250,"description":"Site of last stand"}]
[MAP_UPDATE:create:note:{"name":"Commander's Warning","legend":"<p>Letter found at Fort Emberwatch...</p>"}]
```

### C.3 Quest Generator Examples

**Dungeon Quest:**
```
Location: Near ruins marker
Quest: "The Lost Catacombs"
Quest Giver: Brother Aldric (priest in nearby Kaki)
Objective: Investigate the catacombs beneath Fort Emberwatch and
           recover the sacred relic before the undead find it.
Locations:
  1. Temple of Light (Kaki) - Get blessing
  2. Fort Emberwatch ruins - Find catacomb entrance
  3. Undead camp - Avoid or fight through
  4. Catacomb depths - Recover relic
Reward: Sacred relic + 500 gold
```

**Diplomatic Quest:**
```
Location: Capital city
Quest: "The Akeshian Delegation"
Quest Giver: Queen Elara of Hizuna
Objective: Escort the Akeshian ambassador safely to the capital
           for alliance negotiations.
Locations:
  1. Border fort - Meet delegation
  2. Bandit territory - Defend against attack
  3. River crossing - Navigate treacherous waters
  4. Capital (Kaki) - Complete journey
Obstacles: Bandits, rival kingdoms, natural hazards
Reward: Royal favor + diplomatic immunity
```

---

## Appendix D: Troubleshooting Guide

### D.1 Common Issues

**Issue:** AI returns malformed JSON
**Solution:**
- Add explicit schema to prompt
- Request `response_format: { type: "json_object" }` (OpenAI)
- Implement error recovery parsing (Appendix A.3)

**Issue:** Context exceeds token limit
**Solution:**
- Reduce regional radius
- Filter to major entities only
- Use compressed format
- Cache static data

**Issue:** AI suggests non-existent entities
**Solution:**
- Provide complete entity list in context
- Add validation before applying
- Implement fuzzy name matching
- Ask user to disambiguate

**Issue:** Changes are too aggressive/conservative
**Solution:**
- Adjust temperature (lower = conservative)
- Add confidence thresholds
- Refine prompt with examples
- Request reasoning for review

**Issue:** Streaming response cuts off
**Solution:**
- Increase `max_tokens`
- Handle `finish_reason: "length"`
- Implement continuation requests
- Compress context to allow larger responses

### D.2 Debugging Tools

**Console Logging:**

```javascript
// Enable verbose logging
localStorage.setItem("aiDebug", "true");

// In modules
if (localStorage.getItem("aiDebug") === "true") {
  console.log("AI Request:", {
    prompt: prompt.slice(0, 200) + "...",
    tokens: TokenCounter.estimate(prompt),
    model: selectedModel,
    temperature: temperature
  });
}
```

**Token Usage Monitor:**

```javascript
// Add to UI
<div id="tokenMonitor" style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
  <div>Tokens: <span id="tokenCount">0</span></div>
  <div>Cost: $<span id="tokenCost">0.00</span></div>
</div>

<script>
setInterval(() => {
  const usage = TokenCounter.getUsage();
  document.getElementById("tokenCount").textContent = usage.total.toLocaleString();

  // Rough cost estimate (Claude Sonnet: $3/$15 per million tokens)
  const cost = (usage.input * 3 + usage.output * 15) / 1_000_000;
  document.getElementById("tokenCost").textContent = cost.toFixed(4);
}, 1000);
</script>
```

---

## Summary

This specification provides a comprehensive blueprint for integrating AI-powered storytelling and roleplay features into Azgaar's Fantasy Map Generator. The integration leverages existing infrastructure (`modules/ui/ai-generator.js`) for a pure client-side implementation without requiring backend services or Python bridges.

**Key Deliverables:**
1. **AI Map Generator (NEW)** - Generate complete maps from narrative prompts
2. **AI World Builder (NEW)** - Enhance random maps with thematic world-building
3. Story Translator - Convert narratives to map changes
4. Roleplay Assistant - Interactive AI Dungeon Master
5. Quest Generator - Location-based quest creation
6. Enhanced Notes - Entity-specific lore generation
7. Supporting modules - Context builder, validator, updater

**Implementation Timeline:** 12-13 weeks across 6 phases

**Next Steps for Opus:**
1. Review this specification thoroughly
2. Set up development environment (clone repo)
3. Begin Phase 1: Core infrastructure modules
4. Test incrementally after each module
5. Iterate based on real-world usage

**Success Metrics:**
- **AI-generated maps match user prompts >85% accuracy**
- **World-building produces thematically coherent nations/cultures**
- Story translation accuracy >80%
- Context stays within 65k token budget
- Map updates validate successfully
- User approval workflow prevents errors
- Roleplay sessions maintain coherent state
- **Heightmap templates execute without errors**

**New Capabilities:**
- **From Prompt to Playable World:** Users can describe their ideal fantasy world and get a complete, playable map in minutes
- **Instant World-Building:** Transform generic random maps into rich, story-ready worlds with AI-generated lore, conflicts, and cultures
- **Narrative-Driven Geography:** AI interprets story requirements (e.g., "volcanic archipelago", "mountain kingdoms") and generates appropriate terrain
- **Thematic Coherence:** World Builder ensures nations, cultures, and conflicts align with the user's narrative vision

This specification is ready for implementation by Claude Opus.
