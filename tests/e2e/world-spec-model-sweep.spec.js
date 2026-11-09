import {test, expect} from "@playwright/test";
import fs from "fs";
import path from "path";
import {useSharedAppPage, loadWorldSpecApplicator} from "../setup/helpers.js";

/**
 * Model sweep: turn every world spec in SWEEP_DIR into a map on one shared
 * page and score each one (terrain fidelity, location hints, placement,
 * entities, borders). Writes audit-reports/<sweep-name>.json plus a PNG per
 * model, and prints a comparison table.
 *
 *   SWEEP_DIR=world-spec-outputs/sweep-2026-11-08T... npx playwright test tests/e2e/world-spec-model-sweep.spec.js
 */

const SWEEP_DIR = process.env.SWEEP_DIR || latestSweepDir();
const files = SWEEP_DIR
  ? fs
      .readdirSync(SWEEP_DIR)
      .filter(f => f.endsWith(".json") && !f.endsWith(".error.json") && f !== "summary.json")
      .sort()
  : [];

function latestSweepDir() {
  const root = "world-spec-outputs";
  if (!fs.existsSync(root)) return null;
  const dirs = fs
    .readdirSync(root)
    .filter(d => d.startsWith("sweep-") && fs.statSync(path.join(root, d)).isDirectory())
    .sort();
  return dirs.length ? path.join(root, dirs[dirs.length - 1]) : null;
}

test.describe("World spec model sweep", () => {
  test.skip(!files.length, "No sweep outputs found; run scripts/world-spec-model-sweep.mjs first");
  const shared = useSharedAppPage(test);
  const rows = [];
  const sweepName = path.basename(SWEEP_DIR || "sweep");

  test.beforeAll(async () => {
    test.setTimeout(120000);
    await loadWorldSpecApplicator(shared.page);
  });

  test("map every spec in the sweep", async () => {
    test.setTimeout(240000 * Math.max(1, files.length));
    for (const file of files) {
        const payload = JSON.parse(fs.readFileSync(path.join(SWEEP_DIR, file), "utf8"));
        const spec = payload.worldSpec || payload;

        const outcome = await shared.page.evaluate(async spec => {
          const A = window.WorldSpecApplicator;
          try {
            const result = await A.generateFromSpec(A.cleanupWorldSpec(JSON.parse(JSON.stringify(spec))));
            const {states, burgs, markers} = window.pack;
            const norm = s => String(s || "").toLowerCase().replace(/[’']/g, "'");
            const burgNames = new Set(burgs.filter(b => b && b.i && !b.removed).map(b => norm(b.name)));
            const markerNames = new Set((markers || []).filter(m => m.specId).map(m => norm(m.name)));
            const onMap = spec.locations.filter(l => burgNames.has(norm(l.name)) || markerNames.has(norm(l.name))).length;
            const ownershipOk = burgs
              .filter(b => b && b.i && !b.removed)
              .every(b => {
                const loc = spec.locations.find(l => norm(l.name) === norm(b.name));
                if (!loc || !loc.owner || loc.owner === "none") return true;
                const owner = spec.states.find(s => s.id === loc.owner);
                return !owner || states[b.state]?.name === owner.name;
              });
            const loading = document.getElementById("loading");
            if (loading) loading.style.display = "none";
            if (typeof window.resetZoom === "function") window.resetZoom(0);
            return {
              ok: result.success,
              terrainMode: result.terrainMode,
              fidelity: result.fidelity,
              placement: result.placementSummary,
              stats: result.stats,
              warnings: result.warnings.length,
              errors: result.errors.length,
              locationsOnMap: onMap,
              locationsInSpec: spec.locations.length,
              statesCreated: states.filter(s => s && s.i && !s.removed).length,
              statesInSpec: spec.states.length,
              ownershipOk,
              landPct: Math.round((Array.from(window.grid.cells.h).filter(h => h >= 20).length / window.grid.cells.h.length) * 100)
            };
          } catch (error) {
            return {ok: false, error: error.message};
          }
        }, spec);

        const modelName = (payload.model || file.replace(/\.json$/, "")).replace(/[/:]/g, "_");
        fs.mkdirSync("audit-reports", {recursive: true});
        await shared.page.waitForTimeout(300);
        await shared.page.screenshot({path: path.join("audit-reports", `${sweepName}__${modelName}.png`)});

        const terrain = outcome.fidelity?.terrain;
        const locs = outcome.fidelity?.locations;
        const borders = outcome.fidelity?.borders;
        rows.push({
          model: payload.model || file,
          provider: payload.provider,
          genSeconds: payload.duration ? +payload.duration : null,
          costUsd: payload.estimatedCostUsd ?? null,
          ok: outcome.ok,
          error: outcome.error,
          terrainMode: outcome.terrainMode,
          features: terrain ? `${terrain.features.filter(f => f.passed).length}/${terrain.features.length}` : "-",
          terrainScore: terrain?.score ?? null,
          hints: locs ? `${locs.locations.filter(l => l.passed).length}/${locs.locations.length}` : "-",
          placed: outcome.placement ? `${outcome.placement.placed}/${outcome.placement.total}` : "-",
          exact: outcome.placement?.exact ?? null,
          meanOffsetCells: outcome.placement?.meanDisplacementCells ?? null,
          maxOffsetCells: outcome.placement?.maxDisplacementCells ?? null,
          locationsOnMap: outcome.ok ? `${outcome.locationsOnMap}/${outcome.locationsInSpec}` : "-",
          states: outcome.ok ? `${outcome.statesCreated}/${outcome.statesInSpec}` : "-",
          ownershipOk: outcome.ownershipOk,
          borders: borders ? `${borders.borders.filter(b => b.passed).length}/${borders.borders.length}` : "-",
          landPct: outcome.landPct ?? null,
          warnings: outcome.warnings ?? null,
          applicatorErrors: outcome.errors ?? null
        });


      console.log(`${outcome.ok ? "OK  " : "FAIL"} ${file}${outcome.ok ? "" : " — " + outcome.error}`);
    }
    expect(rows.filter(r => r.ok).length, "no spec produced a map").toBeGreaterThan(0);
  });

  test.afterAll(() => {
    if (!rows.length) return;
    const report = {sweep: SWEEP_DIR, generatedAt: new Date().toISOString(), rows};
    fs.mkdirSync("audit-reports", {recursive: true});
    fs.writeFileSync(path.join("audit-reports", `${sweepName}.json`), JSON.stringify(report, null, 2));
    const cols = ["model", "ok", "terrainMode", "features", "terrainScore", "hints", "placed", "exact", "meanOffsetCells", "maxOffsetCells", "locationsOnMap", "states", "ownershipOk", "borders", "landPct", "genSeconds", "costUsd"];
    console.log("\n" + cols.join("\t"));
    for (const r of rows) console.log(cols.map(c => String(r[c] ?? "")).join("\t"));
    console.log(`\nReport: audit-reports/${sweepName}.json`);
  });
});
