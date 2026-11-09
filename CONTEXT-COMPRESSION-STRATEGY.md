# Context Compression Strategy for AI Integration

**Version:** 1.0
**Date:** 2025-11-28
**Problem:** Full JSON map data is too token-intensive for AI context windows

---

## Problem Statement

### Current Approach (Naive)
```javascript
// Full state object: ~250 tokens per state
{
  "i": 16,
  "name": "Hizuna",
  "color": "#ffcf51",
  "capital": 16,
  "center": 1248,
  "culture": 14,
  "form": "Union",
  "fullName": "Hizunan Union",
  "cells": 204,
  "burgs": 38,
  "area": 20175,
  "urban": 357.474,
  "rural": 2176.02,
  "neighbors": [11, 4],
  "diplomacy": ["x", "Friendly", "Ally", ...],
  "provinces": [101, 102, 103, ...],
  "military": [...]
}
```

**Token Cost:** ~250 tokens × 20 states = **5,000 tokens** just for basic state data

### With Full Map Data
- States: ~5,000 tokens
- Burgs (50 cities): ~8,000 tokens
- Provinces: ~3,000 tokens
- Features: ~2,000 tokens
- Rivers: ~2,000 tokens
- Routes: ~2,000 tokens
- **Total: ~22,000 tokens** for minimal data

**Problem:** This leaves only ~43k tokens for:
- AI instructions/prompts
- Regional detail
- Response space

---

## Solution: Hierarchical Compression System

### Core Principle
Create **ultra-dense binary-like representations** that AI can parse and work with, then **decompress back to full JSON** when applying changes.

---

## Compression Format Design

### 1. **State Compression**

**Full Format (250 tokens):**
```javascript
{
  "i": 16,
  "name": "Hizuna",
  "color": "#ffcf51",
  "capital": 16,
  "center": 1248,
  "culture": 14,
  "form": "Union",
  "fullName": "Hizunan Union",
  "cells": 204,
  "burgs": 38,
  "area": 20175,
  "urban": 357.474,
  "rural": 2176.02,
  "neighbors": [11, 4],
  "diplomacy": ["x", "Friendly", "Ally"]
}
```

**Compressed Format (25 tokens - 90% reduction):**
```
S16|Hizuna|Union|C16|CL14|N204|B38|A20k|U357|R2176|NB[11:F,4:A]
```

**Format Spec:**
```
S{id}|{name}|{form}|C{capital}|CL{culture}|N{cells}|B{burgs}|A{area_k}|U{urban}|R{rural}|NB[{neighbor}:{relation_code},...]

Relation Codes:
A=Ally, F=Friendly, N=Neutral, S=Suspicion, E=Enemy, R=Rival, V=Vassal, Z=Suzerain
```

**Token Savings:** 250 → 25 tokens (90% reduction)

---

### 2. **Burg Compression**

**Full Format (150 tokens):**
```javascript
{
  "i": 16,
  "cell": 1248,
  "x": 642.71,
  "y": 231.77,
  "state": 16,
  "culture": 14,
  "name": "Kaki",
  "feature": 4,
  "capital": 1,
  "port": 1,
  "population": 55.741,
  "type": "Naval",
  "citadel": 1,
  "plaza": 1,
  "walls": 1,
  "temple": 1
}
```

**Compressed Format (15 tokens - 90% reduction):**
```
B16|Kaki|S16|P56|Naval|@643,232|F:CPW1
```

**Format Spec:**
```
B{id}|{name}|S{state}|P{pop_rounded}|{type}|@{x},{y}|F:{features}

Features (single chars):
C=Capital, P=Port, W=Walls, 1=Citadel, 2=Plaza, 3=Temple, 4=Shanty
```

**Token Savings:** 150 → 15 tokens (90% reduction)

---

### 3. **Geographic Feature Compression**

**Full Format (100 tokens):**
```javascript
{
  "i": 4,
  "type": "island",
  "land": true,
  "border": false,
  "cells": 2390,
  "firstCell": 81,
  "area": 265359,
  "group": "continent"
}
```

