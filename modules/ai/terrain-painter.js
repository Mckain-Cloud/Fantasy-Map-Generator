"use strict";

/**
 * Terrain Painter
 *
 * Deterministically rasterizes a list of declarative terrain features onto a
 * grid of points, producing FMG heights (0-100, where 20 is sea level).
 *
 * This replaces the stochastic heightmap DSL ("Hill 3 40-55 60-75 30-50") for
 * AI-directed maps. The DSL picks random points inside a box and grows random
 * blobs, so there is no guarantee that "mountains in the northeast" land where
 * the AI also placed its mountain fortress. Here every feature is an explicit
 * shape in normalized map coordinates (0-1, x west→east, y north→south), and
 * the painter puts it exactly there. The only randomness is a seeded noise
 * field used to roughen coastlines and ridge lines, so identical input always
 * yields identical output.
 *
 * The module is pure: no DOM, no globals. It runs in the browser and in Node
 * (vitest) unchanged.
 *
 * Feature shape:
 *   {
 *     id?: string,
 *     type: "landmass" | "island" | "plateau" | "highlands" | "lowlands" |
 *           "mountains" | "hills" | "valley" | "canyon" |
 *           "lake" | "sea" | "bay" | "gulf" | "strait" | "fjord",
 *     points: [[x, y], ...],  // normalized 0-1. Areas: polygon (>=3 points) or
 *                             // a single center point + radius (circle).
 *                             // Lines: polyline (>=2 points) or single peak.
 *     radius?: number,        // circle radius for 1-point areas (normalized)
 *     height?: number,        // target height (areas, ridges) or water level
 *     depth?: number,         // how much to lower land (valley, canyon)
 *     width?: number,         // half-width of a line feature (normalized)
 *     falloff?: number,       // area edge ramp width (normalized)
 *     roughness?: number      // 0-1, edge/ridge noise amplitude
 *   }
 *
 * Terrain object:
 *   {
 *     base?: "ocean" | "land",   // what the empty map is (default ocean)
 *     features: Feature[],
 *     smooth?: number,           // smoothing passes (default 1)
 *     texture?: number           // land relief noise amplitude (default 4)
 *   }
 */

import {aleaPRNG} from "../../utils/aleaWrapper.js";

export const SEA_LEVEL = 20;
const OCEAN_FLOOR = 5;
const SHELF_FLOOR = 12;
const DEFAULT_LAND = 25;

/**
 * Feature catalogue. `kind` controls how a feature composes with the heights
 * already painted:
 *   area-land  : raise everything inside the shape to at least `height`,
 *                with a coastal ramp and an offshore shelf around the edge
 *   area-lower : lower land inside the shape to at most `height`
 *   area-water : carve water inside the shape down to `height`
 *   line-raise : ridge along a path peaking at `height`
 *   line-lower : lower land along a path by `depth` (floor stays land)
 *   line-water : carve a water channel along a path
 */
export const FEATURE_TYPES = {
  landmass: {kind: "area-land", height: 32, falloff: 0.06, roughness: 0.5},
  continent: {kind: "area-land", height: 32, falloff: 0.06, roughness: 0.5},
  island: {kind: "area-land", height: 28, falloff: 0.03, roughness: 0.5},
  peninsula: {kind: "area-land", height: 28, falloff: 0.03, roughness: 0.5},
  plateau: {kind: "area-land", height: 52, falloff: 0.025, roughness: 0.3},
  highlands: {kind: "area-land", height: 44, falloff: 0.05, roughness: 0.4},
  lowlands: {kind: "area-lower", height: 22, falloff: 0.04, roughness: 0.3},
  plains: {kind: "area-lower", height: 24, falloff: 0.04, roughness: 0.3},
  mountains: {kind: "line-raise", height: 85, width: 0.045, roughness: 0.6},
  ridge: {kind: "line-raise", height: 70, width: 0.03, roughness: 0.5},
  hills: {kind: "line-raise", height: 50, width: 0.06, roughness: 0.5},
  volcano: {kind: "line-raise", height: 95, width: 0.03, roughness: 0.2},
  valley: {kind: "line-lower", depth: 14, width: 0.03, roughness: 0.3},
  canyon: {kind: "line-lower", depth: 25, width: 0.015, roughness: 0.2},
  lake: {kind: "area-water", height: 12, falloff: 0.008, roughness: 0.4},
  sea: {kind: "area-water", height: 5, falloff: 0.04, roughness: 0.5},
  bay: {kind: "area-water", height: 8, falloff: 0.03, roughness: 0.5},
  gulf: {kind: "area-water", height: 6, falloff: 0.04, roughness: 0.5},
  inlet: {kind: "area-water", height: 10, falloff: 0.015, roughness: 0.4},
  strait: {kind: "line-water", height: 8, width: 0.025, roughness: 0.3},
  channel: {kind: "line-water", height: 10, width: 0.02, roughness: 0.3},
  fjord: {kind: "line-water", height: 10, width: 0.012, roughness: 0.4}
};

