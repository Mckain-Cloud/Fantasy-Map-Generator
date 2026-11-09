/**
 * World Specification Validator Module
 *
 * Validates heightmap DSL commands and world specification objects.
 */

// ============================================================================
// Heightmap Command Patterns
// ============================================================================

const COMMAND_PATTERNS = [
    /^Hill\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Range\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Trough\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Pit\s+\d+\s+\d+-\d+\s+\d+-\d+\s+\d+-\d+$/,
    /^Strait\s+\d+(\.\d+)?\s+(vertical|horizontal)$/i,
    /^Smooth\s+\d+(\.\d+)?$/,
    /^Mask\s+\d+(\.\d+)?$/,
    /^Add\s+-?\d+(\.\d+)?\s+\d+-\d+\s+\d+-\d+$/,
    /^Multiply\s+[\d.]+\s+(land|sea)$/i
];

// ============================================================================
// Valid Enum Values
// ============================================================================

const VALID_CONFLICT_TYPES = [
    "territorial_warfare_north",
    "territorial_warfare_south",
    "territorial_warfare_east",
    "territorial_warfare_west",
    "mobile_threat",
    "civil_unrest",
    "personal_conflict",
    "none",  // OpenAI-compatible null equivalent
    null
];

const VALID_ZONE_TYPES = ["Disaster", "Invasion", "Rebels", "Disease", "Eruption", "Flood"];

// Deterministic terrain feature types (must match terrain-painter.js FEATURE_TYPES)
export const VALID_FEATURE_TYPES = [
    "landmass", "continent", "island", "peninsula", "plateau", "highlands", "lowlands", "plains",
    "mountains", "ridge", "hills", "volcano", "valley", "canyon",
    "lake", "sea", "bay", "gulf", "inlet", "strait", "channel", "fjord"
];
export const LINE_FEATURE_TYPES = ["mountains", "ridge", "hills", "volcano", "valley", "canyon", "strait", "channel", "fjord"];

const VALID_TEMPLATES = [
    "continents",
    "archipelago",
    "peninsula",
    "isthmus",
    "pangea",
    "atoll",
    "mediterranean",
    "highIsland",
    "lowIsland"
];

