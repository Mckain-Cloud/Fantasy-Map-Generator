"use strict";

/**
 * Terrain Fidelity Checker
 *
 * Answers the question "did the map actually come out the way the spec asked?"
 *
 * Given a terrain spec (features) and the heights that were painted onto a set
 * of grid points, it samples every point inside each feature's core region and
 * reports what fraction satisfies the feature's expectation (land is land,
 * mountains are high, lakes are water, ...). It also checks each spec location
 * against the terrain class it was declared to sit on (coast, mountain, ...).
 *
 * Pure module: works in Node (vitest) and in the browser. In the browser it is
 * run after generation and the report is attached to the applicator result so
 * the UI and the e2e tests can assert on it.
 */

import {normalizeFeature, areaSignedDistance, distanceToPolyline, SEA_LEVEL} from "./terrain-painter.js";

/** What each feature kind promises, and how strictly we hold it to it. */
const EXPECTATIONS = {
  "area-land": {test: h => h >= SEA_LEVEL, label: "land", minRatio: 0.9},
  "area-lower": {test: h => h >= SEA_LEVEL && h < 50, label: "low land", minRatio: 0.85},
  "area-water": {test: h => h < SEA_LEVEL, label: "water", minRatio: 0.9},
  "line-raise": {test: (h, f) => h >= Math.min(50, f.height * 0.6), label: "elevated", minRatio: 0.8},
  "line-lower": {test: h => h >= SEA_LEVEL && h < 60, label: "low land", minRatio: 0.75},
  "line-water": {test: h => h < SEA_LEVEL, label: "water", minRatio: 0.8}
};

/**
 * Terrain classes a location can declare via `terrain` (or imply via `type`).
 * `near` means "within this many isotropic units there must be a cell that
 * passes `test`", used for coast so a port can sit on a land cell next to water.
 */
export const LOCATION_TERRAIN = {
  land: {test: h => h >= SEA_LEVEL, label: "on land"},
  plain: {test: h => h >= SEA_LEVEL && h < 45, label: "on low land"},
  lowland: {test: h => h >= SEA_LEVEL && h < 45, label: "on low land"},
  hill: {test: h => h >= 36, label: "on hills"},
  hills: {test: h => h >= 36, label: "on hills"},
  mountain: {test: h => h >= 50, label: "in mountains"},
  mountains: {test: h => h >= 50, label: "in mountains"},
  // ~3 cells of tolerance: the model works in 0.01 steps and the coastline carries seeded noise
  coast: {test: h => h >= SEA_LEVEL, near: {test: h => h < SEA_LEVEL, radius: 0.035}, label: "on the coast"},
  island: {test: h => h >= SEA_LEVEL, label: "on land"},
  valley: {test: h => h >= SEA_LEVEL && h < 50, label: "in a valley"},
  // a lake landmark sits on the water itself; a lakeside settlement sits on land next to it
  lake: {test: () => true, near: {test: h => h < SEA_LEVEL, radius: 0.03}, label: "at or beside a lake"},
  water: {test: h => h < SEA_LEVEL, label: "on water"},
  sea: {test: h => h < SEA_LEVEL, label: "at sea"}
};

/** Location types whose name alone implies a terrain class. */
const TYPE_IMPLIES_TERRAIN = {
  port: "coast",
  harbor: "coast",
  harbour: "coast",
  lighthouse: "coast",
  shipyard: "coast",
  mine: "hill",
  quarry: "hill"
};

/**
 * Determine which terrain class a location expects, or null if unconstrained.
 */
export function expectedLocationTerrain(loc) {
  const declared = String(loc.terrain || "").toLowerCase();
  if (declared && LOCATION_TERRAIN[declared]) return declared;

  const type = String(loc.type || "").toLowerCase();
  if (TYPE_IMPLIES_TERRAIN[type]) return TYPE_IMPLIES_TERRAIN[type];
  for (const key of Object.keys(TYPE_IMPLIES_TERRAIN)) {
    if (type.includes(key)) return TYPE_IMPLIES_TERRAIN[key];
  }
  return null;
}

/**
 * Build a tiny uniform-bucket spatial index over map points for nearest lookups.
 */
