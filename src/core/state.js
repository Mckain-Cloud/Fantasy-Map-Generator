// Fantasy Map Generator - Central State Module
// This module bridges ES Modules with the legacy global variable pattern
// During transition, it maintains backward compatibility with window.* access

"use strict";

// Constants
export const PRODUCTION = typeof location !== "undefined" && location.hostname && location.hostname !== "localhost" && location.hostname !== "127.0.0.1";
export const INFO = true;
export const TIME = true;
export const WARN = true;
export const ERROR = true;

// Typed array limits
export const INT8_MAX = 127;
export const UINT8_MAX = 255;
export const UINT16_MAX = 65535;
export const UINT32_MAX = 4294967295;

// Main state object - holds all mutable state
export const state = {
  // Core data structures
  grid: {},
  pack: {},
  seed: null,
  mapId: null,
  mapHistory: [],
  notes: [],
  customization: 0,
  elSelected: null,
  modules: {},

  // Configuration data (set after modules load)
  biomesData: null,
  nameBases: null,

  // View state
  scale: 1,
  viewX: 0,
  viewY: 0,

  // Graph dimensions
  graphWidth: 0,
  graphHeight: 0,
  svgWidth: 0,
  svgHeight: 0,

  // Map coordinates on globe
  mapCoordinates: {},

  // Rate settings
  populationRate: 1000,
  distanceScale: 3,
  urbanization: 1,
  urbanDensity: 10,

  // Options
  options: {
    pinNotes: false,
    winds: [225, 45, 225, 315, 135, 315],
    temperatureEquator: 27,
    temperatureNorthPole: -30,
    temperatureSouthPole: -15,
    stateLabelsMode: "auto",
    showBurgPreview: true,
    villageMaxPopulation: 2000
  },

  // Debug settings
  DEBUG: {},
  MOBILE: false
};

// SVG layer references - these are d3 selections, initialized by main.js
export const layers = {
  svg: null,
  defs: null,
  viewbox: null,
  scaleBar: null,
  legend: null,
  ocean: null,
  oceanLayers: null,
  oceanPattern: null,
  lakes: null,
  landmass: null,
  texture: null,
  terrs: null,
  biomes: null,
  cells: null,
  gridOverlay: null,
  coordinates: null,
  compass: null,
  rivers: null,
  terrain: null,
  relig: null,
  cults: null,
  regions: null,
  statesBody: null,
  statesHalo: null,
  provs: null,
  zones: null,
  borders: null,
  stateBorders: null,
  provinceBorders: null,
  routes: null,
  roads: null,
  trails: null,
  searoutes: null,
  temperature: null,
  coastline: null,
  ice: null,
  prec: null,
  population: null,
  emblems: null,
  labels: null,
  icons: null,
  burgIcons: null,
  anchors: null,
  armies: null,
  markers: null,
  fogging: null,
  ruler: null,
  debug: null,
  burgLabels: null
};

// D3 utilities - initialized by main.js
export const d3Utils = {
  color: null,
  lineGen: null,
  zoom: null
};

// Rulers instance - initialized by main.js
export let rulers = null;
export function setRulers(r) {
  rulers = r;
}

// ============= BACKWARD COMPATIBILITY =============
// During transition, sync state with window globals
// This will be removed in the final cleanup phase

if (typeof window !== "undefined") {
  // Make constants available globally
  window.PRODUCTION = PRODUCTION;
  window.INFO = INFO;
  window.TIME = TIME;
  window.WARN = WARN;
  window.ERROR = ERROR;
  window.INT8_MAX = INT8_MAX;
  window.UINT8_MAX = UINT8_MAX;
  window.UINT16_MAX = UINT16_MAX;
  window.UINT32_MAX = UINT32_MAX;

  // Create property descriptors for state variables
  // This allows existing code to use `pack` while new code uses `state.pack`
  const stateKeys = [
    "grid",
    "pack",
    "seed",
    "mapId",
    "mapHistory",
    "notes",
    "customization",
    "elSelected",
    "modules",
    "biomesData",
    "nameBases",
    "scale",
    "viewX",
    "viewY",
    "graphWidth",
    "graphHeight",
    "svgWidth",
    "svgHeight",
    "mapCoordinates",
    "populationRate",
    "distanceScale",
    "urbanization",
    "urbanDensity",
    "options",
    "DEBUG",
    "MOBILE"
  ];

  stateKeys.forEach(key => {
    if (!(key in window)) {
      Object.defineProperty(window, key, {
        get: () => state[key],
        set: v => {
          state[key] = v;
        },
        configurable: true
      });
    }
  });

  // Layer references - these are set by main.js after DOM is ready
  const layerKeys = Object.keys(layers);
  layerKeys.forEach(key => {
    if (!(key in window)) {
      Object.defineProperty(window, key, {
        get: () => layers[key],
        set: v => {
          layers[key] = v;
        },
        configurable: true
      });
    }
  });

  // D3 utilities
  Object.defineProperty(window, "color", {
    get: () => d3Utils.color,
    set: v => {
      d3Utils.color = v;
    },
    configurable: true
  });
  Object.defineProperty(window, "lineGen", {
    get: () => d3Utils.lineGen,
    set: v => {
      d3Utils.lineGen = v;
    },
    configurable: true
  });
  Object.defineProperty(window, "zoom", {
    get: () => d3Utils.zoom,
    set: v => {
      d3Utils.zoom = v;
    },
    configurable: true
  });

  // Rulers
  Object.defineProperty(window, "rulers", {
    get: () => rulers,
    set: v => {
      rulers = v;
    },
    configurable: true
  });

  // Export the state module to window for debugging
  window.FMG = {state, layers, d3Utils};
}
