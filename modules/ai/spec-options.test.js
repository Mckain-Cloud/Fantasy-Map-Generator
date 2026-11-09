import {describe, test, expect} from "vitest";
import {
  resolveLatitudeBand,
  latitudeBandToMapOptions,
  mapOptionsToLatitudeBand,
  buildDiplomacy,
  normalizeRelation,
  mapNameFromSpec,
  DEFAULT_LATITUDE
} from "./spec-options.js";

describe("resolveLatitudeBand", () => {
  test("explicit latitude wins and is normalized", () => {
    expect(resolveLatitudeBand({latitude: {north: 30, south: 60}})).toEqual({north: 60, south: 30, source: "latitude"});
    expect(resolveLatitudeBand({latitude: {north: 95, south: -100}})).toEqual({north: 90, south: -90, source: "latitude"});
  });
  test("zones map to bands, southern hemisphere mirrors", () => {
    expect(resolveLatitudeBand({zone: "tropical"})).toMatchObject({north: 23, south: -5});
    expect(resolveLatitudeBand({zone: "Temperate", hemisphere: "south"})).toMatchObject({north: -32, south: -58});
  });
  test("falls back to a temperate default", () => {
    expect(resolveLatitudeBand({})).toEqual({...DEFAULT_LATITUDE, source: "default"});
    expect(resolveLatitudeBand({zone: "mars"})).toMatchObject({source: "default"});
    expect(resolveLatitudeBand({latitude: {north: 40, south: 40}})).toMatchObject({source: "default"});
  });
});

describe("latitude ↔ map options", () => {
  test("round-trips through FMG's slider formula", () => {
    for (const band of [
      {north: 58, south: 32},
      {north: 23, south: -5},
      {north: -32, south: -58},
      {north: 88, south: 66},
      {north: 90, south: -90}
    ]) {
      const opts = latitudeBandToMapOptions(band);
      const back = mapOptionsToLatitudeBand(opts);
      expect(back.north).toBeCloseTo(band.north, 0);
      expect(back.south).toBeCloseTo(band.south, 0);
      expect(opts.mapSize).toBeGreaterThanOrEqual(1);
      expect(opts.mapSize).toBeLessThanOrEqual(100);
      expect(opts.latitude).toBeGreaterThanOrEqual(0);
      expect(opts.latitude).toBeLessThanOrEqual(100);
    }
  });
  test("whole globe is size 100 at shift 50", () => {
    expect(latitudeBandToMapOptions({north: 90, south: -90})).toEqual({mapSize: 100, latitude: 50, longitude: 50});
  });
});

describe("buildDiplomacy", () => {
  const states = [
    {id: "a", name: "Alpha", capital: "ca"},
    {id: "b", name: "Beta", capital: "cb"},
    {id: "c", name: "Gamma", capital: "cc"}
  ];
  const locations = [
    {id: "ca", x: 0.2, y: 0.5},
    {id: "cb", x: 0.8, y: 0.5},
    {id: "cc", x: 0.25, y: 0.6}
  ];

  test("defaults to Neutral with x on the diagonal and an empty chronicle", () => {
    const d = buildDiplomacy(states, {}, locations);
    expect(d[0]).toEqual([]);
    expect(d[1][1]).toBe("x");
    expect(d[1][2]).toBe("Neutral");
    expect(d[3][1]).toBe("Neutral");
    expect(d.length).toBe(4);
  });

  test("territorial warfare splits sides into enemies and allies", () => {
    const d = buildDiplomacy(states, {conflictType: "territorial_warfare_east"}, locations);
    expect(d[1][2]).toBe("Enemy");
    expect(d[2][1]).toBe("Enemy");
    expect(d[1][3]).toBe("Ally");
    expect(d[3][2]).toBe("Enemy");
  });

  test("explicit relations override and are reciprocal", () => {
    const withRelations = [
      {...states[0], relations: [{state: "b", relation: "ally"}, {state: "Gamma", relation: "vassal"}]},
      states[1],
      states[2]
    ];
    const d = buildDiplomacy(withRelations, {conflictType: "territorial_warfare_east"}, locations);
    expect(d[1][2]).toBe("Ally");
    expect(d[2][1]).toBe("Ally");
    expect(d[1][3]).toBe("Vassal");
    expect(d[3][1]).toBe("Suzerain");
  });

  test("ignores unknown states and relations", () => {
    const d = buildDiplomacy([{...states[0], relations: [{state: "zzz", relation: "enemy"}, {state: "b", relation: "frenemy"}]}, states[1]], {}, locations);
    expect(d[1][2]).toBe("Neutral");
  });
});

describe("normalizeRelation", () => {
  test("maps synonyms", () => {
    expect(normalizeRelation("WAR")).toBe("Enemy");
    expect(normalizeRelation("overlord")).toBe("Suzerain");
    expect(normalizeRelation("")).toBeNull();
    expect(normalizeRelation("buddies")).toBeNull();
  });
});

describe("mapNameFromSpec", () => {
  test("prefers explicit names and trims", () => {
    expect(mapNameFromSpec({name: "  Corgak Reach  "})).toBe("Corgak Reach");
    expect(mapNameFromSpec({worldAnalysis: {worldName: "Blackwater Frontier"}})).toBe("Blackwater Frontier");
    expect(mapNameFromSpec({worldAnalysis: {summary: "long text"}})).toBeNull();
  });
});