export function buildPointIndex(points, width, height, cellSize) {
  const size = cellSize || Math.sqrt((width * height) / Math.max(1, points.length)) * 2;
  const cols = Math.max(1, Math.ceil(width / size));
  const rows = Math.max(1, Math.ceil(height / size));
  const buckets = new Array(cols * rows);
  const key = (x, y) =>
    Math.min(rows - 1, Math.max(0, Math.floor(y / size))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(x / size)));

  for (let i = 0; i < points.length; i++) {
    const k = key(points[i][0], points[i][1]);
    (buckets[k] ||= []).push(i);
  }

  const nearest = (x, y) => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / size)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / size)));
    let best = -1;
    let bestDist = Infinity;
    for (let ring = 0; ring < Math.max(cols, rows); ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          const bx = cx + dx;
          const by = cy + dy;
          if (bx < 0 || by < 0 || bx >= cols || by >= rows) continue;
          const bucket = buckets[by * cols + bx];
          if (!bucket) continue;
          for (const i of bucket) {
            const d = Math.hypot(points[i][0] - x, points[i][1] - y);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          }
        }
      }
      if (best >= 0 && bestDist <= size * ring) break;
    }
    return best;
  };

  const within = (x, y, radius) => {
    const result = [];
    const minX = Math.max(0, Math.floor((x - radius) / size));
    const maxX = Math.min(cols - 1, Math.floor((x + radius) / size));
    const minY = Math.max(0, Math.floor((y - radius) / size));
    const maxY = Math.min(rows - 1, Math.floor((y + radius) / size));
    for (let by = minY; by <= maxY; by++) {
      for (let bx = minX; bx <= maxX; bx++) {
        const bucket = buckets[by * cols + bx];
        if (!bucket) continue;
        for (const i of bucket) {
          if (Math.hypot(points[i][0] - x, points[i][1] - y) <= radius) result.push(i);
        }
      }
    }
    return result;
  };

  return {nearest, within};
}

/**
 * Check every terrain feature against the painted heights.
 *
 * @returns {{passed: boolean, score: number, features: object[]}}
 */
export function checkTerrainFidelity(terrain, heights, points, {width, height}) {
  const aspect = height / width;
  const features = (terrain?.features || []).map(f => normalizeFeature(f, aspect)).filter(Boolean);
  const results = [];

  for (const f of features) {
    const expectation = EXPECTATIONS[f.kind];
    if (!expectation) continue;

    let sampled = 0;
    let satisfied = 0;

    for (let i = 0; i < points.length; i++) {
      const x = points[i][0] / width;
      const y = (points[i][1] / height) * aspect;
      let inCore = false;

      if (f.kind.startsWith("area")) {
        // Core = inside the shape beyond the edge ramp, where no noise can reach
        inCore = areaSignedDistance(f, x, y) >= f.falloff * 1.5;
      } else {
        inCore = distanceToPolyline(x, y, f.points) <= f.width * 0.35;
      }

      if (!inCore) continue;
      sampled++;
      if (expectation.test(heights[i], f)) satisfied++;
    }

    const ratio = sampled ? satisfied / sampled : 0;
    results.push({
      id: f.id,
      type: f.type,
      expected: expectation.label,
      sampled,
      satisfied,
      ratio: Math.round(ratio * 1000) / 1000,
      passed: sampled === 0 ? false : ratio >= expectation.minRatio,
      note: sampled === 0 ? "feature too small to contain any grid cell" : undefined
    });
  }

  const score = results.length ? results.reduce((s, r) => s + r.ratio, 0) / results.length : 1;
  return {
    passed: results.every(r => r.passed),
    score: Math.round(score * 1000) / 1000,
    features: results
  };
}

/**
 * Check each location against its expected terrain class at its own coordinates
 * (before any placement snapping happens).
 *
 * @returns {{passed: boolean, locations: object[]}}
 */
export function checkLocationFidelity(locations, heights, points, {width, height}, index = null) {
  const idx = index || buildPointIndex(points, width, height);
  const results = [];

  for (const loc of locations || []) {
    const expectedKey = expectedLocationTerrain(loc);
    if (!expectedKey) continue;
    const expectation = LOCATION_TERRAIN[expectedKey];

    const x = loc.x * width;
    const y = loc.y * height;
    const cell = idx.nearest(x, y);
    if (cell < 0) continue;
    const h = heights[cell];

    // The model works in 0.01 steps (about one cell), so accept a neighbouring
    // cell that satisfies the class when the exact cell does not.
    let passed = expectation.test(h);
    let viaNeighbour = false;
    if (!passed) {
      const nearby = idx.within(x, y, width * 0.012).filter(i => i !== cell);
      viaNeighbour = nearby.some(i => expectation.test(heights[i]));
      passed = viaNeighbour;
    }
    if (passed && expectation.near) {
      const radius = expectation.near.radius * width;
      const nearby = idx.within(x, y, radius);
      passed = nearby.some(i => expectation.near.test(heights[i]));
    }

    results.push({
      id: loc.id,
      name: loc.name,
      expected: expectedKey,
      label: expectation.label,
      height: h,
      cell,
      viaNeighbour,
      passed
    });
  }

  return {passed: results.every(r => r.passed), locations: results};
}

