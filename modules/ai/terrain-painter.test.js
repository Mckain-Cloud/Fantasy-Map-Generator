import {describe, test, expect} from "vitest";
import {
  paintTerrain,
  normalizeFeature,
  featuresFromHeightmapCommands,
  pointInPolygon,
  signedDistanceToPolygon,
  distanceToPolyline,
  createNoise,
  SEA_LEVEL
} from "./terrain-painter.js";
import {createSyntheticGrid, cellAt, ratioInBox} from "../../tests/node/synthetic-grid.js";

const grid = createSyntheticGrid({width: 800, height: 600, cells: 4000});
const dims = {width: grid.width, height: grid.height, seed: "test"};
const land = h => h >= SEA_LEVEL;
const water = h => h < SEA_LEVEL;

describe("geometry helpers", () => {
  const square = [
    [0.2, 0.2],
    [0.6, 0.2],
    [0.6, 0.6],
    [0.2, 0.6]
  ];

  test("pointInPolygon", () => {
    expect(pointInPolygon(0.4, 0.4, square)).toBe(true);
    expect(pointInPolygon(0.1, 0.4, square)).toBe(false);
    expect(pointInPolygon(0.4, 0.7, square)).toBe(false);
  });

  test("signedDistanceToPolygon is positive inside and negative outside", () => {
    expect(signedDistanceToPolygon(0.4, 0.4, square)).toBeCloseTo(0.2, 5);
    expect(signedDistanceToPolygon(0.7, 0.4, square)).toBeCloseTo(-0.1, 5);
    expect(signedDistanceToPolygon(0.3, 0.4, square)).toBeCloseTo(0.1, 5);
  });

  test("distanceToPolyline", () => {
    const path = [
      [0, 0],
      [1, 0]
    ];
    expect(distanceToPolyline(0.5, 0.3, path)).toBeCloseTo(0.3, 5);
    expect(distanceToPolyline(1.5, 0, path)).toBeCloseTo(0.5, 5);
    expect(distanceToPolyline(0.5, 0, [[0.5, 0.2]])).toBeCloseTo(0.2, 5);
  });
});

describe("seeded noise", () => {
  test("is deterministic and bounded", () => {
    const a = createNoise("seed-1");
    const b = createNoise("seed-1");
    const c = createNoise("seed-2");
    let differs = false;
    for (let i = 0; i < 50; i++) {
      const x = i * 0.037;
      const y = i * 0.011;
      expect(a(x, y)).toBe(b(x, y));
      expect(Math.abs(a(x, y))).toBeLessThanOrEqual(1);
      if (a(x, y) !== c(x, y)) differs = true;
    }
    expect(differs).toBe(true);
  });
});

describe("normalizeFeature", () => {
  test("applies type defaults", () => {
    const f = normalizeFeature({type: "mountains", points: [[0.1, 0.1], [0.5, 0.5]]});
    expect(f.kind).toBe("line-raise");
    expect(f.height).toBe(85);
    expect(f.width).toBeGreaterThan(0);
  });

  test("scales y by aspect ratio", () => {
    const f = normalizeFeature({type: "island", points: [[0.5, 0.5]], radius: 0.1}, 0.75);
    expect(f.points[0]).toEqual([0.5, 0.375]);
  });

  test("rejects unknown types and empty geometry", () => {
    expect(normalizeFeature({type: "volcanic-doom", points: [[0.5, 0.5]]})).toBeNull();
    expect(normalizeFeature({type: "island", points: []})).toBeNull();
    expect(normalizeFeature({type: "island"})).toBeNull();
  });
});

