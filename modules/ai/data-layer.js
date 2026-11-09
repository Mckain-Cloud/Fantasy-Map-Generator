"use strict";

/**
 * AI Data Layer - Encoding, decoding, and translation for AI integration
 *
 * This module handles:
 * - Encoding: Compress map data for AI context (~22k tokens → ~2-4k tokens)
 * - Decoding: Parse compressed strings back to map objects
 * - Validation: Ensure data integrity via validators.js
 * - CRUD: Create, update, remove operations with validation
 * - Batch: Apply multiple changes atomically with rollback support
 */

import {validateSchema, validateReferences, validateSemantics, validateChangeSet} from "./validators.js";

// ============================================================================
// Data Source Injection (for testing)
// ============================================================================

let dataSource = {
  getPack: () => (typeof window !== "undefined" ? window.pack : null),
  getGrid: () => (typeof window !== "undefined" ? window.grid : null),
  getNotes: () => (typeof window !== "undefined" ? window.notes : [])
};

function setDataSource(source) {
  dataSource = {...dataSource, ...source};
}

function resetDataSource() {
  dataSource = {
    getPack: () => (typeof window !== "undefined" ? window.pack : null),
    getGrid: () => (typeof window !== "undefined" ? window.grid : null),
    getNotes: () => (typeof window !== "undefined" ? window.notes : [])
  };
}

// ============================================================================
// Encoding Functions (GET - map → compressed)
// ============================================================================

/**
 * Encode a state to compressed format
 * Format: S{id}|{name}|{form}[|C{capital}][|CL{culture}][|N{cells}][|B{burgs}][|A{area}][|U{urban}][|R{rural}][|NB[ids]][|D[id:relation,...]]
 */
function encodeState(state) {
  if (!state || state.removed) return null;

  // Mandatory fields
  let result = `S${state.i}|${state.name}|${state.form || "Monarchy"}`;

  // Optional fields - only include if present and meaningful
  if (state.capital) result += `|C${state.capital}`;
  if (state.culture) result += `|CL${state.culture}`;
  if (state.cells) result += `|N${state.cells}`;
  if (state.burgs) result += `|B${state.burgs}`;
  if (state.area) result += `|A${Math.round(state.area / 1000)}k`;
  if (state.urban) result += `|U${Math.round(state.urban)}`;
  if (state.rural) result += `|R${Math.round(state.rural)}`;

  // Neighbors (array of state IDs)
  if (state.neighbors?.length) {
    result += `|NB[${state.neighbors.join(",")}]`;
  }

  // Diplomacy (array indexed by state ID, values are relation strings)
  if (state.diplomacy?.length) {
    const relations = state.diplomacy
      .map((rel, idx) => (rel && rel !== "x" ? `${idx}:${encodeDiplomacyRelation(rel)}` : null))
      .filter(Boolean);
    if (relations.length) result += `|D[${relations.join(",")}]`;
  }

  return result;
}

/**
 * Encode diplomacy relation to short code
 */
function encodeDiplomacyRelation(relation) {
  const codes = {
    Ally: "A",
    Friendly: "F",
    Neutral: "N",
    Suspicion: "S",
    Enemy: "E",
    Rival: "R",
    Unknown: "U",
    Vassal: "V",
    Suzerain: "Z"
  };
  return codes[relation] || relation.charAt(0);
}

/**
 * Decode diplomacy code to full relation
 */
function decodeDiplomacyRelation(code) {
  const relations = {
    A: "Ally",
    F: "Friendly",
    N: "Neutral",
    S: "Suspicion",
    E: "Enemy",
    R: "Rival",
    U: "Unknown",
    V: "Vassal",
    Z: "Suzerain"
  };
  return relations[code] || code;
}

/**
 * Encode a burg to compressed format
 * Format: B{id}|{name}|{cell}|@{x},{y}[|S{state}][|P{pop}][|T{type}][|F{flags}][|CL{culture}][|FT{feature}]
 * Flags: C=capital, P=port, W=walls, T=temple, S=shanty, Z=citadel, L=plaza
 */
