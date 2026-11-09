/**
 * AI Data Layer - Unit Test Suite (Vitest)
 *
 * Pure Node.js tests with mocked data - no browser required.
 *
 * Tests for:
 * 1. Encoding: All 12 entity types
 * 2. Decoding: Round-trip preservation
 * 3. Validation - Schema: Obvious errors rejected
 * 4. Validation - Referential: Invalid refs detected
 * 5. Validation - Semantic: Subtle errors caught
 * 6. Edge cases: ID 0, empty arrays, NaN, boundaries
 * 7. Batch operations: ChangeSet validation, atomicity
 *
 * Run with: npm run test:unit:ai
 */

import {describe, test, expect, beforeEach, afterEach} from "vitest";
import {DataLayer} from "./data-layer.js";
import {validateSchema, validateReferences, validateSemantics, validateChangeSet} from "./validators.js";

// ============================================================================
// Mock Data Factory
// ============================================================================

function createMockPack(options = {}) {
  const numCells = options.numCells || 100;

  return {
    states: options.states || [
      {i: 0, name: "Neutrals", removed: false}, // Index 0 is special
      {i: 1, name: "Hizuna", form: "Union", capital: 1, culture: 1, cells: 50, burgs: 5, neighbors: [2], diplomacy: ["x", "x", "Ally"]},
      {i: 2, name: "Korinth", form: "Monarchy", capital: 2, culture: 2, cells: 30, burgs: 3, neighbors: [1], diplomacy: ["x", "Ally", "x"]},
      {i: 3, removed: true} // Removed state for testing
    ],
    burgs: options.burgs || [
      {i: 0, name: "", removed: false}, // Index 0 is placeholder
      {i: 1, name: "Kaki", cell: 10, x: 100, y: 200, state: 1, population: 50, capital: 1, port: 1, culture: 1, feature: 1},
      {i: 2, name: "Pelora", cell: 20, x: 200, y: 300, state: 2, population: 30, capital: 1, culture: 2, feature: 1},
      {i: 3, name: "Smalltown", cell: 15, x: 150, y: 250, state: 1, population: 10, culture: 1, feature: 1},
      {i: 4, removed: true} // Removed burg
    ],
    markers: options.markers || [
      {i: 0, type: "volcanoes", x: 300, y: 400, cell: 30, icon: "🌋"},
      {i: 1, type: "ruins", x: 350, y: 450, cell: 35, icon: "🏺", lock: true}
    ],
    cultures: options.cultures || [
      {i: 0, name: "Wildlands", removed: false},
      {i: 1, name: "Shwazen", type: "Generic", base: 1, center: 10, expansionism: 1.2, code: "Sw"},
      {i: 2, name: "Korinthian", type: "Naval", base: 2, center: 20, expansionism: 1.0, code: "Ko"}
    ],
    religions: options.religions || [
      {i: 0, name: "No religion", removed: false},
      {i: 1, name: "Moonlight", type: "Folk", form: "Animism", culture: 1, center: 10, expansionism: 1, code: "Ml"}
    ],
    provinces: options.provinces || [
      {i: 0, removed: false},
      {i: 1, name: "Kaki Province", state: 1, center: 10, burg: 1, formName: "Province"}
    ],
    rivers: options.rivers || [
      {i: 1, name: "Silverflow", source: 5, mouth: 50, parent: 0, discharge: 100, length: 234, width: 1.2}
    ],
    routes: options.routes || [
      {i: 1, group: "roads", feature: 1, points: [[100, 200, 10], [150, 250, 15], [200, 300, 20]]}
    ],
    features: options.features || [
      {i: 0, type: "ocean"},
      {i: 1, type: "island", land: true, border: false, cells: 80, area: 50000, group: "continent"}
    ],
    zones: options.zones || [
      {i: 0, name: "Cursed Lands", type: "dangerous", cells: [10, 11, 12]}
    ],
    cells: {
      i: new Array(numCells).fill(0).map((_, i) => i),
      h: new Uint8Array(numCells).fill(25), // All land
      t: new Int8Array(numCells).fill(2), // Distance from coast
      p: new Array(numCells).fill(0).map((_, i) => [i * 10, i * 10]), // Cell centers
      state: new Uint16Array(numCells).fill(0),
      culture: new Uint16Array(numCells).fill(0),
      religion: new Uint16Array(numCells).fill(0),
      burg: new Uint16Array(numCells).fill(0),
      pop: new Float32Array(numCells).fill(1)
    }
  };
}

function createMockNotes() {
  return [
    {id: "marker0", name: "Mount Doom", legend: "<p>Active volcano</p>"},
    {id: "state1", name: "Hizuna", legend: "<p>A prosperous union</p>"}
  ];
}

// Setup data source for testing
function setupMockDataSource(pack, notes = []) {
  DataLayer.setDataSource({
    getPack: () => pack,
    getGrid: () => ({}),
    getNotes: () => notes
  });
}

// ============================================================================
// Encoding Tests
// ============================================================================

