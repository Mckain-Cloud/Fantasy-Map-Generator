import {describe, test, expect} from "vitest";
import {checkBorderFidelity} from "./terrain-fidelity.js";
import {resolveWinds, longitudeToOption, WIND_ANGLES} from "./spec-options.js";

/**
 * A 10x6 lattice split into state 1 (x<5) and state 2 (x>=5), with a river
 * running down the boundary column and mountains along the top row.
 */
function lattice() {
  const w = 10;
  const h = 6;
  const n = w * h;
  const state = new Uint16Array(n);
  const heights = new Uint8Array(n).fill(30);
  const rivers = new Uint16Array(n);
  const c = [];
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    state[i] = x < 5 ? 1 : 2;
    if (x === 5) rivers[i] = 1;
    if (y === 0) heights[i] = 70;
    const nb = [];
    if (x > 0) nb.push(i - 1);
    if (x < w - 1) nb.push(i + 1);
    if (y > 0) nb.push(i - w);
    if (y < h - 1) nb.push(i + w);
    c.push(nb);
  }
  return {state, c, h: heights, r: rivers};
}

const ids = new Map([
  ["a", 1],
  ["b", 2]
]);

describe("checkBorderFidelity", () => {
  test("river border along a river passes", () => {
    const r = checkBorderFidelity([{between: ["a", "b"], type: "river", name: "Great River"}], lattice(), ids);
    expect(r.borders[0].sharedCells).toBe(12);
    expect(r.borders[0].ratio).toBe(1);
    expect(r.passed).toBe(true);
  });

  test("mountain border fails when only the top row is high", () => {
    const r = checkBorderFidelity([{between: ["a", "b"], type: "mountain"}], lattice(), ids);
    expect(r.borders[0].ratio).toBeLessThan(0.5);
    expect(r.passed).toBe(false);
  });

  test("sea border fails when the states touch on land", () => {
    const r = checkBorderFidelity([{between: ["a", "b"], type: "sea"}], lattice(), ids);
    expect(r.passed).toBe(false);
    expect(r.borders[0].note).toMatch(/share a land border/);
  });

  test("unknown state or non-touching states are reported", () => {
    const g = lattice();
    expect(checkBorderFidelity([{between: ["a", "zzz"], type: "river"}], g, ids).borders[0].note).toMatch(/not created/);
    g.state.fill(1);
    expect(checkBorderFidelity([{between: ["a", "b"], type: "river"}], g, ids).borders[0].note).toMatch(/do not touch/);
  });

  test("informational types only check adjacency", () => {
    const r = checkBorderFidelity([{between: ["a", "b"], type: "undefined"}], lattice(), ids);
    expect(r.passed).toBe(true);
    expect(r.borders[0].note).toMatch(/informational/);
  });
});

describe("winds and longitude", () => {
  test("prevailing wind fills all six tiers", () => {
    expect(resolveWinds({prevailingWind: "west"})).toEqual(new Array(6).fill(WIND_ANGLES.west));
    expect(resolveWinds({prevailingWind: "Easterly"})).toEqual(new Array(6).fill(270));
    expect(resolveWinds({winds: [0, 90, 180, 270, 360, -90]})).toEqual([0, 90, 180, 270, 0, 270]);
    expect(resolveWinds({})).toBeNull();
    expect(resolveWinds({prevailingWind: "default"})).toBeNull();
  });

  test("longitude option centres the map on the meridian", () => {
    // 24° tall band, 4:3 aspect → 32° wide; centre at 0° → lonE = 16 → shift = (180-16)/(360-32)
    expect(longitudeToOption(0, {north: 62, south: 38}, 4 / 3)).toBeCloseTo(50, 0);
    expect(longitudeToOption(-164, {north: 62, south: 38}, 4 / 3)).toBeCloseTo(100, 0);
    expect(longitudeToOption(164, {north: 62, south: 38}, 4 / 3)).toBeCloseTo(0, 0);
    expect(longitudeToOption(45, {north: 90, south: -90}, 2)).toBe(50);
  });
});