export const FEATURE_TYPE_NAMES = Object.keys(FEATURE_TYPES);

// Order in which feature kinds are composed. Land first, then relief, then
// water last so a lake drawn inside a landmass always ends up as water.
const KIND_ORDER = ["area-land", "area-lower", "line-raise", "line-lower", "area-water", "line-water"];

// ============================================================================
// Geometry helpers (all in isotropic normalized units, see `toIso`)
// ============================================================================

export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function distanceToPolyline(px, py, path) {
  if (path.length === 1) return Math.hypot(px - path[0][0], py - path[0][1]);
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceToSegment(px, py, path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}

/** Signed distance to a polygon: positive inside, negative outside. */
export function signedDistanceToPolygon(px, py, polygon) {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const d = distanceToSegment(px, py, polygon[j][0], polygon[j][1], polygon[i][0], polygon[i][1]);
    if (d < best) best = d;
  }
  return pointInPolygon(px, py, polygon) ? best : -best;
}

/** Signed distance to a circle: positive inside. */
export function signedDistanceToCircle(px, py, cx, cy, r) {
  return r - Math.hypot(px - cx, py - cy);
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clampHeight(h) {
  return Math.max(0, Math.min(100, Math.round(h)));
}

// ============================================================================
// Seeded value noise
// ============================================================================

/**
 * Creates a deterministic 2D value-noise sampler in [-1, 1].
 * `frequency` is cycles across one unit of the isotropic coordinate space.
 */
export function createNoise(seed, {frequency = 9, octaves = 3} = {}) {
  const random = aleaPRNG(String(seed));
  const size = 256;
  const lattice = new Float32Array(size * size);
  for (let i = 0; i < lattice.length; i++) lattice[i] = random() * 2 - 1;

  const sample = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = smoothstep(x - xi);
    const fy = smoothstep(y - yi);
    const idx = (ix, iy) => lattice[(((iy % size) + size) % size) * size + (((ix % size) + size) % size)];
    const top = lerp(idx(xi, yi), idx(xi + 1, yi), fx);
    const bottom = lerp(idx(xi, yi + 1), idx(xi + 1, yi + 1), fx);
    return lerp(top, bottom, fy);
  };

  return (x, y) => {
    let amplitude = 1;
    let total = 0;
    let norm = 0;
    let freq = frequency;
    for (let o = 0; o < octaves; o++) {
      total += sample(x * freq + o * 17.3, y * freq + o * 31.7) * amplitude;
      norm += amplitude;
      amplitude *= 0.5;
      freq *= 2;
    }
    return total / norm;
  };
}

// ============================================================================
// Feature normalization
// ============================================================================

/**
 * Fill in defaults for a feature and convert its geometry to isotropic units.
 * Isotropic units: x stays 0-1 across the map width; y is scaled by the
 * aspect ratio so that one unit of distance is the same physical length on
 * both axes. Widths, radii and falloffs are therefore fractions of map width.
 */
export function normalizeFeature(feature, aspect = 1) {
  const type = String(feature.type || "").toLowerCase();
  const defaults = FEATURE_TYPES[type];
  if (!defaults) return null;

  const points = (feature.points || []).filter(p => Array.isArray(p) && p.length >= 2 && isFinite(p[0]) && isFinite(p[1]));
  if (points.length === 0) return null;

  const iso = points.map(([x, y]) => [x, y * aspect]);
  const isArea = defaults.kind.startsWith("area");

  return {
    id: feature.id || feature.label || feature.name || type,
    type,
    kind: defaults.kind,
    points: iso,
    rawPoints: points,
    isPolygon: isArea && iso.length >= 3,
    // Zero / null mean "use the default" so strict JSON schemas can require the fields
    radius: feature.radius || (isArea ? 0.1 : undefined),
    height: feature.height || defaults.height,
    depth: feature.depth || defaults.depth,
    width: feature.width || defaults.width,
    falloff: feature.falloff || defaults.falloff,
    roughness: typeof feature.roughness === "number" && feature.roughness >= 0 ? feature.roughness : defaults.roughness
  };
}