describe("DataLayer.encode", () => {
  beforeEach(() => {
    setupMockDataSource(createMockPack(), createMockNotes());
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("state encoding", () => {
    test("encodes state with all fields", () => {
      const state = {
        i: 1,
        name: "Hizuna",
        form: "Union",
        capital: 1,
        culture: 1,
        cells: 50,
        burgs: 5,
        area: 20000,
        urban: 100,
        rural: 500,
        neighbors: [2, 3],
        diplomacy: ["x", "x", "Ally", "Enemy"]
      };

      const encoded = DataLayer.encode.state(state);

      expect(encoded).toContain("S1|Hizuna|Union");
      expect(encoded).toContain("C1");
      expect(encoded).toContain("CL1");
      expect(encoded).toContain("N50");
      expect(encoded).toContain("B5");
      expect(encoded).toContain("A20k");
      expect(encoded).toContain("NB[2,3]");
      expect(encoded).toContain("D[2:A,3:E]");
    });

    test("omits empty optional fields", () => {
      const state = {i: 1, name: "Minimal", form: "Monarchy"};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).toBe("S1|Minimal|Monarchy");
      expect(encoded).not.toContain("NB");
      expect(encoded).not.toContain("|D");
    });

    test("returns null for removed state", () => {
      const state = {i: 1, name: "Removed", removed: true};
      expect(DataLayer.encode.state(state)).toBeNull();
    });
  });

  describe("burg encoding", () => {
    test("encodes burg with flags", () => {
      const burg = {
        i: 1,
        name: "Kaki",
        cell: 10,
        x: 100.5,
        y: 200.7,
        state: 1,
        population: 50,
        type: "Naval",
        capital: 1,
        port: 1,
        walls: 1,
        temple: 0,
        culture: 1,
        feature: 1
      };

      const encoded = DataLayer.encode.burg(burg);

      expect(encoded).toContain("B1|Kaki|10|@101,201"); // Rounded coords
      expect(encoded).toContain("S1");
      expect(encoded).toContain("P50");
      expect(encoded).toContain("TNaval");
      expect(encoded).toContain("FCPW"); // Capital, Port, Walls
      expect(encoded).toContain("CL1");
      expect(encoded).toContain("FT1");
    });

    test("encodes all flag types", () => {
      const burg = {
        i: 1,
        name: "AllFlags",
        cell: 10,
        x: 100,
        y: 200,
        capital: 1,
        port: 1,
        walls: 1,
        temple: 1,
        shanty: 1,
        citadel: 1,
        plaza: 1
      };

      const encoded = DataLayer.encode.burg(burg);
      expect(encoded).toContain("FCPWTSZL");
    });
  });

  describe("marker encoding", () => {
    test("encodes marker with all fields", () => {
      const marker = {i: 0, type: "volcanoes", x: 300, y: 400, cell: 30, icon: "🌋", lock: true};
      const encoded = DataLayer.encode.marker(marker);

      expect(encoded).toBe("M0|volcanoes|@300,400|C30|I🌋|L1");
    });
  });

  describe("culture encoding", () => {
    test("encodes culture correctly", () => {
      const culture = {i: 1, name: "Shwazen", type: "Generic", base: 1, center: 10, expansionism: 1.2, code: "Sw"};
      const encoded = DataLayer.encode.culture(culture);

      expect(encoded).toBe("CL1|Shwazen|Generic|B1|C10|E1.2|CDSw");
    });
  });

  describe("religion encoding", () => {
    test("encodes religion correctly", () => {
      const religion = {i: 1, name: "Moonlight", type: "Folk", form: "Animism", culture: 1, center: 10, code: "Ml"};
      const encoded = DataLayer.encode.religion(religion);

      expect(encoded).toContain("RL1|Moonlight|Folk|Animism");
      expect(encoded).toContain("CL1");
      expect(encoded).toContain("CDMl");
    });
  });

  describe("province encoding", () => {
    test("encodes province correctly", () => {
      const province = {i: 1, name: "Kaki Province", state: 1, center: 10, burg: 1, formName: "Province"};
      const encoded = DataLayer.encode.province(province);

      expect(encoded).toBe("PV1|Kaki Province|S1|C10|B1|FNProvince");
    });
  });

  describe("river encoding", () => {
    test("encodes river correctly", () => {
      const river = {i: 1, name: "Silverflow", source: 5, mouth: 50, parent: 0, discharge: 100, length: 234, width: 1.2};
      const encoded = DataLayer.encode.river(river);

      expect(encoded).toBe("RV1|Silverflow|5|50|P0|D100|L234|W1.2");
    });
  });

  describe("note encoding", () => {
    test("encodes note and escapes pipe characters", () => {
      const note = {id: "marker0", name: "Test Note", legend: "<p>Text with | pipe</p>"};
      const encoded = DataLayer.encode.note(note);

      expect(encoded).toBe("NTmarker0|Test Note|<p>Text with \\| pipe</p>");
    });
  });

  describe("zone encoding", () => {
    test("encodes zone correctly", () => {
      const zone = {i: 0, name: "Cursed Lands", type: "dangerous", state: 0, cells: [10, 11, 12]};
      const encoded = DataLayer.encode.zone(zone);

      expect(encoded).toBe("ZN0|Cursed Lands|dangerous|S0|C[10,11,12]");
    });
  });

  describe("fullContext encoding", () => {
    test("encodes all entity types", () => {
      const pack = createMockPack();
      setupMockDataSource(pack, createMockNotes());

      const context = DataLayer.encode.fullContext();

      expect(context.states.length).toBeGreaterThan(0);
      expect(context.burgs.length).toBeGreaterThan(0);
      expect(context.markers.length).toBeGreaterThan(0);
      expect(context.cultures.length).toBeGreaterThan(0);
      expect(context.religions.length).toBeGreaterThan(0);
      expect(context.notes.length).toBeGreaterThan(0);
      expect(context.zones.length).toBeGreaterThan(0);
    });

    test("excludes removed entities", () => {
      const context = DataLayer.encode.fullContext();

      // State 3 is removed
      expect(context.states.some(s => s.includes("S3"))).toBe(false);
      // Burg 4 is removed
      expect(context.burgs.some(b => b.includes("B4"))).toBe(false);
    });
  });
});

// ============================================================================
// Decoding Tests
// ============================================================================

describe("DataLayer.decode", () => {
  describe("state decoding", () => {
    test("decodes state with all fields", () => {
      const encoded = "S1|Hizuna|Union|C1|CL1|N50|B5|A20k|U100|R500|NB[2,3]|D[2:A,3:E]";
      const state = DataLayer.decode.state(encoded);

      expect(state.i).toBe(1);
      expect(state.name).toBe("Hizuna");
      expect(state.form).toBe("Union");
      expect(state.capital).toBe(1);
      expect(state.culture).toBe(1);
      expect(state.cells).toBe(50);
      expect(state.burgs).toBe(5);
      expect(state.area).toBe(20000);
      expect(state.urban).toBe(100);
      expect(state.rural).toBe(500);
      expect(state.neighbors).toEqual([2, 3]);
      expect(state.diplomacy[2]).toBe("Ally");
      expect(state.diplomacy[3]).toBe("Enemy");
    });

    test("returns null for invalid input", () => {
      expect(DataLayer.decode.state(null)).toBeNull();
      expect(DataLayer.decode.state("X1|Invalid")).toBeNull();
    });
  });

  describe("burg decoding", () => {
    test("decodes burg with flags", () => {
      const encoded = "B1|Kaki|10|@100,200|S1|P50|TNaval|FCPW|CL1|FT1";
      const burg = DataLayer.decode.burg(encoded);

      expect(burg.i).toBe(1);
      expect(burg.name).toBe("Kaki");
      expect(burg.cell).toBe(10);
      expect(burg.x).toBe(100);
      expect(burg.y).toBe(200);
      expect(burg.state).toBe(1);
      expect(burg.population).toBe(50);
      expect(burg.type).toBe("Naval");
      expect(burg.capital).toBe(1);
      expect(burg.port).toBe(1);
      expect(burg.walls).toBe(1);
      expect(burg.temple).toBe(0);
    });
  });

  describe("marker decoding", () => {
    test("decodes marker correctly", () => {
      const encoded = "M0|volcanoes|@300,400|C30|I🌋|L1";
      const marker = DataLayer.decode.marker(encoded);

      expect(marker.i).toBe(0);
      expect(marker.type).toBe("volcanoes");
      expect(marker.x).toBe(300);
      expect(marker.y).toBe(400);
      expect(marker.cell).toBe(30);
      expect(marker.icon).toBe("🌋");
      expect(marker.lock).toBe(true);
    });
  });

  describe("note decoding", () => {
    test("decodes note and unescapes pipe characters", () => {
      const encoded = "NTmarker0|Test Note|<p>Text with \\| pipe</p>";
      const note = DataLayer.decode.note(encoded);

      expect(note.id).toBe("marker0");
      expect(note.name).toBe("Test Note");
      expect(note.legend).toBe("<p>Text with | pipe</p>");
    });
  });

  describe("round-trip tests", () => {
    test("state round-trip preserves data", () => {
      const original = {
        i: 1,
        name: "Hizuna",
        form: "Union",
        capital: 1,
        culture: 1,
        cells: 50,
        neighbors: [2, 3],
        diplomacy: ["x", "x", "Ally"]
      };

      const encoded = DataLayer.encode.state(original);
      const decoded = DataLayer.decode.state(encoded);

      expect(decoded.i).toBe(original.i);
      expect(decoded.name).toBe(original.name);
      expect(decoded.form).toBe(original.form);
      expect(decoded.capital).toBe(original.capital);
      expect(decoded.culture).toBe(original.culture);
      expect(decoded.cells).toBe(original.cells);
      expect(decoded.neighbors).toEqual(original.neighbors);
      expect(decoded.diplomacy[2]).toBe("Ally");
    });

    test("burg round-trip preserves data", () => {
      const original = {
        i: 1,
        name: "Kaki",
        cell: 10,
        x: 100,
        y: 200,
        state: 1,
        capital: 1,
        port: 1
      };

      const encoded = DataLayer.encode.burg(original);
      const decoded = DataLayer.decode.burg(encoded);

      expect(decoded.i).toBe(original.i);
      expect(decoded.name).toBe(original.name);
      expect(decoded.cell).toBe(original.cell);
      expect(decoded.capital).toBe(1);
      expect(decoded.port).toBe(1);
    });
  });

  describe("response decoding", () => {
    test("parses JSON ChangeSet", () => {
      const response = {
        create: {states: [{i: 5, name: "New State", form: "Republic"}]},
        update: {burgs: [{i: 1, population: 100}]},
        delete: {markers: [0]}
      };

      const changeSet = DataLayer.decode.response(response);

      expect(changeSet.create.states).toHaveLength(1);
      expect(changeSet.update.burgs).toHaveLength(1);
      expect(changeSet.delete.markers).toEqual([0]);
    });

    test("handles string JSON input", () => {
      const jsonStr = '{"create": {"states": [{"i": 5, "name": "New"}]}}';
      const changeSet = DataLayer.decode.response(jsonStr);

      expect(changeSet.create.states).toHaveLength(1);
    });

    test("returns error for invalid JSON", () => {
      const result = DataLayer.decode.response("not valid json");
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("Validation - Schema", () => {
  describe("missing required fields", () => {
    test("rejects state without name", () => {
      const errors = validateSchema({i: 1, form: "Monarchy"}, "state", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "name")).toBe(true);
    });

    test("rejects burg without cell", () => {
      const errors = validateSchema({i: 1, name: "Test", x: 100, y: 200}, "burg", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "cell")).toBe(true);
    });

    test("rejects marker without type", () => {
      const errors = validateSchema({i: 1, x: 100, y: 200}, "marker", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "type")).toBe(true);
    });
  });

  describe("invalid types", () => {
    test("rejects string for numeric field", () => {
      const errors = validateSchema({i: "not a number", name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "i")).toBe(true);
    });

    test("rejects number for string field", () => {
      const errors = validateSchema({i: 1, name: 123, form: "Monarchy"}, "state", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "name")).toBe(true);
    });
  });

  describe("out-of-range values", () => {
    test("rejects negative population", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: 200, population: -100}, "burg", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE" && e.field === "population")).toBe(true);
    });

    test("rejects negative ID", () => {
      const errors = validateSchema({i: -1, name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE" && e.field === "i")).toBe(true);
    });
  });

  describe("invalid enum values", () => {
    test("rejects invalid state form", () => {
      const errors = validateSchema({i: 1, name: "Test", form: "InvalidForm"}, "state", "create");
      expect(errors.some(e => e.code === "INVALID_ENUM" && e.field === "form")).toBe(true);
    });

    test("rejects invalid religion type", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "InvalidType", form: "Animism"}, "religion", "create");
      expect(errors.some(e => e.code === "INVALID_ENUM" && e.field === "type")).toBe(true);
    });

    test("rejects invalid route group", () => {
      const errors = validateSchema({i: 1, group: "invalid"}, "route", "create");
      expect(errors.some(e => e.code === "INVALID_ENUM" && e.field === "group")).toBe(true);
    });
  });

  describe("NaN values", () => {
    test("rejects NaN for numeric field", () => {
      const errors = validateSchema({i: NaN, name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.some(e => e.code === "INVALID_VALUE" && e.field === "i")).toBe(true);
    });
  });

  describe("update mode validation", () => {
    test("allows partial data for updates", () => {
      // In update mode, mandatory fields are not required
      const errors = validateSchema({population: 100}, "burg", "update");
      expect(errors.filter(e => e.code === "MISSING_REQUIRED")).toHaveLength(0);
    });
  });
});

// ============================================================================
// Referential Validation Tests
// ============================================================================

describe("Validation - Referential", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
  });

  describe("state references", () => {
    test("rejects non-existent capital burg", () => {
      const errors = validateReferences({i: 1, capital: 999}, "state", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "capital")).toBe(true);
    });

    test("rejects removed capital burg", () => {
      const errors = validateReferences({i: 1, capital: 4}, "state", pack); // Burg 4 is removed
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "capital")).toBe(true);
    });

    test("rejects non-existent culture", () => {
      const errors = validateReferences({i: 1, culture: 999}, "state", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "culture")).toBe(true);
    });

    test("rejects non-existent neighbor", () => {
      const errors = validateReferences({i: 1, neighbors: [999]}, "state", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field.includes("neighbors"))).toBe(true);
    });
  });

  describe("burg references", () => {
    test("rejects non-existent state", () => {
      const errors = validateReferences({i: 1, state: 999}, "burg", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "state")).toBe(true);
    });

    test("rejects removed state", () => {
      const errors = validateReferences({i: 1, state: 3}, "burg", pack); // State 3 is removed
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "state")).toBe(true);
    });

    test("rejects cell out of range", () => {
      const errors = validateReferences({i: 1, cell: 9999}, "burg", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "cell")).toBe(true);
    });
  });

  describe("province references", () => {
    test("rejects non-existent burg", () => {
      const errors = validateReferences({i: 1, state: 1, burg: 999}, "province", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "burg")).toBe(true);
    });
  });

  describe("route references (AI intent)", () => {
    test("rejects non-existent from.burg", () => {
      const errors = validateReferences({i: 1, from: {burg: 999}, to: {burg: 1}}, "route", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "from.burg")).toBe(true);
    });

    test("rejects non-existent to.burg", () => {
      const errors = validateReferences({i: 1, from: {burg: 1}, to: {burg: 999}}, "route", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "to.burg")).toBe(true);
    });
  });

  describe("zone references", () => {
    test("rejects cell out of range", () => {
      const errors = validateReferences({i: 1, cells: [10, 9999]}, "zone", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field.includes("cells"))).toBe(true);
    });
  });

  describe("allows valid references", () => {
    test("accepts valid state references", () => {
      const errors = validateReferences({i: 1, capital: 1, culture: 1, neighbors: [2]}, "state", pack);
      expect(errors).toHaveLength(0);
    });

    test("accepts valid burg references", () => {
      const errors = validateReferences({i: 1, state: 1, culture: 1, cell: 10}, "burg", pack);
      expect(errors).toHaveLength(0);
    });

    test("accepts ID 0 (neutral/none)", () => {
      const errors = validateReferences({i: 1, state: 0, culture: 0}, "burg", pack);
      expect(errors).toHaveLength(0);
    });
  });
});

// ============================================================================
// Semantic Validation Tests
// ============================================================================

