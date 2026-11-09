"use strict";

/**
 * Spec Options
 *
 * Pure helpers that translate world-spec fields into FMG option values:
 *  - climate latitude / zone → map size and latitude sliders (globe position)
 *  - states' relations and conflict type → diplomacy matrix
 *  - world name → map name
 *
 * No DOM access here so everything is unit-testable in Node.
 */

/** Named latitude bands (north edge, south edge in degrees). */
export const CLIMATE_ZONES = {
  equatorial: {north: 12, south: -12},
  tropical: {north: 23, south: -5},
  subtropical: {north: 38, south: 12},
  mediterranean: {north: 45, south: 28},
  temperate: {north: 58, south: 32},
  continental: {north: 62, south: 40},
  boreal: {north: 72, south: 52},
  subarctic: {north: 72, south: 52},
  polar: {north: 88, south: 66},
  arctic: {north: 88, south: 66}
};

export const DEFAULT_LATITUDE = {north: 58, south: 32}; // temperate

export const RELATIONS = ["Ally", "Friendly", "Neutral", "Suspicion", "Rival", "Enemy", "Vassal", "Suzerain", "Unknown"];

const clampLat = v => Math.max(-90, Math.min(90, v));

/**
 * Resolve the latitude band a spec asks for.
 * Accepts climate.latitude {north, south}, climate.zone (see CLIMATE_ZONES),
 * optional climate.hemisphere "south" to mirror a zone, else the default band.
 */
export function resolveLatitudeBand(climate = {}) {
  const explicit = climate.latitude;
  if (explicit && typeof explicit.north === "number" && typeof explicit.south === "number") {
    const north = clampLat(Math.max(explicit.north, explicit.south));
    const south = clampLat(Math.min(explicit.north, explicit.south));
    if (north - south >= 1) return {north, south, source: "latitude"};
  }

  const zone = String(climate.zone || "").toLowerCase();
  if (CLIMATE_ZONES[zone]) {
    let {north, south} = CLIMATE_ZONES[zone];
    if (String(climate.hemisphere || "").toLowerCase().startsWith("s")) [north, south] = [-south, -north];
    return {north, south, source: "zone"};
  }

  return {...DEFAULT_LATITUDE, source: "default"};
}

/**
 * Convert a latitude band into FMG's mapSize / latitude / longitude option
 * percentages (the three sliders calculateMapCoordinates() reads).
 *
 * FMG: latT = mapSize% * 1.8; latN = 90 - (180 - latT) * latitude%/100.
 */
export function latitudeBandToMapOptions({north, south}) {
  const latT = Math.max(1.8, north - south);
  const mapSize = round1((latT / 180) * 100);
  const latitude = latT >= 180 ? 50 : round1(((90 - north) / (180 - latT)) * 100);
  return {
    mapSize: Math.max(1, Math.min(100, mapSize)),
    latitude: Math.max(0, Math.min(100, latitude)),
    longitude: 50
  };
}

