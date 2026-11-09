# World Spec: Deterministic Terrain

How an AI-generated world specification becomes a map, and how to prove the map matches it.

## Why this exists

The first version of the pipeline asked the model for FMG heightmap DSL commands such as
`Range 2 72-88 70-95 10-50`. Those commands pick a *random* point inside the box and grow a
*random* blob. The model also placed locations at exact coordinates expecting them to sit on
the mountains it had just "drawn". The two never lined up. Auditing a real GPT-5.1 output
against the produced map showed:

- 6 of 16 locations sat on water at their spec coordinates; 4 sat on 90-height peaks (a forest, a river, a ford).
- Every location was moved 40-134 px (4-15% of the map) because placement picked the "most suitable" cell in a huge radius.
- Ruins, ridges, forests, rivers and swamps were all turned into towns (and 8 of them into ports).
- The "eastern mountains" box ended up 8% mountain; the "river valley" box ended up 38% mountain.

Random terrain cannot be made faithful. Deterministic terrain can.

## The contract

`terrain.features` is a list of shapes in the **same 0-1 coordinate system as locations**
(x west to east, y north to south). `modules/ai/terrain-painter.js` rasterizes them onto the
FMG grid with no randomness except a seeded noise field for natural-looking edges. The same
spec always produces the same heights.

```json
"terrain": {
  "base": "ocean",
  "features": [
    {"id": "mainland", "type": "landmass", "points": [[0.08,0.12],[0.92,0.08],[0.95,0.9],[0.1,0.92]]},
    {"id": "stone_teeth", "type": "mountains", "points": [[0.78,0.1],[0.82,0.3],[0.8,0.5]], "height": 88, "width": 0.05},
    {"id": "blackwater_valley", "type": "valley", "points": [[0.5,0.05],[0.52,0.5],[0.48,0.95]], "width": 0.03},
    {"id": "headwaters", "type": "lake", "points": [[0.58,0.42]], "radius": 0.03}
  ],
  "heightmapCommands": []
}
```

| Kind | Types | Geometry | Composition |
|------|-------|----------|-------------|
| area-land | landmass, continent, island, peninsula, plateau, highlands | polygon or point + radius | raise to at least `height`, coastal ramp + offshore shelf |
| area-lower | lowlands, plains | polygon or point + radius | lower land to at most `height` |
| line-raise | mountains, ridge, hills, volcano | polyline + `width` | ridge peaking at `height` |
| line-lower | valley, canyon | polyline + `width` + `depth` | lower land, floor stays land |
| area-water | lake, sea, bay, gulf, inlet | polygon or point + radius | carve water |
| line-water | strait, channel, fjord | polyline + `width` | carve a water channel |

Order of composition is fixed (land, relief, water) regardless of declaration order, so a
lake inside a landmass is always water. Distances (`radius`, `width`, `falloff`) are fractions
of the map width. `0` or missing means "use the type default".

Legacy specs that only have `heightmapCommands` are converted to features
(`featuresFromHeightmapCommands`), collapsing random ranges to their centers. Set
`terrain.useLegacyDsl: true` to run the old randomized DSL instead.

## Locations

- `kind: "settlement"` (or a settlement type: city, town, village, fortress, camp...) becomes a burg.
- `kind: "landmark"` (or ruins, lair, mine, forest, lake, peak, battlefield...) becomes a map marker with the description as its legend note.
- `terrain` hint (`coast`, `plain`, `hill`, `mountain`, `valley`, `island`, `lake`, `water`, `land`) is verified after painting.
- Placement is **nearest valid cell**, never "best" cell. A location lands on its own cell when that cell is land and free; otherwise it moves to the closest cell that is, searching ring by ring. Each placement records `displacementCells`, and the UI and tests surface the mean and max.

## Fidelity report

`generateFromSpec` returns:

```js
{
  success, seed, terrainMode,          // "features" | "converted-dsl" | "legacy-dsl" | "template"
  fidelity: {
    terrain:   {passed, score, features: [{id, type, expected, ratio, passed}]},
    locations: {passed, locations: [{name, expected, height, passed}]},
    summary:   ["OK  mountains \"stone_teeth\": 100% elevated", ...]
  },
  placement: [{id, name, as: "capital"|"burg"|"marker", cell, displacementCells, exact, farFallback, state}],
  placementSummary: {total, placed, unplaced, burgs, markers, exact, meanDisplacementCells, maxDisplacementCells},
  warnings, errors, stats
}
```

The terrain check samples every grid cell in each feature's core (inside the shape beyond the
edge ramp) and requires a minimum share to match the feature's class (land ≥ 90%, water ≥ 90%,
elevated ≥ 80%, ...). It samples the **full grid**, not `pack`, because FMG drops deep-ocean
cells from `pack`.

## What the spec drives