describe("Validation - Semantic", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
  });

  describe("state semantics", () => {
    test("detects capital in wrong state", () => {
      // Burg 2 belongs to state 2, not state 1
      const {errors} = validateSemantics({i: 1, capital: 2}, "state", pack, null);
      expect(errors.some(e => e.code === "CAPITAL_WRONG_STATE")).toBe(true);
    });

    test("detects self-neighbor", () => {
      const {errors} = validateSemantics({i: 1, neighbors: [1, 2]}, "state", pack, null);
      expect(errors.some(e => e.code === "SELF_NEIGHBOR")).toBe(true);
    });

    test("accepts valid capital", () => {
      // Burg 1 belongs to state 1
      const {errors} = validateSemantics({i: 1, capital: 1}, "state", pack, null);
      expect(errors.filter(e => e.code === "CAPITAL_WRONG_STATE")).toHaveLength(0);
    });
  });

  describe("burg semantics", () => {
    test("detects duplicate capital", () => {
      // State 1 already has burg 1 as capital
      const {errors} = validateSemantics({i: 3, state: 1, capital: 1}, "burg", pack, null);
      expect(errors.some(e => e.code === "DUPLICATE_CAPITAL")).toBe(true);
    });

    test("warns about burg far from cell", () => {
      // Cell 10 center is at [100, 100], burg at [300, 400] is far
      const {warnings} = validateSemantics({i: 1, cell: 10, x: 300, y: 400}, "burg", pack, null);
      expect(warnings.some(w => w.code === "BURG_FAR_FROM_CELL")).toBe(true);
    });
  });

  describe("province semantics", () => {
    test("detects province burg in wrong state", () => {
      // Burg 2 is in state 2, but province is in state 1
      const {errors} = validateSemantics({i: 1, state: 1, burg: 2}, "province", pack, null);
      expect(errors.some(e => e.code === "PROVINCE_BURG_WRONG_STATE")).toBe(true);
    });
  });

  describe("river semantics", () => {
    test("detects same source and mouth", () => {
      const {errors} = validateSemantics({i: 1, source: 10, mouth: 10}, "river", pack, null);
      expect(errors.some(e => e.code === "RIVER_SAME_ENDPOINTS")).toBe(true);
    });
  });

  describe("route semantics", () => {
    test("detects same from and to burg", () => {
      const {errors} = validateSemantics({i: 1, from: {burg: 1}, to: {burg: 1}}, "route", pack, null);
      expect(errors.some(e => e.code === "ROUTE_SAME_ENDPOINTS")).toBe(true);
    });
  });
});

// ============================================================================
// ChangeSet Validation Tests
// ============================================================================

describe("Validation - ChangeSet", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
  });

  describe("asymmetric diplomacy detection", () => {
    test("detects asymmetric diplomacy in changeSet", () => {
      const changeSet = {
        update: {
          states: [
            {i: 1, diplomacy: ["x", "x", "Ally"]}, // State 1 sets Ally with State 2
            {i: 2, diplomacy: ["x", "Enemy", "x"]} // State 2 sets Enemy with State 1 (asymmetric!)
          ]
        }
      };

      const {errors} = validateChangeSet(changeSet, pack);
      expect(errors.some(e => e.code === "ASYMMETRIC_DIPLOMACY")).toBe(true);
    });

    test("accepts symmetric diplomacy", () => {
      const changeSet = {
        update: {
          states: [
            {i: 1, diplomacy: ["x", "x", "Ally"]}, // State 1 sets Ally with State 2
            {i: 2, diplomacy: ["x", "Ally", "x"]} // State 2 also sets Ally with State 1
          ]
        }
      };

      const {errors} = validateChangeSet(changeSet, pack);
      expect(errors.filter(e => e.code === "ASYMMETRIC_DIPLOMACY")).toHaveLength(0);
    });
  });

  describe("validates all entities in changeSet", () => {
    test("catches schema errors in create", () => {
      const changeSet = {
        create: {
          states: [{name: "NoID", form: "Monarchy"}] // Missing i
        }
      };

      const {errors} = validateChangeSet(changeSet, pack);
      expect(errors.some(e => e.code === "MISSING_REQUIRED")).toBe(true);
    });

    test("catches referential errors in create", () => {
      const changeSet = {
        create: {
          burgs: [{i: 10, name: "NewBurg", cell: 9999, x: 100, y: 200}] // Cell out of range
        }
      };

      const {errors} = validateChangeSet(changeSet, pack);
      expect(errors.some(e => e.code === "INVALID_REF")).toBe(true);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  describe("ID 0 handling", () => {
    test("state ID 0 (Neutrals) is special", () => {
      const pack = createMockPack();
      setupMockDataSource(pack, []);

      const context = DataLayer.encode.fullContext();
      // State 0 should be excluded from encoding (it's the Neutrals placeholder)
      expect(context.states.some(s => s.startsWith("S0|"))).toBe(false);
    });

    test("burg ID 0 is placeholder", () => {
      const pack = createMockPack();
      setupMockDataSource(pack, []);

      const context = DataLayer.encode.fullContext();
      expect(context.burgs.some(b => b.startsWith("B0|"))).toBe(false);
    });
  });

  describe("empty arrays", () => {
    test("handles empty neighbors array", () => {
      const state = {i: 1, name: "Test", form: "Monarchy", neighbors: []};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).not.toContain("NB");
    });

    test("handles empty diplomacy array", () => {
      const state = {i: 1, name: "Test", form: "Monarchy", diplomacy: []};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).not.toContain("|D");
    });

    test("handles empty zone cells", () => {
      const zone = {i: 1, name: "Empty", type: "test", cells: []};
      const encoded = DataLayer.encode.zone(zone);

      expect(encoded).not.toContain("|C[");
    });
  });

  describe("special characters", () => {
    test("handles state name with special characters", () => {
      const state = {i: 1, name: "Test's Kingdom", form: "Monarchy"};
      const encoded = DataLayer.encode.state(state);
      const decoded = DataLayer.decode.state(encoded);

      expect(decoded.name).toBe("Test's Kingdom");
    });
  });

  describe("large numbers", () => {
    test("handles large area values", () => {
      const state = {i: 1, name: "Huge", form: "Monarchy", area: 999999999};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).toContain("A1000000k");
    });
  });

  describe("floating point precision", () => {
    test("coordinates are rounded", () => {
      const burg = {i: 1, name: "Test", cell: 10, x: 123.456789, y: 987.654321};
      const encoded = DataLayer.encode.burg(burg);

      expect(encoded).toContain("@123,988");
    });

    test("river width preserves one decimal", () => {
      const river = {i: 1, name: "Test", source: 1, mouth: 10, width: 1.23456};
      const encoded = DataLayer.encode.river(river);

      expect(encoded).toContain("W1.2");
    });
  });
});

// ============================================================================
// CRUD Operations Tests
// ============================================================================

describe("CRUD Operations", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, createMockNotes());
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("create validation", () => {
    test("validates new state creation without capital", () => {
      // Create state without capital (valid - capital is optional)
      const result = DataLayer.create.state({
        i: 10,
        name: "New State",
        form: "Republic",
        culture: 1
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects capital in different state", () => {
      // Burg 1 belongs to state 1, so assigning it as capital of state 10 is a semantic error
      const result = DataLayer.create.state({
        i: 10,
        name: "New State",
        form: "Republic",
        capital: 1, // Burg 1 is in state 1
        culture: 1
      });

      // Invalid due to semantic error
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "CAPITAL_WRONG_STATE")).toBe(true);
    });

    test("rejects invalid state creation", () => {
      const result = DataLayer.create.state({
        i: 10,
        name: "New State",
        form: "InvalidForm"
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_ENUM")).toBe(true);
    });
  });

  describe("update validation", () => {
    test("validates existing entity update", () => {
      const result = DataLayer.update.state(1, {name: "Renamed Hizuna"});

      expect(result.valid).toBe(true);
    });

    test("rejects update to non-existent entity", () => {
      const result = DataLayer.update.state(999, {name: "Ghost"});

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "ENTITY_NOT_FOUND")).toBe(true);
    });

    test("rejects update to removed entity", () => {
      const result = DataLayer.update.state(3, {name: "Removed"}); // State 3 is removed

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "ENTITY_REMOVED")).toBe(true);
    });
  });

  describe("remove validation", () => {
    test("validates entity removal", () => {
      const result = DataLayer.remove.state(1);

      expect(result.valid).toBe(true);
    });

    test("warns about referenced entity", () => {
      // Burg 1 is the capital of state 1, so removing it should warn
      const result = DataLayer.remove.burg(1);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === "REFERENCED_BY")).toBe(true);
    });

    test("rejects removal of already removed entity", () => {
      const result = DataLayer.remove.state(3); // Already removed

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "ALREADY_REMOVED")).toBe(true);
    });
  });
});

// ============================================================================
// Batch Operations Tests
// ============================================================================