**Compressed Format (10 tokens - 90% reduction):**
```
G4|island|N2390|A265k|continent
```

**Format Spec:**
```
G{id}|{type}|N{cells}|A{area_k}|{group}
```

---

### 4. **River Compression**

**Full Format (80 tokens):**
```javascript
{
  "i": 1,
  "source": 1234,
  "mouth": 5678,
  "discharge": 100,
  "length": 234,
  "name": "Silverflow",
  "type": "River",
  "cells": [1234, 1235, 1236, ..., 5678]
}
```

**Compressed Format (12 tokens - 85% reduction):**
```
R1|Silverflow|1234>5678|L234|D100|N{cell_count}
```

**Format Spec:**
```
R{id}|{name}|{source}>{mouth}|L{length}|D{discharge}|N{cell_count}
```

**Note:** Omit full cell path - AI doesn't need it for world-building

---

### 5. **Marker Compression**

**Full Format (50 tokens):**
```javascript
{
  "i": 0,
  "icon": "🌋",
  "type": "volcanoes",
  "cell": 1234,
  "x": 123.45,
  "y": 456.78,
  "lock": false
}
```

**Compressed Format (8 tokens - 84% reduction):**
```
M0|volcano|@123,457
```

**Format Spec:**
```
M{id}|{type_abbrev}|@{x},{y}

Type Abbreviations (AI learns mapping):
volcano, ruins, dungeon, temple, cave, monster, dragon, portal, etc.
```

---

## Implementation

### Context Builder Module

