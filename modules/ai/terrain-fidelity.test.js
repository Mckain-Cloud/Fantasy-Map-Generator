import {describe, test, expect} from "vitest";
import {paintTerrain, SEA_LEVEL} from "./terrain-painter.js";
import {
  checkTerrainFidelity,
  checkLocationFidelity,
  checkSpecFidelity,
  expectedLocationTerrain,
  buildPointIndex
} from "./terrain-fidelity.js";
import {createSyntheticGrid} from "../../tests/node/synthetic-grid.js";

const grid = createSyntheticGrid({width: 800, height: 600, cells: 4000});
const dims = {width: grid.width, height: grid.height};

const terrain = {
  features: [
    {id: "main", type: "landmass", points: [[0.5, 0.5]], radius: 0.42},
    {id: "spine", type: "mountains", points: [[0.3, 0.3], [0.7, 0.3]]},
    {id: "tarn", type: "lake", points: [[0.5, 0.6]], radius: 0.05},
    {id: "cut", type: "strait", points: [[0.5, 0.9], [0.5, 1]], width: 0.03}
  ]
};

describe("checkTerrainFidelity", () => {
  test("passes for terrain painted from the same spec", () => {
    const heights = paintTerrain(terrain, grid, {...dims, seed: "s"});
    const report = checkTerrainFidelity(terrain, heights, grid.points, dims);
    expect(report.features.map(f => f.id)).toEqual(["main", "spine", "tarn", "cut"]);
    for (const f of report.features) expect(f.passed, `${f.id}: ${f.ratio}`).toBe(true);
    expect(report.passed).toBe(true);
    expect(report.score).toBeGreaterThan(0.9);
  });

  test("fails when the map does not match the spec", () => {
    const allWater = new Uint8Array(grid.points.length).fill(5);
    const report = checkTerrainFidelity(terrain, allWater, grid.points, dims);
    const byId = Object.fromEntries(report.features.map(f => [f.id, f]));
    expect(byId.main.passed).toBe(false);
    expect(byId.spine.passed).toBe(false);
    expect(byId.tarn.passed).toBe(true); // a lake on an all-water map is still water
    expect(report.passed).toBe(false);
  });

  test("flags features too small to sample", () => {
    const heights = paintTerrain(terrain, grid, {...dims, seed: "s"});
    const tiny = {features: [{id: "speck", type: "island", points: [[0.9, 0.9]], radius: 0.001}]};
    const report = checkTerrainFidelity(tiny, heights, grid.points, dims);
    expect(report.features[0].passed).toBe(false);
    expect(report.features[0].note).toMatch(/too small/);
  });
});

describe("expectedLocationTerrain", () => {
  test("uses explicit terrain hint first", () => {
    expect(expectedLocationTerrain({type: "city", terrain: "mountain"})).toBe("mountain");
    expect(expectedLocationTerrain({type: "city", terrain: "Coast"})).toBe("coast");
  });
  test("infers from type when no hint", () => {
    expect(expectedLocationTerrain({type: "port"})).toBe("coast");
    expect(expectedLocationTerrain({type: "fishing port"})).toBe("coast");
    expect(expectedLocationTerrain({type: "mine"})).toBe("hill");
  });
  test("returns null for unconstrained locations", () => {
    expect(expectedLocationTerrain({type: "city"})).toBeNull();
    expect(expectedLocationTerrain({type: "city", terrain: "nonsense"})).toBeNull();
  });
});

describe("buildPointIndex", () => {
  test("nearest returns the closest point", () => {
    const index = buildPointIndex(grid.points, grid.width, grid.height);
    const [px, py] = grid.points[1234];
    expect(index.nearest(px + 0.1, py - 0.1)).toBe(1234);
  });
  test("within returns points inside the radius", () => {
    const index = buildPointIndex(grid.points, grid.width, grid.height);
    const [px, py] = grid.points[1234];
    const near = index.within(px, py, grid.spacing * 1.1);
    expect(near).toContain(1234);
    expect(near.length).toBeGreaterThanOrEqual(5);
    expect(near.length).toBeLessThanOrEqual(9);
  });
});

describe("checkLocationFidelity", () => {
  const heights = paintTerrain(terrain, grid, {...dims, seed: "s"});

  test("validates mountain, coast and plain locations", () => {
    const locations = [
      {id: "peak", name: "Peak Hold", type: "fortress", terrain: "mountain", x: 0.5, y: 0.3},
      {id: "port", name: "Shore Port", type: "port", x: 0.47, y: 0.95}, // land beside the strait
      {id: "farm", name: "Lowfield", type: "village", terrain: "plain", x: 0.3, y: 0.7},
      {id: "free", name: "Anywhere", type: "city", x: 0.5, y: 0.5}
    ];
    const report = checkLocationFidelity(locations, heights, grid.points, dims);
    const byId = Object.fromEntries(report.locations.map(l => [l.id, l]));
    expect(byId.peak.passed).toBe(true);
    expect(byId.port.passed, JSON.stringify(byId.port)).toBe(true);
    expect(byId.farm.passed).toBe(true);
    expect(byId.free).toBeUndefined();
    expect(report.passed).toBe(true);
  });

  test("fails a mountain location placed on the sea", () => {
    const report = checkLocationFidelity(
      [{id: "x", name: "Sea Peak", type: "tower", terrain: "mountain", x: 0.95, y: 0.95}],
      heights,
      grid.points,
      dims
    );
    expect(report.passed).toBe(false);
    expect(report.locations[0].height).toBeLessThan(SEA_LEVEL);
  });
});

describe("checkSpecFidelity", () => {
  test("combines both reports with a readable summary", () => {
    const heights = paintTerrain(terrain, grid, {...dims, seed: "s"});
    const spec = {
      terrain,
      locations: [{id: "peak", name: "Peak Hold", type: "fortress", terrain: "mountain", x: 0.5, y: 0.3}]
    };
    const report = checkSpecFidelity(spec, heights, grid.points, dims);
    expect(report.passed).toBe(true);
    expect(report.summary.length).toBe(5);
    expect(report.summary.every(line => line.startsWith("OK "))).toBe(true);
  });
});