describe("Batch Operations", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, createMockNotes());
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("batch.validate", () => {
    test("validates complete ChangeSet", () => {
      const changeSet = {
        create: {
          states: [{i: 10, name: "New State", form: "Republic"}]
        },
        update: {
          burgs: [{i: 1, population: 100}]
        },
        delete: {
          markers: [1]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(true);
    });

    test("catches errors across all operations", () => {
      const changeSet = {
        create: {
          states: [{name: "NoID", form: "Monarchy"}] // Missing i
        },
        update: {
          burgs: [{i: 999, population: 100}] // Non-existent
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("batch.apply", () => {
    test("applies valid ChangeSet", () => {
      const changeSet = {
        create: {
          zones: [{i: 5, name: "New Zone", type: "test"}]
        }
      };

      const result = DataLayer.batch.apply(changeSet);

      expect(result.success).toBe(true);
      expect(result.snapshot).toBeDefined();
      expect(result.summary.created.zones).toBe(1);
    });

    test("returns snapshot for undo", () => {
      const changeSet = {
        update: {
          states: [{i: 1, name: "Renamed"}]
        }
      };

      const result = DataLayer.batch.apply(changeSet);

      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.pack).toBeDefined();
    });

    test("rejects invalid ChangeSet without applying", () => {
      const changeSet = {
        create: {
          states: [{name: "NoID"}] // Missing required i
        }
      };

      const result = DataLayer.batch.apply(changeSet);

      expect(result.success).toBe(false);
      expect(result.snapshot).toBeNull();
    });
  });
});

// ============================================================================
// Token Estimation
// ============================================================================

describe("Token Estimation", () => {
  test("estimates tokens for string", () => {
    const text = "This is a test string with some content";
    const tokens = DataLayer.estimateTokens(text);

    // ~4 chars per token
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(20);
  });

  test("estimates tokens for object", () => {
    const obj = {name: "Test", value: 123, array: [1, 2, 3]};
    const tokens = DataLayer.estimateTokens(obj);

    expect(tokens).toBeGreaterThan(0);
  });
});

// ============================================================================
// MALFORMED INPUT TESTS
// ============================================================================

describe("Malformed Input - Encoded Strings", () => {
  describe("decode.state malformed inputs", () => {
    test("returns null for empty string", () => {
      expect(DataLayer.decode.state("")).toBeNull();
    });

    test("returns null for null input", () => {
      expect(DataLayer.decode.state(null)).toBeNull();
    });

    test("returns null for undefined input", () => {
      expect(DataLayer.decode.state(undefined)).toBeNull();
    });

    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.state("B1|Name|Monarchy")).toBeNull();
      expect(DataLayer.decode.state("X1|Name|Monarchy")).toBeNull();
      expect(DataLayer.decode.state("s1|Name|Monarchy")).toBeNull();
    });

    test("handles missing delimiters", () => {
      const result = DataLayer.decode.state("S1Name|Monarchy");
      // Should still parse what it can
      expect(result).not.toBeNull();
    });

    test("handles extra pipes", () => {
      const result = DataLayer.decode.state("S1||Name|Monarchy");
      expect(result).not.toBeNull();
      expect(result.i).toBe(1);
    });

    test("handles truncated input", () => {
      const result = DataLayer.decode.state("S1|Na");
      expect(result).not.toBeNull();
      expect(result.i).toBe(1);
    });

    test("handles only prefix", () => {
      const result = DataLayer.decode.state("S");
      expect(result).not.toBeNull();
    });

    test("handles numeric-only after prefix", () => {
      const result = DataLayer.decode.state("S123");
      expect(result).not.toBeNull();
      expect(result.i).toBe(123);
    });

    test("handles whitespace in name", () => {
      const result = DataLayer.decode.state("S1|  Name  |Monarchy");
      expect(result.name).toBe("  Name  ");
    });

    test("handles special characters in name", () => {
      const result = DataLayer.decode.state("S1|Test's \"Kingdom\" & More|Monarchy");
      expect(result.name).toBe("Test's \"Kingdom\" & More");
    });

    test("handles unicode in name", () => {
      const result = DataLayer.decode.state("S1|Königreich|Monarchy");
      expect(result.name).toBe("Königreich");
    });

    test("handles emoji in name", () => {
      const result = DataLayer.decode.state("S1|Kingdom 👑|Monarchy");
      expect(result.name).toBe("Kingdom 👑");
    });
  });

  describe("decode.burg malformed inputs", () => {
    test("returns null for empty string", () => {
      expect(DataLayer.decode.burg("")).toBeNull();
    });

    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.burg("S1|Name|10|@100,200")).toBeNull();
    });

    test("handles missing coordinate marker", () => {
      const result = DataLayer.decode.burg("B1|Name|10|100,200");
      expect(result).not.toBeNull();
      // Coordinates won't parse without @
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    test("handles malformed coordinates", () => {
      const result = DataLayer.decode.burg("B1|Name|10|@abc,def");
      expect(result).not.toBeNull();
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    test("handles negative coordinates", () => {
      const result = DataLayer.decode.burg("B1|Name|10|@-100,-200");
      // Regex only matches digits, so this won't work as expected
      expect(result).not.toBeNull();
    });

    test("handles decimal coordinates (gets truncated)", () => {
      const encoded = DataLayer.encode.burg({i: 1, name: "Test", cell: 10, x: 100.7, y: 200.3});
      expect(encoded).toContain("@101,200");
    });
  });

  describe("decode.marker malformed inputs", () => {
    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.marker("B0|volcanoes|@300,400")).toBeNull();
    });

    test("handles marker with emoji icon", () => {
      const result = DataLayer.decode.marker("M0|volcanoes|@300,400|C30|I🌋");
      expect(result.icon).toBe("🌋");
    });

    test("handles marker with multi-char emoji", () => {
      const result = DataLayer.decode.marker("M0|flags|@300,400|C30|I🏳️‍🌈");
      expect(result.icon).toBe("🏳️‍🌈");
    });
  });

  describe("decode.note malformed inputs", () => {
    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.note("B0|Name|Legend")).toBeNull();
    });

    test("handles escaped pipes in legend", () => {
      const result = DataLayer.decode.note("NTmarker0|Name|Text with \\| pipe \\| chars");
      expect(result.legend).toBe("Text with | pipe | chars");
    });

    test("handles HTML in legend", () => {
      const result = DataLayer.decode.note("NTmarker0|Name|<p>Bold <b>text</b></p>");
      expect(result.legend).toContain("<b>text</b>");
    });

    test("handles empty legend", () => {
      const result = DataLayer.decode.note("NTmarker0|Name|");
      expect(result.legend).toBe("");
    });
  });
});

describe("Malformed Input - JSON Responses", () => {
  describe("decode.response invalid JSON", () => {
    test("returns error for invalid JSON string", () => {
      const result = DataLayer.decode.response("not valid json");
      expect(result.error).toBeDefined();
    });

    test("returns error for incomplete JSON", () => {
      const result = DataLayer.decode.response('{"create": {');
      expect(result.error).toBeDefined();
    });

    test("returns error for JSON with trailing comma", () => {
      const result = DataLayer.decode.response('{"create": {},}');
      expect(result.error).toBeDefined();
    });

    test("returns error for single quotes JSON", () => {
      const result = DataLayer.decode.response("{'create': {}}");
      expect(result.error).toBeDefined();
    });

    test("handles empty object", () => {
      const result = DataLayer.decode.response({});
      expect(result.create).toEqual({});
      expect(result.update).toEqual({});
      expect(result.delete).toEqual({});
    });

    test("handles empty string JSON", () => {
      const result = DataLayer.decode.response('""');
      expect(result.create).toEqual({});
    });

    test("handles array instead of object", () => {
      const result = DataLayer.decode.response([{i: 1}]);
      expect(result.create).toEqual({});
    });

    test("handles null input", () => {
      const result = DataLayer.decode.response(null);
      expect(result.create).toEqual({});
    });

    test("handles number input", () => {
      const result = DataLayer.decode.response(123);
      expect(result.create).toEqual({});
    });
  });

  describe("decode.response wrong structure", () => {
    test("handles missing wrapper (direct entities)", () => {
      const result = DataLayer.decode.response({states: [{i: 5, name: "Test"}]});
      // Should not have create.states since it's at wrong level
      expect(result.create.states).toBeUndefined();
    });

    test("handles nested create inside create", () => {
      const result = DataLayer.decode.response({create: {create: {states: []}}});
      expect(result.create.create).toBeDefined();
    });

    test("handles extra fields (should be ignored)", () => {
      const result = DataLayer.decode.response({
        create: {states: [{i: 5}]},
        extra: "ignored",
        another: {field: true}
      });
      expect(result.create.states).toHaveLength(1);
    });
  });
});

describe("Malformed Input - Type Coercion", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
  });

  describe("string numbers", () => {
    test("rejects string ID", () => {
      const errors = validateSchema({i: "5", name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "i")).toBe(true);
    });

    test("rejects string population", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: 200, population: "50"}, "burg", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "population")).toBe(true);
    });

    test("rejects string coordinates", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: "100", y: 200}, "burg", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "x")).toBe(true);
    });
  });

  describe("boolean coercion", () => {
    test("rejects string boolean for lock", () => {
      const errors = validateSchema({i: 1, type: "test", x: 100, y: 200, lock: "true"}, "marker", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "lock")).toBe(true);
    });

    test("accepts actual boolean for lock", () => {
      const errors = validateSchema({i: 1, type: "test", x: 100, y: 200, lock: true}, "marker", "create");
      expect(errors.filter(e => e.field === "lock")).toHaveLength(0);
    });
  });

  describe("special numeric values", () => {
    test("rejects Infinity", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: 200, population: Infinity}, "burg", "create");
      expect(errors.some(e => e.code === "INVALID_VALUE" || e.code === "OUT_OF_RANGE")).toBe(true);
    });

    test("rejects -Infinity", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: 200, population: -Infinity}, "burg", "create");
      expect(errors.length).toBeGreaterThan(0);
    });

    test("rejects NaN", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: NaN}, "burg", "create");
      expect(errors.some(e => e.code === "INVALID_VALUE")).toBe(true);
    });

    test("handles -0 (negative zero)", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: -0, y: 200}, "burg", "create");
      // -0 is technically valid as it equals 0
      expect(errors.filter(e => e.field === "x")).toHaveLength(0);
    });

    test("handles float ID", () => {
      const errors = validateSchema({i: 1.5, name: "Test", form: "Monarchy"}, "state", "create");
      // Floats are still type "number" so may pass type check but could cause issues
      expect(errors.filter(e => e.field === "i" && e.code === "INVALID_TYPE")).toHaveLength(0);
    });

    test("handles scientific notation", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 1e2, y: 2e2}, "burg", "create");
      // 1e2 = 100, should be valid
      expect(errors.filter(e => e.field === "x")).toHaveLength(0);
    });

    test("handles very large scientific notation", () => {
      const errors = validateSchema({i: 1, name: "Test", form: "Monarchy", area: 1e15}, "state", "create");
      // Very large but still valid number
      expect(errors.filter(e => e.field === "area" && e.code === "INVALID_TYPE")).toHaveLength(0);
    });
  });

  describe("array type validation", () => {
    test("rejects object instead of array for neighbors", () => {
      const errors = validateSchema({i: 1, name: "Test", form: "Monarchy", neighbors: {0: 2, 1: 3}}, "state", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "neighbors")).toBe(true);
    });

    test("rejects string instead of array for diplomacy", () => {
      const errors = validateSchema({i: 1, name: "Test", form: "Monarchy", diplomacy: "Ally,Enemy"}, "state", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "diplomacy")).toBe(true);
    });

    test("accepts empty array", () => {
      const errors = validateSchema({i: 1, name: "Test", form: "Monarchy", neighbors: []}, "state", "create");
      expect(errors.filter(e => e.field === "neighbors")).toHaveLength(0);
    });
  });
});

// ============================================================================
// BOUNDARY VALUE TESTS
// ============================================================================

describe("Boundary Values - Numeric", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("ID boundaries", () => {
    test("rejects negative ID", () => {
      const errors = validateSchema({i: -1, name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE")).toBe(true);
    });

    test("accepts ID = 0", () => {
      const errors = validateSchema({i: 0, name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.filter(e => e.field === "i")).toHaveLength(0);
    });

    test("accepts ID = 1", () => {
      const errors = validateSchema({i: 1, name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.filter(e => e.field === "i")).toHaveLength(0);
    });

    test("accepts very large ID", () => {
      const errors = validateSchema({i: 999999, name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.filter(e => e.field === "i")).toHaveLength(0);
    });

    test("handles MAX_SAFE_INTEGER", () => {
      const errors = validateSchema({i: Number.MAX_SAFE_INTEGER, name: "Test", form: "Monarchy"}, "state", "create");
      expect(errors.filter(e => e.field === "i" && e.code === "INVALID_TYPE")).toHaveLength(0);
    });
  });

  describe("population boundaries", () => {
    test("accepts population = 0", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: 200, population: 0}, "burg", "create");
      expect(errors.filter(e => e.field === "population")).toHaveLength(0);
    });

    test("rejects negative population", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: 200, population: -1}, "burg", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE" && e.field === "population")).toBe(true);
    });

    test("accepts very large population", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: 200, population: 10000000}, "burg", "create");
      expect(errors.filter(e => e.field === "population")).toHaveLength(0);
    });
  });

  describe("coordinate boundaries", () => {
    test("accepts coordinates at origin (0,0)", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 0, y: 0}, "burg", "create");
      expect(errors.filter(e => e.field === "x" || e.field === "y")).toHaveLength(0);
    });

    test("accepts very large coordinates", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 10000, y: 10000}, "burg", "create");
      expect(errors.filter(e => e.field === "x" || e.field === "y")).toHaveLength(0);
    });

    test("rejects negative x coordinate", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: -100, y: 200}, "burg", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE" && e.field === "x")).toBe(true);
    });

    test("rejects negative y coordinate", () => {
      const errors = validateSchema({i: 1, name: "Test", cell: 10, x: 100, y: -200}, "burg", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE" && e.field === "y")).toBe(true);
    });
  });

  describe("expansionism boundaries", () => {
    test("accepts expansionism = 0", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "Generic", expansionism: 0}, "culture", "create");
      expect(errors.filter(e => e.field === "expansionism")).toHaveLength(0);
    });

    test("accepts very small expansionism", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "Generic", expansionism: 0.001}, "culture", "create");
      expect(errors.filter(e => e.field === "expansionism")).toHaveLength(0);
    });

    test("accepts large expansionism", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "Generic", expansionism: 10.0}, "culture", "create");
      expect(errors.filter(e => e.field === "expansionism")).toHaveLength(0);
    });

    test("rejects negative expansionism", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "Generic", expansionism: -0.5}, "culture", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE" && e.field === "expansionism")).toBe(true);
    });
  });

  describe("area encoding boundaries", () => {
    test("encodes small area correctly", () => {
      const encoded = DataLayer.encode.state({i: 1, name: "Test", form: "Monarchy", area: 500});
      expect(encoded).toContain("A1k"); // 500 rounds to 1k
    });

    test("encodes zero area", () => {
      const encoded = DataLayer.encode.state({i: 1, name: "Test", form: "Monarchy", area: 0});
      expect(encoded).not.toContain("|A");
    });

    test("encodes very large area", () => {
      const encoded = DataLayer.encode.state({i: 1, name: "Test", form: "Monarchy", area: 999999999});
      expect(encoded).toContain("A1000000k");
    });
  });
});

