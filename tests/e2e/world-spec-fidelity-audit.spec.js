import {test, expect} from "@playwright/test";
import fs from "fs";
import path from "path";
import {gotoApp, waitForAppReady} from "../setup/helpers.js";

/**
 * Fidelity audit: run a real cached AI world-spec through the applicator and
 * compare what the spec asked for with what ended up on the map.
 *
 * Writes a JSON report next to the Playwright results so it can be diffed
 * between pipeline versions. Set WORLD_SPEC_FILE to audit a different spec.
 */

const SPEC_FILE = process.env.WORLD_SPEC_FILE || "world-spec-outputs/gpt-5.1_2025-12-01T05-07-35.json";
// Reports go outside test-results/ because Playwright wipes that folder on every run
const REPORT_FILE =
  process.env.AUDIT_REPORT || `audit-reports/${path.basename(SPEC_FILE).replace(/\.json$/, "")}.audit.json`;

function loadSpec() {
  const raw = JSON.parse(fs.readFileSync(path.resolve(SPEC_FILE), "utf8"));
  return raw.worldSpec || raw;
}

test.describe("World spec fidelity audit", () => {
  test("cached AI spec vs produced map", async ({page}) => {
    test.setTimeout(240000);
    const spec = loadSpec();

    const logs = [];
    page.on("console", msg => {
      const text = msg.text();
      if (text.includes("WorldSpecApplicator") || msg.type() === "error") logs.push(`[${msg.type()}] ${text}`);
    });
    page.on("pageerror", err => logs.push(`[pageerror] ${err.message}`));

    await gotoApp(page);
    await waitForAppReady(page);

    await page.evaluate(async () => {
      if (typeof window.WorldSpecApplicator !== "object") {
        const module = await import("/modules/ai/world-spec-applicator.js");
        window.WorldSpecApplicator = module.WorldSpecApplicator;
      }
    });

    const report = await page.evaluate(async spec => {
      const A = window.WorldSpecApplicator;
      const cleaned = A.cleanupWorldSpec(JSON.parse(JSON.stringify(spec)));
      let result;
      try {
        result = await A.generateFromSpec(cleaned);
      } catch (error) {
        return {fatal: error.message, stack: error.stack, errors: A.getErrors()};
      }

      const {cells, burgs, states, cultures, religions, zones, markers} = window.pack;
      const W = window.graphWidth;
      const H = window.graphHeight;
      const q = cells.q;
      const cellAt = (nx, ny) => q.find(nx * W, ny * H, Infinity)?.[2];
      const norm = (name) => String(name || "").toLowerCase().replace(/[’']/g, "'");

      // Per-location comparison
      const locations = spec.locations.map(loc => {
        const targetCell = cellAt(loc.x, loc.y);
        const burg = burgs.find(b => b && b.i && !b.removed && norm(b.name) === norm(loc.name));
        const marker = (markers || []).find(m => norm(m.name) === norm(loc.name));
        let placed = null;
        if (burg) {
          const dx = burg.x - loc.x * W;
          const dy = burg.y - loc.y * H;
          const displacementPx = Math.hypot(dx, dy);
          placed = {
            as: "burg",
            cell: burg.cell,
            x: +(burg.x / W).toFixed(3),
            y: +(burg.y / H).toFixed(3),
            displacementPx: Math.round(displacementPx),
            displacementPctOfMap: +((displacementPx / Math.min(W, H)) * 100).toFixed(1),
            state: states[burg.state]?.name || "Neutrals",
            capital: !!burg.capital,
            port: !!burg.port
          };
        } else if (marker) {
          placed = {as: "marker", cell: marker.cell};
        }
        return {
          id: loc.id,
          name: loc.name,
          type: loc.type,
          owner: loc.owner,
          spec: {x: loc.x, y: loc.y},
          terrainAtSpecCoords: {
            height: cells.h[targetCell],
            isLand: cells.h[targetCell] >= 20,
            hasRiver: !!cells.r[targetCell],
            stateAtCell: states[cells.state[targetCell]]?.name || "Neutrals"
          },
          placed,
          onMap: !!placed
        };
      });

      // States
      const stateReport = spec.states.map(s => {
        const st = states.find(x => x && x.i && !x.removed && norm(x.name) === norm(s.name));
        const capLoc = spec.locations.find(l => l.id === s.capital);
        return {
          id: s.id,
          name: s.name,
          specCapital: capLoc?.name || s.capital || null,
          onMap: !!st,
          actualCapital: st ? burgs[st.capital]?.name : null,
          cells: st?.cells ?? 0,
          burgs: st ? burgs.filter(b => b && b.i && b.state === st.i).length : 0,
          specLocationCount: spec.locations.filter(l => l.owner === s.id).length
        };
      });

      // Terrain probes derived from the spec's own border hints / commands
      // Probe the full grid: pack drops deep-ocean cells so water regions would look empty
      const g = window.grid;
      const probeBox = (x0, x1, y0, y1) => {
        const idx = [];
        for (let i = 0; i < g.points.length; i++) {
          const [x, y] = g.points[i];
          if (x >= x0 * W && x <= x1 * W && y >= y0 * H && y <= y1 * H) idx.push(i);
        }
        const hs = idx.map(i => g.cells.h[i]);
        return {
          cells: idx.length,
          meanHeight: +(hs.reduce((a, b) => a + b, 0) / Math.max(1, hs.length)).toFixed(1),
          landPct: +((hs.filter(h => h >= 20).length / Math.max(1, hs.length)) * 100).toFixed(0),
          mountainPct: +((hs.filter(h => h >= 50).length / Math.max(1, hs.length)) * 100).toFixed(0),
          riverPct: null
        };
      };

      const landCells = Array.from(g.cells.h).filter(h => h >= 20).length;

      return {
        success: result.success,
        stats: result.stats,
        applicatorErrors: result.errors,
        map: {
          width: W,
          height: H,
          cells: cells.i.length,
          gridCells: g.points.length,
          landPct: +((landCells / g.points.length) * 100).toFixed(0),
          burgs: burgs.filter(b => b && b.i && !b.removed).length,
          states: states.filter(s => s && s.i && !s.removed).length,
          cultures: cultures.filter(c => c && c.i && !c.removed).length,
          religions: religions.filter(r => r && r.i && !r.removed).length,
          zones: zones?.length || 0,
          markers: markers?.length || 0,
          rivers: window.pack.rivers?.length || 0,
          svg: {
            burgLabels: document.querySelectorAll("#burgLabels text").length,
            stateLabels: document.querySelectorAll("#labels #states text").length,
            markers: document.querySelectorAll("#markers > *").length,
            zones: document.querySelectorAll("#zones > *").length
          }
        },
        terrainProbes: {
          "eastern mountains (Range x70-95 y10-50)": probeBox(0.7, 0.95, 0.1, 0.5),
          "blackwater valley (Trough x45-55 y0-100)": probeBox(0.45, 0.55, 0, 1),
          "northrealm west (x0-30 y30-55)": probeBox(0, 0.3, 0.3, 0.55),
          "corgak heartland (x55-65 y35-50)": probeBox(0.55, 0.65, 0.35, 0.5)
        },
        specSummary: {
          locations: spec.locations.length,
          states: spec.states.length,
          cultures: spec.cultures.length,
          religions: spec.religions.length,
          zones: spec.zones.length
        },
        locations,
        states: stateReport,
        cultures: spec.cultures.map(c => ({name: c.name, onMap: cultures.some(x => x && x.i && norm(x.name) === norm(c.name))})),
        religions: spec.religions.map(r => ({name: r.name, onMap: religions.some(x => x && x.i && norm(x.name) === norm(r.name))})),
        zones: spec.zones.map(z => ({name: z.name, type: z.type, onMap: (zones || []).some(x => norm(x.name) === norm(z.name))}))
      };
    }, spec);

    report.consoleLog = logs.slice(0, 200);
    fs.mkdirSync(path.dirname(REPORT_FILE), {recursive: true});
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    await page.evaluate(() => {
      const loading = document.getElementById("loading");
      if (loading) loading.style.display = "none";
      if (typeof window.resetZoom === "function") window.resetZoom(0);
    });
    await page.waitForTimeout(500);
    await page.screenshot({path: REPORT_FILE.replace(/\.json$/, ".png"), fullPage: false});

    console.log(JSON.stringify({map: report.map, stats: report.stats, terrainProbes: report.terrainProbes}, null, 2));
    expect(report.fatal, report.fatal).toBeUndefined();
  });
});
