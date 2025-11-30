"use strict";

/**
 * AI Data Layer - Validators
 *
 * Three-layer validation system:
 * 1. Schema: Required fields, types, ranges
 * 2. Referential: Entity existence, ID validity
 * 3. Semantic: Business rules, logical consistency
 */

// ============================================================================
// Schema Definitions
// ============================================================================

const SCHEMAS = {
  state: {
    mandatory: ["i", "name", "form"],
    optional: ["capital", "culture", "cells", "burgs", "area", "urban", "rural", "neighbors", "diplomacy", "color", "center"],
    types: {
      i: "number",
      name: "string",
      form: "string",
      capital: "number",
      culture: "number",
      cells: "number",
      burgs: "number",
      area: "number",
      urban: "number",
      rural: "number",
      neighbors: "array",
      diplomacy: "array",
      color: "string",
      center: "number"
    },
    ranges: {
      i: {min: 0},
      capital: {min: 0},
      culture: {min: 0},
      cells: {min: 0},
      burgs: {min: 0},
      area: {min: 0},
      urban: {min: 0},
      rural: {min: 0}
    }
  },

  burg: {
    mandatory: ["i", "name", "cell", "x", "y"],
    optional: ["state", "population", "type", "capital", "port", "walls", "temple", "shanty", "citadel", "plaza", "culture", "feature"],
    types: {
      i: "number",
      name: "string",
      cell: "number",
      x: "number",
      y: "number",
      state: "number",
      population: "number",
      type: "string",
      capital: "number",
      port: "number",
      walls: "number",
      temple: "number",
      shanty: "number",
      citadel: "number",
      plaza: "number",
      culture: "number",
      feature: "number"
    },
    ranges: {
      i: {min: 0},
      cell: {min: 0},
      x: {min: 0},
      y: {min: 0},
      state: {min: 0},
      population: {min: 0},
      culture: {min: 0},
      feature: {min: 0}
    }
  },

  marker: {
    mandatory: ["i", "type", "x", "y"],
    optional: ["cell", "icon", "lock"],
    types: {
      i: "number",
      type: "string",
      x: "number",
      y: "number",
      cell: "number",
      icon: "string",
      lock: "boolean"
    },
    ranges: {
      i: {min: 0},
      x: {min: 0},
      y: {min: 0},
      cell: {min: 0}
    }
  },

  culture: {
    mandatory: ["i", "name", "type"],
    optional: ["base", "center", "expansionism", "code", "color", "shield", "origins"],
    types: {
      i: "number",
      name: "string",
      type: "string",
      base: "number",
      center: "number",
      expansionism: "number",
      code: "string",
      color: "string",
      shield: "string",
      origins: "array"
    },
    ranges: {
      i: {min: 0},
      base: {min: 0},
      center: {min: 0},
      expansionism: {min: 0}
    }
  },

  religion: {
    mandatory: ["i", "name", "type", "form"],
    optional: ["culture", "center", "expansionism", "code", "color", "expansion"],
    types: {
      i: "number",
      name: "string",
      type: "string",
      form: "string",
      culture: "number",
      center: "number",
      expansionism: "number",
      code: "string",
      color: "string",
      expansion: "string"
    },
    ranges: {
      i: {min: 0},
      culture: {min: 0},
      center: {min: 0},
      expansionism: {min: 0}
    }
  },

  province: {
    mandatory: ["i", "name", "state"],
    optional: ["center", "burg", "formName", "fullName", "color"],
    types: {
      i: "number",
      name: "string",
      state: "number",
      center: "number",
      burg: "number",
      formName: "string",
      fullName: "string",
      color: "string"
    },
    ranges: {
      i: {min: 0},
      state: {min: 0},
      center: {min: 0},
      burg: {min: 0}
    }
  },

  river: {
    mandatory: ["i", "name", "source", "mouth"],
    optional: ["parent", "discharge", "length", "width", "basin", "cells", "type"],
    types: {
      i: "number",
      name: "string",
      source: "number",
      mouth: "number",
      parent: "number",
      discharge: "number",
      length: "number",
      width: "number",
      basin: "number",
      cells: "array",
      type: "string"
    },
    ranges: {
      i: {min: 0},
      source: {min: 0},
      mouth: {min: 0},
      parent: {min: 0},
      discharge: {min: 0},
      length: {min: 0},
      width: {min: 0}
    }
  },

  route: {
    mandatory: ["i", "group"],
    // For AI creation: from/to (intent), for existing: points (geometry)
    optional: ["from", "to", "feature", "points"],
    types: {
      i: "number",
      group: "string",
      from: "object",
      to: "object",
      feature: "number",
      points: "array"
    },
    ranges: {
      i: {min: 0},
      feature: {min: 0}
    }
  },

  feature: {
    mandatory: ["i", "type"],
    optional: ["land", "border", "cells", "area", "group", "firstCell", "vertices", "name"],
    types: {
      i: "number",
      type: "string",
      land: "boolean",
      border: "boolean",
      cells: "number",
      area: "number",
      group: "string",
      firstCell: "number",
      vertices: "array",
      name: "string"
    },
    ranges: {
      i: {min: 0},
      cells: {min: 0},
      area: {min: 0},
      firstCell: {min: 0}
    }
  },

  military: {
    mandatory: ["i", "state", "cell"],
    optional: ["x", "y", "a", "name", "icon", "u"],
    types: {
      i: "number",
      state: "number",
      cell: "number",
      x: "number",
      y: "number",
      a: "number",
      name: "string",
      icon: "string",
      u: "object"
    },
    ranges: {
      i: {min: 0},
      state: {min: 0},
      cell: {min: 0},
      a: {min: 0}
    }
  },

  note: {
    mandatory: ["id", "name"],
    optional: ["legend"],
    types: {
      id: "string",
      name: "string",
      legend: "string"
    },
    ranges: {}
  },

  zone: {
    mandatory: ["i", "name", "type"],
    optional: ["state", "cells", "color"],
    types: {
      i: "number",
      name: "string",
      type: "string",
      state: "number",
      cells: "array",
      color: "string"
    },
    ranges: {
      i: {min: 0},
      state: {min: 0}
    }
  }
};