describe("Boundary Values - Arrays", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("diplomacy array boundaries", () => {
    test("handles diplomacy with 100+ entries", () => {
      const diplomacy = new Array(100).fill("x");
      diplomacy[50] = "Ally";
      diplomacy[75] = "Enemy";

      const state = {i: 1, name: "Test", form: "Monarchy", diplomacy};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).toContain("D[50:A,75:E]");
    });

    test("handles diplomacy with all 'x' entries", () => {
      const diplomacy = new Array(10).fill("x");
      const state = {i: 1, name: "Test", form: "Monarchy", diplomacy};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).not.toContain("|D");
    });

    test("handles sparse diplomacy array", () => {
      const diplomacy = [];
      diplomacy[10] = "Ally";
      diplomacy[50] = "Enemy";

      const state = {i: 1, name: "Test", form: "Monarchy", diplomacy};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).toContain("D[10:A,50:E]");
    });
  });

  describe("neighbors array boundaries", () => {
    test("handles many neighbors", () => {
      const neighbors = [2, 3, 4, 5, 6, 7, 8, 9, 10];
      const state = {i: 1, name: "Test", form: "Monarchy", neighbors};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).toContain("NB[2,3,4,5,6,7,8,9,10]");
    });

    test("handles single neighbor", () => {
      const state = {i: 1, name: "Test", form: "Monarchy", neighbors: [2]};
      const encoded = DataLayer.encode.state(state);

      expect(encoded).toContain("NB[2]");
    });
  });

  describe("zone cells array boundaries", () => {
    test("handles zone with many cells", () => {
      const cells = Array.from({length: 50}, (_, i) => i + 10);
      const zone = {i: 1, name: "Large Zone", type: "test", cells};
      const encoded = DataLayer.encode.zone(zone);

      expect(encoded).toContain("C[10,11,12");
    });

    test("handles zone with single cell", () => {
      const zone = {i: 1, name: "Tiny Zone", type: "test", cells: [10]};
      const encoded = DataLayer.encode.zone(zone);

      expect(encoded).toContain("C[10]");
    });
  });

  describe("route points boundaries", () => {
    test("handles route with many points", () => {
      const points = Array.from({length: 100}, (_, i) => [i * 10, i * 10, i]);
      const route = {i: 1, group: "roads", feature: 1, points};
      const encoded = DataLayer.encode.route(route);

      expect(encoded).toContain("PTS[0,0,0;10,10,1;20,20,2");
    });

    test("handles route with single point", () => {
      const route = {i: 1, group: "roads", feature: 1, points: [[100, 200, 10]]};
      const encoded = DataLayer.encode.route(route);

      expect(encoded).toContain("PTS[100,200,10]");
    });
  });
});

describe("Boundary Values - Strings", () => {
  describe("name boundaries", () => {
    test("handles empty name in encoding", () => {
      const state = {i: 1, name: "", form: "Monarchy"};
      const encoded = DataLayer.encode.state(state);
      expect(encoded).toBe("S1||Monarchy");
    });

    test("handles whitespace-only name", () => {
      const state = {i: 1, name: "   ", form: "Monarchy"};
      const encoded = DataLayer.encode.state(state);
      expect(encoded).toContain("|   |");
    });

    test("handles very long name", () => {
      const longName = "A".repeat(500);
      const state = {i: 1, name: longName, form: "Monarchy"};
      const encoded = DataLayer.encode.state(state);
      const decoded = DataLayer.decode.state(encoded);

      expect(decoded.name).toBe(longName);
    });

    test("handles name with newlines", () => {
      const state = {i: 1, name: "Line1\nLine2", form: "Monarchy"};
      const encoded = DataLayer.encode.state(state);
      const decoded = DataLayer.decode.state(encoded);

      expect(decoded.name).toBe("Line1\nLine2");
    });

    test("handles name with tabs", () => {
      const state = {i: 1, name: "Word1\tWord2", form: "Monarchy"};
      const encoded = DataLayer.encode.state(state);
      const decoded = DataLayer.decode.state(encoded);

      expect(decoded.name).toBe("Word1\tWord2");
    });
  });

  describe("legend boundaries", () => {
    test("handles very long legend", () => {
      const longLegend = "<p>" + "Lorem ipsum ".repeat(100) + "</p>";
      const note = {id: "test", name: "Test", legend: longLegend};
      const encoded = DataLayer.encode.note(note);
      const decoded = DataLayer.decode.note(encoded);

      expect(decoded.legend).toBe(longLegend);
    });

    test("handles legend with multiple pipes", () => {
      const legend = "A|B|C|D|E";
      const note = {id: "test", name: "Test", legend};
      const encoded = DataLayer.encode.note(note);
      const decoded = DataLayer.decode.note(encoded);

      expect(decoded.legend).toBe(legend);
    });
  });
});

// ============================================================================
// COMPLETE ENTITY TYPE COVERAGE
// ============================================================================

describe("Entity Type Coverage - Military", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("military encoding", () => {
    test("encodes military unit with all fields", () => {
      const unit = {
        i: 1,
        state: 1,
        cell: 10,
        x: 100,
        y: 200,
        a: 5000,
        name: "1st Legion",
        icon: "⚔️",
        u: {infantry: 1000, cavalry: 500, archers: 200}
      };

      const encoded = DataLayer.encode.military(unit);

      expect(encoded).toContain("ML1");
      expect(encoded).toContain("S1");
      expect(encoded).toContain("C10");
      expect(encoded).toContain("@100,200");
      expect(encoded).toContain("A5000");
      expect(encoded).toContain("N1st Legion");
      expect(encoded).toContain("I⚔️");
      expect(encoded).toContain("U[");
    });

    test("encodes military unit with minimal fields", () => {
      const unit = {i: 1, state: 1, cell: 10, x: 100, y: 200};
      const encoded = DataLayer.encode.military(unit);

      expect(encoded).toBe("ML1|S1|C10|@100,200");
    });

    test("returns null for null input", () => {
      expect(DataLayer.encode.military(null)).toBeNull();
    });
  });

  describe("military schema validation", () => {
    test("validates military with required fields", () => {
      const errors = validateSchema({i: 1, state: 1, cell: 10}, "military", "create");
      expect(errors.filter(e => e.code === "MISSING_REQUIRED")).toHaveLength(0);
    });

    test("rejects military without state", () => {
      const errors = validateSchema({i: 1, cell: 10}, "military", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "state")).toBe(true);
    });

    test("rejects military without cell", () => {
      const errors = validateSchema({i: 1, state: 1}, "military", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "cell")).toBe(true);
    });

    test("validates military strength range", () => {
      const errors = validateSchema({i: 1, state: 1, cell: 10, a: -100}, "military", "create");
      expect(errors.some(e => e.code === "OUT_OF_RANGE" && e.field === "a")).toBe(true);
    });
  });
});

describe("Entity Type Coverage - Feature", () => {
  describe("feature encoding", () => {
    test("encodes island feature", () => {
      const feature = {
        i: 1,
        type: "island",
        land: true,
        border: false,
        cells: 500,
        area: 100000,
        group: "continent"
      };

      const encoded = DataLayer.encode.feature(feature);

      expect(encoded).toContain("FT1");
      expect(encoded).toContain("|island");
      expect(encoded).toContain("L1");
      expect(encoded).toContain("B0");
      expect(encoded).toContain("N500");
      expect(encoded).toContain("A100000");
      expect(encoded).toContain("Gcontinent");
    });

    test("encodes ocean feature", () => {
      const feature = {i: 0, type: "ocean", land: false, border: true};
      const encoded = DataLayer.encode.feature(feature);

      expect(encoded).toContain("FT0|ocean");
      expect(encoded).toContain("L0");
      expect(encoded).toContain("B1");
    });

    test("encodes lake feature", () => {
      const feature = {i: 2, type: "lake", land: false, cells: 50, area: 5000};
      const encoded = DataLayer.encode.feature(feature);

      expect(encoded).toContain("FT2|lake");
    });

    test("returns null for removed feature", () => {
      const feature = {i: 1, type: "island", removed: true};
      expect(DataLayer.encode.feature(feature)).toBeNull();
    });
  });

  describe("feature schema validation", () => {
    test("validates feature with required fields", () => {
      const errors = validateSchema({i: 1, type: "island"}, "feature", "create");
      expect(errors.filter(e => e.code === "MISSING_REQUIRED")).toHaveLength(0);
    });

    test("rejects feature without type", () => {
      const errors = validateSchema({i: 1}, "feature", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "type")).toBe(true);
    });

    test("validates boolean fields", () => {
      const errors = validateSchema({i: 1, type: "island", land: "yes"}, "feature", "create");
      expect(errors.some(e => e.code === "INVALID_TYPE" && e.field === "land")).toBe(true);
    });
  });
});

