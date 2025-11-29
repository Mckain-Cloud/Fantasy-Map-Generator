/**
 * Test Fixtures - Sample map seeds and expected data
 * These seeds produce consistent, deterministic maps for testing
 */

export const TEST_MAPS = {
  // Small map for quick tests
  small: {
    seed: 'test_small_12345',
    expected: {
      minStates: 3,
      maxStates: 8,
      minBurgs: 10,
      maxBurgs: 30,
      minCultures: 2,
      maxCultures: 6
    }
  },

  // Medium map for comprehensive tests
  medium: {
    seed: 'test_medium_67890',
    expected: {
      minStates: 5,
      maxStates: 15,
      minBurgs: 30,
      maxBurgs: 80,
      minCultures: 4,
      maxCultures: 12
    }
  },

  // Large map for stress tests
  large: {
    seed: 'test_large_abcdef',
    expected: {
      minStates: 15,
      maxStates: 35,
      minBurgs: 80,
      maxBurgs: 200,
      minCultures: 10,
      maxCultures: 25
    }
  },

  // Archipelago for island testing
  archipelago: {
    seed: 'test_archipelago_xyz',
    expected: {
      minIslands: 5,
      minStates: 3,
      // Most states should be Naval type
      navalStatesRatio: 0.6
    }
  },

  // Continental for large landmass testing
  continental: {
    seed: 'test_continental_qrs',
    expected: {
      continentCount: 1,
      minStates: 10,
      minBurgs: 50
    }
  },

  // Deterministic for snapshot testing
  snapshot: {
    seed: 'snapshot_fixed_000',
    expected: {
      // Exact values for snapshot comparison
      stateCount: 8,
      burgCount: 45,
      cultureCount: 6,
      religionCount: 4,
      firstStateName: 'Akeshia',
      firstBurgName: 'Akesh',
      firstCultureName: 'Shwazen'
    }
  }
};

export const MOCK_STATE = {
  i: 1,
  name: 'TestKingdom',
  fullName: 'The Test Kingdom',
  form: 'Kingdom',
  color: '#ff0000',
  capital: 1,
  center: 100,
  culture: 1,
  cells: 200,
  burgs: 20,
  area: 15000,
  urban: 300,
  rural: 2000,
  neighbors: [2, 3],
  diplomacy: ['x', 'x', 'Friendly', 'Ally'],
  provinces: [1, 2, 3],
  military: [{
    i: 0,
    a: 1000,
    cell: 100,
    x: 500,
    y: 400,
    u: { infantry: 500, archers: 300, cavalry: 200 },
    name: '1st Legion',
    state: 1,
    icon: '⚔️'
  }]
};

export const MOCK_BURG = {
  i: 1,
  name: 'TestCity',
  cell: 100,
  x: 500,
  y: 400,
  state: 1,
  culture: 1,
  population: 50,
  type: 'City',
  capital: 1,
  port: 1,
  citadel: 1,
  walls: 1,
  plaza: 1,
  temple: 1
};

export const MOCK_CULTURE = {
  i: 1,
  name: 'TestCulture',
  type: 'Generic',
  base: 1,
  origins: [0],
  shield: 'heater',
  center: 100,
  color: '#00ff00',
  expansionism: 1.0,
  code: 'Tc'
};

export const MOCK_RELIGION = {
  i: 1,
  name: 'TestFaith',
  type: 'Folk',
  form: 'Animism',
  culture: 1,
  center: 100,
  color: '#0000ff',
  code: 'Tf',
  expansion: 'culture',
  expansionism: 1.0
};

export const MOCK_MARKER = {
  i: 0,
  icon: '🏰',
  type: 'castle',
  cell: 100,
  x: 500,
  y: 400,
  lock: false
};

// AI Test Data
export const MOCK_AI_RESPONSES = {
  worldBuild: JSON.stringify({
    version: '1.0',
    operation: 'worldbuild',
    confidence: 0.92,
    reasoning: 'Applied post-apocalyptic theme',
    changes: [
      { entity: 'S1|name=BrokenCrown|form=Ruin', op: 'update' },
      { entity: 'S2|name=FreeCities|form=League', op: 'update' },
      { entity: 'M50|ruins|@450,320', op: 'create' }
    ]
  }),

  storyTranslate: JSON.stringify({
    version: '1.0',
    operation: 'translate',
    confidence: 0.88,
    narrative_summary: 'Kingdom fell to invaders',
    changes: [
      {
        operation: 'update',
        entityType: 'state',
        entityId: 1,
        updates: { name: 'Fallen Kingdom', form: 'Ruin' },
        reasoning: 'Kingdom conquered'
      }
    ]
  }),

  questGenerate: JSON.stringify({
    title: 'The Lost Artifact',
    questGiver: { name: 'Elder Sage', role: 'Village Elder', motivation: 'Protect village' },
    objective: 'Recover the ancient artifact',
    locations: [
      { name: 'Ancient Temple', x: 600, y: 300, description: 'Ruined temple' }
    ],
    obstacles: ['Undead guardians', 'Trapped corridors'],
    reward: 'Sacred relic',
    sideObjectives: ['Find lost journal']
  })
};

// Helper to generate minimal valid pack structure
export function createMinimalPack() {
  return {
    cells: {
      i: Array.from({ length: 1000 }, (_, i) => i),
      v: Array(1000).fill([]),
      c: Array(1000).fill([]),
      p: Array(1000).fill([500, 400]),
      h: new Uint8Array(1000).fill(25),
      area: new Uint16Array(1000).fill(10),
      biome: new Uint8Array(1000).fill(6),
      state: new Uint16Array(1000).fill(1),
      province: new Uint16Array(1000).fill(1),
      culture: new Uint16Array(1000).fill(1),
      religion: new Uint16Array(1000).fill(1),
      burg: new Uint16Array(1000).fill(0),
      routes: Array(1000).fill({}),
      r: new Uint16Array(1000).fill(0),
      pop: new Float32Array(1000).fill(1.0),
      s: new Uint8Array(1000).fill(50)
    },
    states: [
      { i: 0, name: 'Neutral' },
      { ...MOCK_STATE, removed: false }
    ],
    burgs: [
      { i: 0, name: 'None' },
      { ...MOCK_BURG, removed: false }
    ],
    cultures: [
      { i: 0, name: 'None' },
      { ...MOCK_CULTURE, removed: false }
    ],
    religions: [
      { i: 0, name: 'None' },
      { ...MOCK_RELIGION, removed: false }
    ],
    provinces: [],
    rivers: [],
    routes: [],
    markers: [],
    features: [],
    zones: []
  };
}