// Valid enum values
const ENUMS = {
  stateForm: [
    "Monarchy",
    "Republic",
    "Theocracy",
    "Union",
    "Anarchy",
    "Despotism",
    "Horde",
    "Oligarchy",
    "Democracy",
    "Dictatorship",
    "Confederation"
  ],
  religionType: ["Folk", "Organized", "Cult", "Heresy"],
  religionForm: ["Animism", "Polytheism", "Monotheism", "Dualism", "Nontheism", "Other"],
  cultureType: ["Generic", "River", "Lake", "Naval", "Nomadic", "Hunting", "Highland"],
  routeGroup: ["roads", "trails", "searoutes"],
  featureType: ["island", "lake", "ocean", "sea", "gulf", "bay", "strait"],
  diplomacyRelation: ["Ally", "Friendly", "Neutral", "Suspicion", "Enemy", "Rival", "Unknown", "Vassal", "Suzerain"]
};

// ============================================================================
// Layer 1: Schema Validation
// ============================================================================

/**
 * Validate entity against schema
 * @param {Object} entity - Entity data to validate
 * @param {string} entityType - Type of entity
 * @param {string} operation - "create" or "update"
 * @returns {Array} Array of error objects
 */
export function validateSchema(entity, entityType, operation = "create") {
  const errors = [];
  const schema = SCHEMAS[entityType];

  if (!schema) {
    errors.push({
      field: "entityType",
      code: "UNKNOWN_ENTITY_TYPE",
      message: `Unknown entity type: ${entityType}`,
      layer: "schema"
    });
    return errors;
  }

  // For create operations, check mandatory fields
  if (operation === "create") {
    for (const field of schema.mandatory) {
      if (entity[field] === undefined || entity[field] === null) {
        errors.push({
          field,
          code: "MISSING_REQUIRED",
          message: `Missing required field: ${field}`,
          layer: "schema"
        });
      }
    }
  }

  // Validate types and ranges for all provided fields
  for (const [field, value] of Object.entries(entity)) {
    if (value === undefined || value === null) continue;

    const expectedType = schema.types[field];
    if (!expectedType) continue; // Unknown field, ignore

    // Type checking
    const actualType = getValueType(value);
    if (actualType !== expectedType) {
      errors.push({
        field,
        code: "INVALID_TYPE",
        message: `Field ${field} expected ${expectedType}, got ${actualType}`,
        layer: "schema"
      });
      continue;
    }

    // Range checking
    const range = schema.ranges[field];
    if (range && typeof value === "number") {
      if (range.min !== undefined && value < range.min) {
        errors.push({
          field,
          code: "OUT_OF_RANGE",
          message: `Field ${field} must be >= ${range.min}, got ${value}`,
          layer: "schema"
        });
      }
      if (range.max !== undefined && value > range.max) {
        errors.push({
          field,
          code: "OUT_OF_RANGE",
          message: `Field ${field} must be <= ${range.max}, got ${value}`,
          layer: "schema"
        });
      }
    }

    // NaN check for numbers
    if (typeof value === "number" && isNaN(value)) {
      errors.push({
        field,
        code: "INVALID_VALUE",
        message: `Field ${field} cannot be NaN`,
        layer: "schema"
      });
    }
  }

  // Enum validation for specific fields
  if (entityType === "state" && entity.form) {
    if (!ENUMS.stateForm.includes(entity.form)) {
      errors.push({
        field: "form",
        code: "INVALID_ENUM",
        message: `Invalid state form: ${entity.form}. Valid values: ${ENUMS.stateForm.join(", ")}`,
        layer: "schema"
      });
    }
  }

  if (entityType === "religion") {
    if (entity.type && !ENUMS.religionType.includes(entity.type)) {
      errors.push({
        field: "type",
        code: "INVALID_ENUM",
        message: `Invalid religion type: ${entity.type}`,
        layer: "schema"
      });
    }
    if (entity.form && !ENUMS.religionForm.includes(entity.form)) {
      errors.push({
        field: "form",
        code: "INVALID_ENUM",
        message: `Invalid religion form: ${entity.form}`,
        layer: "schema"
      });
    }
  }

  if (entityType === "culture" && entity.type) {
    if (!ENUMS.cultureType.includes(entity.type)) {
      errors.push({
        field: "type",
        code: "INVALID_ENUM",
        message: `Invalid culture type: ${entity.type}`,
        layer: "schema"
      });
    }
  }

  if (entityType === "route" && entity.group) {
    if (!ENUMS.routeGroup.includes(entity.group)) {
      errors.push({
        field: "group",
        code: "INVALID_ENUM",
        message: `Invalid route group: ${entity.group}`,
        layer: "schema"
      });
    }
  }

  return errors;
}