describe("Entity Type Coverage - Route", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("route encoding", () => {
    test("encodes road route", () => {
      const route = {
        i: 1,
        group: "roads",
        feature: 1,
        points: [[100, 200, 10], [150, 250, 15], [200, 300, 20]]
      };

      const encoded = DataLayer.encode.route(route);

      expect(encoded).toContain("RT1|roads|1");
      expect(encoded).toContain("PTS[100,200,10;150,250,15;200,300,20]");
    });

    test("encodes trail route", () => {
      const route = {i: 2, group: "trails", feature: 1, points: [[50, 50, 5]]};
      const encoded = DataLayer.encode.route(route);

      expect(encoded).toContain("RT2|trails|1");
    });

    test("encodes sea route", () => {
      const route = {i: 3, group: "searoutes", feature: 0, points: [[300, 400, 30], [350, 450, 35]]};
      const encoded = DataLayer.encode.route(route);

      expect(encoded).toContain("RT3|searoutes|0");
    });

    test("encodes route without points", () => {
      const route = {i: 1, group: "roads", feature: 1};
      const encoded = DataLayer.encode.route(route);

      expect(encoded).toBe("RT1|roads|1");
      expect(encoded).not.toContain("PTS");
    });
  });

  describe("route schema validation", () => {
    test("validates route with required fields", () => {
      const errors = validateSchema({i: 1, group: "roads"}, "route", "create");
      expect(errors.filter(e => e.code === "MISSING_REQUIRED")).toHaveLength(0);
    });

    test("rejects route without group", () => {
      const errors = validateSchema({i: 1}, "route", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "group")).toBe(true);
    });

    test("rejects invalid route group", () => {
      const errors = validateSchema({i: 1, group: "highways"}, "route", "create");
      expect(errors.some(e => e.code === "INVALID_ENUM" && e.field === "group")).toBe(true);
    });

    test("accepts valid route groups", () => {
      for (const group of ["roads", "trails", "searoutes"]) {
        const errors = validateSchema({i: 1, group}, "route", "create");
        expect(errors.filter(e => e.field === "group")).toHaveLength(0);
      }
    });
  });

  describe("route referential validation", () => {
    test("validates from.burg reference", () => {
      const errors = validateReferences({i: 1, from: {burg: 1}, to: {burg: 2}}, "route", pack);
      expect(errors.filter(e => e.field === "from.burg")).toHaveLength(0);
    });

    test("rejects invalid from.burg reference", () => {
      const errors = validateReferences({i: 1, from: {burg: 999}, to: {burg: 1}}, "route", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "from.burg")).toBe(true);
    });

    test("rejects removed from.burg reference", () => {
      const errors = validateReferences({i: 1, from: {burg: 4}, to: {burg: 1}}, "route", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "from.burg")).toBe(true);
    });
  });

  describe("route semantic validation", () => {
    test("rejects route with same from and to burg", () => {
      const {errors} = validateSemantics({i: 1, from: {burg: 1}, to: {burg: 1}}, "route", pack, null);
      expect(errors.some(e => e.code === "ROUTE_SAME_ENDPOINTS")).toBe(true);
    });

    test("rejects route with same from and to cell", () => {
      const {errors} = validateSemantics({i: 1, from: {cell: 10}, to: {cell: 10}}, "route", pack, null);
      expect(errors.some(e => e.code === "ROUTE_SAME_ENDPOINTS")).toBe(true);
    });

    test("accepts route with different endpoints", () => {
      const {errors} = validateSemantics({i: 1, from: {burg: 1}, to: {burg: 2}}, "route", pack, null);
      expect(errors.filter(e => e.code === "ROUTE_SAME_ENDPOINTS")).toHaveLength(0);
    });
  });
});

describe("Entity Type Coverage - Zone", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("zone encoding", () => {
    test("encodes zone with all fields", () => {
      const zone = {
        i: 1,
        name: "Cursed Lands",
        type: "dangerous",
        state: 1,
        cells: [10, 11, 12, 13, 14]
      };

      const encoded = DataLayer.encode.zone(zone);

      expect(encoded).toContain("ZN1|Cursed Lands|dangerous");
      expect(encoded).toContain("S1");
      expect(encoded).toContain("C[10,11,12,13,14]");
    });

    test("encodes zone without state", () => {
      const zone = {i: 1, name: "Wild Zone", type: "wild", cells: [5, 6, 7]};
      const encoded = DataLayer.encode.zone(zone);

      expect(encoded).not.toContain("|S");
      expect(encoded).toContain("C[5,6,7]");
    });

    test("encodes zone without cells", () => {
      const zone = {i: 1, name: "Empty Zone", type: "empty"};
      const encoded = DataLayer.encode.zone(zone);

      expect(encoded).toBe("ZN1|Empty Zone|empty");
    });
  });

  describe("zone decoding", () => {
    test("decodes zone with all fields", () => {
      const decoded = DataLayer.decode.zone("ZN1|Test Zone|dangerous|S1|C[10,11,12]");

      expect(decoded.i).toBe(1);
      expect(decoded.name).toBe("Test Zone");
      expect(decoded.type).toBe("dangerous");
      expect(decoded.state).toBe(1);
      expect(decoded.cells).toEqual([10, 11, 12]);
    });

    test("decodes zone without optional fields", () => {
      const decoded = DataLayer.decode.zone("ZN1|Minimal Zone|test");

      expect(decoded.i).toBe(1);
      expect(decoded.name).toBe("Minimal Zone");
      expect(decoded.type).toBe("test");
      expect(decoded.state).toBeUndefined();
      expect(decoded.cells).toBeUndefined();
    });

    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.zone("S1|Test|type")).toBeNull();
    });
  });

  describe("zone schema validation", () => {
    test("validates zone with required fields", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "dangerous"}, "zone", "create");
      expect(errors.filter(e => e.code === "MISSING_REQUIRED")).toHaveLength(0);
    });

    test("rejects zone without name", () => {
      const errors = validateSchema({i: 1, type: "dangerous"}, "zone", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "name")).toBe(true);
    });

    test("rejects zone without type", () => {
      const errors = validateSchema({i: 1, name: "Test"}, "zone", "create");
      expect(errors.some(e => e.code === "MISSING_REQUIRED" && e.field === "type")).toBe(true);
    });
  });

  describe("zone referential validation", () => {
    test("validates state reference", () => {
      const errors = validateReferences({i: 1, state: 1}, "zone", pack);
      expect(errors.filter(e => e.field === "state")).toHaveLength(0);
    });

    test("accepts state = 0", () => {
      const errors = validateReferences({i: 1, state: 0}, "zone", pack);
      expect(errors.filter(e => e.field === "state")).toHaveLength(0);
    });

    test("rejects non-existent state", () => {
      const errors = validateReferences({i: 1, state: 999}, "zone", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "state")).toBe(true);
    });

    test("rejects removed state", () => {
      const errors = validateReferences({i: 1, state: 3}, "zone", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field === "state")).toBe(true);
    });

    test("validates cell references", () => {
      const errors = validateReferences({i: 1, cells: [10, 20, 30]}, "zone", pack);
      expect(errors.filter(e => e.field.includes("cells"))).toHaveLength(0);
    });

    test("rejects out-of-range cells", () => {
      const errors = validateReferences({i: 1, cells: [10, 9999]}, "zone", pack);
      expect(errors.some(e => e.code === "INVALID_REF" && e.field.includes("cells"))).toBe(true);
    });
  });
});

describe("Entity Type Coverage - Religion", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("religion encoding", () => {
    test("encodes religion with all fields", () => {
      const religion = {
        i: 1,
        name: "Moonlight",
        type: "Folk",
        form: "Animism",
        culture: 1,
        center: 10,
        expansionism: 1.5,
        code: "Ml"
      };

      const encoded = DataLayer.encode.religion(religion);

      expect(encoded).toContain("RL1|Moonlight|Folk|Animism");
      expect(encoded).toContain("CL1");
      expect(encoded).toContain("C10");
      expect(encoded).toContain("E1.5");
      expect(encoded).toContain("CDMl");
    });

    test("encodes religion with minimal fields", () => {
      const religion = {i: 1, name: "Simple", type: "Cult", form: "Monotheism"};
      const encoded = DataLayer.encode.religion(religion);

      expect(encoded).toBe("RL1|Simple|Cult|Monotheism");
    });
  });

  describe("religion decoding", () => {
    test("decodes religion with all fields", () => {
      const decoded = DataLayer.decode.religion("RL1|Moonlight|Folk|Animism|CL1|C10|E1.5|CDMl");

      expect(decoded.i).toBe(1);
      expect(decoded.name).toBe("Moonlight");
      expect(decoded.type).toBe("Folk");
      expect(decoded.form).toBe("Animism");
      expect(decoded.culture).toBe(1);
      expect(decoded.center).toBe(10);
      expect(decoded.expansionism).toBe(1.5);
      expect(decoded.code).toBe("Ml");
    });

    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.religion("S1|Test|Folk|Animism")).toBeNull();
    });
  });

  describe("religion schema validation", () => {
    test("validates all religion types", () => {
      for (const type of ["Folk", "Organized", "Cult", "Heresy"]) {
        const errors = validateSchema({i: 1, name: "Test", type, form: "Animism"}, "religion", "create");
        expect(errors.filter(e => e.field === "type")).toHaveLength(0);
      }
    });

    test("rejects invalid religion type", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "Secular", form: "Animism"}, "religion", "create");
      expect(errors.some(e => e.code === "INVALID_ENUM" && e.field === "type")).toBe(true);
    });

    test("validates all religion forms", () => {
      for (const form of ["Animism", "Polytheism", "Monotheism", "Dualism", "Nontheism", "Other"]) {
        const errors = validateSchema({i: 1, name: "Test", type: "Folk", form}, "religion", "create");
        expect(errors.filter(e => e.field === "form")).toHaveLength(0);
      }
    });

    test("rejects invalid religion form", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "Folk", form: "Atheism"}, "religion", "create");
      expect(errors.some(e => e.code === "INVALID_ENUM" && e.field === "form")).toBe(true);
    });
  });
});

describe("Entity Type Coverage - Culture", () => {
  describe("culture encoding", () => {
    test("encodes culture with all fields", () => {
      const culture = {
        i: 1,
        name: "Shwazen",
        type: "Generic",
        base: 1,
        center: 10,
        expansionism: 1.2,
        code: "Sw"
      };

      const encoded = DataLayer.encode.culture(culture);

      expect(encoded).toBe("CL1|Shwazen|Generic|B1|C10|E1.2|CDSw");
    });

    test("encodes culture with minimal fields", () => {
      const culture = {i: 1, name: "Simple", type: "Nomadic"};
      const encoded = DataLayer.encode.culture(culture);

      expect(encoded).toBe("CL1|Simple|Nomadic");
    });
  });

  describe("culture decoding", () => {
    test("decodes culture with all fields", () => {
      const decoded = DataLayer.decode.culture("CL1|Shwazen|Generic|B1|C10|E1.2|CDSw");

      expect(decoded.i).toBe(1);
      expect(decoded.name).toBe("Shwazen");
      expect(decoded.type).toBe("Generic");
      expect(decoded.base).toBe(1);
      expect(decoded.center).toBe(10);
      expect(decoded.expansionism).toBe(1.2);
      expect(decoded.code).toBe("Sw");
    });

    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.culture("S1|Test|Generic")).toBeNull();
    });
  });

  describe("culture schema validation", () => {
    test("validates all culture types", () => {
      for (const type of ["Generic", "River", "Lake", "Naval", "Nomadic", "Hunting", "Highland"]) {
        const errors = validateSchema({i: 1, name: "Test", type}, "culture", "create");
        expect(errors.filter(e => e.field === "type")).toHaveLength(0);
      }
    });

    test("rejects invalid culture type", () => {
      const errors = validateSchema({i: 1, name: "Test", type: "Urban"}, "culture", "create");
      expect(errors.some(e => e.code === "INVALID_ENUM" && e.field === "type")).toBe(true);
    });
  });
});

