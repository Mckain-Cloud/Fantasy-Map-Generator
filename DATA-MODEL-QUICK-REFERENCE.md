# Fantasy Map Generator - Data Model Quick Reference

**Version:** 1.0
**Date:** 2025-11-28
**Purpose:** Understand the codebase data structures in 5 minutes

---

## What This Project Is

Azgaar's Fantasy Map Generator is a **pure client-side JavaScript application** that procedurally generates detailed fantasy world maps with geography, civilizations, and cultures.

**Key Facts:**
- No backend, no build process, no npm
- Pure vanilla JavaScript (ES6+)
- Runs in browser via HTTP server
- D3.js for SVG rendering, jQuery for UI
- All data stored in global JavaScript objects

---

## Core Architecture

### Two-Layer Graph System

**Layer 1: Grid (Terrain)**
```javascript
grid = {
  cellsX: 148,              // Grid width
  cellsY: 84,               // Grid height
  spacing: 10,              // Cell spacing
  points: [[x,y], ...],     // Cell centers
  cells: {
    h: Uint8Array,          // Heights (0-100, 20=sea level)
    t: Int8Array,           // Distance to coast
    temp: Int8Array,        // Temperature
    prec: Uint8Array        // Precipitation
  }
}
```
- **Purpose:** Heightmap, climate data
- **Cell Count:** ~10,000 (configurable)
- **Used For:** Initial terrain generation

**Layer 2: Pack (Gameplay)**
```javascript
pack = {
  cells: {...},             // Voronoi cells (optimized)
  burgs: [...],             // Cities/towns
  states: [...],            // Nations/kingdoms
  provinces: [...],         // Administrative regions
  cultures: [...],          // Cultural groups
  religions: [...],         // Belief systems
  rivers: [...],            // River networks
  routes: [...],            // Roads/trade routes
  markers: [...],           // Points of interest
  features: [...]           // Geographic features
}
```
- **Purpose:** Political/cultural/gameplay data
- **Cell Count:** ~6,500 (repackaged from grid)
- **Used For:** Everything the user sees/edits

---

## Critical Data Structures

### Pack Cells (Voronoi Polygons)

**Most Important Object** - Everything references these cells.

```javascript
pack.cells = {
  i: [0, 1, 2, ...],                    // Cell indices
  v: [[], [], ...],                     // Vertex IDs forming boundary
  c: [[], [], ...],                     // Neighbor cell IDs
  p: [[x,y], [x,y], ...],               // Center points

  // Geography
  h: Uint8Array,                        // Height (20 = sea level)
  area: Uint16Array,                    // Cell area
  biome: Uint8Array,                    // Biome ID

  // Political
  state: Uint16Array,                   // Owning state ID
  province: Uint16Array,                // Province ID
  culture: Uint16Array,                 // Culture ID
  religion: Uint16Array,                // Religion ID

  // Infrastructure
  burg: Uint16Array,                    // Settlement ID (0 if none)
  routes: [{}, {}, ...],                // Route connections
  r: Uint16Array,                       // River ID

  // Population
  pop: Float32Array,                    // Population
  s: Uint8Array                         // Population score (suitability)
}
```

**Key Insight:** Cells are the **spatial index**. Everything has a cell reference.

---

### States (Nations/Kingdoms)

```javascript
pack.states[16] = {
  i: 16,                                // State ID
  name: "Hizuna",
  fullName: "Hizunan Union",
  form: "Union",                        // Government type
  color: "#ffcf51",

  // References
  capital: 16,                          // Capital burg ID
  center: 1248,                         // Center cell ID
  culture: 14,                          // Primary culture ID

  // Statistics
  cells: 204,                           // Cell count
  burgs: 38,                            // Settlement count
  area: 20175,                          // Total area
  urban: 357.474,                       // Urban population
  rural: 2176.02,                       // Rural population

  // Relations
  neighbors: [11, 4],                   // Adjacent state IDs
  diplomacy: ["x", "Friendly", "Ally"], // Indexed by state ID

  // Administrative
  provinces: [101, 102, 103, ...],      // Province IDs

  // Military
  military: [{
    i: 0,                               // Regiment ID
    a: 1304,                            // Total strength
    cell: 1248,                         // Current cell
    x: 646.6, y: 236.9,                 // Coordinates
    u: {                                // Unit composition
      archers: 355,
      cavalry: 333,
      infantry: 607
    },
    name: "1st Legion",
    state: 16,
    icon: "⚔️"
  }],

  // Coat of Arms
  coa: {...}
}
```