function encodeBurg(burg) {
  if (!burg || burg.removed) return null;

  // Mandatory fields
  let result = `B${burg.i}|${burg.name}|${burg.cell}|@${Math.round(burg.x)},${Math.round(burg.y)}`;

  // Optional fields
  if (burg.state) result += `|S${burg.state}`;
  if (burg.population) result += `|P${Math.round(burg.population)}`;
  if (burg.type) result += `|T${burg.type}`;

  // Flags
  const flags = [];
  if (burg.capital) flags.push("C");
  if (burg.port) flags.push("P");
  if (burg.walls) flags.push("W");
  if (burg.temple) flags.push("T");
  if (burg.shanty) flags.push("S");
  if (burg.citadel) flags.push("Z");
  if (burg.plaza) flags.push("L");
  if (flags.length) result += `|F${flags.join("")}`;

  if (burg.culture) result += `|CL${burg.culture}`;
  if (burg.feature) result += `|FT${burg.feature}`;

  return result;
}

/**
 * Encode a marker to compressed format
 * Format: M{id}|{type}|@{x},{y}[|C{cell}][|I{icon}][|L{lock}]
 */
function encodeMarker(marker) {
  if (!marker) return null;

  let result = `M${marker.i}|${marker.type}|@${Math.round(marker.x)},${Math.round(marker.y)}`;

  if (marker.cell !== undefined) result += `|C${marker.cell}`;
  if (marker.icon) result += `|I${marker.icon}`;
  if (marker.lock) result += `|L1`;

  return result;
}

/**
 * Encode a culture to compressed format
 * Format: CL{id}|{name}|{type}[|B{base}][|C{center}][|E{expansionism}][|CD{code}]
 */
function encodeCulture(culture) {
  if (!culture || culture.removed) return null;

  let result = `CL${culture.i}|${culture.name}|${culture.type || "Generic"}`;

  if (culture.base !== undefined) result += `|B${culture.base}`;
  if (culture.center !== undefined) result += `|C${culture.center}`;
  if (culture.expansionism) result += `|E${culture.expansionism}`;
  if (culture.code) result += `|CD${culture.code}`;

  return result;
}

/**
 * Encode a religion to compressed format
 * Format: RL{id}|{name}|{type}|{form}[|CL{culture}][|C{center}][|E{expansionism}][|CD{code}]
 */
function encodeReligion(religion) {
  if (!religion || religion.removed) return null;

  let result = `RL${religion.i}|${religion.name}|${religion.type}|${religion.form || "Other"}`;

  if (religion.culture !== undefined) result += `|CL${religion.culture}`;
  if (religion.center !== undefined) result += `|C${religion.center}`;
  if (religion.expansionism) result += `|E${religion.expansionism}`;
  if (religion.code) result += `|CD${religion.code}`;

  return result;
}

/**
 * Encode a province to compressed format
 * Format: PV{id}|{name}|S{state}[|C{center}][|B{burg}][|FN{formName}]
 */
function encodeProvince(province) {
  if (!province || province.removed) return null;

  let result = `PV${province.i}|${province.name}|S${province.state}`;

  if (province.center !== undefined) result += `|C${province.center}`;
  if (province.burg !== undefined) result += `|B${province.burg}`;
  if (province.formName) result += `|FN${province.formName}`;

  return result;
}

/**
 * Encode a river to compressed format
 * Format: RV{id}|{name}|{source}|{mouth}[|P{parent}][|D{discharge}][|L{length}][|W{width}]
 */
function encodeRiver(river) {
  if (!river || river.removed) return null;

  let result = `RV${river.i}|${river.name}|${river.source}|${river.mouth}`;

  if (river.parent !== undefined) result += `|P${river.parent}`;
  if (river.discharge) result += `|D${Math.round(river.discharge)}`;
  if (river.length) result += `|L${Math.round(river.length)}`;
  if (river.width) result += `|W${river.width.toFixed(1)}`;

  return result;
}

/**
 * Encode a route to compressed format
 * Format: RT{id}|{group}|{feature}|PTS[{x},{y},{cell};...]
 */
function encodeRoute(route) {
  if (!route || route.removed) return null;

  let result = `RT${route.i}|${route.group}|${route.feature}`;

  if (route.points?.length) {
    const pts = route.points.map(p => `${Math.round(p[0])},${Math.round(p[1])},${p[2]}`).join(";");
    result += `|PTS[${pts}]`;
  }

  return result;
}

/**
 * Encode a feature to compressed format
 * Format: FT{id}|{type}[|L{land}][|B{border}][|N{cells}][|A{area}][|G{group}]
 */
