# Fantasy Map Generator - Test Suite

Two layers, picked by speed:

| Layer | Runner | What it covers | Time |
|-------|--------|----------------|------|
| **Fast** | Vitest (Node, no browser) | pure logic: AI data layer, dungeon preprocessor, prompts, terrain painter, fidelity checker, validators | ~2 s for 650+ tests |
| **Browser** | Playwright (Edge or bundled Chromium) | anything that needs FMG's globals, the DOM, SVG, or a generated map | ~25 s for the world-spec specs, ~15 min for everything |

Rule of thumb: if the code under test can be written as a pure function over plain data, put it
in a module with no DOM/global access and test it with Vitest. Only reach for Playwright when
the behaviour genuinely depends on the running app.

---

## Quick start

```bash
npm install
npx playwright install msedge        # or set PW_BROWSER=chromium to use the bundled browser

npm run test:fast                    # Vitest, all pure-logic tests (seconds)
npm run test:fast:watch              # Vitest in watch mode while developing

npm run test:world-spec              # Playwright: applicator + fidelity contract (~25 s incl. build)
npm run test:audit                   # Playwright: spec-vs-map audit report for a real AI output
npm run ai:sweep                     # live: ask every registry model for a world spec (costs money, needs API keys)
npm run test:sweep                   # Playwright: map + score every spec from the latest sweep folder
npm run test:e2e                     # all Playwright e2e specs
npm test                             # full Playwright suite
npm run test:report                  # open the HTML report
```

Useful environment variables for Playwright runs:

| Variable | Effect |
|----------|--------|
| `PW_SKIP_BUILD=1` | serve the existing `dist/` instead of rebuilding (saves ~15 s; only when sources are unchanged) |
| `PW_BROWSER=chromium` | use Playwright's bundled Chromium instead of the Edge channel |
| `WORLD_SPEC_FILE=path.json` | spec file for `npm run test:audit` |
| `AUDIT_REPORT=path.json` | where the audit writes its report (+ PNG screenshot) |
| `SWEEP_DIR=world-spec-outputs/sweep-…` | sweep folder for `npm run test:sweep` (default: newest) |
| `COLLECT_COVERAGE=true` | collect V8 coverage during Playwright runs |

---

## Layout

```
vitest.config.js            # fast layer: modules/ai/**/*.test.js, tests/node/**/*.test.js
playwright.config.js        # browser layer

modules/ai/*.test.js        # Vitest tests live next to the module they test
tests/node/                 # Node-only helpers (synthetic grid for terrain tests)
tests/fixtures/             # JSON fixtures (e.g. world-spec-corgak-features.json)

tests/setup/
  helpers.js                # gotoApp, waitForAppReady, useSharedAppPage, loadWorldSpecApplicator, ...
  fixtures.js               # map seeds
  mocks.js                  # AI/storage mocks
  coverageHelpers.js        # V8 coverage plumbing

tests/unit/                 # Playwright unit-style tests against app globals (utils, modules, core)
tests/integration/          # map generation pipeline
tests/e2e/                  # workflows, editors, layers, AI features
  world-spec-applicator.spec.js      # API, validation, placement, generation (shared page)
  world-spec-fidelity.spec.js        # the contract: spec geography == map geography
  world-spec-fidelity-audit.spec.js  # report generator for any spec file
tests/performance/          # benchmarks
```

---

## Writing fast (Vitest) tests

```javascript
import {describe, test, expect} from "vitest";
import {paintTerrain} from "./terrain-painter.js";
import {createSyntheticGrid, cellAt} from "../../tests/node/synthetic-grid.js";

const grid = createSyntheticGrid({width: 800, height: 600, cells: 4000});

test("island lands where asked", () => {
  const h = paintTerrain({features: [{type: "island", points: [[0.3, 0.5]], radius: 0.12}]}, grid, {width: 800, height: 600, seed: "t"});
  expect(h[cellAt(grid, 0.3, 0.5)]).toBeGreaterThanOrEqual(20);
});
```

Modules meant for this layer must not touch `window`, `document`, or FMG globals at import time
(exposing themselves on `window` behind a `typeof window !== "undefined"` guard is fine).

---

## Writing browser (Playwright) tests

### Share one page per worker (default for unit specs)