// Helper to check if value represents "no value"
function isNone(val) {
    return val === null || val === undefined || val === "none" || val === -1;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single heightmap DSL command.
 * @param {string} cmd - The command string to validate
 * @returns {boolean} - Whether the command is valid
 */
export function validateHeightmapCommand(cmd) {
    if (!cmd || typeof cmd !== "string") return false;
    // Strip comments before validation
    const cleaned = cmd.split('#')[0].trim();
    return COMMAND_PATTERNS.some(pattern => pattern.test(cleaned));
}

/**
 * Validate a coordinate value (0-1 range).
 * @param {number} val - The coordinate value
 * @returns {boolean} - Whether the value is in valid range
 */
export function validateCoordinate(val) {
    return typeof val === "number" && val >= 0 && val <= 1;
}

/**
 * Validate a radius value (should be positive and reasonable).
 * @param {number} val - The radius value
 * @returns {boolean} - Whether the value is reasonable
 */
export function validateRadius(val) {
    return typeof val === "number" && val > 0 && val <= 1;
}

/**
 * Validate conflict type field.
 * @param {string|null} val - The conflict type value
 * @returns {boolean} - Whether the value is valid
 */
export function validateConflictType(val) {
    return VALID_CONFLICT_TYPES.includes(val);
}

/**
 * Parse combined conflictType to extract base type and axis.
 * @param {string|null} val - The conflict type value
 * @returns {object} - { type: string|null, axis: string|null }
 */
export function parseConflictType(val) {
    if (isNone(val)) return { type: null, axis: null };

    if (val.startsWith("territorial_warfare_")) {
        return {
            type: "territorial_warfare",
            axis: val.replace("territorial_warfare_", "")
        };
    }

    return { type: val, axis: null };
}

// ============================================================================
// World Specification Analysis
// ============================================================================

/**
 * Analyze a world specification for validity and issues.
 * @param {object} spec - The world specification object
 * @returns {object} - Analysis result with valid flag, issues, and warnings
 */
export function analyzeWorldSpec(spec) {
    const issues = [];
    const warnings = [];
    const validCommands = [];
    const invalidCommands = [];

    // Check required top-level properties
    if (!spec) {
        return {
            valid: false,
            validCommands: [],
            invalidCommands: [],
            issues: ["World specification is null or undefined"],
            warnings: []
        };
    }

    // Validate worldAnalysis
    if (spec.worldAnalysis) {
        validateWorldAnalysis(spec.worldAnalysis, issues, warnings);
    } else {
        warnings.push("Missing worldAnalysis section");
    }

    // Validate terrain
    if (!spec.terrain) {
        issues.push("Missing terrain section");
    } else {
        const hasFeatures = Array.isArray(spec.terrain.features) && spec.terrain.features.length > 0;

        // Validate deterministic terrain features (preferred)
        if (spec.terrain.features !== undefined && !Array.isArray(spec.terrain.features)) {
            issues.push("terrain.features must be an array");
        } else if (hasFeatures) {
            spec.terrain.features.forEach((feature, index) => validateTerrainFeature(feature, index, issues, warnings));
        }

        // Validate heightmap commands (legacy)
        if (!spec.terrain.heightmapCommands) {
            if (!hasFeatures) issues.push("Missing terrain.features (or legacy heightmapCommands)");
        } else {
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
        }

        // Validate template
        if (spec.terrain.template && !VALID_TEMPLATES.includes(spec.terrain.template)) {
            warnings.push(`Unknown terrain template: ${spec.terrain.template}`);
        }
    }

    // Validate locations
    if (!spec.locations) {
        issues.push("Missing locations array");
    } else {
        for (const loc of spec.locations) {
            validateLocation(loc, issues, warnings);
        }
    }

    // Validate zones
    if (spec.zones) {
        for (const zone of spec.zones) {
            validateZone(zone, issues, warnings);
        }
    }

    // Validate state-location references
    const locationIds = new Set((spec.locations || []).map(l => l.id));
    if (spec.states) {
        for (const state of spec.states) {
            if (!state.id) {
                issues.push(`State "${state.name || "unnamed"}" missing id`);
            }
            if (!state.name) {
                issues.push(`State with id "${state.id}" missing name`);
            }
            if (state.capital && !locationIds.has(state.capital)) {
                issues.push(`State "${state.name || state.id}" references unknown capital: ${state.capital}`);
            }
            if (state.locations) {
                for (const locId of state.locations) {
                    if (!locationIds.has(locId)) {
                        warnings.push(`State "${state.name || state.id}" references unknown location: ${locId}`);
                    }
                }
            }
        }
    }

    // Validate location-state ownership references
    const stateIds = new Set((spec.states || []).map(s => s.id));
    if (spec.locations) {
        for (const loc of spec.locations) {
            if (loc.owner && loc.owner !== "" && loc.owner !== "none" && !stateIds.has(loc.owner)) {
                warnings.push(`Location "${loc.name || loc.id}" references unknown owner: ${loc.owner}`);
            }
        }
    }

    // Validate border references
    if (spec.borders) {
        for (const border of spec.borders) {
            if (!border.between || !Array.isArray(border.between) || border.between.length < 2) {
                // a malformed border hint is dropped by cleanupWorldSpec; it must not block the map
                warnings.push(`Border "${border.name || "unnamed"}" has no valid 'between' pair and will be ignored`);
            } else {
                for (const stateId of border.between) {
                    if (!stateIds.has(stateId)) {
                        warnings.push(`Border references unknown state: ${stateId}`);
                    }
                }
            }
        }
    }

    // Validate culture references in states
    const cultureIds = new Set((spec.cultures || []).map(c => c.id));
    if (spec.states) {
        for (const state of spec.states) {
            if (state.culture && !cultureIds.has(state.culture)) {
                warnings.push(`State "${state.name || state.id}" references unknown culture: ${state.culture}`);
            }
        }
    }

    // Validate territorial coherence if applicable
    const territorialIssues = validateTerritorialCoherence(spec);
    if (territorialIssues.length > 0) {
        warnings.push(...territorialIssues);
    }

    return {
        valid: issues.length === 0,
        validCommands,
        invalidCommands,
        issues,
        warnings
    };
}

/**
 * Validate a single deterministic terrain feature
 */
function validateTerrainFeature(feature, index, issues, warnings) {
    const label = `Terrain feature #${index + 1}${feature?.id ? ` "${feature.id}"` : ""}`;
    if (!feature || typeof feature !== "object") {
        issues.push(`${label} is not an object`);
        return;
    }
    const type = String(feature.type || "").toLowerCase();
    if (!VALID_FEATURE_TYPES.includes(type)) {
        issues.push(`${label} has unknown type "${feature.type}". Valid: ${VALID_FEATURE_TYPES.join(", ")}`);
    }
    if (!Array.isArray(feature.points) || feature.points.length === 0) {
        issues.push(`${label} has no points`);
    } else {
        const bad = feature.points.filter(p => !Array.isArray(p) || p.length < 2 || !validateCoordinate(p[0]) || !validateCoordinate(p[1]));
        if (bad.length) issues.push(`${label} has ${bad.length} point(s) outside the 0-1 range`);
        const isLine = LINE_FEATURE_TYPES.includes(type);
        if (!isLine && feature.points.length === 2) {
            warnings.push(`${label} has 2 points; areas need 3+ points for a polygon or 1 point + radius for a circle`);
        }
        if (isLine && feature.points.length < 2) {
            warnings.push(`${label} is a line feature with a single point; it will be painted as a round peak`);
        }
        if (!isLine && feature.points.length < 3 && feature.radius !== undefined && feature.radius !== null && feature.radius !== 0 && !validateRadius(feature.radius)) {
            issues.push(`${label} has invalid radius ${feature.radius}`);
        }
    }
    for (const key of ["height", "depth"]) {
        const v = feature[key];
        if (v !== undefined && v !== null && v !== 0 && (typeof v !== "number" || v < 0 || v > 100)) {
            issues.push(`${label} has invalid ${key} ${v} (expected 0-100)`);
        }
    }
    for (const key of ["width", "falloff"]) {
        const v = feature[key];
        if (v !== undefined && v !== null && v !== 0 && (typeof v !== "number" || v <= 0 || v > 0.5)) {
            warnings.push(`${label} has unusual ${key} ${v} (expected 0-0.5 of map width)`);
        }
    }
}

/**
 * Validate worldAnalysis section
 */
function validateWorldAnalysis(analysis, issues, warnings) {
    // Required fields
    if (!analysis.summary) {
        warnings.push("worldAnalysis missing summary");
    }
    if (!analysis.setting) {
        warnings.push("worldAnalysis missing setting");
    }

    // Validate conflict fields
    if (analysis.conflictType !== undefined && !validateConflictType(analysis.conflictType)) {
        issues.push(`Invalid conflictType: ${analysis.conflictType}`);
    }
}

/**
 * Validate a single location
 */
function validateLocation(loc, issues, warnings) {
    if (!loc.id) {
        issues.push(`Location "${loc.name || "unnamed"}" missing id`);
    }
    if (!loc.name) {
        issues.push(`Location with id "${loc.id}" missing name`);
    }
    if (!validateCoordinate(loc.x) || !validateCoordinate(loc.y)) {
        issues.push(`Location "${loc.name || loc.id}" has invalid coordinates: (${loc.x}, ${loc.y})`);
    }
}

/**
 * Validate a single zone
 */
function validateZone(zone, issues, warnings) {
    if (!zone.name) {
        issues.push("Zone missing name");
    }
    if (!zone.center || !validateCoordinate(zone.center.x) || !validateCoordinate(zone.center.y)) {
        issues.push(`Zone "${zone.name || "unnamed"}" has invalid center coordinates`);
    }
    if (!validateRadius(zone.radius)) {
        warnings.push(`Zone "${zone.name || "unnamed"}" has unusual radius: ${zone.radius}`);
    }
    if (zone.type && !VALID_ZONE_TYPES.includes(zone.type)) {
        warnings.push(`Zone "${zone.name || "unnamed"}" has non-standard type: ${zone.type}`);
    }
}

/**
 * Validate territorial coherence for territorial warfare specs
 * Checks that enemy-owned locations are on the enemy side of the map.
 * Returns array of warning messages
 */
function validateTerritorialCoherence(spec) {
    const warnings = [];
    const analysis = spec.worldAnalysis;

    // Parse combined conflict type
    const { type: conflictType, axis } = parseConflictType(analysis?.conflictType);

    // Only validate if territorial warfare with axis
    if (!analysis || conflictType !== "territorial_warfare" || !axis) {
        return warnings;
    }

    const locations = spec.locations || [];
    const states = spec.states || [];

    // Find states with capitals to determine sides
    const statesWithCapitals = states.map(s => {
        const capitalLoc = locations.find(l => l.id === s.capital);
        if (!capitalLoc) return null;
        const pos = (axis === "east" || axis === "west") ? capitalLoc.x : capitalLoc.y;
        return { stateId: s.id, pos };
    }).filter(Boolean);

    if (statesWithCapitals.length < 2) {
        return warnings;
    }

    // Sort to find midpoint
    statesWithCapitals.sort((a, b) => a.pos - b.pos);
    const midpoint = (statesWithCapitals[0].pos + statesWithCapitals[statesWithCapitals.length - 1].pos) / 2;

    // Identify attacker states (higher pos for east/south, lower for west/north)
    const attackerStates = new Set();
    for (const { stateId, pos } of statesWithCapitals) {
        if (axis === "east" || axis === "south") {
            if (pos > midpoint) attackerStates.add(stateId);
        } else {
            if (pos < midpoint) attackerStates.add(stateId);
        }
    }

    // Check each location
    for (const loc of locations) {
        if (!loc.owner || loc.owner === "none") continue;

        const isAttackerOwned = attackerStates.has(loc.owner);
        if (!isAttackerOwned) continue;

        const coord = (axis === "east" || axis === "west") ? loc.x : loc.y;

        // Attacker locations should be on attacker side
        const onWrongSide = (axis === "east" || axis === "south")
            ? coord < midpoint - 0.1
            : coord > midpoint + 0.1;

        if (onWrongSide) {
            warnings.push(
                `Location "${loc.name}" is owned by attacker faction but positioned on defender side. ` +
                `Consider using owner:"none" for contested/overrun locations.`
            );
        }
    }

    return warnings;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a heightmap command into its components.
 * @param {string} cmd - The command string
 * @returns {object|null} - Parsed command object or null if invalid
 */
export function parseHeightmapCommand(cmd) {
    if (!validateHeightmapCommand(cmd)) return null;

    const parts = cmd.trim().split(/\s+/);
    const type = parts[0];

    switch (type) {
        case "Hill":
        case "Range":
        case "Trough":
        case "Pit":
            return {
                type,
                count: parseInt(parts[1], 10),
                height: parts[2],
                rangeX: parts[3],
                rangeY: parts[4]
            };

        case "Strait":
            return {
                type,
                width: parseInt(parts[1], 10),
                direction: parts[2].toLowerCase()
            };

        case "Smooth":
        case "Mask":
            return {
                type,
                strength: parseInt(parts[1], 10)
            };

        case "Add":
            return {
                type,
                amount: parseInt(parts[1], 10),
                rangeX: parts[2],
                rangeY: parts[3]
            };

        case "Multiply":
            return {
                type,
                factor: parseFloat(parts[1]),
                target: parts[2].toLowerCase()
            };

        default:
            return null;
    }
}

/**
 * Get statistics about a world specification.
 * @param {object} spec - The world specification object
 * @returns {object} - Statistics about the spec
 */
export function getWorldSpecStats(spec) {
    const analysis = analyzeWorldSpec(spec);

    // Parse combined conflict type
    const rawConflictType = isNone(spec.worldAnalysis?.conflictType) ? null : spec.worldAnalysis.conflictType;
    const { type: conflictType, axis: conflictAxis } = parseConflictType(rawConflictType);

    return {
        terrainFeatures: spec.terrain?.features?.length || 0,
        heightmapCmds: spec.terrain?.heightmapCommands?.length || 0,
        validCmds: analysis.validCommands.length,
        invalidCmds: analysis.invalidCommands.length,
        locations: spec.locations?.length || 0,
        states: spec.states?.length || 0,
        cultures: spec.cultures?.length || 0,
        religions: spec.religions?.length || 0,
        zones: spec.zones?.length || 0,
        borders: spec.borders?.length || 0,
        issues: analysis.issues.length,
        warnings: analysis.warnings.length,
        valid: analysis.valid,
        conflictType: rawConflictType,
        parsedType: conflictType,
        conflictAxis
    };
}

/**
 * Check if a world spec has territorial warfare that should be validated
 * @param {object} spec - The world specification object
 * @returns {boolean}
 */
export function hasTerritorialWarfare(spec) {
    const { type } = parseConflictType(spec.worldAnalysis?.conflictType);
    return type === "territorial_warfare";
}

/**
 * Get conflict summary for a world spec
 * @param {object} spec - The world specification object
 * @returns {object} - Summary of conflict configuration
 */
export function getConflictSummary(spec) {
    const analysis = spec.worldAnalysis;
    const rawConflictType = isNone(analysis?.conflictType) ? null : analysis.conflictType;
    const { type: conflictType, axis: conflictAxis } = parseConflictType(rawConflictType);

    if (!analysis || !conflictType) {
        return {
            hasConflict: false,
            type: null,
            description: "No conflict defined"
        };
    }

    const descriptions = {
        territorial_warfare: `Territorial warfare with threat from the ${conflictAxis || "unknown direction"}`,
        mobile_threat: "Mobile threat (dragon, monster, raiders) - no fixed front line",
        civil_unrest: "Civil unrest - populations intermingled in same territory",
        personal_conflict: "Personal conflict (feuds, vendettas) - not territorial"
    };

    return {
        hasConflict: true,
        type: conflictType,
        rawType: rawConflictType,
        axis: conflictAxis,
        requiresTerritorialValidation: conflictType === "territorial_warfare",
        description: descriptions[conflictType] || `Unknown conflict type: ${conflictType}`
    };
}