function encodeFeature(feature) {
  if (!feature || feature.removed) return null;

  let result = `FT${feature.i}|${feature.type}`;

  if (feature.land !== undefined) result += `|L${feature.land ? 1 : 0}`;
  if (feature.border !== undefined) result += `|B${feature.border ? 1 : 0}`;
  if (feature.cells) result += `|N${feature.cells}`;
  if (feature.area) result += `|A${Math.round(feature.area)}`;
  if (feature.group) result += `|G${feature.group}`;

  return result;
}

/**
 * Encode a military unit to compressed format
 * Format: ML{id}|S{state}|C{cell}|@{x},{y}[|A{strength}][|N{name}][|I{icon}][|U{units}]
 */
function encodeMilitary(unit) {
  if (!unit) return null;

  let result = `ML${unit.i}|S${unit.state}|C${unit.cell}|@${Math.round(unit.x)},${Math.round(unit.y)}`;

  if (unit.a) result += `|A${unit.a}`;
  if (unit.name) result += `|N${unit.name}`;
  if (unit.icon) result += `|I${unit.icon}`;

  if (unit.u) {
    const units = Object.entries(unit.u)
      .map(([k, v]) => `${k.charAt(0)}:${v}`)
      .join(",");
    result += `|U[${units}]`;
  }

  return result;
}

/**
 * Encode a note to compressed format
 * Format: NT{id}|{name}|{legend}
 * Note: Notes use string IDs like "marker0", "state1"
 */
function encodeNote(note) {
  if (!note) return null;

  // Escape pipe characters in legend
  const legend = (note.legend || "").replace(/\|/g, "\\|");
  return `NT${note.id}|${note.name}|${legend}`;
}

/**
 * Encode a zone to compressed format
 * Format: ZN{id}|{name}|{type}[|S{state}][|C[cells]]
 */
function encodeZone(zone) {
  if (!zone) return null;

  let result = `ZN${zone.i}|${zone.name}|${zone.type}`;

  if (zone.state !== undefined) result += `|S${zone.state}`;
  if (zone.cells?.length) result += `|C[${zone.cells.join(",")}]`;

  return result;
}

/**
 * Encode full map context for AI
 * @param {Object} options - Filtering options
 * @returns {Object} Compressed map data with sections
 */
function encodeFullContext(options = {}) {
  const pack = dataSource.getPack();
  const notes = dataSource.getNotes();

  if (!pack) return {error: "No pack data available"};

  const context = {
    states: [],
    burgs: [],
    markers: [],
    cultures: [],
    religions: [],
    provinces: [],
    rivers: [],
    routes: [],
    features: [],
    military: [],
    notes: [],
    zones: []
  };

  // Encode states (skip index 0 which is "Neutrals")
  if (pack.states) {
    context.states = pack.states
      .filter(s => s && s.i && !s.removed)
      .map(encodeState)
      .filter(Boolean);
  }

  // Encode burgs (skip index 0 which is placeholder)
  if (pack.burgs) {
    context.burgs = pack.burgs
      .filter(b => b && b.i && !b.removed)
      .map(encodeBurg)
      .filter(Boolean);
  }

  // Encode markers
  if (pack.markers) {
    context.markers = pack.markers.map(encodeMarker).filter(Boolean);
  }

  // Encode cultures (skip index 0)
  if (pack.cultures) {
    context.cultures = pack.cultures
      .filter(c => c && c.i && !c.removed)
      .map(encodeCulture)
      .filter(Boolean);
  }

  // Encode religions (skip index 0)
  if (pack.religions) {
    context.religions = pack.religions
      .filter(r => r && r.i && !r.removed)
      .map(encodeReligion)
      .filter(Boolean);
  }

  // Encode provinces
  if (pack.provinces) {
    context.provinces = pack.provinces
      .filter(p => p && p.i && !p.removed)
      .map(encodeProvince)
      .filter(Boolean);
  }

  // Encode rivers
  if (pack.rivers) {
    context.rivers = pack.rivers
      .filter(r => r && r.i)
      .map(encodeRiver)
      .filter(Boolean);
  }

  // Encode features (landmasses, lakes, etc.)
  if (pack.features) {
    context.features = pack.features
      .filter(f => f && f.i)
      .map(encodeFeature)
      .filter(Boolean);
  }

  // Encode zones
  if (pack.zones) {
    context.zones = pack.zones.map(encodeZone).filter(Boolean);
  }

  // Encode notes
  if (notes?.length) {
    context.notes = notes.map(encodeNote).filter(Boolean);
  }

  // Routes are typically large - only include summary or skip
  if (options.includeRoutes && pack.routes) {
    context.routes = pack.routes
      .filter(r => r && r.i)
      .map(encodeRoute)
      .filter(Boolean);
  }

  // Military units from states
  if (pack.states) {
    pack.states.forEach(state => {
      if (state?.military?.length) {
        state.military.forEach(unit => {
          const encoded = encodeMilitary(unit);
          if (encoded) context.military.push(encoded);
        });
      }
    });
  }

  return context;
}