/**
 * Signed distance from an isotropic point to an area feature (positive inside).
 */
export function areaSignedDistance(feature, x, y) {
  if (feature.isPolygon) return signedDistanceToPolygon(x, y, feature.points);
  if (feature.points.length === 2) {
    // Two points + radius: a capsule (stadium) shape
    return feature.radius - distanceToPolyline(x, y, feature.points);
  }
  const [cx, cy] = feature.points[0];
  return signedDistanceToCircle(x, y, cx, cy, feature.radius);
}

// ============================================================================
// Painting
// ============================================================================

/**
 * Paint terrain heights for a set of grid points.
 *
 * @param {object} terrain   Terrain object (see module header)
 * @param {object} graph     {points: [[x,y],...], cells?: {c: neighbors[][]}}
 * @param {object} options   {width, height, seed}
 * @returns {Uint8Array}     heights per point, 0-100
 */
export function paintTerrain(terrain, graph, {width, height, seed = "terrain"}) {
  const points = graph.points;
  const n = points.length;
  const aspect = height / width;
  const heights = new Float32Array(n);

  const base = terrain?.base === "land" ? DEFAULT_LAND : OCEAN_FLOOR;
  heights.fill(base);

  const noise = createNoise(seed);
  const textureNoise = createNoise(seed + ":texture", {frequency: 14, octaves: 2});
  const texture = terrain?.texture ?? 4;

  const features = (terrain?.features || [])
    .map(f => normalizeFeature(f, aspect))
    .filter(Boolean)
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

  // Precompute isotropic coordinates once
  const ux = new Float32Array(n);
  const uy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ux[i] = points[i][0] / width;
    uy[i] = (points[i][1] / height) * aspect;
  }

  for (const f of features) {
    for (let i = 0; i < n; i++) {
      heights[i] = applyFeature(f, heights[i], ux[i], uy[i], noise);
    }
  }

  // Gentle relief on land so rivers and biomes have gradients to work with
  if (texture > 0) {
    for (let i = 0; i < n; i++) {
      if (heights[i] >= SEA_LEVEL) {
        heights[i] = Math.max(SEA_LEVEL, heights[i] + textureNoise(ux[i], uy[i]) * texture);
      }
    }
  }

  const passes = terrain?.smooth ?? 1;
  const neighbors = graph.cells?.c;
  let result = heights;
  if (neighbors && passes > 0) {
    for (let p = 0; p < passes; p++) result = smoothPass(result, neighbors);
  }

  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = clampHeight(result[i]);
  return out;
}

function applyFeature(f, h, x, y, noise) {
  switch (f.kind) {
    case "area-land": {
      const d = areaSignedDistance(f, x, y) + noise(x, y) * f.roughness * f.falloff;
      if (d >= f.falloff) return Math.max(h, f.height);
      if (d >= 0) return Math.max(h, lerp(SEA_LEVEL, f.height, smoothstep(d / f.falloff)));
      if (d >= -f.falloff) return Math.max(h, lerp(SEA_LEVEL - 1, SHELF_FLOOR, smoothstep(-d / f.falloff)));
      return h;
    }
    case "area-lower": {
      if (h < SEA_LEVEL) return h;
      const d = areaSignedDistance(f, x, y) + noise(x, y) * f.roughness * f.falloff;
      if (d <= 0) return h;
      const target = Math.max(SEA_LEVEL + 1, f.height);
      const t = smoothstep(d / f.falloff);
      return Math.min(h, lerp(h, target, t));
    }
    case "area-water": {
      const d = areaSignedDistance(f, x, y) + noise(x, y) * f.roughness * f.falloff;
      if (d <= 0) return h;
      const t = smoothstep(d / f.falloff);
      return Math.min(h, lerp(SEA_LEVEL - 1, f.height, t));
    }
    case "line-raise": {
      const dist = distanceToPolyline(x, y, f.points) + noise(x, y) * f.roughness * f.width * 0.6;
      if (dist >= f.width) return h;
      const profile = Math.pow(1 - smoothstep(dist / f.width), 1.3);
      // Peaks vary along the ridge so it is not a uniform wall
      const peak = f.height * (1 - 0.15 * Math.abs(noise(x * 2.7, y * 2.7)));
      return Math.max(h, lerp(h, peak, profile));
    }
    case "line-lower": {
      if (h < SEA_LEVEL) return h;
      const dist = distanceToPolyline(x, y, f.points) + noise(x, y) * f.roughness * f.width * 0.5;
      if (dist >= f.width) return h;
      const profile = 1 - smoothstep(dist / f.width);
      return Math.max(SEA_LEVEL + 1, h - f.depth * profile);
    }
    case "line-water": {
      const dist = distanceToPolyline(x, y, f.points) + noise(x, y) * f.roughness * f.width * 0.5;
      if (dist >= f.width) return h;
      const profile = 1 - smoothstep(dist / f.width);
      return Math.min(h, lerp(h, f.height, Math.pow(profile, 0.5)));
    }
    default:
      return h;
  }
}