**Key Relationships:**
- `state.capital` → `pack.burgs[16]`
- `state.center` → `pack.cells.p[1248]`
- `state.culture` → `pack.cultures[14]`
- `state.diplomacy[11]` → Relation with state 11

---

### Burgs (Settlements)

```javascript
pack.burgs[16] = {
  i: 16,                                // Burg ID
  name: "Kaki",

  // Location
  cell: 1248,                           // Cell ID
  x: 642.71, y: 231.77,                 // Exact coordinates

  // Political
  state: 16,                            // Owning state
  culture: 14,                          // Culture
  capital: 1,                           // Is capital (0 or 1)

  // Geography
  feature: 4,                           // Feature ID (island/continent)
  port: 1,                              // Is port (0 or 1)

  // Statistics
  population: 55.741,                   // Population
  type: "Naval",                        // Burg type

  // Buildings
  citadel: 1,                           // Has citadel
  plaza: 1,                             // Has plaza
  walls: 1,                             // Has walls
  temple: 1,                            // Has temple
  shanty: 0,                            // Has shanty district

  // Coat of Arms
  coa: {...}
}
```

**Key Relationships:**
- `burg.cell` → `pack.cells.p[1248]`
- `burg.state` → `pack.states[16]`
- Reverse lookup: `pack.cells.burg[1248]` → `16`

---

### Features (Geographic)

```javascript
pack.features[4] = {
  i: 4,
  type: "island",                       // island, lake, ocean
  land: true,                           // Is land
  border: false,                        // Is on border

  cells: 2390,                          // Number of cells
  firstCell: 81,                        // First cell ID
  vertices: [8778, 8877, ...],          // Boundary vertices
  area: 265359,                         // Total area

  group: "continent",                   // Feature grouping
  name: "Main Continent"                // Optional name
}
```

---

### Rivers

```javascript
pack.rivers[1] = {
  i: 1,
  name: "Silverflow",
  type: "River",

  // Flow
  source: 1234,                         // Source cell
  mouth: 5678,                          // Mouth cell
  parent: 0,                            // Parent river ID (0 if main)

  // Path
  cells: [1234, 1235, ..., 5678],       // Cell path from source to mouth

  // Properties
  discharge: 100,                       // Water volume
  length: 234,                          // River length
  width: 1.2,                           // Display width
  basin: 1                              // Drainage basin ID
}
```

**Key Insight:** River.cells array defines complete path.

---

### Routes (Roads/Trails)

```javascript
pack.routes[11] = {
  i: 11,
  group: "roads",                       // roads, trails, sea routes
  feature: 4,                           // Feature ID (which landmass)

  // Path (waypoints with cell references)
  points: [
    [546.28, 303.24, 2134],             // [x, y, cellId]
    [553.5, 302.1, 2020],
    [642.71, 231.77, 1248]
  ]
}
```

---

### Markers (Points of Interest)

```javascript
pack.markers[0] = {
  i: 0,
  icon: "🌋",
  type: "volcanoes",                    // 34 types available

  // Location
  cell: 1234,
  x: 123.45, y: 456.78,

  lock: false                           // User locked position
}
```

**Available Types:** volcanoes, ruins, dungeons, temples, caves, monsters, dragons, portals, sacred forests, etc.

---

### Cultures