/**
 * Get the type of a value for validation
 */
function getValueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

// ============================================================================
// Layer 2: Referential Validation
// ============================================================================

/**
 * Validate entity references exist
 * @param {Object} entity - Entity data to validate
 * @param {string} entityType - Type of entity
 * @param {Object} pack - Pack data for lookups
 * @returns {Array} Array of error objects
 */
export function validateReferences(entity, entityType, pack) {
  const errors = [];
  if (!pack) return errors;

  switch (entityType) {
    case "state":
      // Capital must reference existing burg
      if (entity.capital !== undefined && entity.capital !== 0) {
        if (!pack.burgs?.[entity.capital] || pack.burgs[entity.capital].removed) {
          errors.push({
            field: "capital",
            code: "INVALID_REF",
            message: `Capital burg ${entity.capital} does not exist`,
            layer: "referential"
          });
        }
      }
      // Culture must exist
      if (entity.culture !== undefined && entity.culture !== 0) {
        if (!pack.cultures?.[entity.culture] || pack.cultures[entity.culture].removed) {
          errors.push({
            field: "culture",
            code: "INVALID_REF",
            message: `Culture ${entity.culture} does not exist`,
            layer: "referential"
          });
        }
      }
      // Neighbors must be valid states
      if (entity.neighbors?.length) {
        entity.neighbors.forEach((neighborId, idx) => {
          if (neighborId !== 0 && (!pack.states?.[neighborId] || pack.states[neighborId].removed)) {
            errors.push({
              field: `neighbors[${idx}]`,
              code: "INVALID_REF",
              message: `Neighbor state ${neighborId} does not exist`,
              layer: "referential"
            });
          }
        });
      }
      break;

    case "burg":
      // State must exist (0 is valid for neutral)
      if (entity.state !== undefined && entity.state !== 0) {
        if (!pack.states?.[entity.state] || pack.states[entity.state].removed) {
          errors.push({
            field: "state",
            code: "INVALID_REF",
            message: `State ${entity.state} does not exist`,
            layer: "referential"
          });
        }
      }
      // Culture must exist
      if (entity.culture !== undefined && entity.culture !== 0) {
        if (!pack.cultures?.[entity.culture] || pack.cultures[entity.culture].removed) {
          errors.push({
            field: "culture",
            code: "INVALID_REF",
            message: `Culture ${entity.culture} does not exist`,
            layer: "referential"
          });
        }
      }
      // Feature must exist
      if (entity.feature !== undefined) {
        if (!pack.features?.[entity.feature]) {
          errors.push({
            field: "feature",
            code: "INVALID_REF",
            message: `Feature ${entity.feature} does not exist`,
            layer: "referential"
          });
        }
      }
      // Cell must be valid
      if (entity.cell !== undefined) {
        if (!pack.cells?.i || entity.cell >= pack.cells.i.length) {
          errors.push({
            field: "cell",
            code: "INVALID_REF",
            message: `Cell ${entity.cell} is out of range`,
            layer: "referential"
          });
        }
      }
      break;

    case "province":
      // State must exist
      if (entity.state !== undefined) {
        if (!pack.states?.[entity.state] || pack.states[entity.state].removed) {
          errors.push({
            field: "state",
            code: "INVALID_REF",
            message: `State ${entity.state} does not exist`,
            layer: "referential"
          });
        }
      }
      // Burg must exist
      if (entity.burg !== undefined && entity.burg !== 0) {
        if (!pack.burgs?.[entity.burg] || pack.burgs[entity.burg].removed) {
          errors.push({
            field: "burg",
            code: "INVALID_REF",
            message: `Burg ${entity.burg} does not exist`,
            layer: "referential"
          });
        }
      }
      break;

    case "religion":
      // Culture must exist
      if (entity.culture !== undefined && entity.culture !== 0) {
        if (!pack.cultures?.[entity.culture] || pack.cultures[entity.culture].removed) {
          errors.push({
            field: "culture",
            code: "INVALID_REF",
            message: `Culture ${entity.culture} does not exist`,
            layer: "referential"
          });
        }
      }
      break;

    case "route":
      // Validate from/to references for AI intent
      if (entity.from?.burg !== undefined) {
        if (!pack.burgs?.[entity.from.burg] || pack.burgs[entity.from.burg].removed) {
          errors.push({
            field: "from.burg",
            code: "INVALID_REF",
            message: `From burg ${entity.from.burg} does not exist`,
            layer: "referential"
          });
        }
      }
      if (entity.to?.burg !== undefined) {
        if (!pack.burgs?.[entity.to.burg] || pack.burgs[entity.to.burg].removed) {
          errors.push({
            field: "to.burg",
            code: "INVALID_REF",
            message: `To burg ${entity.to.burg} does not exist`,
            layer: "referential"
          });
        }
      }
      break;

    case "zone":
      // State reference (if provided)
      if (entity.state !== undefined && entity.state !== 0) {
        if (!pack.states?.[entity.state] || pack.states[entity.state].removed) {
          errors.push({
            field: "state",
            code: "INVALID_REF",
            message: `State ${entity.state} does not exist`,
            layer: "referential"
          });
        }
      }
      // Cells must be valid
      if (entity.cells?.length) {
        entity.cells.forEach((cellId, idx) => {
          if (!pack.cells?.i || cellId >= pack.cells.i.length) {
            errors.push({
              field: `cells[${idx}]`,
              code: "INVALID_REF",
              message: `Cell ${cellId} is out of range`,
              layer: "referential"
            });
          }
        });
      }
      break;
  }

  return errors;
}