// ============================================================================
// Decoding Functions (compressed → map objects)
// ============================================================================

/**
 * Parse a pipe-delimited field string into key-value pairs
 */
function parseFields(str, startIndex = 0) {
  const fields = {};
  const parts = str.split("|").slice(startIndex);

  // Known field prefixes (order matters - longer prefixes first)
  const knownPrefixes = ["NB", "CL", "FN", "FT", "CD", "RL", "PV", "RV", "ZN", "NT", "S", "P", "T", "F", "C", "B", "A", "U", "R", "D", "E", "L", "W", "I", "M", "N", "G", "@"];

  for (const part of parts) {
    if (!part) continue;

    // Handle array fields like NB[1,2,3] or D[1:A,2:F]
    const arrayMatch = part.match(/^([A-Z]+)\[(.*)\]$/);
    if (arrayMatch) {
      fields[arrayMatch[1]] = arrayMatch[2];
      continue;
    }

    // Handle flags-only fields (F followed by flag chars with no value)
    if (/^F[A-Z]+$/.test(part)) {
      fields.F = part.slice(1);
      continue;
    }

    // Match known prefixes
    for (const prefix of knownPrefixes) {
      if (part.startsWith(prefix) && part.length > prefix.length) {
        fields[prefix] = part.slice(prefix.length);
        break;
      }
    }
  }

  return fields;
}

/**
 * Decode a compressed state string to object
 */
function decodeState(compressed) {
  if (!compressed?.startsWith("S")) return null;

  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(1));
  const name = parts[1];
  const form = parts[2];

  const state = {i: id, name, form};
  const fields = parseFields(compressed, 3);

  if (fields.C) state.capital = parseInt(fields.C);
  if (fields.CL) state.culture = parseInt(fields.CL);
  if (fields.N) state.cells = parseInt(fields.N);
  if (fields.B) state.burgs = parseInt(fields.B);
  if (fields.A) state.area = parseInt(fields.A.replace("k", "")) * 1000;
  if (fields.U) state.urban = parseFloat(fields.U);
  if (fields.R) state.rural = parseFloat(fields.R);

  if (fields.NB) {
    state.neighbors = fields.NB.split(",").map(n => parseInt(n));
  }

  if (fields.D) {
    state.diplomacy = [];
    fields.D.split(",").forEach(rel => {
      const [idx, code] = rel.split(":");
      state.diplomacy[parseInt(idx)] = decodeDiplomacyRelation(code);
    });
  }

  return state;
}

/**
 * Decode a compressed burg string to object
 */
function decodeBurg(compressed) {
  if (!compressed?.startsWith("B")) return null;

  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(1));
  const name = parts[1];
  const cell = parseInt(parts[2]);

  // Parse coordinates from @x,y
  const coordMatch = parts[3]?.match(/@(\d+),(\d+)/);
  const x = coordMatch ? parseInt(coordMatch[1]) : 0;
  const y = coordMatch ? parseInt(coordMatch[2]) : 0;

  const burg = {i: id, name, cell, x, y};
  const fields = parseFields(compressed, 4);

  if (fields.S) burg.state = parseInt(fields.S);
  if (fields.P) burg.population = parseInt(fields.P);
  if (fields.T) burg.type = fields.T;
  if (fields.CL) burg.culture = parseInt(fields.CL);
  if (fields.FT) burg.feature = parseInt(fields.FT);

  // Parse flags
  if (fields.F) {
    const flags = fields.F;
    burg.capital = flags.includes("C") ? 1 : 0;
    burg.port = flags.includes("P") ? 1 : 0;
    burg.walls = flags.includes("W") ? 1 : 0;
    burg.temple = flags.includes("T") ? 1 : 0;
    burg.shanty = flags.includes("S") ? 1 : 0;
    burg.citadel = flags.includes("Z") ? 1 : 0;
    burg.plaza = flags.includes("L") ? 1 : 0;
  }

  return burg;
}

/**
 * Decode a compressed marker string to object
 */