```javascript
pack.cultures[14] = {
  i: 14,
  name: "Shwazen",
  type: "Generic",                      // Generic, River, Lake, Naval, Nomadic, etc.

  // Origin
  base: 1,                              // Name base ID (for generation)
  origins: [0],                         // Origin cell IDs
  center: 1234,                         // Cultural center cell

  // Properties
  color: "#6e8faf",
  shield: "heater",                     // Shield shape for COA
  expansionism: 1.2,                    // Expansion rate
  code: "Sw"                            // 2-letter abbreviation
}
```

---

### Religions

```javascript
pack.religions[1] = {
  i: 1,
  name: "Moonlight",
  type: "Folk",                         // Folk, Organized, Cult, Heresy
  form: "Animism",                      // Religious form

  culture: 1,                           // Origin culture
  center: 1234,                         // Origin cell

  color: "#b36200",
  code: "Ml",                           // 2-letter code

  expansion: "culture",                 // Expansion method
  expansionism: 1                       // Expansion rate
}
```

---

### Provinces

```javascript
pack.provinces[101] = {
  i: 101,
  name: "Kaki",
  fullName: "Kaki Province",
  formName: "Province",

  state: 16,                            // Parent state
  center: 1248,                         // Center cell
  burg: 16,                             // Provincial capital

  color: "neutral",
  coa: {...}                            // Coat of arms
}
```

---

### Notes (User Annotations)

```javascript
notes = [{
  id: "note123",
  name: "The Great War",
  legend: "<p>HTML content with <strong>formatting</strong></p>"
}]
```

---

## Critical Relationships

### Entity Reference Map

```
State ──┬→ Burgs (capital)
        ├→ Cell (center)
        ├→ Culture (primary)
        ├→ Provinces (administrative)
        ├→ Military Units
        └→ Other States (diplomacy)

Burg ───┬→ Cell (location)
        ├→ State (owner)
        ├→ Culture
        └→ Feature (landmass)

Cell ───┬→ State (owner)
        ├→ Burg (settlement, if any)
        ├→ Province
        ├→ Culture
        ├→ Religion
        ├→ River (if on river)
        ├→ Routes (connections)
        └→ Neighbors (adjacent cells)

River ──→ Cells (path)

Route ──→ Cells (via points)

Marker ─→ Cell (location)

Province┬→ State (parent)
        ├→ Cell (center)
        └→ Burg (capital)
```

### Reverse Lookups

```javascript
// Find state by ID
pack.states[16]

// Find all burgs in a state
pack.burgs.filter(b => b.state === 16)

// Find burg in a cell
const burgId = pack.cells.burg[1248];
const burg = pack.burgs[burgId];

// Find state owning a cell
const stateId = pack.cells.state[1248];
const state = pack.states[stateId];

// Find neighbors of a state
const neighborIds = pack.states[16].neighbors;
const neighbors = neighborIds.map(id => pack.states[id]);
```

---

## Data Access Patterns

### Global Variables (Always Available)

```javascript
pack        // Main gameplay data
grid        // Terrain/heightmap data
notes       // User annotations
biomesData  // Biome definitions
nameBases   // Name generation data
options     // World configuration
seed        // Map seed
```

### Common Operations

```javascript
// Get all states
const states = pack.states.filter(s => s.i && !s.removed);

// Get all burgs in a state
const stateBurgs = pack.burgs.filter(b => b.state === 16 && !b.removed);

// Find burg by name
const burg = pack.burgs.find(b => b.name === "Kaki");

// Get cell at coordinates
const cell = findCell(x, y);

// Get neighbors of a cell
const neighbors = pack.cells.c[1248].map(id => pack.cells[id]);

// Get all land cells
const landCells = pack.cells.i.filter(i => pack.cells.h[i] >= 20);
```

---

## File Structure