// ============================================================================
// Layer 3: Semantic Validation
// ============================================================================

/**
 * Validate business rules and logical consistency
 * @param {Object} entity - Entity data to validate
 * @param {string} entityType - Type of entity
 * @param {Object} pack - Pack data for context
 * @param {Object} allChanges - All changes in the batch (for cross-entity validation)
 * @returns {Object} {errors: [], warnings: []}
 */
export function validateSemantics(entity, entityType, pack, allChanges) {
  const errors = [];
  const warnings = [];
  if (!pack) return {errors, warnings};

  switch (entityType) {
    case "state":
      // Capital burg must belong to this state
      if (entity.capital && entity.capital !== 0 && pack.burgs?.[entity.capital]) {
        const capitalBurg = pack.burgs[entity.capital];
        if (capitalBurg.state !== entity.i) {
          errors.push({
            field: "capital",
            code: "CAPITAL_WRONG_STATE",
            message: `Capital burg ${entity.capital} belongs to state ${capitalBurg.state}, not ${entity.i}`,
            layer: "semantic"
          });
        }
      }

      // State cannot be its own neighbor
      if (entity.neighbors?.includes(entity.i)) {
        errors.push({
          field: "neighbors",
          code: "SELF_NEIGHBOR",
          message: `State cannot be its own neighbor`,
          layer: "semantic"
        });
      }

      // Diplomacy array should be reciprocal (checked in batch validation)
      break;

    case "burg":
      // Capital burg: only one per state
      if (entity.capital && entity.state) {
        const otherCapital = pack.burgs?.find(
          b => b && !b.removed && b.i !== entity.i && b.state === entity.state && b.capital
        );
        if (otherCapital) {
          errors.push({
            field: "capital",
            code: "DUPLICATE_CAPITAL",
            message: `State ${entity.state} already has capital burg ${otherCapital.i}`,
            layer: "semantic"
          });
        }
      }

      // Port requires coastal cell
      if (entity.port && entity.cell !== undefined && pack.cells) {
        const cellHeight = pack.cells.h?.[entity.cell];
        const coastDistance = pack.cells.t?.[entity.cell];
        // Port should be on coast (t = -1 or 1)
        if (coastDistance !== undefined && Math.abs(coastDistance) > 1) {
          warnings.push({
            field: "port",
            code: "PORT_NOT_COASTAL",
            message: `Port burg ${entity.i} cell ${entity.cell} is not coastal (t=${coastDistance})`
          });
        }
      }

      // Burg coordinates should be near its cell center
      if (entity.cell !== undefined && entity.x !== undefined && entity.y !== undefined && pack.cells?.p) {
        const cellCenter = pack.cells.p[entity.cell];
        if (cellCenter) {
          const dx = Math.abs(entity.x - cellCenter[0]);
          const dy = Math.abs(entity.y - cellCenter[1]);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 50) {
            // Arbitrary threshold
            warnings.push({
              field: "x,y",
              code: "BURG_FAR_FROM_CELL",
              message: `Burg ${entity.i} is ${Math.round(distance)} units from cell ${entity.cell} center`
            });
          }
        }
      }
      break;

    case "marker":
      // Marker cell should match coordinates
      if (entity.cell !== undefined && entity.x !== undefined && entity.y !== undefined && pack.cells?.p) {
        const cellCenter = pack.cells.p[entity.cell];
        if (cellCenter) {
          const dx = Math.abs(entity.x - cellCenter[0]);
          const dy = Math.abs(entity.y - cellCenter[1]);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 30) {
            warnings.push({
              field: "cell",
              code: "MARKER_FAR_FROM_CELL",
              message: `Marker ${entity.i} is ${Math.round(distance)} units from specified cell ${entity.cell}`
            });
          }
        }
      }
      break;

    case "province":
      // Province burg should be in the province's state
      if (entity.burg && entity.state && pack.burgs?.[entity.burg]) {
        const provinceBurg = pack.burgs[entity.burg];
        if (provinceBurg.state !== entity.state) {
          errors.push({
            field: "burg",
            code: "PROVINCE_BURG_WRONG_STATE",
            message: `Province burg ${entity.burg} belongs to state ${provinceBurg.state}, not ${entity.state}`,
            layer: "semantic"
          });
        }
      }
      break;

    case "river":
      // Source and mouth should be different cells
      if (entity.source === entity.mouth) {
        errors.push({
          field: "source,mouth",
          code: "RIVER_SAME_ENDPOINTS",
          message: `River source and mouth cannot be the same cell`,
          layer: "semantic"
        });
      }

      // Source should be at higher elevation than mouth (warning)
      if (entity.source !== undefined && entity.mouth !== undefined && pack.cells?.h) {
        const sourceHeight = pack.cells.h[entity.source];
        const mouthHeight = pack.cells.h[entity.mouth];
        if (sourceHeight !== undefined && mouthHeight !== undefined && sourceHeight < mouthHeight) {
          warnings.push({
            field: "source,mouth",
            code: "RIVER_UPHILL",
            message: `River flows uphill: source height ${sourceHeight} < mouth height ${mouthHeight}`
          });
        }
      }
      break;

    case "route":
      // From and to should be different
      if (entity.from && entity.to) {
        if (entity.from.burg !== undefined && entity.from.burg === entity.to.burg) {
          errors.push({
            field: "from,to",
            code: "ROUTE_SAME_ENDPOINTS",
            message: `Route cannot start and end at the same burg`,
            layer: "semantic"
          });
        }
        if (entity.from.cell !== undefined && entity.from.cell === entity.to.cell) {
          errors.push({
            field: "from,to",
            code: "ROUTE_SAME_ENDPOINTS",
            message: `Route cannot start and end at the same cell`,
            layer: "semantic"
          });
        }
      }
      break;
  }

  return {errors, warnings};
}