/**
 * Check the spec's `borders[]` hints against the territory the map produced.
 *
 * @param {object[]} borders        spec.borders: [{between: [idA, idB], type, name}]
 * @param {object}   graph          {state: Uint16Array, c: neighbors[][], h: heights, r: rivers, biome?}
 * @param {Map|object} stateIndexById  spec state id → pack state index
 * @returns {{passed: boolean, borders: object[]}}
 */
export function checkBorderFidelity(borders, graph, stateIndexById) {
  const lookup = id => (stateIndexById instanceof Map ? stateIndexById.get(id) : stateIndexById?.[id]) || 0;
  const results = [];
  const FOREST_BIOMES = new Set([5, 6, 7, 8, 9]); // FMG forest biome ids

  for (const border of borders || []) {
    const [idA, idB] = border.between || [];
    const a = lookup(idA);
    const b = lookup(idB);
    const type = String(border.type || "undefined").toLowerCase();
    const entry = {name: border.name || `${idA}/${idB}`, type, between: [idA, idB], sharedCells: 0, ratio: null, passed: true, note: undefined};

    if (!a || !b) {
      entry.note = "one of the states was not created";
      entry.passed = false;
      results.push(entry);
      continue;
    }

    // land cells of A touching B (and vice versa) = the actual border
    const borderCells = [];
    for (let i = 0; i < graph.state.length; i++) {
      const s = graph.state[i];
      if (s !== a && s !== b) continue;
      if (graph.h[i] < SEA_LEVEL) continue;
      const other = s === a ? b : a;
      if ((graph.c[i] || []).some(n => graph.state[n] === other)) borderCells.push(i);
    }
    entry.sharedCells = borderCells.length;

    const nearRiver = i => !!graph.r?.[i] || (graph.c[i] || []).some(n => graph.r?.[n]);
    const nearMountain = i => graph.h[i] >= 45 || (graph.c[i] || []).some(n => graph.h[n] >= 45);
    const inForest = i => graph.biome && FOREST_BIOMES.has(graph.biome[i]);

    if (type === "sea" || type === "coast") {
      entry.passed = borderCells.length === 0;
      entry.ratio = borderCells.length === 0 ? 1 : 0;
      if (!entry.passed) entry.note = "states share a land border but the spec says they are separated by sea";
    } else if (borderCells.length === 0) {
      entry.passed = false;
      entry.note = "states do not touch on the map";
    } else if (type === "river") {
      entry.ratio = ratio(borderCells, nearRiver);
      entry.passed = entry.ratio >= 0.5;
    } else if (type === "mountain" || type === "mountains") {
      entry.ratio = ratio(borderCells, nearMountain);
      entry.passed = entry.ratio >= 0.5;
    } else if (type === "forest") {
      entry.ratio = graph.biome ? ratio(borderCells, inForest) : null;
      entry.passed = entry.ratio === null ? true : entry.ratio >= 0.4;
      if (entry.ratio === null) entry.note = "no biome data";
    } else {
      entry.note = "informational border type; only adjacency is checked";
    }
    results.push(entry);
  }

  return {passed: results.every(r => r.passed), borders: results};

  function ratio(cells, test) {
    const ok = cells.filter(test).length;
    return Math.round((ok / cells.length) * 1000) / 1000;
  }
}

/**
 * Run both checks and fold them into one report.
 */
export function checkSpecFidelity(spec, heights, points, dims) {
  const terrainReport = checkTerrainFidelity(spec.terrain, heights, points, dims);
  const locationReport = checkLocationFidelity(spec.locations, heights, points, dims);
  return {
    passed: terrainReport.passed && locationReport.passed,
    terrain: terrainReport,
    locations: locationReport,
    summary: summarize(terrainReport, locationReport)
  };
}

function summarize(terrainReport, locationReport) {
  const lines = [];
  for (const f of terrainReport.features) {
    lines.push(`${f.passed ? "OK " : "BAD"} ${f.type} "${f.id}": ${Math.round(f.ratio * 100)}% ${f.expected}${f.note ? ` (${f.note})` : ""}`);
  }
  for (const l of locationReport.locations) {
    lines.push(`${l.passed ? "OK " : "BAD"} location "${l.name}": expected ${l.label}, height ${l.height}`);
  }
  return lines;
}

export const TerrainFidelity = {
  checkTerrainFidelity,
  checkLocationFidelity,
  checkBorderFidelity,
  checkSpecFidelity,
  expectedLocationTerrain,
  buildPointIndex,
  LOCATION_TERRAIN
};

if (typeof window !== "undefined") {
  window.TerrainFidelity = TerrainFidelity;
}