describe("paintTerrain", () => {
  test("empty terrain on ocean base is all water", () => {
    const h = paintTerrain({features: []}, grid, dims);
    expect(h.length).toBe(grid.points.length);
    expect(Array.from(h).every(water)).toBe(true);
  });

  test("land base is all land", () => {
    const h = paintTerrain({base: "land", features: []}, grid, dims);
    expect(Array.from(h).every(land)).toBe(true);
  });

  test("is deterministic for the same seed", () => {
    const terrain = {features: [{type: "island", points: [[0.5, 0.5]], radius: 0.2}]};
    const a = paintTerrain(terrain, grid, dims);
    const b = paintTerrain(terrain, grid, dims);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test("circular island lands exactly where asked", () => {
    const h = paintTerrain({features: [{type: "island", points: [[0.3, 0.5]], radius: 0.12}]}, grid, dims);
    expect(h[cellAt(grid, 0.3, 0.5)]).toBeGreaterThanOrEqual(SEA_LEVEL);
    // core is land
    expect(ratioInBox(grid, h, [0.25, 0.44, 0.35, 0.56], land)).toBeGreaterThan(0.95);
    // far away stays water
    expect(ratioInBox(grid, h, [0.6, 0.1, 0.95, 0.9], water)).toBe(1);
  });

  test("polygon landmass covers its interior and nothing else", () => {
    const polygon = [
      [0.1, 0.1],
      [0.5, 0.1],
      [0.5, 0.9],
      [0.1, 0.9]
    ];
    const h = paintTerrain({features: [{type: "landmass", points: polygon}]}, grid, dims);
    expect(ratioInBox(grid, h, [0.18, 0.18, 0.42, 0.82], land)).toBeGreaterThan(0.97);
    expect(ratioInBox(grid, h, [0.65, 0.1, 0.95, 0.9], water)).toBe(1);
  });

  test("mountain range is high along its path and leaves surroundings alone", () => {
    const terrain = {
      features: [
        {type: "landmass", points: [[0.5, 0.5]], radius: 0.45},
        {type: "mountains", points: [[0.3, 0.3], [0.7, 0.3]], height: 85, width: 0.04}
      ]
    };
    const h = paintTerrain(terrain, grid, dims);
    expect(ratioInBox(grid, h, [0.32, 0.29, 0.68, 0.31], v => v >= 60)).toBeGreaterThan(0.9);
    // Plain land well south of the ridge is unchanged lowland
    expect(ratioInBox(grid, h, [0.3, 0.6, 0.7, 0.7], v => v >= SEA_LEVEL && v < 45)).toBeGreaterThan(0.95);
  });

  test("mountains in the ocean create a mountainous island chain", () => {
    const h = paintTerrain({features: [{type: "mountains", points: [[0.2, 0.5], [0.8, 0.5]]}]}, grid, dims);
    expect(ratioInBox(grid, h, [0.25, 0.49, 0.75, 0.51], v => v >= 50)).toBeGreaterThan(0.85);
    expect(ratioInBox(grid, h, [0.2, 0.1, 0.8, 0.3], water)).toBe(1);
  });

  test("lake inside a landmass is water, surrounded by land", () => {
    const terrain = {
      features: [
        {type: "landmass", points: [[0.5, 0.5]], radius: 0.45},
        {type: "lake", points: [[0.5, 0.5]], radius: 0.06}
      ]
    };
    const h = paintTerrain(terrain, grid, dims);
    expect(h[cellAt(grid, 0.5, 0.5)]).toBeLessThan(SEA_LEVEL);
    expect(ratioInBox(grid, h, [0.47, 0.46, 0.53, 0.54], water)).toBeGreaterThan(0.9);
    expect(ratioInBox(grid, h, [0.2, 0.2, 0.3, 0.3], land)).toBeGreaterThan(0.95);
  });

  test("water features win regardless of declaration order", () => {
    const lakeFirst = paintTerrain(
      {
        features: [
          {type: "lake", points: [[0.5, 0.5]], radius: 0.06},
          {type: "landmass", points: [[0.5, 0.5]], radius: 0.45}
        ]
      },
      grid,
      dims
    );
    expect(lakeFirst[cellAt(grid, 0.5, 0.5)]).toBeLessThan(SEA_LEVEL);
  });

  test("valley lowers land but never sinks it", () => {
    const base = {base: "land", features: [{type: "plateau", points: [[0.5, 0.5]], radius: 0.6, height: 60}]};
    const plain = paintTerrain(base, grid, dims);
    const withValley = paintTerrain(
      {...base, features: [...base.features, {type: "valley", points: [[0.5, 0.1], [0.5, 0.9]], depth: 25, width: 0.04}]},
      grid,
      dims
    );
    const i = cellAt(grid, 0.5, 0.5);
    expect(withValley[i]).toBeLessThan(plain[i]);
    expect(ratioInBox(grid, withValley, [0.49, 0.2, 0.51, 0.8], land)).toBe(1);
  });

  test("strait cuts a water channel through land", () => {
    const terrain = {
      base: "land",
      features: [{type: "strait", points: [[0.5, 0], [0.5, 1]], width: 0.03}]
    };
    const h = paintTerrain(terrain, grid, dims);
    expect(ratioInBox(grid, h, [0.495, 0.1, 0.505, 0.9], water)).toBeGreaterThan(0.9);
    expect(ratioInBox(grid, h, [0.1, 0.1, 0.3, 0.9], land)).toBe(1);
  });

  test("lowlands flatten part of a highland", () => {
    const terrain = {
      features: [
        {type: "highlands", points: [[0.5, 0.5]], radius: 0.45, height: 50},
        {type: "lowlands", points: [[0.3, 0.5]], radius: 0.1, height: 23}
      ]
    };
    const h = paintTerrain(terrain, grid, dims);
    expect(h[cellAt(grid, 0.3, 0.5)]).toBeLessThan(35);
    expect(h[cellAt(grid, 0.7, 0.5)]).toBeGreaterThan(40);
  });

  test("heights are integers within 0-100", () => {
    const h = paintTerrain(
      {features: [{type: "mountains", points: [[0.1, 0.1], [0.9, 0.9]], height: 100, width: 0.3}]},
      grid,
      dims
    );
    for (const v of h) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  test("works without neighbour data (no smoothing)", () => {
    const h = paintTerrain({features: [{type: "island", points: [[0.5, 0.5]], radius: 0.2}]}, {points: grid.points}, dims);
    expect(h[cellAt(grid, 0.5, 0.5)]).toBeGreaterThanOrEqual(SEA_LEVEL);
  });
});

describe("featuresFromHeightmapCommands (legacy bridge)", () => {
  test("converts spatial commands and ignores global modifiers", () => {
    const features = featuresFromHeightmapCommands([
      "Mask 3",
      "Hill 3 45-60 35-70 35-80",
      "Range 2 72-88 70-95 10-50 # eastern mountains",
      "Trough 1 15-25 45-55 0-100",
      "Pit 1 10-18 48-52 40-50",
      "Smooth 7",
      "Multiply 1.1 land"
    ]);
    expect(features.map(f => f.type)).toEqual(["landmass", "mountains", "valley", "lake"]);
    expect(features[0].points[0]).toEqual([0.525, 0.575]);
    expect(features[1].height).toBeGreaterThanOrEqual(50);
    // vertical trough → vertical valley path
    expect(features[2].points[0][0]).toBeCloseTo(features[2].points[1][0], 5);
  });

  test("the converted terrain actually paints land where the hills were", () => {
    const features = featuresFromHeightmapCommands(["Hill 3 45-60 35-70 35-80"]);
    const h = paintTerrain({features}, grid, dims);
    expect(h[cellAt(grid, 0.525, 0.575)]).toBeGreaterThanOrEqual(SEA_LEVEL);
  });
});