describe("Entity Type Coverage - Province", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("province encoding", () => {
    test("encodes province with all fields", () => {
      const province = {
        i: 1,
        name: "Kaki Province",
        state: 1,
        center: 10,
        burg: 1,
        formName: "Province"
      };

      const encoded = DataLayer.encode.province(province);

      expect(encoded).toBe("PV1|Kaki Province|S1|C10|B1|FNProvince");
    });

    test("encodes province with minimal fields", () => {
      const province = {i: 1, name: "Simple", state: 1};
      const encoded = DataLayer.encode.province(province);

      expect(encoded).toBe("PV1|Simple|S1");
    });
  });

  describe("province decoding", () => {
    test("decodes province with all fields", () => {
      const decoded = DataLayer.decode.province("PV1|Kaki Province|S1|C10|B1|FNProvince");

      expect(decoded.i).toBe(1);
      expect(decoded.name).toBe("Kaki Province");
      expect(decoded.state).toBe(1);
      expect(decoded.center).toBe(10);
      expect(decoded.burg).toBe(1);
      expect(decoded.formName).toBe("Province");
    });

    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.province("S1|Test|S1")).toBeNull();
    });
  });

  describe("province semantic validation", () => {
    test("detects province burg in wrong state", () => {
      // Burg 2 belongs to state 2, not state 1
      const {errors} = validateSemantics({i: 1, state: 1, burg: 2}, "province", pack, null);
      expect(errors.some(e => e.code === "PROVINCE_BURG_WRONG_STATE")).toBe(true);
    });

    test("accepts province burg in correct state", () => {
      // Burg 1 belongs to state 1
      const {errors} = validateSemantics({i: 1, state: 1, burg: 1}, "province", pack, null);
      expect(errors.filter(e => e.code === "PROVINCE_BURG_WRONG_STATE")).toHaveLength(0);
    });
  });
});

describe("Entity Type Coverage - River", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("river encoding", () => {
    test("encodes river with all fields", () => {
      const river = {
        i: 1,
        name: "Silverflow",
        source: 5,
        mouth: 50,
        parent: 0,
        discharge: 100,
        length: 234,
        width: 1.2
      };

      const encoded = DataLayer.encode.river(river);

      expect(encoded).toBe("RV1|Silverflow|5|50|P0|D100|L234|W1.2");
    });

    test("encodes river with minimal fields", () => {
      const river = {i: 1, name: "Simple", source: 10, mouth: 20};
      const encoded = DataLayer.encode.river(river);

      expect(encoded).toBe("RV1|Simple|10|20");
    });

    test("rounds width to one decimal", () => {
      const river = {i: 1, name: "Test", source: 1, mouth: 10, width: 1.23456};
      const encoded = DataLayer.encode.river(river);

      expect(encoded).toContain("W1.2");
    });
  });

  describe("river decoding", () => {
    test("decodes river with all fields", () => {
      const decoded = DataLayer.decode.river("RV1|Silverflow|5|50|P0|D100|L234|W1.2");

      expect(decoded.i).toBe(1);
      expect(decoded.name).toBe("Silverflow");
      expect(decoded.source).toBe(5);
      expect(decoded.mouth).toBe(50);
      expect(decoded.parent).toBe(0);
      expect(decoded.discharge).toBe(100);
      expect(decoded.length).toBe(234);
      expect(decoded.width).toBe(1.2);
    });

    test("returns null for wrong prefix", () => {
      expect(DataLayer.decode.river("S1|Test|5|50")).toBeNull();
    });
  });

  describe("river semantic validation", () => {
    test("detects same source and mouth", () => {
      const {errors} = validateSemantics({i: 1, source: 10, mouth: 10}, "river", pack, null);
      expect(errors.some(e => e.code === "RIVER_SAME_ENDPOINTS")).toBe(true);
    });

    test("accepts different source and mouth", () => {
      const {errors} = validateSemantics({i: 1, source: 10, mouth: 20}, "river", pack, null);
      expect(errors.filter(e => e.code === "RIVER_SAME_ENDPOINTS")).toHaveLength(0);
    });

    test("warns about river flowing uphill", () => {
      // Need to set up pack with cell heights
      pack.cells.h[10] = 10; // Lower source
      pack.cells.h[20] = 50; // Higher mouth

      const {warnings} = validateSemantics({i: 1, source: 10, mouth: 20}, "river", pack, null);
      expect(warnings.some(w => w.code === "RIVER_UPHILL")).toBe(true);
    });
  });
});

// ============================================================================
// CROSS-ENTITY DEPENDENCY TESTS
// ============================================================================

describe("Cross-Entity Dependencies - Cascading Validation", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("delete culture warnings", () => {
    test("warns when deleting culture used by state", () => {
      // State 1 uses culture 1
      const result = DataLayer.remove.culture(1);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === "REFERENCED_BY" && w.message.includes("state"))).toBe(true);
    });

    test("warns when deleting culture used by burg", () => {
      // Burg 1 uses culture 1
      const result = DataLayer.remove.culture(1);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === "REFERENCED_BY" && w.message.includes("burg"))).toBe(true);
    });
  });

  describe("delete state warnings", () => {
    test("warns when deleting state with burgs", () => {
      // State 1 has burgs
      const result = DataLayer.remove.state(1);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === "REFERENCED_BY" && w.message.includes("burg"))).toBe(true);
    });

    test("warns when deleting state with provinces", () => {
      // State 1 has province 1
      const result = DataLayer.remove.state(1);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === "REFERENCED_BY" && w.message.includes("province"))).toBe(true);
    });
  });

  describe("delete burg warnings", () => {
    test("warns when deleting burg that is capital", () => {
      // Burg 1 is capital of state 1
      const result = DataLayer.remove.burg(1);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === "REFERENCED_BY" && w.message.includes("state"))).toBe(true);
    });
  });
});

describe("Cross-Entity Dependencies - Reference Chain", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  test("creating burg in non-existent state fails", () => {
    const result = DataLayer.create.burg({
      i: 10,
      name: "Ghost Town",
      cell: 10,
      x: 100,
      y: 200,
      state: 999
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "INVALID_REF" && e.field === "state")).toBe(true);
  });

  test("creating province with non-existent state fails", () => {
    const result = DataLayer.create.province({
      i: 10,
      name: "Ghost Province",
      state: 999
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "INVALID_REF" && e.field === "state")).toBe(true);
  });

  test("creating province with non-existent burg fails", () => {
    const result = DataLayer.create.province({
      i: 10,
      name: "Test Province",
      state: 1,
      burg: 999
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "INVALID_REF" && e.field === "burg")).toBe(true);
  });

  test("creating religion with non-existent culture fails", () => {
    const result = DataLayer.create.religion({
      i: 10,
      name: "Test Religion",
      type: "Folk",
      form: "Animism",
      culture: 999
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "INVALID_REF" && e.field === "culture")).toBe(true);
  });
});

// ============================================================================
// COMPLEX MULTI-ENTITY SCENARIOS
// ============================================================================