All `tests/unit/**` specs import `test`/`expect` from `tests/setup/shared-test.js` instead of
`@playwright/test`. That fixture replaces `page` with one app page per worker, loaded once with a
small map and reused by every test the worker runs. Together with `fullyParallel: false` in
`playwright.config.js` (a file's tests run in order in one worker), page load happens ~16 times
per run instead of ~1400. Rules: never navigate, close what you open, and if a test regenerates
the map say so in its name. `scripts/codemod-shared-page.mjs` converts a page-per-test file.

```javascript
import {test, expect} from "../../setup/shared-test.js";

test("rn rounds", async ({page}) => {              // page = shared app page
  expect(await page.evaluate(() => rn(3.14159, 2))).toBe(3.14);
});

test.beforeAll(async ({appPage}) => { /* worker-scoped handle when a describe keeps its own `page` */ });
```

The read-only e2e specs (layers, toolbar, dialogs, ai-data-layer, notesEditor, editorWorkflows)
use the same fixture. The specs that regenerate or load maps (mapGeneration, coreWorkflows,
userJourneys, integration, performance) keep a page per test on purpose.

### Share one page per file (e2e specs with heavier state)

Loading the app is the expensive part (5-15 s). Use `useSharedAppPage` so a whole describe
block shares one page, loaded once with a tiny map:

```javascript
import {test, expect} from "@playwright/test";
import {useSharedAppPage, loadWorldSpecApplicator} from "../setup/helpers.js";

test.describe("My feature", () => {
  const shared = useSharedAppPage(test);          // serial mode, one page, fast init

  test.beforeAll(async () => {
    await loadWorldSpecApplicator(shared.page);  // if you need the AI modules
  });

  test("does a thing", async () => {
    const result = await shared.page.evaluate(() => window.pack.cells.i.length);
    expect(result).toBeGreaterThan(0);
  });
});
```

Tests in a shared-page block run serially and must not depend on each other's map state
(or must regenerate it themselves).

### Per-test pages

When isolation matters more than speed, keep the classic pattern:

```javascript
test.beforeEach(async ({page}) => {
  await gotoApp(page);
  await waitForAppReady(page);
});
```

### Things to know about FMG internals

- `pack` drops deep-ocean cells. To measure land/water share or probe open sea, use `window.grid` (`grid.cells.h`, `grid.points`, `grid.cellsX`, `grid.spacing`).
- `pack.cells.q.find(x, y)` returns `[x, y, cellId]`, so the id is `found[2]`.
- The loading overlay fades for 3 s after the initial map; hide `#loading` before screenshots.
- `localStorage` persists options between loads. The fast init script sets `points=1` (1000 cells) and an 800x600 map so the on-load map is cheap.

---

## The world-spec fidelity contract

`tests/e2e/world-spec-fidelity.spec.js` generates a map from
`tests/fixtures/world-spec-corgak-features.json` and asserts:

- every terrain feature passes the fidelity check (land is land, mountains are high, lakes are water);
- every location's `terrain` hint is satisfied at its coordinates;
- settlements become burgs and landmarks become markers, all named as in the spec;
- no location moved more than two cells from its spec coordinates;
- states, capitals, ownership, cultures and religions match the spec;
- the SVG actually contains the burgs, markers and state labels.

If you change the painter, the applicator, or FMG's generation pipeline, this is the spec that
tells you whether AI-directed geography still ends up on the map. See `WORLD-SPEC-TERRAIN.md`
for the terrain format and the audit workflow.

---

## CI

`.github/workflows` runs the fast layer first (fails in seconds if pure logic breaks), then the
Playwright jobs. Playwright artifacts (HTML report, screenshots, videos, audit JSON) are
uploaded on every run.

---

## Troubleshooting

- **"Failed to fetch dynamically imported module"**: the built app bundles `modules/ai/*` into the main chunk; use the `window.*` exports (`WorldSpecApplicator`, `TerrainPainter`, `TerrainFidelity`) instead of importing by URL.
- **Edge not found**: `npx playwright install msedge`, or run with `PW_BROWSER=chromium`.
- **Build failing in webServer**: run `npm run build` directly to see the esbuild error; template-literal prompts must escape backticks as `` \` ``.
- **Slow run**: check you are not loading a page per test; convert the file to `useSharedAppPage`.