function decodeMarker(compressed) {
  if (!compressed?.startsWith("M")) return null;

  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(1));
  const type = parts[1];

  const coordMatch = parts[2]?.match(/@(\d+),(\d+)/);
  const x = coordMatch ? parseInt(coordMatch[1]) : 0;
  const y = coordMatch ? parseInt(coordMatch[2]) : 0;

  const marker = {i: id, type, x, y};
  const fields = parseFields(compressed, 3);

  if (fields.C) marker.cell = parseInt(fields.C);
  if (fields.I) marker.icon = fields.I;
  if (fields.L) marker.lock = fields.L === "1";

  return marker;
}

/**
 * Decode a compressed culture string to object
 */
function decodeCulture(compressed) {
  if (!compressed?.startsWith("CL")) return null;

  // Handle CL prefix (2 chars)
  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(2));
  const name = parts[1];
  const type = parts[2];

  const culture = {i: id, name, type};
  const fields = parseFields(compressed, 3);

  if (fields.B) culture.base = parseInt(fields.B);
  if (fields.C) culture.center = parseInt(fields.C);
  if (fields.E) culture.expansionism = parseFloat(fields.E);
  if (fields.CD) culture.code = fields.CD;

  return culture;
}

/**
 * Decode a compressed religion string to object
 */
function decodeReligion(compressed) {
  if (!compressed?.startsWith("RL")) return null;

  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(2));
  const name = parts[1];
  const type = parts[2];
  const form = parts[3];

  const religion = {i: id, name, type, form};
  const fields = parseFields(compressed, 4);

  if (fields.CL) religion.culture = parseInt(fields.CL);
  if (fields.C) religion.center = parseInt(fields.C);
  if (fields.E) religion.expansionism = parseFloat(fields.E);
  if (fields.CD) religion.code = fields.CD;

  return religion;
}

/**
 * Decode a compressed province string to object
 */
function decodeProvince(compressed) {
  if (!compressed?.startsWith("PV")) return null;

  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(2));
  const name = parts[1];

  const province = {i: id, name};
  const fields = parseFields(compressed, 2);

  if (fields.S) province.state = parseInt(fields.S);
  if (fields.C) province.center = parseInt(fields.C);
  if (fields.B) province.burg = parseInt(fields.B);
  if (fields.FN) province.formName = fields.FN;

  return province;
}

/**
 * Decode a compressed river string to object
 */
function decodeRiver(compressed) {
  if (!compressed?.startsWith("RV")) return null;

  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(2));
  const name = parts[1];
  const source = parseInt(parts[2]);
  const mouth = parseInt(parts[3]);

  const river = {i: id, name, source, mouth};
  const fields = parseFields(compressed, 4);

  if (fields.P) river.parent = parseInt(fields.P);
  if (fields.D) river.discharge = parseInt(fields.D);
  if (fields.L) river.length = parseInt(fields.L);
  if (fields.W) river.width = parseFloat(fields.W);

  return river;
}

/**
 * Decode a compressed note string to object
 */
function decodeNote(compressed) {
  if (!compressed?.startsWith("NT")) return null;

  const parts = compressed.split("|");
  const id = parts[0].slice(2);
  const name = parts[1];
  // Unescape pipe characters in legend
  const legend = parts.slice(2).join("|").replace(/\\\|/g, "|");

  return {id, name, legend};
}

/**
 * Decode a compressed zone string to object
 */
function decodeZone(compressed) {
  if (!compressed?.startsWith("ZN")) return null;

  const parts = compressed.split("|");
  const id = parseInt(parts[0].slice(2));
  const name = parts[1];
  const type = parts[2];

  const zone = {i: id, name, type};
  const fields = parseFields(compressed, 3);

  if (fields.S) zone.state = parseInt(fields.S);
  if (fields.C) {
    zone.cells = fields.C.split(",").map(c => parseInt(c));
  }

  return zone;
}

/**
 * Decode an AI response ChangeSet (JSON with verbs)
 */
function decodeResponse(aiResponse) {
  if (typeof aiResponse === "string") {
    try {
      aiResponse = JSON.parse(aiResponse);
    } catch (e) {
      return {error: "Invalid JSON response", details: e.message};
    }
  }

  // Handle null, undefined, or non-object inputs
  if (aiResponse == null || typeof aiResponse !== "object") {
    return {
      create: {},
      update: {},
      delete: {}
    };
  }

  return {
    create: aiResponse.create || {},
    update: aiResponse.update || {},
    delete: aiResponse.delete || {}
  };
}