```javascript
// modules/ai/context-compressor.js
"use strict";

window.ContextCompressor = (function() {

  // ========================================
  // COMPRESSION FUNCTIONS
  // ========================================

  const compressState = function(state) {
    const neighbors = state.neighbors
      ?.map(nid => {
        const rel = state.diplomacy?.[nid];
        const code = DIPLOMACY_CODES[rel] || 'N';
        return `${nid}:${code}`;
      })
      .join(',') || '';

    return [
      `S${state.i}`,
      state.name,
      state.form || 'None',
      `C${state.capital}`,
      `CL${state.culture}`,
      `N${state.cells}`,
      `B${state.burgs}`,
      `A${Math.round(state.area / 1000)}k`,
      `U${Math.round(state.urban)}`,
      `R${Math.round(state.rural)}`,
      neighbors ? `NB[${neighbors}]` : 'NB[]'
    ].join('|');
  };

  const compressBurg = function(burg) {
    const features = [];
    if (burg.capital) features.push('C');
    if (burg.port) features.push('P');
    if (burg.walls) features.push('W');
    if (burg.citadel) features.push('1');
    if (burg.plaza) features.push('2');
    if (burg.temple) features.push('3');
    if (burg.shanty) features.push('4');

    return [
      `B${burg.i}`,
      burg.name,
      `S${burg.state}`,
      `P${Math.round(burg.population)}`,
      burg.type || 'Town',
      `@${Math.round(burg.x)},${Math.round(burg.y)}`,
      features.length ? `F:${features.join('')}` : 'F:'
    ].join('|');
  };

  const compressFeature = function(feature) {
    return [
      `G${feature.i}`,
      feature.type,
      `N${feature.cells}`,
      `A${Math.round(feature.area / 1000)}k`,
      feature.group || 'none'
    ].join('|');
  };

  const compressRiver = function(river) {
    return [
      `R${river.i}`,
      river.name || `River${river.i}`,
      `${river.source}>${river.mouth}`,
      `L${river.length}`,
      `D${Math.round(river.discharge)}`,
      `N${river.cells?.length || 0}`
    ].join('|');
  };

  const compressMarker = function(marker) {
    const typeAbbrev = MARKER_ABBREV[marker.type] || marker.type;
    return [
      `M${marker.i}`,
      typeAbbrev,
      `@${Math.round(marker.x)},${Math.round(marker.y)}`
    ].join('|');
  };

  // ========================================
  // DECOMPRESSION FUNCTIONS
  // ========================================

  const decompressState = function(compressed) {
    const parts = compressed.split('|');
    const state = {
      i: parseInt(parts[0].slice(1)),
      name: parts[1],
      form: parts[2]
    };

    // Parse each field
    for (let i = 3; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('C')) state.capital = parseInt(part.slice(1));
      else if (part.startsWith('CL')) state.culture = parseInt(part.slice(2));
      else if (part.startsWith('N')) state.cells = parseInt(part.slice(1));
      else if (part.startsWith('B')) state.burgs = parseInt(part.slice(1));
      else if (part.startsWith('A')) state.area = parseInt(part.slice(1, -1)) * 1000;
      else if (part.startsWith('U')) state.urban = parseInt(part.slice(1));
      else if (part.startsWith('R')) state.rural = parseInt(part.slice(1));
      else if (part.startsWith('NB[')) {
        const nbStr = part.slice(3, -1);
        if (nbStr) {
          state.neighbors = [];
          state.diplomacy = [];
          nbStr.split(',').forEach(nb => {
            const [nid, code] = nb.split(':');
            state.neighbors.push(parseInt(nid));
            state.diplomacy[parseInt(nid)] = DIPLOMACY_REVERSE[code];
          });
        }
      }
    }

    return state;
  };

  const decompressBurg = function(compressed) {
    const parts = compressed.split('|');
    const burg = {
      i: parseInt(parts[0].slice(1)),
      name: parts[1]
    };

    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('S')) burg.state = parseInt(part.slice(1));
      else if (part.startsWith('P')) burg.population = parseInt(part.slice(1));
      else if (part.startsWith('@')) {
        const [x, y] = part.slice(1).split(',').map(Number);
        burg.x = x;
        burg.y = y;
      } else if (part.startsWith('F:')) {
        const features = part.slice(2);
        burg.capital = features.includes('C') ? 1 : 0;
        burg.port = features.includes('P') ? 1 : 0;
        burg.walls = features.includes('W') ? 1 : 0;
        burg.citadel = features.includes('1') ? 1 : 0;
        burg.plaza = features.includes('2') ? 1 : 0;
        burg.temple = features.includes('3') ? 1 : 0;
        burg.shanty = features.includes('4') ? 1 : 0;
      } else {
        burg.type = part;
      }
    }

    return burg;
  };

  const decompressMarker = function(compressed) {
    const parts = compressed.split('|');
    const marker = {
      i: parseInt(parts[0].slice(1))
    };

    const typeAbbrev = parts[1];
    marker.type = MARKER_REVERSE[typeAbbrev] || typeAbbrev;

    if (parts[2].startsWith('@')) {
      const [x, y] = parts[2].slice(1).split(',').map(Number);
      marker.x = x;
      marker.y = y;
    }

    return marker;
  };

  // ========================================
  // FULL MAP COMPRESSION
  // ========================================

  const compressMapContext = function(options = {}) {
    const compressed = {
      meta: `MAP|${pack.cells.i.length}cells`,
      states: pack.states
        .filter(s => s.i && !s.removed)
        .map(compressState),
      burgs: pack.burgs
        .filter(b => b.i && !b.removed)
        .slice(0, options.maxBurgs || 50) // Top 50 by default
        .map(compressBurg),
      features: pack.features
        .filter(f => f.i && f.land)
        .map(compressFeature),
      rivers: pack.rivers
        .filter(r => r.i)
        .slice(0, options.maxRivers || 20)
        .map(compressRiver),
      markers: pack.markers
        .slice(0, options.maxMarkers || 30)
        .map(compressMarker)
    };

    return compressed;
  };

  const formatForAI = function(compressed) {
    let output = `${compressed.meta}\n\n`;

    output += `STATES (${compressed.states.length}):\n`;
    compressed.states.forEach(s => output += s + '\n');

    output += `\nBURGS (${compressed.burgs.length}):\n`;
    compressed.burgs.forEach(b => output += b + '\n');

    output += `\nFEATURES (${compressed.features.length}):\n`;
    compressed.features.forEach(f => output += f + '\n');

    output += `\nRIVERS (${compressed.rivers.length}):\n`;
    compressed.rivers.forEach(r => output += r + '\n');

    output += `\nMARKERS (${compressed.markers.length}):\n`;
    compressed.markers.forEach(m => output += m + '\n');

    return output;
  };

  // ========================================
  // CONSTANTS
  // ========================================

  const DIPLOMACY_CODES = {
    'Ally': 'A',
    'Friendly': 'F',
    'Neutral': 'N',
    'Suspicion': 'S',
    'Enemy': 'E',
    'Rival': 'R',
    'Vassal': 'V',
    'Suzerain': 'Z',
    'Unknown': 'U'
  };

  const DIPLOMACY_REVERSE = Object.fromEntries(
    Object.entries(DIPLOMACY_CODES).map(([k, v]) => [v, k])
  );

  const MARKER_ABBREV = {
    'volcanoes': 'volcano',
    'hot springs': 'hotspring',
    'waterfalls': 'waterfall',
    'caves': 'cave',
    'ore deposits': 'ore',
    'bridges': 'bridge',
    'roads': 'road',
    'passes': 'pass',
    'mines': 'mine',
    'sources': 'source',
    'wells': 'well',
    'lakes': 'lake',
    'inns': 'inn',
    'lighthouses': 'lighthouse',
    'portals': 'portal',
    'rifts': 'rift',
    'sacred forests': 'sacredforest',
    'sacred mountains': 'sacredmountain',
    'temples': 'temple',
    'shrines': 'shrine',
    'statues': 'statue',
    'circuses': 'circus',
    'jousts': 'joust',
    'fairs': 'fair',
    'markets': 'market',
    'stadiums': 'stadium',
    'libraries': 'library',
    'towers': 'tower',
    'amphitheatres': 'amphitheatre',
    'ruins': 'ruins',
    'dungeons': 'dungeon',
    'monsters': 'monster',
    'brigands': 'brigands',
    'pirates': 'pirates',
    'dragons': 'dragon'
  };

  const MARKER_REVERSE = Object.fromEntries(
    Object.entries(MARKER_ABBREV).map(([k, v]) => [v, k])
  );

  // ========================================
  // PUBLIC API
  // ========================================

  return {
    compressState,
    compressBurg,
    compressFeature,
    compressRiver,
    compressMarker,
    decompressState,
    decompressBurg,
    decompressMarker,
    compressMapContext,
    formatForAI
  };
})();
```

