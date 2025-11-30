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
