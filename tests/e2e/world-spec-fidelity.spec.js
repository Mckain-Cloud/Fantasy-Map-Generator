import {test, expect} from "@playwright/test";
import fs from "fs";
import path from "path";
import {useSharedAppPage, loadWorldSpecApplicator} from "../setup/helpers.js";

/**
 * End-to-end fidelity: a realistic spec with deterministic terrain features
 * must produce a map whose geography, settlements and polities match it.
 *
 * These assertions are the contract for "AI-directed geography reflects on
 * the final map". If they fail, the map is lying about the spec.
 */

const SPEC = JSON.parse(fs.readFileSync(path.resolve("tests/fixtures/world-spec-corgak-features.json"), "utf8"));

test.describe("World spec fidelity (features)", () => {
  const shared = useSharedAppPage(test);
  let outcome;

  test.beforeAll(async () => {
    test.setTimeout(180000);
    await loadWorldSpecApplicator(shared.page);
    outcome = await shared.page.evaluate(async spec => {
      const A = window.WorldSpecApplicator;
      const result = await A.generateFromSpec(A.cleanupWorldSpec(JSON.parse(JSON.stringify(spec))));
      const {cells, burgs, states, markers, cultures, religions} = window.pack;
      const W = window.graphWidth;
      const H = window.graphHeight;
      // Probe the full grid (pack has no deep-ocean cells)
      const heightAt = (x, y) => {
        const g = window.grid;
        const col = Math.min(g.cellsX - 1, Math.floor((x * W) / g.spacing));
        const row = Math.min(g.cellsY - 1, Math.floor((y * H) / g.spacing));
        return g.cells.h[row * g.cellsX + col];
      };

      return {
        result,
        W,
        H,
        cellCount: cells.i.length,
        landRatio: Array.from(window.grid.cells.h).filter(h => h >= 20).length / window.grid.cells.h.length,
        burgs: burgs.filter(b => b && b.i && !b.removed).map(b => ({name: b.name, x: b.x / W, y: b.y / H, state: states[b.state]?.name, capital: !!b.capital, port: !!b.port, h: cells.h[b.cell]})),
        markers: (markers || []).map(m => ({name: m.name, type: m.type, x: m.x / W, y: m.y / H})),
        states: states.filter(s => s && s.i && !s.removed).map(s => ({name: s.name, capital: burgs[s.capital]?.name, cells: s.cells, culture: cultures[s.culture]?.name})),
        cultures: cultures.filter(c => c && c.i && !c.removed).map(c => c.name),
        religions: religions.filter(r => r && r.i && !r.removed).map(r => ({name: r.name, cells: Array.from(cells.religion).filter(x => x === r.i).length})),
        probes: {
          stoneTeethMid: heightAt(0.82, 0.32),
          gulf: heightAt(0.05, 0.42),
          headwaters: heightAt(0.58, 0.42),
          mainlandCenter: heightAt(0.5, 0.75),
          wetfang: heightAt(0.4, 0.62),
          openOcean: heightAt(0.99, 0.99)
        },
        mapCoordinates: {...window.mapCoordinates},
        winds: [...(window.options?.winds || [])],
        provinces: (window.pack.provinces || []).filter(p => p && p.i).map(p => ({name: p.name, state: states[p.state]?.name, cells: Array.from(cells.province).filter(x => x === p.i).length})),
        regiments: states.filter(s => s && s.i && !s.removed).map(s => ({name: s.name, regiments: s.military?.length || 0})),
        burgTypes: burgs.filter(b => b && b.i && !b.removed).map(b => ({name: b.name, type: b.type})),
        specMarkerNames: (markers || []).filter(m => m.specId).map(m => m.name),
        markerNotes: (window.notes || []).filter(n => n.id.startsWith("marker")).length,
        mapName: document.getElementById("mapName")?.value,
        routes: window.pack.routes?.length || 0,
        diplomacy: states.filter(s => s && s.i && !s.removed).map(s => ({name: s.name, row: s.diplomacy})),
        burgFeatures: burgs.filter(b => b && b.i && !b.removed).map(b => ({name: b.name, walls: b.walls, citadel: b.citadel})),
        svg: {
          routes: document.querySelectorAll("#routes path").length,
          burgLabels: document.querySelectorAll("#burgLabels text").length,
          markers: document.querySelectorAll("#markers > *").length,
          stateLabels: document.querySelectorAll("#labels #states text").length
        }
      };
    }, SPEC);
  });

  test("generation succeeds with no applicator errors", () => {
    expect(outcome.result.success).toBe(true);
    expect(outcome.result.terrainMode).toBe("features");
    expect(outcome.result.errors).toEqual([]);
  });

  test("terrain features are where the spec put them", () => {
    const fidelity = outcome.result.fidelity;
    expect(fidelity).toBeTruthy();
    for (const f of fidelity.terrain.features) {
      expect(f.passed, `${f.type} "${f.id}" only ${Math.round(f.ratio * 100)}% ${f.expected}`).toBe(true);
    }
    expect(outcome.probes.stoneTeethMid).toBeGreaterThanOrEqual(50);
    expect(outcome.probes.gulf).toBeLessThan(20);
    expect(outcome.probes.headwaters).toBeLessThan(20);
    expect(outcome.probes.mainlandCenter).toBeGreaterThanOrEqual(20);
    expect(outcome.probes.wetfang).toBeGreaterThanOrEqual(20);
    expect(outcome.probes.wetfang).toBeLessThan(40);
    expect(outcome.probes.openOcean).toBeLessThan(20);
  });

  test("location terrain hints are satisfied", () => {
    const report = outcome.result.fidelity.locations;
    const failed = report.locations.filter(l => !l.passed);
    expect(failed, JSON.stringify(failed)).toEqual([]);
  });

  test("every location is on the map, settlements as burgs and landmarks as markers", () => {
    const names = new Set([...outcome.burgs.map(b => b.name.toLowerCase()), ...outcome.markers.filter(m => m.name).map(m => m.name.toLowerCase())]);
    for (const loc of SPEC.locations) {
      expect(names.has(loc.name.toLowerCase()), `${loc.name} missing from map`).toBe(true);
    }
    const settlementCount = SPEC.locations.filter(l => l.kind === "settlement").length;
    const landmarkCount = SPEC.locations.filter(l => l.kind === "landmark").length;
    expect(outcome.burgs.length).toBe(settlementCount);
    expect(outcome.specMarkerNames.length).toBe(landmarkCount);
    expect(outcome.result.stats.specMarkers).toBe(landmarkCount);
    // flavour markers are added on top and never displace spec markers
    expect(outcome.markers.length).toBeGreaterThanOrEqual(landmarkCount);
    expect(outcome.markerNotes).toBeGreaterThanOrEqual(landmarkCount);
  });

  test("locations sit on (or right next to) their spec coordinates", () => {
    const summary = outcome.result.placementSummary;
    expect(summary.unplaced).toBe(0);
    expect(summary.maxDisplacementCells).toBeLessThanOrEqual(2);
    expect(summary.meanDisplacementCells).toBeLessThanOrEqual(1);
    for (const p of outcome.result.placement) {
      const loc = SPEC.locations.find(l => l.id === p.id);
      const placed = p.as === "marker" ? outcome.markers.find(m => m.name === loc.name && m.type.startsWith("spec-")) : outcome.burgs.find(b => b.name === loc.name);
      expect(placed, loc.name).toBeTruthy();
      const dist = Math.hypot((placed.x - loc.x) * outcome.W, (placed.y - loc.y) * outcome.H);
      const spacing = Math.sqrt((outcome.W * outcome.H) / outcome.cellCount);
      expect(dist, `${loc.name} is ${(dist / spacing).toFixed(1)} cells away`).toBeLessThanOrEqual(spacing * 2.5);
    }
  });

  test("states, capitals, ownership and cultures match the spec", () => {
    expect(outcome.states.map(s => s.name).sort()).toEqual(["Corgak Clan", "Northrealm"]);
    const byName = Object.fromEntries(outcome.states.map(s => [s.name, s]));
    expect(byName["Corgak Clan"].capital).toBe("Cameron's Tower");
    expect(byName["Northrealm"].capital).toBe("Northrealm Capital");
    expect(byName["Corgak Clan"].culture).toBe("Corgak Orks");
    expect(byName["Northrealm"].culture).toBe("Northrealm Humans");
    // both states must hold real territory, not just their capital cells
    expect(byName["Northrealm"].cells).toBeGreaterThan(200);
    expect(byName["Corgak Clan"].cells).toBeGreaterThan(200);

    for (const b of outcome.burgs) {
      const loc = SPEC.locations.find(l => l.name === b.name);
      const owner = SPEC.states.find(s => s.id === loc.owner)?.name;
      expect(b.state, `${b.name} should belong to ${owner}`).toBe(owner);
    }
    const capital = outcome.burgs.find(b => b.name === "Northrealm Capital");
    expect(capital.port, "coastal capital should be a port").toBe(true);

    expect(outcome.cultures).toEqual(["Corgak Orks", "Northrealm Humans"]);
    expect(outcome.religions.map(r => r.name)).toEqual(["Stone and Skull Paths", "Church of the River Crown"]);
    for (const r of outcome.religions) expect(r.cells, `${r.name} has no territory`).toBeGreaterThan(0);
  });

  test("climate, globe position, roads, diplomacy and name follow the spec", () => {
    // latitude band 38°N-62°N requested
    expect(outcome.mapCoordinates.latN).toBeCloseTo(62, 0);
    expect(outcome.mapCoordinates.latS).toBeCloseTo(38, 0);
    expect(outcome.mapName).toBe("The Blackwater Frontier");
    expect(outcome.routes).toBeGreaterThan(0);
    const corgak = outcome.diplomacy.find(d => d.name === "Corgak Clan");
    const northrealm = outcome.diplomacy.find(d => d.name === "Northrealm");
    const northIndex = outcome.diplomacy.indexOf(northrealm) + 1;
    const corgakIndex = outcome.diplomacy.indexOf(corgak) + 1;
    expect(corgak.row[northIndex]).toBe("Suspicion");
    expect(northrealm.row[corgakIndex]).toBe("Suspicion");
    const capital = outcome.burgFeatures.find(b => b.name === "Cameron's Tower");
    expect(capital.citadel).toBe(1);
    expect(capital.walls).toBe(1);
  });

  test("provinces, military, winds, burg types, borders and flavour markers follow the spec", () => {
    expect(outcome.winds).toEqual([90, 90, 90, 90, 90, 90]);

    const provinceNames = outcome.provinces.map(p => p.name).sort();
    expect(provinceNames).toEqual(["Blackwater Hold", "Ford Shire", "Gulf Coast", "Stone Teeth"]);
    for (const p of outcome.provinces) expect(p.cells, `${p.name} has no cells`).toBeGreaterThan(0);
    expect(outcome.provinces.find(p => p.name === "Stone Teeth").state).toBe("Corgak Clan");
    expect(outcome.provinces.find(p => p.name === "Gulf Coast").state).toBe("Northrealm");
    expect(outcome.result.stats.provinces).toBe(4);

    for (const s of outcome.regiments) expect(s.regiments, `${s.name} has no regiments`).toBeGreaterThan(0);

    const capital = outcome.burgTypes.find(b => b.name === "Northrealm Capital");
    expect(capital.type).toBe("Naval");
    for (const b of outcome.burgTypes) expect(["Generic", "Naval", "Lake", "Highland", "River", "Nomadic", "Hunting"]).toContain(b.type);

    const borders = outcome.result.fidelity.borders;
    expect(borders.borders).toHaveLength(1);
    expect(borders.borders[0].sharedCells).toBeGreaterThan(0);
    expect(borders.borders[0].passed).toBe(true);

    expect(outcome.result.stats.flavourMarkers).toBeGreaterThan(0);
  });

  test("the map is actually drawn", () => {
    expect(outcome.svg.burgLabels).toBe(outcome.burgs.length);
    expect(outcome.svg.markers).toBe(outcome.markers.length);
    expect(outcome.svg.stateLabels).toBeGreaterThan(0);
    expect(outcome.svg.routes).toBeGreaterThan(0);
  });
});