---

## Example Compression Results

### Before Compression
```javascript
// Full JSON for 20 states, 50 burgs, 10 features
{
  "states": [...], // 5,000 tokens
  "burgs": [...],  // 8,000 tokens
  "features": [...], // 2,000 tokens
  "rivers": [...], // 2,000 tokens
  "markers": [...] // 1,500 tokens
}
// Total: 18,500 tokens
```

### After Compression
```
MAP|6234cells

STATES (20):
S1|Akeshia|Empire|C1|CL1|N450|B65|A48k|U520|R4800|NB[2:E,3:N,4:F]
S2|Silden|Kingdom|C2|CL2|N320|B42|A35k|U380|R3200|NB[1:E,5:A]
...

BURGS (50):
B1|Akesh|S1|P120|Imperial|@450,320|F:CPW1
B2|Sildar|S2|P85|Fortress|@620,410|F:CW
...

FEATURES (10):
G1|continent|N5800|A620k|mainland
G2|island|N380|A42k|archipelago
...

RIVERS (15):
R1|Silverflow|1234>5678|L450|D120|N89
R2|Darkwater|2345>6789|L320|D85|N67
...

MARKERS (25):
M1|volcano|@450,320
M2|ruins|@620,410
...

Total: 2,500 tokens (86.5% reduction)
```

---

## AI Prompt Integration

### Updated System Prompt for AI Map Generator