```
Fantasy-Map-Generator/
├── index.html              # UI + entry point (14,000 lines)
├── main.js                 # Core generation logic
├── modules/
│   ├── ui/                 # Editors (states, burgs, cultures, etc.)
│   ├── renderers/          # SVG drawing (draw-states.js, etc.)
│   ├── generators/         # Procedural generation
│   │   ├── cultures-generator.js
│   │   ├── burgs-and-states.js
│   │   ├── religions-generator.js
│   │   ├── markers-generator.js
│   │   └── military-generator.js
│   └── io/                 # Save/load/export
├── utils/                  # Utilities
└── libs/                   # D3.js, jQuery, etc.
```

---

## Generation Pipeline

```
1. generateGrid()           → Create voronoi grid
2. HeightmapGenerator       → Define terrain heights
3. Features.markupGrid()    → Detect landmasses/oceans
4. calculateTemperatures()  → Climate layer
5. generatePrecipitation()  → Weather patterns
6. reGraph()                → Create pack (optimized grid)
7. Rivers.generate()        → River networks
8. Biomes.define()          → Assign biomes
9. Cultures.generate()      → Cultural regions
10. BurgsAndStates.generate() → Cities and nations
11. Routes.generate()       → Roads and trade routes
12. Religions.generate()    → Belief systems
13. Provinces.generate()    → Administrative divisions
14. Military.generate()     → Army units
15. Markers.generate()      → Points of interest
```

---

## Data Persistence

### Save Format

Maps are saved as `.map` files containing:
```
VERSION|PARAMETERS
MAP_DATA (JSON serialized)
SVG_DATA (serialized)
```

Compressed with JSZip, typically 2-6MB.

### Load Process

```javascript
1. Parse .map file
2. Decompress JSON
3. Restore pack, grid, notes globals
4. Redraw SVG layers
```

---

## Key Insights for AI Integration

1. **Everything is Spatial**
   - All entities reference cells (Voronoi polygons)
   - Cells are the spatial index

2. **Referential Integrity is Critical**
   - State → Burgs (via ID)
   - Burg → State (via ID)
   - Cell → State (via array index)
   - Breaking these references corrupts the map

3. **No ORM, No Database**
   - Pure JavaScript objects and arrays
   - Typed arrays for performance (Uint8Array, etc.)
   - Direct mutation (no transactions)

4. **Global State is the Truth**
   - `pack` and `grid` are authoritative
   - UI reads from these objects
   - Edits mutate directly

5. **IDs are Array Indices**
   - `pack.states[16]` - State ID 16
   - `pack.burgs[16]` - Burg ID 16
   - Removed items marked with `removed: true`, not deleted

---

## Quick Start for AI

To understand a map:
1. Read `pack.states` - Get all nations
2. Read `pack.burgs` - Get all cities
3. Read `pack.features` - Get geography
4. Cross-reference via IDs

To modify a map:
1. Load full context (all entities)
2. Generate changes with entity IDs
3. Validate referential integrity
4. Apply changes to `pack.*` objects
5. Call redraw functions (`drawStates()`, etc.)

---

## Common Pitfalls

❌ **Don't:** Splice/delete array elements (breaks IDs)
✅ **Do:** Set `removed: true` instead

❌ **Don't:** Change IDs after creation
✅ **Do:** Use existing IDs, create new ones sequentially

❌ **Don't:** Create orphaned references
✅ **Do:** Always validate state/burg/culture IDs exist

❌ **Don't:** Forget reciprocal relations (diplomacy)
✅ **Do:** Update both directions (A→B and B→A)

❌ **Don't:** Mutate without redrawing
✅ **Do:** Call `drawStates()`, `drawBurgs()`, etc. after changes

---

## Summary

**In One Sentence:**
Fantasy Map Generator stores a procedurally-generated fantasy world as JavaScript objects with Voronoi cells as the spatial index, states/burgs as the political layer, and cultures/religions as the social layer.

**Data Flow:**
```
Grid (terrain) → Pack (gameplay) → User Edits → Pack Mutation → SVG Redraw
```

**For AI Integration:**
- Compress full context to ~2-4k tokens
- AI works with complete state, not fragments
- Return structured JSON with entity IDs
- Validate before applying
- Redraw affected layers

---

**This is all you need to start working with the codebase data model!**