// ============================================================================
// Validation Wrappers
// ============================================================================

/**
 * Create a ValidationResult object
 */
function createValidationResult(valid, errors = [], warnings = [], entity = null) {
  return {valid, errors, warnings, entity};
}

/**
 * Validate an entity for creation (POST)
 */
function validateCreate(entityType, data) {
  const errors = [];
  const warnings = [];

  // Layer 1: Schema validation
  const schemaErrors = validateSchema(data, entityType, "create");
  errors.push(...schemaErrors);

  if (errors.length) {
    return createValidationResult(false, errors, warnings);
  }

  // Layer 2: Referential validation
  const refErrors = validateReferences(data, entityType, dataSource.getPack());
  errors.push(...refErrors);

  if (errors.length) {
    return createValidationResult(false, errors, warnings);
  }

  // Layer 3: Semantic validation
  const {errors: semErrors, warnings: semWarnings} = validateSemantics(
    data,
    entityType,
    dataSource.getPack(),
    null
  );
  errors.push(...semErrors);
  warnings.push(...semWarnings);

  return createValidationResult(errors.length === 0, errors, warnings, data);
}

/**
 * Validate an entity for update (PATCH)
 */
function validateUpdate(entityType, id, changes) {
  const errors = [];
  const warnings = [];
  const pack = dataSource.getPack();

  // Verify entity exists
  const collection = getCollection(pack, entityType);
  const existing = collection?.find(e => e.i === id);

  if (!existing) {
    errors.push({
      field: "i",
      code: "ENTITY_NOT_FOUND",
      message: `${entityType} with id ${id} not found`,
      layer: "referential"
    });
    return createValidationResult(false, errors, warnings);
  }

  if (existing.removed) {
    errors.push({
      field: "i",
      code: "ENTITY_REMOVED",
      message: `${entityType} with id ${id} has been removed`,
      layer: "referential"
    });
    return createValidationResult(false, errors, warnings);
  }

  // Merge changes with existing data for validation
  const merged = {...existing, ...changes, i: id};

  // Layer 1: Schema validation (only for provided fields)
  const schemaErrors = validateSchema(changes, entityType, "update");
  errors.push(...schemaErrors);

  if (errors.length) {
    return createValidationResult(false, errors, warnings);
  }

  // Layer 2: Referential validation
  const refErrors = validateReferences(merged, entityType, pack);
  errors.push(...refErrors);

  if (errors.length) {
    return createValidationResult(false, errors, warnings);
  }

  // Layer 3: Semantic validation
  const {errors: semErrors, warnings: semWarnings} = validateSemantics(merged, entityType, pack, null);
  errors.push(...semErrors);
  warnings.push(...semWarnings);

  return createValidationResult(errors.length === 0, errors, warnings, merged);
}

/**
 * Validate an entity for deletion (DELETE)
 */