```javascript
const AI_MAP_GENERATOR_SYSTEM_PROMPT = `You are a fantasy map design assistant.

COMPRESSED MAP FORMAT:
States: S{id}|{name}|{form}|C{capital}|CL{culture}|N{cells}|B{burgs}|A{area}|U{urban}|R{rural}|NB[neighbor:relation,...]
Burgs: B{id}|{name}|S{state}|P{pop}|{type}|@{x},{y}|F:{features}
Features: G{id}|{type}|N{cells}|A{area}|{group}
Rivers: R{id}|{name}|{source}>{mouth}|L{length}|D{discharge}|N{cells}
Markers: M{id}|{type}|@{x},{y}

Relation codes: A=Ally, F=Friendly, N=Neutral, E=Enemy, R=Rival, S=Suspicion
Feature flags: C=Capital, P=Port, W=Walls, 1=Citadel, 2=Plaza, 3=Temple

RESPOND IN COMPRESSED FORMAT for efficiency.

Example output for renaming state:
S16|Hizuna→BrokenCrown|Empire|C16|CL14|N204|B38|A20k|U357|R2176|NB[11:E,4:R]
                ^^^^ name change

CURRENT MAP:
{compressed_map_data}

USER REQUEST:
{user_prompt}

Return compressed format changes.`;
```

### AI Response Parsing

```javascript
// Parse AI's compressed response
const parseCompressedResponse = function(aiResponse) {
  const changes = [];
  const lines = aiResponse.split('\n');

  for (const line of lines) {
    if (line.startsWith('S')) {
      // State change
      const state = ContextCompressor.decompressState(line);
      changes.push({
        operation: 'update',
        entityType: 'state',
        entityId: state.i,
        updates: state
      });
    } else if (line.startsWith('B')) {
      // Burg change
      const burg = ContextCompressor.decompressBurg(line);
      changes.push({
        operation: 'update',
        entityType: 'burg',
        entityId: burg.i,
        updates: burg
      });
    } else if (line.startsWith('M') && line.includes('NEW')) {
      // New marker
      const marker = ContextCompressor.decompressMarker(line.replace('NEW|', ''));
      changes.push({
        operation: 'create',
        entityType: 'marker',
        updates: marker
      });
    }
  }

  return changes;
};
```

---

## Token Budget Comparison

### Scenario: World Builder with Medium Map

**Uncompressed Approach:**
```
Map Context: 22,000 tokens
System Prompt: 2,000 tokens
User Concept: 500 tokens
AI Response Space: 8,000 tokens
Total: 32,500 tokens
```

**Compressed Approach:**
```
Map Context: 2,500 tokens (compressed)
Format Guide: 500 tokens (teach AI the format)
System Prompt: 2,000 tokens
User Concept: 500 tokens
AI Response Space: 8,000 tokens
Total: 13,500 tokens
```

**Savings:** 19,000 tokens (58.5% reduction in total context)

---

## Advanced Compression Techniques

### 1. **Semantic Clustering**

Group related entities to reduce repetition:

```
REGION:North|S1,S2,S3|B1-15|cold,mountains
REGION:South|S4,S5|B16-30|warm,coastal
```

### 2. **Delta Encoding**

For AI World Builder, only send what needs changing:

```
CHANGES:
S1|name:Akeshia→BrokenCrown|form:Empire→Ruin
S2|diplomacy:1=E,3=F
+M50|ruins|@450,320
+NOTE|Cataclysm|<p>The great fall...</p>
```

### 3. **Reference IDs**

Use short references for repeated elements:

```
CULTURES:
C1=Imperial,C2=Nomadic,C3=Coastal

STATES:
S1|Akesh|Empire|CL:C1|...
S2|Wanderers|Tribe|CL:C2|...
```

---

## Implementation Priority

### Phase 1: Basic Compression (Week 1-2)
- Implement core compression/decompression
- Test with state and burg data
- Integrate with existing context builder