/** Inverse of latitudeBandToMapOptions, for assertions and reporting. */
export function mapOptionsToLatitudeBand({mapSize, latitude}) {
  const latT = (mapSize / 100) * 180;
  const north = 90 - (180 - latT) * (latitude / 100);
  return {north: round1(north), south: round1(north - latT)};
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

// ============================================================================
// Winds and longitude
// ============================================================================

/**
 * FMG wind angles are "blowing from": 90 = westerly, 270 = easterly,
 * 180 = northerly, 0/360 = southerly. One angle per 30° latitude tier (6 tiers).
 */
export const WIND_ANGLES = {west: 90, westerly: 90, east: 270, easterly: 270, north: 180, northerly: 180, south: 0, southerly: 0};
export const DEFAULT_WINDS = [225, 45, 225, 315, 135, 315];

/** Resolve climate.prevailingWind / climate.winds into FMG's 6-tier wind array, or null for default. */
export function resolveWinds(climate = {}) {
  if (Array.isArray(climate.winds) && climate.winds.length === 6 && climate.winds.every(v => typeof v === "number")) {
    return climate.winds.map(v => ((v % 360) + 360) % 360);
  }
  const key = String(climate.prevailingWind || "").toLowerCase();
  if (key in WIND_ANGLES) return new Array(6).fill(WIND_ANGLES[key]);
  if (typeof climate.prevailingWind === "number") return new Array(6).fill(((climate.prevailingWind % 360) + 360) % 360);
  return null;
}

/**
 * Longitude slider (%) that centres the map on `centerDeg`.
 * FMG: lonT = min(aspect * latT, 360); lonE = 180 - (360 - lonT) * shift.
 */
export function longitudeToOption(centerDeg, {north, south}, aspect) {
  const latT = Math.max(1.8, north - south);
  const lonT = Math.min(aspect * latT, 360);
  if (lonT >= 360) return 50;
  const center = Math.max(-180, Math.min(180, centerDeg));
  const shift = ((180 - lonT / 2 - center) / (360 - lonT)) * 100;
  return Math.round(Math.max(0, Math.min(100, shift)) * 10) / 10;
}

// ============================================================================
// Diplomacy
// ============================================================================

/**
 * Build FMG diplomacy arrays for the spec's states.
 *
 * @param {object[]} specStates   spec states in order (index i → pack state i+1)
 * @param {object}   worldAnalysis spec.worldAnalysis (conflictType)
 * @param {object[]} locations    spec locations (capital positions decide sides)
 * @returns {string[][]} matrix indexed by pack state id (0 = Neutrals, "x" on the diagonal)
 */
export function buildDiplomacy(specStates = [], worldAnalysis = {}, locations = []) {
  const n = specStates.length + 1;
  const matrix = Array.from({length: n}, () => new Array(n).fill("Neutral"));
  for (let i = 0; i < n; i++) matrix[i][i] = "x";
  matrix[0] = []; // Neutrals row is FMG's chronicle

  const indexById = new Map(specStates.map((s, i) => [s.id, i + 1]));
  const indexByName = new Map(specStates.map((s, i) => [String(s.name || "").toLowerCase(), i + 1]));
  const resolve = ref => indexById.get(ref) ?? indexByName.get(String(ref || "").toLowerCase()) ?? 0;

  // 1. Territorial warfare: states on opposite sides of the front are enemies
  const conflict = String(worldAnalysis?.conflictType || "");
  if (conflict.startsWith("territorial_warfare_")) {
    const axis = conflict.replace("territorial_warfare_", "");
    const horizontal = axis === "east" || axis === "west";
    const positions = specStates
      .map((s, i) => {
        const capital = locations.find(l => l.id === s.capital);
        return capital ? {index: i + 1, pos: horizontal ? capital.x : capital.y} : null;
      })
      .filter(Boolean);
    if (positions.length >= 2) {
      const sorted = [...positions].sort((a, b) => a.pos - b.pos);
      const midpoint = (sorted[0].pos + sorted[sorted.length - 1].pos) / 2;
      const sideOf = p => (p.pos < midpoint ? "low" : "high");
      for (const a of positions) {
        for (const b of positions) {
          if (a.index === b.index) continue;
          const relation = sideOf(a) === sideOf(b) ? "Ally" : "Enemy";
          matrix[a.index][b.index] = relation;
        }
      }
    }
  }

  // 2. Explicit relations win
  for (let i = 0; i < specStates.length; i++) {
    const from = i + 1;
    for (const rel of specStates[i].relations || []) {
      const to = resolve(rel.state);
      const relation = normalizeRelation(rel.relation);
      if (!to || to === from || !relation) continue;
      matrix[from][to] = relation;
      matrix[to][from] = reciprocal(relation);
    }
  }

  return matrix;
}

export function normalizeRelation(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;
  const map = {
    ally: "Ally",
    allied: "Ally",
    alliance: "Ally",
    friendly: "Friendly",
    friend: "Friendly",
    neutral: "Neutral",
    suspicion: "Suspicion",
    suspicious: "Suspicion",
    rival: "Rival",
    rivalry: "Rival",
    enemy: "Enemy",
    war: "Enemy",
    hostile: "Enemy",
    vassal: "Vassal",
    suzerain: "Suzerain",
    overlord: "Suzerain",
    unknown: "Unknown"
  };
  return map[v] || null;
}

function reciprocal(relation) {
  if (relation === "Vassal") return "Suzerain";
  if (relation === "Suzerain") return "Vassal";
  return relation;
}

// ============================================================================
// Map name
// ============================================================================

export function mapNameFromSpec(spec) {
  const candidates = [spec?.name, spec?.worldAnalysis?.worldName, spec?.worldAnalysis?.name, spec?.title];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 60);
  }
  return null;
}

export const SpecOptions = {
  WIND_ANGLES,
  DEFAULT_WINDS,
  resolveWinds,
  longitudeToOption,
  CLIMATE_ZONES,
  DEFAULT_LATITUDE,
  RELATIONS,
  resolveLatitudeBand,
  latitudeBandToMapOptions,
  mapOptionsToLatitudeBand,
  buildDiplomacy,
  normalizeRelation,
  mapNameFromSpec
};

if (typeof window !== "undefined") {
  window.SpecOptions = SpecOptions;
}