function validateRemove(entityType, id) {
  const errors = [];
  const warnings = [];
  const pack = dataSource.getPack();

  const collection = getCollection(pack, entityType);
  const existing = collection?.find(e => e.i === id);

  if (!existing) {
    errors.push({
      field: "i",
      code: "ENTITY_NOT_FOUND",
      message: `${entityType} with id ${id} not found`,
      layer: "referential"
    });
    return createValidationResult(false, errors, warnings);
  }

  if (existing.removed) {
    errors.push({
      field: "i",
      code: "ALREADY_REMOVED",
      message: `${entityType} with id ${id} is already removed`,
      layer: "referential"
    });
    return createValidationResult(false, errors, warnings);
  }

  // Check for references to this entity (generate warnings)
  const refs = findReferencesTo(entityType, id, pack);
  refs.forEach(ref => {
    warnings.push({
      field: ref.field,
      code: "REFERENCED_BY",
      message: `Referenced by ${ref.entityType} ${ref.entityId}`
    });
  });

  return createValidationResult(true, errors, warnings, existing);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get collection from pack by entity type
 */
function getCollection(pack, entityType) {
  const collections = {
    state: pack?.states,
    burg: pack?.burgs,
    marker: pack?.markers,
    culture: pack?.cultures,
    religion: pack?.religions,
    province: pack?.provinces,
    river: pack?.rivers,
    route: pack?.routes,
    feature: pack?.features,
    zone: pack?.zones
  };
  return collections[entityType];
}

/**
 * Find entities that reference the given entity
 */
function findReferencesTo(entityType, id, pack) {
  const refs = [];

  if (entityType === "state") {
    // Burgs reference states
    pack.burgs?.forEach(b => {
      if (b?.state === id) {
        refs.push({entityType: "burg", entityId: b.i, field: "state"});
      }
    });
    // Provinces reference states
    pack.provinces?.forEach(p => {
      if (p?.state === id) {
        refs.push({entityType: "province", entityId: p.i, field: "state"});
      }
    });
  }

  if (entityType === "burg") {
    // States reference burgs as capitals
    pack.states?.forEach(s => {
      if (s?.capital === id) {
        refs.push({entityType: "state", entityId: s.i, field: "capital"});
      }
    });
  }

  if (entityType === "culture") {
    // States reference cultures
    pack.states?.forEach(s => {
      if (s?.culture === id) {
        refs.push({entityType: "state", entityId: s.i, field: "culture"});
      }
    });
    // Burgs reference cultures
    pack.burgs?.forEach(b => {
      if (b?.culture === id) {
        refs.push({entityType: "burg", entityId: b.i, field: "culture"});
      }
    });
  }

  return refs;
}

/**
 * Deep copy an object (for snapshots)
 */
function deepCopy(obj) {
  if (obj === null || typeof obj !== "object") return obj;

  // Handle typed arrays
  if (ArrayBuffer.isView(obj)) {
    return obj.slice();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(deepCopy);
  }

  // Handle objects
  const copy = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  return copy;
}

/**
 * Estimate token count for data
 */
function estimateTokens(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  // Rough estimate: ~4 chars per token
  return Math.ceil(str.length / 4);
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Validate an entire ChangeSet as a unit
 */
function batchValidate(changeSet) {
  const errors = [];
  const warnings = [];

  // Use the unified ChangeSet validator
  const result = validateChangeSet(changeSet, dataSource.getPack());
  errors.push(...result.errors);
  warnings.push(...result.warnings);

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Apply a validated ChangeSet with snapshot/rollback support
 */
function batchApply(changeSet) {
  const pack = dataSource.getPack();
  const grid = dataSource.getGrid();
  const notes = dataSource.getNotes();

  // Step 1: Validate ALL changes first
  const validation = batchValidate(changeSet);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
      snapshot: null,
      state: {pack, grid},
      summary: {created: {}, updated: {}, deleted: {}}
    };
  }

  // Step 2: Deep snapshot before mutations
  const snapshot = {
    pack: deepCopy(pack),
    grid: deepCopy(grid),
    notes: deepCopy(notes)
  };

  const summary = {
    created: {},
    updated: {},
    deleted: {}
  };

  try {
    // Step 3: Apply creates
    if (changeSet.create) {
      for (const [entityType, entities] of Object.entries(changeSet.create)) {
        if (!entities?.length) continue;
        summary.created[entityType] = applyCreates(entityType, entities, pack, notes);
      }
    }

    // Step 4: Apply updates
    if (changeSet.update) {
      for (const [entityType, updates] of Object.entries(changeSet.update)) {
        if (!updates?.length) continue;
        summary.updated[entityType] = applyUpdates(entityType, updates, pack, notes);
      }
    }

    // Step 5: Apply deletes
    if (changeSet.delete) {
      for (const [entityType, ids] of Object.entries(changeSet.delete)) {
        if (!ids?.length) continue;
        summary.deleted[entityType] = applyDeletes(entityType, ids, pack, notes);
      }
    }

    return {
      success: true,
      errors: [],
      warnings: validation.warnings,
      snapshot,
      state: {pack, grid},
      summary
    };
  } catch (e) {
    // Step 6: Rollback on error
    Object.assign(pack, snapshot.pack);
    if (grid) Object.assign(grid, snapshot.grid);
    if (typeof window !== "undefined") {
      window.notes = snapshot.notes;
    }

    return {
      success: false,
      errors: [
        {
          field: "batch",
          code: "APPLY_ERROR",
          message: e.message,
          layer: "semantic"
        }
      ],
      warnings: validation.warnings,
      rolledBack: true,
      snapshot,
      state: {pack: snapshot.pack, grid: snapshot.grid},
      summary
    };
  }
}

/**
 * Apply create operations for an entity type
 */
function applyCreates(entityType, entities, pack, notes) {
  let count = 0;
  const collection = getCollection(pack, entityType);

  for (const entity of entities) {
    // Assign new ID if not provided
    if (entity.i === undefined) {
      entity.i = collection.length;
    }

    // Handle special cases
    if (entityType === "river" || entityType === "route") {
      // Rivers and routes need path generation from intent
      // This would call the existing pathfinding algorithms
      // For now, just add the intent data
    }

    if (entityType === "note") {
      // Notes go to the notes array, not pack
      notes.push(entity);
    } else if (collection) {
      collection[entity.i] = entity;
    }

    count++;
  }

  return count;
}

/**
 * Apply update operations for an entity type
 */
function applyUpdates(entityType, updates, pack, notes) {
  let count = 0;

  if (entityType === "note") {
    for (const update of updates) {
      const noteIndex = notes.findIndex(n => n.id === update.id);
      if (noteIndex !== -1) {
        Object.assign(notes[noteIndex], update);
        count++;
      }
    }
  } else {
    const collection = getCollection(pack, entityType);
    for (const update of updates) {
      const existing = collection?.find(e => e.i === update.i);
      if (existing) {
        Object.assign(existing, update);
        count++;
      }
    }
  }

  return count;
}

/**
 * Apply delete operations for an entity type
 */
function applyDeletes(entityType, ids, pack, notes) {
  let count = 0;

  if (entityType === "note") {
    for (const id of ids) {
      const noteIndex = notes.findIndex(n => n.id === id);
      if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
        count++;
      }
    }
  } else {
    const collection = getCollection(pack, entityType);
    for (const id of ids) {
      const existing = collection?.find(e => e.i === id);
      if (existing) {
        existing.removed = true;
        count++;
      }
    }
  }

  return count;
}