### Phase 2: AI Integration (Week 3-4)
- Update all prompts to use compressed format
- Train AI with format examples
- Test response parsing

### Phase 3: Advanced Techniques (Week 5-6)
- Implement delta encoding for updates
- Add semantic clustering for large maps
- Optimize for different map sizes

---

## Success Metrics

**Target Compression Ratios:**
- States: 90% reduction (250 → 25 tokens)
- Burgs: 90% reduction (150 → 15 tokens)
- Features: 90% reduction (100 → 10 tokens)
- Rivers: 85% reduction (80 → 12 tokens)
- Markers: 84% reduction (50 → 8 tokens)

**Overall Context Budget:**
- Small maps (2k cells): 1,500 tokens (was 8,000)
- Medium maps (6k cells): 2,500 tokens (was 18,000)
- Large maps (20k cells): 4,000 tokens (was 50,000)

**Remaining Budget for AI:**
- ~60k tokens for prompts, instructions, and responses
- Enables much richer AI interactions
- Supports larger maps without hitting limits

---

## Example End-to-End Workflow

### 1. User Opens AI World Builder
```javascript
const mapContext = ContextCompressor.compressMapContext({
  maxBurgs: 50,
  maxRivers: 20,
  maxMarkers: 30
});

const compressedText = ContextCompressor.formatForAI(mapContext);
// Result: 2,500 tokens
```

### 2. Send to AI
```javascript
const prompt = `${WORLD_BUILDER_SYSTEM_PROMPT}

${compressedText}

USER CONCEPT: Post-apocalyptic recovery, fractured empire

Respond with compressed format changes.`;

// Total context: ~5,000 tokens (was 25,000)
```

### 3. AI Responds in Compressed Format
```
S1|name:Akeshia→BrokenCrown|form:Empire→Territories
S2|name:Silden→FreeCities|form:Kingdom→League
S1|diplomacy:2=R
+M50|ruins|@450,320
+M51|ruins|@520,410
+NOTE|Cataclysm|<p>100 years ago...</p>
```

### 4. Parse and Apply
```javascript
const changes = parseCompressedResponse(aiResponse);
// changes = [{operation: 'update', ...}, ...]

UpdateValidator.validate(changes);
MapUpdater.applyChanges(changes);
```

---

## Documentation for AI

Include in all prompts:

```
COMPRESSED MAP FORMAT GUIDE:

States: S{id}|{name}|{form}|C{capital}|CL{culture}|N{cells}|B{burgs}|A{area_k}|U{urban}|R{rural}|NB[{id}:{code},...]
  Example: S16|Hizuna|Union|C16|CL14|N204|B38|A20k|U357|R2176|NB[11:F,4:A]
  Codes: A=Ally, F=Friendly, N=Neutral, E=Enemy, R=Rival, S=Suspicion, V=Vassal, Z=Suzerain

Burgs: B{id}|{name}|S{state}|P{pop}|{type}|@{x},{y}|F:{flags}
  Example: B16|Kaki|S16|P56|Naval|@643,232|F:CPW1
  Flags: C=Capital, P=Port, W=Walls, 1=Citadel, 2=Plaza, 3=Temple, 4=Shanty

Features: G{id}|{type}|N{cells}|A{area_k}|{group}
  Example: G4|island|N2390|A265k|continent

Rivers: R{id}|{name}|{source}>{mouth}|L{length}|D{discharge}|N{cells}
  Example: R1|Silverflow|1234>5678|L234|D100|N89

Markers: M{id}|{type}|@{x},{y}
  Example: M1|volcano|@450,320

TO MAKE CHANGES, respond in same compressed format with modifications.
```

---

## Conclusion

This compression strategy achieves:
- **58-86% reduction** in total context size
- **Enables larger maps** without hitting token limits
- **Faster AI responses** (less data to process)
- **More budget** for AI reasoning and rich responses
- **Lossless compression** for essential data
- **AI-parseable format** (simple, consistent structure)

The compressed format is human-readable enough for debugging while being maximally token-efficient for AI processing.