// ============================================================================
// ChangeSet Validation (Batch)
// ============================================================================

/**
 * Validate an entire ChangeSet as a unit
 * Catches cross-entity issues like asymmetric diplomacy
 * @param {Object} changeSet - {create: {...}, update: {...}, delete: {...}}
 * @param {Object} pack - Pack data for context
 * @returns {Object} {errors: [], warnings: []}
 */
export function validateChangeSet(changeSet, pack) {
  const errors = [];
  const warnings = [];

  // First, validate each entity individually
  if (changeSet.create) {
    for (const [entityType, entities] of Object.entries(changeSet.create)) {
      if (!entities?.length) continue;
      const singularType = entityType.replace(/s$/, ""); // states -> state
      entities.forEach((entity, idx) => {
        const schemaErrors = validateSchema(entity, singularType, "create");
        schemaErrors.forEach(e => {
          e.field = `create.${entityType}[${idx}].${e.field}`;
          errors.push(e);
        });

        if (schemaErrors.length === 0) {
          const refErrors = validateReferences(entity, singularType, pack);
          refErrors.forEach(e => {
            e.field = `create.${entityType}[${idx}].${e.field}`;
            errors.push(e);
          });

          const {errors: semErrors, warnings: semWarnings} = validateSemantics(
            entity,
            singularType,
            pack,
            changeSet
          );
          semErrors.forEach(e => {
            e.field = `create.${entityType}[${idx}].${e.field}`;
            errors.push(e);
          });
          semWarnings.forEach(w => {
            w.field = `create.${entityType}[${idx}].${w.field}`;
            warnings.push(w);
          });
        }
      });
    }
  }

  if (changeSet.update) {
    for (const [entityType, updates] of Object.entries(changeSet.update)) {
      if (!updates?.length) continue;
      const singularType = entityType.replace(/s$/, "");
      updates.forEach((update, idx) => {
        // For updates, validate schema with "update" mode
        const schemaErrors = validateSchema(update, singularType, "update");
        schemaErrors.forEach(e => {
          e.field = `update.${entityType}[${idx}].${e.field}`;
          errors.push(e);
        });
      });
    }
  }

  // Cross-entity validation: Diplomacy reciprocity
  if (changeSet.update?.states || changeSet.create?.states) {
    const stateChanges = [...(changeSet.create?.states || []), ...(changeSet.update?.states || [])];

    // Build a map of all diplomacy changes
    const diplomacyChanges = new Map();
    stateChanges.forEach(state => {
      if (state.diplomacy) {
        diplomacyChanges.set(state.i, state.diplomacy);
      }
    });

    // Check reciprocity for each diplomacy change
    diplomacyChanges.forEach((diplomacy, stateId) => {
      diplomacy.forEach((relation, targetId) => {
        if (!relation || relation === "x" || targetId === 0) return;

        // Check if target also has a diplomacy entry for this state
        const targetDiplomacy = diplomacyChanges.get(targetId);
        if (!targetDiplomacy) {
          // Target state not in changeSet - check if relation matches existing
          const existingTarget = pack?.states?.[targetId];
          if (existingTarget?.diplomacy?.[stateId] !== relation) {
            errors.push({
              field: `states.diplomacy`,
              code: "ASYMMETRIC_DIPLOMACY",
              message: `State ${stateId} sets ${relation} with ${targetId}, but ${targetId}'s diplomacy is not updated to match`,
              layer: "semantic"
            });
          }
        } else {
          // Target state is in changeSet - check if its diplomacy matches
          if (targetDiplomacy[stateId] !== relation) {
            errors.push({
              field: `states.diplomacy`,
              code: "ASYMMETRIC_DIPLOMACY",
              message: `State ${stateId} sets ${relation} with ${targetId}, but ${targetId} sets ${targetDiplomacy[stateId] || "nothing"} with ${stateId}`,
              layer: "semantic"
            });
          }
        }
      });
    });
  }

  return {errors, warnings};
}

// ============================================================================
// Exports
// ============================================================================

export const Validators = {
  validateSchema,
  validateReferences,
  validateSemantics,
  validateChangeSet,
  SCHEMAS,
  ENUMS
};

// Window exposure for backward compatibility
if (typeof window !== "undefined") {
  window.Validators = Validators;
}