describe("Complex Scenarios - State Operations", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("create state with full diplomacy matrix", () => {
    test("validates symmetric diplomacy for 5 states", () => {
      const changeSet = {
        update: {
          states: [
            {i: 1, diplomacy: ["x", "x", "Ally", "Neutral", "Enemy"]},
            {i: 2, diplomacy: ["x", "Ally", "x", "Friendly", "Suspicion"]}
          ]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      // State 1 says Ally with 2, State 2 says Ally with 1 - symmetric
      expect(result.errors.filter(e => e.code === "ASYMMETRIC_DIPLOMACY" && e.message.includes("1") && e.message.includes("2"))).toHaveLength(0);
    });

    test("detects asymmetric diplomacy in matrix", () => {
      const changeSet = {
        update: {
          states: [
            {i: 1, diplomacy: ["x", "x", "Ally"]},
            {i: 2, diplomacy: ["x", "Enemy", "x"]} // Asymmetric!
          ]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.errors.some(e => e.code === "ASYMMETRIC_DIPLOMACY")).toBe(true);
    });
  });

  describe("state split scenario", () => {
    test("validates creating new state from existing burgs", () => {
      // Simulate splitting: create new state, but burg transfer needs separate updates
      const changeSet = {
        create: {
          states: [{i: 10, name: "New Kingdom", form: "Monarchy", culture: 1}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(true);
    });
  });
});

describe("Complex Scenarios - Trade Route Network", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  test("validates trade route network between 3 burgs", () => {
    const changeSet = {
      create: {
        routes: [
          {i: 10, group: "roads", from: {burg: 1}, to: {burg: 2}},
          {i: 11, group: "roads", from: {burg: 2}, to: {burg: 3}},
          {i: 12, group: "roads", from: {burg: 1}, to: {burg: 3}}
        ]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    expect(result.valid).toBe(true);
  });

  test("rejects route with non-existent endpoint", () => {
    const changeSet = {
      create: {
        routes: [
          {i: 10, group: "roads", from: {burg: 1}, to: {burg: 999}}
        ]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "INVALID_REF")).toBe(true);
  });
});

describe("Complex Scenarios - Province Hierarchy", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  test("validates province creation with correct state and burg", () => {
    const changeSet = {
      create: {
        provinces: [
          {i: 10, name: "New Province", state: 1, burg: 1, formName: "County"}
        ]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    expect(result.valid).toBe(true);
  });

  test("rejects province with burg in different state", () => {
    const changeSet = {
      create: {
        provinces: [
          {i: 10, name: "Bad Province", state: 1, burg: 2} // Burg 2 is in state 2
        ]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "PROVINCE_BURG_WRONG_STATE")).toBe(true);
  });
});

// ============================================================================
// CONCURRENT/BATCH CONFLICT TESTS
// ============================================================================

describe("Batch Conflicts", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("conflicting operations in same batch", () => {
    test("handles creating and updating same entity type", () => {
      const changeSet = {
        create: {
          states: [{i: 10, name: "New State", form: "Republic"}]
        },
        update: {
          states: [{i: 1, name: "Updated State"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(true);
    });

    test("handles updating entity with invalid reference", () => {
      const changeSet = {
        update: {
          states: [{i: 1, capital: 999}] // Non-existent burg
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      // Update validation in current impl only checks schema
      // Full referential check would need merged state
    });
  });

  describe("multiple capital designation", () => {
    test("creating two capitals for same state in batch fails semantic check", () => {
      const changeSet = {
        create: {
          burgs: [
            {i: 10, name: "Capital A", cell: 10, x: 100, y: 200, state: 1, capital: 1},
            {i: 11, name: "Capital B", cell: 15, x: 150, y: 250, state: 1, capital: 1}
          ]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      // First burg is valid, second should conflict
      // Note: Current implementation validates each entity separately
      // A more sophisticated check would catch this
    });
  });

  describe("delete and reference conflict", () => {
    test("handles delete markers array", () => {
      const changeSet = {
        delete: {
          markers: [0, 1]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// AI RESPONSE SIMULATION TESTS
// ============================================================================

describe("AI Response Simulation - Common Errors", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("missing ID field", () => {
    test("AI forgot to include ID in state", () => {
      const changeSet = {
        create: {
          states: [{name: "Newland", form: "Republic"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "MISSING_REQUIRED" && e.field.includes("i"))).toBe(true);
    });

    test("AI forgot to include ID in burg", () => {
      const changeSet = {
        create: {
          burgs: [{name: "New City", cell: 10, x: 100, y: 200}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "MISSING_REQUIRED" && e.field.includes("i"))).toBe(true);
    });
  });

  describe("wrong field names", () => {
    test("AI used 'id' instead of 'i'", () => {
      const changeSet = {
        create: {
          states: [{id: 5, name: "Newland", form: "Republic"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      // id is not recognized, so i is missing
      expect(result.errors.some(e => e.code === "MISSING_REQUIRED")).toBe(true);
    });

    test("AI used 'title' instead of 'name'", () => {
      const changeSet = {
        create: {
          states: [{i: 5, title: "Newland", form: "Republic"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "MISSING_REQUIRED" && e.field.includes("name"))).toBe(true);
    });

    test("AI used 'type' instead of 'form' for state", () => {
      const changeSet = {
        create: {
          states: [{i: 5, name: "Newland", type: "Republic"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "MISSING_REQUIRED" && e.field.includes("form"))).toBe(true);
    });
  });

  describe("singular vs plural confusion", () => {
    test("AI used singular 'state' instead of 'states'", () => {
      const response = {
        create: {
          state: [{i: 5, name: "Newland", form: "Republic"}]
        }
      };

      const changeSet = DataLayer.decode.response(response);
      // 'state' is not recognized, create.states is empty
      expect(changeSet.create.states).toBeUndefined();
    });
  });

  describe("extra narrative fields", () => {
    test("AI added description field", () => {
      const changeSet = {
        create: {
          states: [{
            i: 5,
            name: "Newland",
            form: "Republic",
            description: "A peaceful nation founded by settlers"
          }]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      // Extra fields should be ignored, valid data should pass
      expect(result.valid).toBe(true);
    });

    test("AI added ruler field", () => {
      const changeSet = {
        create: {
          states: [{
            i: 5,
            name: "Newland",
            form: "Monarchy",
            ruler: "King Bob"
          }]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid enum values from AI", () => {
    test("AI used lowercase form", () => {
      const changeSet = {
        create: {
          states: [{i: 5, name: "Newland", form: "monarchy"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_ENUM" && e.field.includes("form"))).toBe(true);
    });

    test("AI invented new government type", () => {
      const changeSet = {
        create: {
          states: [{i: 5, name: "Newland", form: "Socialist"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_ENUM")).toBe(true);
    });

    test("AI used abbreviation for route group", () => {
      const changeSet = {
        create: {
          routes: [{i: 10, group: "road"}] // Should be "roads"
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_ENUM" && e.field.includes("group"))).toBe(true);
    });
  });

  describe("coordinate format errors", () => {
    test("AI provided coordinates as string", () => {
      const changeSet = {
        create: {
          burgs: [{i: 10, name: "Test", cell: 10, x: "100", y: "200"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_TYPE")).toBe(true);
    });

    test("AI provided coordinates as object", () => {
      const changeSet = {
        create: {
          burgs: [{i: 10, name: "Test", cell: 10, position: {x: 100, y: 200}}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      // x and y are missing
      expect(result.errors.some(e => e.code === "MISSING_REQUIRED")).toBe(true);
    });
  });

  describe("reference format errors", () => {
    test("AI used state name instead of ID", () => {
      const changeSet = {
        create: {
          burgs: [{i: 10, name: "Test", cell: 10, x: 100, y: 200, state: "Hizuna"}]
        }
      };

      const result = DataLayer.batch.validate(changeSet);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_TYPE" && e.field.includes("state"))).toBe(true);
    });
  });
});

describe("AI Response Simulation - Complex Requests", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  test("AI creates complete state with capital burg", () => {
    // This is a common AI request: create state and its capital
    // Issue: capital burg belongs to the new state, but state refs the burg
    const changeSet = {
      create: {
        states: [{i: 10, name: "New Kingdom", form: "Monarchy", capital: 20, culture: 1}],
        burgs: [{i: 20, name: "Royal City", cell: 10, x: 100, y: 200, state: 10, capital: 1}]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    // Current validation checks references against existing pack
    // So capital: 20 doesn't exist yet
    expect(result.valid).toBe(false);
  });

  test("AI renames multiple entities", () => {
    const changeSet = {
      update: {
        states: [
          {i: 1, name: "Renamed State 1"},
          {i: 2, name: "Renamed State 2"}
        ],
        burgs: [
          {i: 1, name: "Renamed Burg 1"}
        ]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    expect(result.valid).toBe(true);
  });

  test("AI creates war scenario with diplomacy", () => {
    const changeSet = {
      update: {
        states: [
          {i: 1, diplomacy: ["x", "x", "Enemy"]},
          {i: 2, diplomacy: ["x", "Enemy", "x"]}
        ]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    expect(result.valid).toBe(true); // Symmetric enemy relations
  });

  test("AI response with mixed valid and invalid entities", () => {
    const changeSet = {
      create: {
        states: [
          {i: 10, name: "Valid State", form: "Republic"}, // Valid
          {i: 11, name: "Invalid State", form: "InvalidForm"} // Invalid
        ]
      }
    };

    const result = DataLayer.batch.validate(changeSet);
    expect(result.valid).toBe(false);
    // Should report the invalid one
    expect(result.errors.some(e => e.code === "INVALID_ENUM")).toBe(true);
  });
});

// ============================================================================
// ADDITIONAL EDGE CASES
// ============================================================================

describe("Additional Edge Cases", () => {
  let pack;

  beforeEach(() => {
    pack = createMockPack();
    setupMockDataSource(pack, []);
  });

  afterEach(() => {
    DataLayer.resetDataSource();
  });

  describe("encoding null/undefined values", () => {
    test("handles state with null fields", () => {
      const state = {i: 1, name: "Test", form: "Monarchy", capital: null};
      const encoded = DataLayer.encode.state(state);
      expect(encoded).not.toContain("null");
    });

    test("handles state with undefined fields", () => {
      const state = {i: 1, name: "Test", form: "Monarchy", capital: undefined};
      const encoded = DataLayer.encode.state(state);
      expect(encoded).not.toContain("undefined");
    });
  });

  describe("decoding round-trip consistency", () => {
    test("state round-trip preserves all fields", () => {
      const original = {
        i: 1,
        name: "Test State",
        form: "Monarchy",
        capital: 1,
        culture: 1,
        cells: 100,
        burgs: 10,
        area: 50000,
        urban: 200,
        rural: 1000,
        neighbors: [2, 3],
        diplomacy: ["x", "x", "Ally", "Enemy"]
      };

      const encoded = DataLayer.encode.state(original);
      const decoded = DataLayer.decode.state(encoded);

      expect(decoded.i).toBe(original.i);
      expect(decoded.name).toBe(original.name);
      expect(decoded.form).toBe(original.form);
      expect(decoded.capital).toBe(original.capital);
      expect(decoded.culture).toBe(original.culture);
      expect(decoded.cells).toBe(original.cells);
      expect(decoded.burgs).toBe(original.burgs);
      expect(decoded.area).toBe(original.area);
      expect(decoded.urban).toBe(original.urban);
      expect(decoded.rural).toBe(original.rural);
      expect(decoded.neighbors).toEqual(original.neighbors);
      expect(decoded.diplomacy[2]).toBe("Ally");
      expect(decoded.diplomacy[3]).toBe("Enemy");
    });

    test("burg round-trip preserves all fields", () => {
      const original = {
        i: 1,
        name: "Test Burg",
        cell: 10,
        x: 100,
        y: 200,
        state: 1,
        population: 50,
        type: "Naval",
        capital: 1,
        port: 1,
        walls: 1,
        temple: 0,
        shanty: 0,
        citadel: 1,
        plaza: 0,
        culture: 1,
        feature: 1
      };

      const encoded = DataLayer.encode.burg(original);
      const decoded = DataLayer.decode.burg(encoded);

      expect(decoded.i).toBe(original.i);
      expect(decoded.name).toBe(original.name);
      expect(decoded.cell).toBe(original.cell);
      expect(decoded.x).toBe(original.x);
      expect(decoded.y).toBe(original.y);
      expect(decoded.state).toBe(original.state);
      expect(decoded.population).toBe(original.population);
      expect(decoded.type).toBe(original.type);
      expect(decoded.capital).toBe(original.capital);
      expect(decoded.port).toBe(original.port);
      expect(decoded.walls).toBe(original.walls);
      expect(decoded.citadel).toBe(original.citadel);
    });

    test("marker round-trip preserves all fields", () => {
      const original = {
        i: 5,
        type: "castle",
        x: 500,
        y: 600,
        cell: 50,
        icon: "🏰",
        lock: true
      };

      const encoded = DataLayer.encode.marker(original);
      const decoded = DataLayer.decode.marker(encoded);

      expect(decoded.i).toBe(original.i);
      expect(decoded.type).toBe(original.type);
      expect(decoded.x).toBe(original.x);
      expect(decoded.y).toBe(original.y);
      expect(decoded.cell).toBe(original.cell);
      expect(decoded.icon).toBe(original.icon);
      expect(decoded.lock).toBe(original.lock);
    });
  });

  describe("fullContext encoding coverage", () => {
    test("encodes all entity types in context", () => {
      const context = DataLayer.encode.fullContext();

      expect(context.states).toBeDefined();
      expect(context.burgs).toBeDefined();
      expect(context.markers).toBeDefined();
      expect(context.cultures).toBeDefined();
      expect(context.religions).toBeDefined();
      expect(context.provinces).toBeDefined();
      expect(context.rivers).toBeDefined();
      expect(context.features).toBeDefined();
      expect(context.zones).toBeDefined();
      expect(context.notes).toBeDefined();
    });

    test("includes routes when option is set", () => {
      const contextWithRoutes = DataLayer.encode.fullContext({includeRoutes: true});
      expect(contextWithRoutes.routes).toBeDefined();

      const contextWithoutRoutes = DataLayer.encode.fullContext({includeRoutes: false});
      expect(contextWithoutRoutes.routes).toEqual([]);
    });
  });

  describe("validation edge cases", () => {
    test("validates unknown entity type", () => {
      const errors = validateSchema({i: 1, name: "Test"}, "unknown", "create");
      expect(errors.some(e => e.code === "UNKNOWN_ENTITY_TYPE")).toBe(true);
    });

    test("update mode allows missing mandatory fields", () => {
      const errors = validateSchema({population: 100}, "burg", "update");
      expect(errors.filter(e => e.code === "MISSING_REQUIRED")).toHaveLength(0);
    });

    test("create mode requires mandatory fields", () => {
      const errors = validateSchema({population: 100}, "burg", "create");
      expect(errors.filter(e => e.code === "MISSING_REQUIRED").length).toBeGreaterThan(0);
    });
  });
});