function smoothPass(heights, neighbors) {
  const out = new Float32Array(heights.length);
  for (let i = 0; i < heights.length; i++) {
    const c = neighbors[i];
    if (!c || c.length === 0) {
      out[i] = heights[i];
      continue;
    }
    let sum = heights[i];
    for (const nb of c) sum += heights[nb];
    const mean = sum / (c.length + 1);
    out[i] = (heights[i] + mean) / 2;
  }
  return out;
}

// ============================================================================
// Legacy DSL bridge
// ============================================================================

/**
 * Best-effort conversion of legacy heightmap DSL commands into deterministic
 * features. Random ranges collapse to their center, so the result is a stable
 * approximation of what the DSL would have produced on average. Commands that
 * have no spatial meaning (Smooth, Mask, Multiply, Add) are ignored.
 */
export function featuresFromHeightmapCommands(commands = []) {
  const features = [];
  const mid = range => {
    const [a, b] = String(range).split("-").map(Number);
    return (isNaN(b) ? a : (a + b) / 2) / 100;
  };
  const span = range => {
    const [a, b] = String(range).split("-").map(Number);
    return (isNaN(b) ? 0 : Math.abs(b - a)) / 100;
  };

  for (const raw of commands) {
    const cmd = String(raw).split("#")[0].trim();
    const [tool, count, heightRange, rangeX, rangeY] = cmd.split(/\s+/);
    if (!tool || !rangeX || !rangeY) continue;
    const cx = mid(rangeX);
    const cy = mid(rangeY);
    const h = Math.round(mid(heightRange) * 100);
    const extent = Math.max(0.04, (span(rangeX) + span(rangeY)) / 4);

    if (tool === "Hill") {
      features.push({type: h >= 60 ? "plateau" : "landmass", points: [[cx, cy]], radius: extent, height: Math.max(h, 25)});
    } else if (tool === "Range") {
      const horizontal = span(rangeX) >= span(rangeY);
      const half = Math.max(0.05, horizontal ? span(rangeX) / 2 : span(rangeY) / 2);
      const points = horizontal
        ? [
            [cx - half, cy],
            [cx + half, cy]
          ]
        : [
            [cx, cy - half],
            [cx, cy + half]
          ];
      features.push({type: "mountains", points, height: Math.max(h, 50)});
    } else if (tool === "Trough") {
      const horizontal = span(rangeX) >= span(rangeY);
      const half = Math.max(0.05, horizontal ? span(rangeX) / 2 : span(rangeY) / 2);
      const points = horizontal
        ? [
            [cx - half, cy],
            [cx + half, cy]
          ]
        : [
            [cx, cy - half],
            [cx, cy + half]
          ];
      features.push({type: "valley", points, depth: Math.max(8, 30 - h)});
    } else if (tool === "Pit") {
      features.push({type: "lake", points: [[cx, cy]], radius: Math.max(0.015, extent / 2)});
    }
  }
  return features;
}

export const TerrainPainter = {
  paintTerrain,
  normalizeFeature,
  featuresFromHeightmapCommands,
  FEATURE_TYPES,
  FEATURE_TYPE_NAMES,
  SEA_LEVEL
};

if (typeof window !== "undefined") {
  window.TerrainPainter = TerrainPainter;
}
