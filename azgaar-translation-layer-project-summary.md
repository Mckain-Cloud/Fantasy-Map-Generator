# Azgaar's Fantasy Map Generator - LLM Translation Layer

## Project Summary

A translation layer enabling natural language interaction with Azgaar's Fantasy Map Generator maps. Users can describe narrative events ("The siege succeeded, Fort Emberwatch fell to the undead") and have the map automatically updated, rather than manually editing through the UI.

---

## Table of Contents

1. [Map Format Analysis](#map-format-analysis)
2. [Token Budget Analysis](#token-budget-analysis)
3. [Entity Types Reference](#entity-types-reference)
4. [Architecture Design](#architecture-design)
5. [Integration with Azgaar's Codebase](#integration-with-azgaars-codebase)
6. [Implementation Plan](#implementation-plan)
7. [Library Stack](#library-stack)
8. [Key Code Examples](#key-code-examples)

---

## Map Format Analysis

### Overview

Azgaar's exports maps as JSON files (~2-6MB) containing:
- **Grid Layer**: Heightmap, temperature, precipitation data (~46% of file)
- **Pack Layer**: Voronoi cells for gameplay, political entities (~52% of file)
- **Metadata**: Settings, coordinates, name generation bases (~2% of file)

### Spatial System

The map uses a **Voronoi diagram** structure:
- Each cell is a polygon with a center point `p: [x, y]`
- Cells reference neighbors via `c: [cell_ids]`
- Cells reference boundary vertices via `v: [vertex_ids]`
- Vertices store coordinates and connectivity

```
Map Dimensions: 1481 x 836 (example: Savia)
Scale: 4 miles per unit (configurable)
Total Cells: ~6,500 (varies by map)
Total Vertices: ~13,300 (varies by map)
```

### Key Data Relationships

```
CELL ←→ STATE (cell.state references state.i)
CELL ←→ BURG (cell.burg references burg.i, burg.cell references cell.i)
CELL ←→ PROVINCE (cell.province references province.i)
STATE ←→ PROVINCE (province.state references state.i)
STATE ←→ MILITARY (state.military contains unit array)
ROUTE ←→ CELL (route.points contains [x, y, cell_id] waypoints)
RIVER ←→ CELL (river.cells contains cell_id path)
FEATURE ←→ CELL (cell.f references feature.i)
```

---

## Token Budget Analysis

### Full Map Breakdown (~1.8M tokens total)

| Section | Tokens | % of Total | Notes |
|---------|--------|------------|-------|
| **Grid Layer** | 852,700 | 46.3% | Terrain data, rarely changes |
| Grid cells (heightmap) | 391,074 | 21.2% | |
| Grid vertices | 411,238 | 22.3% | |
| **Pack Layer** | 959,277 | 52.1% | Gameplay data |
| Pack cells (Voronoi) | 569,771 | 30.9% | Geometry, rarely changes |
| Pack vertices | 267,218 | 14.5% | Geometry, rarely changes |
| **Settlements/Burgs** | 55,752 | 3.0% | Changes during RP |
| **Routes/Roads** | 23,368 | 1.3% | Changes during RP |
| **Provinces** | 13,682 | 0.7% | Changes during RP |
| **Rivers** | 11,193 | 0.6% | Rarely changes |
| **States** | 8,688 | 0.5% | Changes during RP |
| **Culture Names** | 20,893 | 1.1% | Reference data |
| **Notes** | 8,459 | 0.5% | User annotations |

### Key Insight

**Only ~170k tokens (9%) is gameplay data that changes during RP:**
- Settlements, routes, states, provinces, military units, markers, notes

**Strategy:** Load gameplay layer + strategic summary (~45-65k tokens) for LLM context, keep geometry on disk.

### Optimized Context Budget

```
Strategic Summary:           ~15,000 tokens
  - State names/capitals
  - Major settlements only
  - Main routes
  - Current military positions

Relevant Detail (per query):  ~30,000 tokens
  - Specific region's cells
  - Local settlements
  - Nearby routes

Response Space:              ~20,000 tokens

Total Context Used:          ~65,000 tokens (33% of 200k)
```

---

## Entity Types Reference

### 1. Pack Cell (Voronoi Polygon)

```json
{
  "i": 1248,
  "v": [2760, 2865, 2974, 2798],
  "c": [1383, 1382, 1246, 1247],
  "p": [646.6, 236.9],
  "g": 2718,
  "h": 20,
  "area": 82,
  "f": 4,
  "t": 1,
  "haven": 1246,
  "harbor": 1,
  "fl": 10,
  "r": 0,
  "conf": 0,
  "biome": 6,
  "s": 26,
  "pop": 14.24,
  "culture": 14,
  "burg": 16,
  "routes": {"1246": 377, "1247": 273},
  "state": 16,
  "religion": 17,
  "province": 101
}
```

| Field | Description |
|-------|-------------|
| `i` | Cell index/ID |
| `v` | Vertex IDs forming boundary |
| `c` | Neighboring cell IDs |
| `p` | Center position [x, y] |
| `g` | Grid cell reference |
| `h` | Height/elevation (20 = sea level) |
| `f` | Feature ID |
| `biome` | Biome type |
| `state` | Controlling state ID |
| `burg` | Settlement ID (0 if none) |
| `province` | Province ID |

### 2. Burg (Settlement)

```json
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

### 3. State (Kingdom/Nation)

```json
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
  "military": [
    {
      "i": 0,
      "a": 1304,
      "cell": 1248,
      "x": 646.6,
      "y": 236.9,
      "u": {"archers": 355, "cavalry": 333, "infantry": 607},
      "name": "1st (Kaki) Regiment",
      "state": 16,
      "icon": "⚔️"
    }
  ],
  "campaigns": [
    {"name": "Akeshian Invasion", "start": 624, "end": 628}
  ]
}
```

### 4. Route (Road/Trade Route)

```json
{
  "i": 11,
  "group": "roads",
  "feature": 4,
  "points": [
    [546.28, 303.24, 2134],
    [553.5, 302.1, 2020],
    [642.71, 231.77, 1248]
  ]
}
```

Points format: `[x, y, cell_id]`

### 5. Feature (Geographic)

```json
{
  "i": 4,
  "type": "island",
  "land": true,
  "border": false,
  "cells": 2390,
  "firstCell": 81,
  "vertices": [8778, 8877, ...],
  "area": 265359,
  "group": "continent"
}
```

### 6. Military Unit

```json
{
  "i": 0,
  "a": 1304,
  "cell": 1248,
  "x": 646.6,
  "y": 236.9,
  "bx": 646.6,
  "by": 236.9,
  "u": {
    "archers": 355,
    "cavalry": 333,
    "artillery": 9,
    "infantry": 607
  },
  "n": 0,
  "name": "1st (Kaki) Regiment",
  "state": 16,
  "icon": "⚔️"
}
```

| Field | Description |
|-------|-------------|
| `a` | Total army strength |
| `cell` | Current location cell |
| `x, y` | Current coordinates |
| `bx, by` | Base/home coordinates |
| `u` | Unit composition |

### Other Entities

- **Province**: Regional subdivision with `state`, `center`, `burg` (capital)
- **Religion**: Belief system with `deity`, `expansion`, `center`
- **Culture**: Cultural group with `name`, `base` (naming), `shield` (heraldry)
- **River**: Water feature with `source`, `mouth`, `cells` (path)
- **Marker**: Point of interest with `icon`, `type`, `x`, `y`, `cell`
- **Note**: Annotation with `id`, `name`, `legend` (HTML content)

---

## Architecture Design

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER NARRATIVE INPUT                        │
│        "The 1st Hizuna Legion marches to Fort Emberwatch"       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PYTHON LLM PARSER                            │
│  • Uses Claude API to parse narrative                           │
│  • Extracts intent, entities, parameters                        │
│  • Resolves names to IDs (Hizuna → state 16)                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STRUCTURED COMMAND                            │
│  {                                                              │
│    "operation": "moveArmy",                                     │
│    "params": {                                                  │
│      "regimentId": 0,                                           │
│      "stateId": 16,                                             │
│      "targetX": 650.0,                                          │
│      "targetY": 240.0                                           │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PYTHON BRIDGE                                │
│  • Validates command                                            │
│  • Calls Azgaar's via Node.js                                   │
│  • Handles response/errors                                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               AZGAAR'S MAP OPERATIONS (JavaScript)              │
│  • MapOperations.moveArmy()                                     │
│  • Uses EXISTING functions: moveRegiment(), drawBorders()       │
│  • Updates pack.states[16].military[0]                          │
│  • Triggers re-render                                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UPDATED MAP                                  │
│  • Army position changed                                        │
│  • Visual updated in browser                                    │
│  • JSON export available                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Operation Categories

#### Trivial (Field Updates Only)
- Rename entities
- Update populations
- Change diplomatic relations
- Modify military unit composition
- Add/edit notes and markers

#### Easy (Using Existing Functions)
- Move armies (`moveRegiment` exists)
- Capture territory (update `cell.state`)
- Add settlements to existing cells
- Update state statistics

#### Medium (Some New Code)
- Create routes (pathfinding exists, need wrapper)
- Split/merge provinces
- Transfer settlements between states

#### Complex (Requires Geometry)
- Add islands/landmasses
- Modify coastlines
- Create new terrain features

---

## Integration with Azgaar's Codebase

### Repository Structure

```
Fantasy-Map-Generator/
├── index.html              # Entry point
├── main.js                 # Core application
├── versioning.js           # Version management
├── modules/
│   ├── ui/                 # UI components, editors
│   ├── dynamic/            # Runtime modules (export, etc.)
│   └── renderers/          # Drawing functions
│       ├── draw-military.js    # Military rendering
│       ├── draw-features.js    # Geographic features
│       └── ...
├── utils/                  # Utility libraries
├── libs/                   # Third-party (D3.js, etc.)
└── styles/                 # Visual presets
```

### Key Global Objects

```javascript
// Main data containers (accessible globally)
pack.cells      // Voronoi cells array
pack.vertices   // Vertex points
pack.burgs      // Settlements
pack.states     // Political entities
pack.provinces  // Regional divisions
pack.features   // Geographic features
pack.rivers     // River systems
pack.routes     // Roads/trade routes
pack.markers    // Map markers
pack.religions  // Belief systems
pack.cultures   // Cultural groups

grid.cells      // Heightmap layer
```

### Existing Functions to Leverage

From `modules/renderers/draw-military.js`:
```javascript
moveRegiment(regiment, x, y)    // Animated army movement
drawRegiment(regiment, stateId) // Render regiment icon
```

From `modules/renderers/draw-features.js`:
```javascript
getFeaturePath(feature)         // Generate SVG path
```

General utilities:
```javascript
findCell(x, y)                  // Get cell at coordinates
getPackPolygon(cellId)          // Get cell polygon
drawBorders()                   // Redraw political borders
drawStateLabels([stateIds])     // Update state labels
drawBurgIcons()                 // Redraw settlement icons
drawBurgLabels()                // Update settlement labels
```

### Proposed API Module

Create `modules/api/map-operations.js`:

```javascript
"use strict";

const MapOperations = {
  
  // ═══════════════════════════════════════════════════════════════
  // TERRITORY OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  
  captureTerritory(cellIds, newStateId) {
    const {cells, states} = pack;
    
    cellIds.forEach(cellId => {
      const oldStateId = cells.state[cellId];
      
      // Update cell ownership
      cells.state[cellId] = newStateId;
      
      // Update old state statistics
      if (oldStateId > 0) {
        states[oldStateId].cells--;
        states[oldStateId].area -= cells.area[cellId];
        states[oldStateId].rural -= cells.pop[cellId];
      }
      
      // Update new state statistics
      states[newStateId].cells++;
      states[newStateId].area += cells.area[cellId];
      states[newStateId].rural += cells.pop[cellId];
    });
    
    // Redraw affected areas
    drawBorders();
    drawStateLabels([newStateId]);
    
    return {success: true, cells: cellIds, newState: newStateId};
  },
  
  // ═══════════════════════════════════════════════════════════════
  // MILITARY OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  
  moveArmy(regimentId, stateId, targetX, targetY) {
    const state = pack.states[stateId];
    if (!state) return {error: "State not found"};
    
    const regiment = state.military?.find(r => r.i === regimentId);
    if (!regiment) return {error: "Regiment not found"};
    
    const targetCell = findCell(targetX, targetY);
    regiment.cell = targetCell;
    regiment.x = targetX;
    regiment.y = targetY;
    
    // Use existing animation function
    moveRegiment(regiment, targetX, targetY);
    
    return {success: true, regiment: regimentId, cell: targetCell};
  },
  
  createArmy(stateId, cellId, name, composition) {
    const state = pack.states[stateId];
    if (!state.military) state.military = [];
    
    const cell = pack.cells[cellId];
    const regiment = {
      i: state.military.length,
      a: Object.values(composition).reduce((a, b) => a + b, 0),
      cell: cellId,
      x: cell.p[0],
      y: cell.p[1],
      bx: cell.p[0],
      by: cell.p[1],
      u: composition,
      n: state.military.length,
      name: name,
      state: stateId,
      icon: "⚔️"
    };
    
    state.military.push(regiment);
    drawRegiment(regiment, stateId);
    
    return {success: true, regiment: regiment};
  },
  
  // ═══════════════════════════════════════════════════════════════
  // SETTLEMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  
  addSettlement(cellId, name, options = {}) {
    const {cells, burgs, states} = pack;
    
    // Validate cell
    if (cells.burg[cellId]) {
      return {error: "Cell already has a settlement"};
    }
    
    const stateId = cells.state[cellId];
    const newBurg = {
      i: burgs.length,
      cell: cellId,
      x: cells.p[cellId][0],
      y: cells.p[cellId][1],
      state: stateId,
      culture: cells.culture[cellId],
      name: name,
      feature: cells.f[cellId],
      capital: options.capital || 0,
      port: cells.harbor[cellId] ? 1 : 0,
      population: options.population || 1.5,
      type: options.type || "Town",
      citadel: options.citadel || 0,
      walls: options.walls || 0,
      temple: options.temple || 0
    };
    
    burgs.push(newBurg);
    cells.burg[cellId] = newBurg.i;
    
    // Update state
    if (stateId > 0) {
      states[stateId].burgs++;
      states[stateId].urban += newBurg.population;
    }
    
    // Redraw
    drawBurgIcons();
    drawBurgLabels();
    
    return {success: true, burg: newBurg};
  },
  
  removeSettlement(burgId) {
    const burg = pack.burgs[burgId];
    if (!burg) return {error: "Settlement not found"};
    
    const stateId = burg.state;
    
    // Clear cell reference
    pack.cells.burg[burg.cell] = 0;
    
    // Update state
    if (stateId > 0) {
      pack.states[stateId].burgs--;
      pack.states[stateId].urban -= burg.population;
    }
    
    // Mark as removed (don't splice to preserve indices)
    burg.removed = true;
    
    drawBurgIcons();
    drawBurgLabels();
    
    return {success: true, removed: burgId};
  },
  
  // ═══════════════════════════════════════════════════════════════
  // ENTITY NAMING
  // ═══════════════════════════════════════════════════════════════
  
  rename(entityType, entityId, newName) {
    switch(entityType) {
      case 'state':
        pack.states[entityId].name = newName;
        pack.states[entityId].fullName = `${newName} ${pack.states[entityId].formName || ''}`.trim();
        drawStateLabels([entityId]);
        break;
      case 'burg':
        pack.burgs[entityId].name = newName;
        drawBurgLabels();
        break;
      case 'province':
        pack.provinces[entityId].name = newName;
        pack.provinces[entityId].fullName = `${newName} ${pack.provinces[entityId].formName || ''}`.trim();
        break;
      case 'river':
        pack.rivers[entityId].name = newName;
        break;
      default:
        return {error: `Unknown entity type: ${entityType}`};
    }
    
    return {success: true, type: entityType, id: entityId, name: newName};
  },
  
  // ═══════════════════════════════════════════════════════════════
  // DIPLOMACY
  // ═══════════════════════════════════════════════════════════════
  
  setDiplomacy(state1Id, state2Id, relation) {
    const validRelations = ["Ally", "Friendly", "Neutral", "Suspicion", "Enemy", "Rival", "Vassal", "Suzerain", "Unknown"];
    if (!validRelations.includes(relation)) {
      return {error: `Invalid relation. Valid: ${validRelations.join(", ")}`};
    }
    
    pack.states[state1Id].diplomacy[state2Id] = relation;
    
    // Set reciprocal relation
    const reciprocal = {
      "Ally": "Ally",
      "Friendly": "Friendly", 
      "Neutral": "Neutral",
      "Suspicion": "Suspicion",
      "Enemy": "Enemy",
      "Rival": "Rival",
      "Vassal": "Suzerain",
      "Suzerain": "Vassal",
      "Unknown": "Unknown"
    };
    pack.states[state2Id].diplomacy[state1Id] = reciprocal[relation];
    
    return {success: true, state1: state1Id, state2: state2Id, relation};
  },
  
  // ═══════════════════════════════════════════════════════════════
  // QUERY OPERATIONS (for LLM context)
  // ═══════════════════════════════════════════════════════════════
  
  findCellsNear(x, y, count) {
    const centerCell = findCell(x, y);
    const result = [];
    const queue = [centerCell];
    const visited = new Set();
    
    while (queue.length > 0 && result.length < count) {
      const cellId = queue.shift();
      if (visited.has(cellId)) continue;
      
      visited.add(cellId);
      result.push(cellId);
      
      pack.cells.c[cellId].forEach(neighbor => {
        if (!visited.has(neighbor)) queue.push(neighbor);
      });
    }
    
    return result;
  },
  
  findBurgByName(name) {
    const burg = pack.burgs.find(b => 
      b.name && b.name.toLowerCase() === name.toLowerCase()
    );
    return burg || {error: "Settlement not found"};
  },
  
  findStateByName(name) {
    const state = pack.states.find(s => 
      s.name && s.name.toLowerCase() === name.toLowerCase()
    );
    return state || {error: "State not found"};
  },
  
  getRouteThrough(startBurgId, endBurgId) {
    const startBurg = pack.burgs[startBurgId];
    const endBurg = pack.burgs[endBurgId];
    
    if (!startBurg || !endBurg) return {error: "Invalid burg IDs"};
    
    // Find routes containing both cells
    const startCell = startBurg.cell;
    const endCell = endBurg.cell;
    
    for (const route of pack.routes) {
      if (route.group !== 'roads') continue;
      
      const cells = route.points.map(p => p[2]);
      const startIdx = cells.indexOf(startCell);
      const endIdx = cells.indexOf(endCell);
      
      if (startIdx !== -1 && endIdx !== -1) {
        // Extract path segment
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const segment = route.points.slice(from, to + 1);
        
        // Find burgs along route
        const burgsOnRoute = segment
          .map(p => pack.cells.burg[p[2]])
          .filter(b => b > 0)
          .map(b => pack.burgs[b]);
        
        return {
          success: true,
          routeId: route.i,
          segment: segment,
          burgs: burgsOnRoute
        };
      }
    }
    
    return {error: "No direct route found"};
  },
  
  getMapState() {
    return {
      states: pack.states
        .filter(s => s.i && !s.removed)
        .map(s => ({
          i: s.i,
          name: s.name,
          fullName: s.fullName,
          cells: s.cells,
          area: s.area,
          burgs: s.burgs,
          capital: s.capital,
          neighbors: s.neighbors,
          military: s.military?.length || 0
        })),
      burgs: pack.burgs
        .filter(b => b.i && !b.removed)
        .map(b => ({
          i: b.i,
          name: b.name,
          state: b.state,
          population: b.population,
          capital: b.capital,
          port: b.port
        })),
      military: pack.states.flatMap(s => 
        (s.military || []).map(r => ({
          state: s.i,
          stateName: s.name,
          id: r.i,
          name: r.name,
          cell: r.cell,
          position: [r.x, r.y],
          strength: r.a
        }))
      )
    };
  },
  
  // ═══════════════════════════════════════════════════════════════
  // NOTES & MARKERS
  // ═══════════════════════════════════════════════════════════════
  
  addNote(id, name, legend) {
    if (!notes) notes = [];
    notes.push({id, name, legend});
    return {success: true, note: {id, name, legend}};
  },
  
  addMarker(x, y, icon, type) {
    const cell = findCell(x, y);
    const marker = {
      i: pack.markers.length,
      icon: icon,
      type: type,
      x: x,
      y: y,
      cell: cell
    };
    pack.markers.push(marker);
    // Trigger marker redraw
    return {success: true, marker};
  }
};

// Export for module usage
if (typeof module !== 'undefined') {
  module.exports = MapOperations;
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Add API Module to Azgaar's
- [ ] Create `modules/api/map-operations.js`
- [ ] Register module in index.html
- [ ] Test basic operations in browser console

#### 1.2 Create Node.js Bridge Runner
- [ ] Create `api-runner.js` for CLI execution
- [ ] Handle command input (file or stdin)
- [ ] Output results as JSON

#### 1.3 Create Python Bridge
- [ ] Basic `AzgaarBridge` class
- [ ] Command execution via subprocess
- [ ] Result parsing and validation

### Phase 2: LLM Integration (Week 2)

#### 2.1 Narrative Parser
- [ ] Claude API integration
- [ ] Intent extraction prompts
- [ ] Entity resolution (names → IDs)

#### 2.2 Command Generation
- [ ] Map intents to operations
- [ ] Parameter extraction
- [ ] Validation layer

#### 2.3 Context Management
- [ ] Strategic map summary generation
- [ ] Relevant detail extraction
- [ ] Token budget management

### Phase 3: Operations Expansion (Week 3)

#### 3.1 Complex Operations
- [ ] Route pathfinding integration
- [ ] Island/terrain creation
- [ ] Province management

#### 3.2 Batch Operations
- [ ] Multi-step narrative processing
- [ ] Transaction-like operation groups
- [ ] Rollback capability

### Phase 4: Polish & Testing (Week 4)

#### 4.1 Validation
- [ ] JSON Schema validation
- [ ] Referential integrity checks
- [ ] Post-operation verification

#### 4.2 CLI Interface
- [ ] Click-based command interface
- [ ] Rich progress output
- [ ] Interactive mode

#### 4.3 Testing
- [ ] Unit tests for operations
- [ ] Integration tests with sample maps
- [ ] LLM parsing tests

---

## Library Stack

### Core Requirements

```txt
# requirements.txt

# Geometry & Spatial
shapely>=2.0.0
scipy>=1.11.0
networkx>=3.0
numpy>=1.24.0

# Data Validation  
pydantic>=2.0.0

# Performance
orjson>=3.9.0

# CLI
click>=8.1.0
rich>=13.0.0

# Logging
loguru>=0.7.0

# Testing
pytest>=7.4.0
pytest-cov>=4.1.0
```

### LLM Integration

```txt
# requirements-llm.txt

anthropic>=0.18.0
python-dotenv>=1.0.0
```

### Optional Visualization

```txt
# requirements-viz.txt

matplotlib>=3.7.0
pandas>=2.0.0
```

### Installation

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-llm.txt
```

---

## Key Code Examples

### Python Bridge

```python
# bridge.py
import json
import subprocess
from pathlib import Path
from typing import Any, Optional
from pydantic import BaseModel
from loguru import logger

class CommandResult(BaseModel):
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None

class AzgaarBridge:
    def __init__(self, azgaar_path: str):
        self.azgaar_path = Path(azgaar_path)
        self.map_file: Optional[Path] = None
        
    def load_map(self, map_file: str):
        """Load a map file for operations"""
        self.map_file = Path(map_file)
        logger.info(f"Loaded map: {self.map_file}")
        
    def call(self, operation: str, params: dict = None) -> CommandResult:
        """Execute an operation via Node.js bridge"""
        command = {
            'operation': operation,
            'params': params or {},
            'mapFile': str(self.map_file) if self.map_file else None
        }
        
        logger.debug(f"Executing: {operation} with {params}")
        
        result = subprocess.run(
            ['node', 'api-runner.js'],
            input=json.dumps(command),
            capture_output=True,
            text=True,
            cwd=self.azgaar_path
        )
        
        if result.returncode != 0:
            logger.error(f"Bridge error: {result.stderr}")
            return CommandResult(success=False, error=result.stderr)
        
        data = json.loads(result.stdout)
        return CommandResult(**data)
    
    # High-level operations
    def capture_territory(self, cell_ids: list[int], new_state_id: int) -> CommandResult:
        return self.call('captureTerritory', {
            'cellIds': cell_ids,
            'newStateId': new_state_id
        })
    
    def move_army(self, regiment_id: int, state_id: int, target_x: float, target_y: float) -> CommandResult:
        return self.call('moveArmy', {
            'regimentId': regiment_id,
            'stateId': state_id,
            'targetX': target_x,
            'targetY': target_y
        })
    
    def add_settlement(self, cell_id: int, name: str, **options) -> CommandResult:
        return self.call('addSettlement', {
            'cellId': cell_id,
            'name': name,
            'options': options
        })
    
    def rename(self, entity_type: str, entity_id: int, new_name: str) -> CommandResult:
        return self.call('rename', {
            'entityType': entity_type,
            'entityId': entity_id,
            'newName': new_name
        })
    
    def set_diplomacy(self, state1_id: int, state2_id: int, relation: str) -> CommandResult:
        return self.call('setDiplomacy', {
            'state1Id': state1_id,
            'state2Id': state2_id,
            'relation': relation
        })
    
    def find_burg_by_name(self, name: str) -> CommandResult:
        return self.call('findBurgByName', {'name': name})
    
    def find_state_by_name(self, name: str) -> CommandResult:
        return self.call('findStateByName', {'name': name})
    
    def get_map_state(self) -> CommandResult:
        return self.call('getMapState')
```

### LLM Narrative Parser

```python
# parser.py
import json
from anthropic import Anthropic
from pydantic import BaseModel
from typing import Optional, Any

class ParsedIntent(BaseModel):
    operation: str
    params: dict[str, Any]
    confidence: float
    reasoning: Optional[str] = None

class NarrativeParser:
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        
    def parse(self, text: str, map_context: dict = None) -> ParsedIntent:
        """Parse narrative text into structured command"""
        
        context_str = ""
        if map_context:
            context_str = f"""
Current map state:
- States: {', '.join(s['name'] for s in map_context.get('states', []))}
- Major settlements: {', '.join(b['name'] for b in map_context.get('burgs', []) if b.get('population', 0) > 10)}
- Military units: {', '.join(f"{m['name']} ({m['stateName']})" for m in map_context.get('military', []))}
"""
        
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Parse this map command into a structured operation.
{context_str}
Available operations:
- captureTerritory(cellIds: int[], newStateId: int)
- moveArmy(regimentId: int, stateId: int, targetX: float, targetY: float)
- addSettlement(cellId: int, name: str, options: object)
- removeSettlement(burgId: int)
- rename(entityType: str, entityId: int, newName: str)
- setDiplomacy(state1Id: int, state2Id: int, relation: str)
- addMarker(x: float, y: float, icon: str, type: str)
- addNote(id: str, name: str, legend: str)

Command: "{text}"

Respond with JSON only:
{{
  "operation": "operationName",
  "params": {{}},
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}"""
            }]
        )
        
        result = json.loads(response.content[0].text)
        return ParsedIntent(**result)
```

### CLI Interface

```python
# cli.py
import click
from rich.console import Console
from rich.table import Table
from rich.progress import track

from bridge import AzgaarBridge
from parser import NarrativeParser

console = Console()

@click.group()
@click.option('--map', '-m', required=True, help='Path to map JSON file')
@click.option('--azgaar', '-a', required=True, help='Path to Azgaar repository')
@click.pass_context
def cli(ctx, map, azgaar):
    """Azgaar's Map Translation Layer CLI"""
    ctx.ensure_object(dict)
    ctx.obj['bridge'] = AzgaarBridge(azgaar)
    ctx.obj['bridge'].load_map(map)

@cli.command()
@click.argument('text')
@click.pass_context
def do(ctx, text):
    """Execute a narrative command"""
    bridge = ctx.obj['bridge']
    parser = NarrativeParser(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    # Get current map state for context
    map_state = bridge.get_map_state().result
    
    # Parse narrative
    console.print(f"[dim]Parsing: {text}[/dim]")
    intent = parser.parse(text, map_state)
    
    console.print(f"[cyan]Operation:[/cyan] {intent.operation}")
    console.print(f"[cyan]Params:[/cyan] {intent.params}")
    console.print(f"[cyan]Confidence:[/cyan] {intent.confidence:.0%}")
    
    if intent.confidence < 0.7:
        if not click.confirm("Low confidence. Execute anyway?"):
            return
    
    # Execute
    result = bridge.call(intent.operation, intent.params)
    
    if result.success:
        console.print("[green]✓ Success[/green]")
        console.print_json(data=result.result)
    else:
        console.print(f"[red]✗ Error: {result.error}[/red]")

@cli.command()
@click.pass_context
def status(ctx):
    """Show current map status"""
    bridge = ctx.obj['bridge']
    state = bridge.get_map_state().result
    
    # States table
    table = Table(title="States")
    table.add_column("ID", style="dim")
    table.add_column("Name", style="cyan")
    table.add_column("Cells")
    table.add_column("Burgs")
    table.add_column("Military")
    
    for s in state['states']:
        table.add_row(
            str(s['i']),
            s['name'],
            str(s['cells']),
            str(s['burgs']),
            str(s['military'])
        )
    
    console.print(table)

@cli.command()
@click.argument('state_name')
@click.argument('cell_ids', nargs=-1, type=int)
@click.pass_context
def capture(ctx, state_name, cell_ids):
    """Capture territory for a state"""
    bridge = ctx.obj['bridge']
    
    state = bridge.find_state_by_name(state_name).result
    if 'error' in state:
        console.print(f"[red]State not found: {state_name}[/red]")
        return
    
    result = bridge.capture_territory(list(cell_ids), state['i'])
    
    if result.success:
        console.print(f"[green]✓ {len(cell_ids)} cells captured for {state_name}[/green]")
    else:
        console.print(f"[red]✗ {result.error}[/red]")

if __name__ == '__main__':
    cli()
```

---

## JSON Schema

A complete JSON Schema (Draft 2020-12) was generated and is available at:
- `azgaar-map-schema.json`

The schema documents all entity types, required fields, data types, and relationships.

---

## Files Generated

1. **azgaar-map-schema.json** - Complete JSON Schema for map format validation
2. **useful-libraries-guide.md** - Comprehensive Python library recommendations
3. **This document** - Project summary and implementation guide

---

## Next Steps

1. Clone/fork Azgaar's Fantasy Map Generator repository
2. Add `modules/api/map-operations.js` module
3. Create Node.js bridge runner (`api-runner.js`)
4. Set up Python project with recommended libraries
5. Implement `AzgaarBridge` class
6. Add Claude API integration for narrative parsing
7. Build CLI interface
8. Test with sample map operations
9. Iterate on LLM prompts for better intent extraction
10. Add complex operations (terrain modification, routes)

---

## References

- [Azgaar's Fantasy Map Generator](https://azgaar.github.io/Fantasy-Map-Generator/)
- [GitHub Repository](https://github.com/Azgaar/Fantasy-Map-Generator)
- [JSON Schema Specification](https://json-schema.org/draft/2020-12/schema)
- [Shapely Documentation](https://shapely.readthedocs.io/)
- [NetworkX Documentation](https://networkx.org/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