| Spec field | Map result |
|------------|------------|
| `terrain.base`, `terrain.features` | heights, coastlines, mountains, lakes (deterministic) |
| `terrain.heightmapCommands` | converted to features (or run as-is with `useLegacyDsl`) |
| `terrain.climateSettings.zone` / `latitude` / `hemisphere` | globe position (map size + latitude sliders) → temperatures, biomes |
| `terrain.climateSettings.temperatureEquator` / `temperatureNorthPole` / `precipitation` | temperature model, rainfall |
| `locations[]` (`x`, `y`, `kind`, `type`, `terrain`, `name`, `description`, `population`, `owner`, `isCapital`) | burgs or markers on their exact cells, legend notes, ownership seeds |
| `states[]` (`name`, `form`, `formName`, `color`, `culture`, `expansionism`, `capital`, `relations`, `coa`) | states, capitals, territory (seeded Dijkstra), diplomacy, emblems |
| `worldAnalysis.conflictType` | territorial warfare → enemies across the front |
| `worldAnalysis.worldName` (or `spec.name`) | map title |
| `cultures[]` (`name`, `type`, `base`, `color`, `expansionism`, `x`/`y`) | cultures, name bases, culture territory (weighted Dijkstra) |
| `religions[]` (`name`, `type`, `form`, `deity`, `culture`, `color`) | religions covering their culture's cells |
| `zones[]` (`name`, `type`, `center`, `radius`, `description`) | hatched zone overlays |
| `terrain.climateSettings.prevailingWind` / `winds` / `longitude` | rain-bearing wind direction, central meridian |
| `provinces[]` (`name`, `state`, `center`, `formName`) | provinces grown inside their state; empty → FMG auto-generates from burgs |
| `locations[].burgType` | burg type (Generic, Naval, Lake, Highland, River, Nomadic, Hunting); default is FMG's terrain classification |
| `states[].locations` | fallback ownership when `locations[].owner` is missing |
| `borders[]` (`between`, `type`) | verified, not generated: the report says whether the produced border actually runs along a river / mountains / forest, or whether sea-separated states touch |
| `options.military` (default true) | regiments from FMG's military generator (uses diplomacy and area) |
| `options.flavourMarkers` (default true) | FMG's random markers (volcanoes, inns, bridges...) added around the spec's own markers |
| `map.style` | visual style preset (default, ancient, gloom, pale, watercolor, clean, atlas, cyberpunk, night, monochrome) |
| `map.width` / `height` / `cells` | canvas size and cell count (default scales with location count) |
| derived automatically | roads/sea routes between burgs, burg walls/citadel/plaza/temple flags, state statistics and neighbours |

Everything in the spec now reaches the map. What remains random is only FMG's flavour layer
(marker placement, regiment composition, province shapes when `provinces[]` is empty), and that
is seeded from the spec so it is reproducible.

## Models and providers

`modules/ai/model-registry.js` is the single list of models offered everywhere (Vite API plugin,
Express server, browser UIs, sweep harness). Each entry has a vendor API route and an OpenRouter
id; `vite-plugins/ai-client.js` picks the vendor API when its key is set and OpenRouter otherwise,
and falls back to OpenRouter automatically when a vendor account is out of credits.

| Vendor | Models | Notes |
|---|---|---|
| Anthropic | Claude Opus 5.5 (default), Sonnet 5.5, Haiku 5.5, Fable 5.1 | no `temperature`; effort via `output_config.effort`; the world-spec schema exceeds the structured-output grammar limit, so Claude gets the schema in the prompt and the JSON is validated afterwards |
| OpenAI | GPT-6 Astra, GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Luna | strict `response_format` json_schema |
| Google | Gemini 4 Argon, Gemini 3.8 Flash | via OpenRouter |
| xAI | Grok 4.7 | via OpenRouter |

Sweep all of them on one adventure with `npm run ai:sweep` (writes `world-spec-outputs/sweep-<stamp>/`),
then `npm run test:sweep` maps and scores each spec into `audit-reports/sweep-<stamp>.json` with a PNG per model.

## Where the logic lives

| File | Role | Tested by |
|------|------|-----------|
| `modules/ai/terrain-painter.js` | pure painter, geometry, noise, legacy conversion | `terrain-painter.test.js` (vitest) |
| `modules/ai/terrain-fidelity.js` | pure fidelity checks, point index | `terrain-fidelity.test.js` (vitest) |
| `modules/ai/world-spec-validator.js` | schema-ish validation incl. features | vitest + Playwright |
| `modules/ai/world-spec-prompts.js` | system prompt + JSON schema the model must follow | Node smoke check |
| `modules/ai/world-spec-applicator.js` | orchestrates FMG: terrain hook, placement, states, markers | `tests/e2e/world-spec-applicator.spec.js`, `tests/e2e/world-spec-fidelity.spec.js` |
| `modules/heightmap-generator.js` | `registerCustom(id, graph => heights)` hook | Playwright |
| `tests/e2e/world-spec-fidelity-audit.spec.js` | spec-vs-map audit report for any JSON spec | `npm run test:audit` |

## Auditing a real AI output

```bash
# default: world-spec-outputs/gpt-5.1_2025-12-01T05-07-35.json
npm run test:audit
# any spec
WORLD_SPEC_FILE=path/to/spec.json AUDIT_REPORT=test-results/my-audit.json npm run test:audit
```

The report (`test-results/world-spec-audit.json` plus a PNG screenshot) lists, per location,
the terrain at its spec coordinates, what it became (burg or marker), how far it moved and
which state it ended up in, plus per-state cell counts and terrain probes.