// ============================================================================
// Public API
// ============================================================================

export const DataLayer = {
  // GET - Encoding
  encode: {
    state: encodeState,
    burg: encodeBurg,
    marker: encodeMarker,
    culture: encodeCulture,
    religion: encodeReligion,
    province: encodeProvince,
    river: encodeRiver,
    route: encodeRoute,
    feature: encodeFeature,
    military: encodeMilitary,
    note: encodeNote,
    zone: encodeZone,
    fullContext: encodeFullContext
  },

  // Decoding
  decode: {
    state: decodeState,
    burg: decodeBurg,
    marker: decodeMarker,
    culture: decodeCulture,
    religion: decodeReligion,
    province: decodeProvince,
    river: decodeRiver,
    note: decodeNote,
    zone: decodeZone,
    response: decodeResponse
  },

  // POST - Create (validates all mandatory fields)
  create: {
    state: data => validateCreate("state", data),
    burg: data => validateCreate("burg", data),
    marker: data => validateCreate("marker", data),
    culture: data => validateCreate("culture", data),
    religion: data => validateCreate("religion", data),
    province: data => validateCreate("province", data),
    river: data => validateCreate("river", data),
    route: data => validateCreate("route", data),
    note: data => validateCreate("note", data),
    zone: data => validateCreate("zone", data)
  },

  // PATCH - Update (validates only provided fields)
  update: {
    state: (id, changes) => validateUpdate("state", id, changes),
    burg: (id, changes) => validateUpdate("burg", id, changes),
    marker: (id, changes) => validateUpdate("marker", id, changes),
    culture: (id, changes) => validateUpdate("culture", id, changes),
    religion: (id, changes) => validateUpdate("religion", id, changes),
    province: (id, changes) => validateUpdate("province", id, changes),
    river: (id, changes) => validateUpdate("river", id, changes),
    route: (id, changes) => validateUpdate("route", id, changes),
    note: (id, changes) => validateUpdate("note", id, changes),
    zone: (id, changes) => validateUpdate("zone", id, changes)
  },

  // DELETE - Remove
  remove: {
    state: id => validateRemove("state", id),
    burg: id => validateRemove("burg", id),
    marker: id => validateRemove("marker", id),
    culture: id => validateRemove("culture", id),
    religion: id => validateRemove("religion", id),
    province: id => validateRemove("province", id),
    river: id => validateRemove("river", id),
    route: id => validateRemove("route", id),
    note: id => validateRemove("note", id),
    zone: id => validateRemove("zone", id)
  },

  // Batch operations
  batch: {
    validate: batchValidate,
    apply: batchApply
  },

  // Utilities
  estimateTokens,

  // Testing support
  setDataSource,
  resetDataSource
};

// Window exposure for backward compatibility
if (typeof window !== "undefined") {
  window.DataLayer = DataLayer;
}
