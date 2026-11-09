"use strict";

/**
 * AI Model Registry
 *
 * The single list of models the app offers, shared by the Vite API plugin,
 * the production Express server, the browser UIs and the test harnesses.
 * Pure data + helpers, no I/O.
 *
 * Verified against the live OpenRouter catalogue and the vendors' model docs
 * on 2026-11-08. When a vendor ships a new generation, edit this file only.
 *
 * Fields:
 *   id            canonical id used by the app and the UI ("vendor/model")
 *   name          display name
 *   vendor        Anthropic | OpenAI | Google | xAI
 *   direct        {provider, model} for a first-party API call, if we support one
 *   openrouter    model id on OpenRouter (every model has one)
 *   pricing       USD per million tokens (input, output), OpenRouter list price
 *   context       context window in tokens
 *   speed/quality coarse hints for the UI
 *   tier          default | fast | budget | premium
 *   features      which app features offer the model
 */

export const MODEL_REGISTRY = [
  // ---------------------------------------------------------------- Anthropic
  {
    id: "anthropic/claude-opus-5-5",
    name: "Claude Opus 5.5",
    vendor: "Anthropic",
    direct: {provider: "anthropic", model: "claude-opus-5-5"},
    openrouter: "anthropic/claude-opus-5.5",
    pricing: {input: 4, output: 20},
    context: 1000000,
    speed: "medium",
    quality: "highest",
    tier: "default",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },
  {
    id: "anthropic/claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    vendor: "Anthropic",
    direct: {provider: "anthropic", model: "claude-sonnet-5-5"},
    openrouter: "anthropic/claude-sonnet-5.5",
    pricing: {input: 2, output: 10},
    context: 1000000,
    speed: "fast",
    quality: "high",
    tier: "fast",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },
  {
    id: "anthropic/claude-haiku-5-5",
    name: "Claude Haiku 5.5",
    vendor: "Anthropic",
    direct: {provider: "anthropic", model: "claude-haiku-5-5"},
    openrouter: "anthropic/claude-haiku-5.5",
    pricing: {input: 0.1, output: 0.5},
    context: 1000000,
    speed: "fastest",
    quality: "good",
    tier: "budget",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },
  {
    id: "anthropic/claude-fable-5-1",
    name: "Claude Fable 5.1",
    vendor: "Anthropic",
    direct: {provider: "anthropic", model: "claude-fable-5-1"},
    openrouter: "anthropic/claude-fable-5.1",
    pricing: {input: 10, output: 50},
    context: 1000000,
    speed: "slow",
    quality: "highest",
    tier: "premium",
    features: ["world-spec"]
  },

  // ---------------------------------------------------------------- OpenAI
  {
    id: "openai/gpt-6-astra",
    name: "GPT-6 Astra",
    vendor: "OpenAI",
    direct: {provider: "openai", model: "gpt-6-astra"},
    openrouter: "openai/gpt-6-astra",
    pricing: {input: 10, output: 50},
    context: 1050000,
    speed: "slow",
    quality: "highest",
    tier: "premium",
    features: ["world-spec"]
  },
  {
    id: "openai/gpt-6.1-sol",
    name: "GPT-6.1 Sol",
    vendor: "OpenAI",
    direct: {provider: "openai", model: "gpt-6.1-sol"},
    openrouter: "openai/gpt-6.1-sol",
    pricing: {input: 2, output: 10},
    context: 1050000,
    speed: "medium",
    quality: "high",
    tier: "default",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },
  {
    id: "openai/gpt-6.1-terra",
    name: "GPT-6.1 Terra",
    vendor: "OpenAI",
    direct: {provider: "openai", model: "gpt-6.1-terra"},
    openrouter: "openai/gpt-6.1-terra",
    pricing: {input: 1, output: 5},
    context: 1050000,
    speed: "fast",
    quality: "high",
    tier: "fast",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },
  {
    id: "openai/gpt-6-luna",
    name: "GPT-6 Luna",
    vendor: "OpenAI",
    direct: {provider: "openai", model: "gpt-6-luna"},
    openrouter: "openai/gpt-6-luna",
    pricing: {input: 0.1, output: 0.5},
    context: 1050000,
    speed: "fastest",
    quality: "good",
    tier: "budget",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },

  // ---------------------------------------------------------------- Google (via OpenRouter)
  {
    id: "google/gemini-4-argon",
    name: "Gemini 4 Argon",
    vendor: "Google",
    direct: null,
    openrouter: "google/gemini-4-argon",
    pricing: {input: 2, output: 10},
    context: 1048576,
    speed: "medium",
    quality: "high",
    tier: "default",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },
  {
    id: "google/gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    vendor: "Google",
    direct: null,
    openrouter: "google/gemini-3.8-flash",
    pricing: {input: 0.3, output: 2.5},
    context: 1048576,
    speed: "fastest",
    quality: "good",
    tier: "budget",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  },

  // ---------------------------------------------------------------- xAI (via OpenRouter)
  {
    id: "x-ai/grok-4.7",
    name: "Grok 4.7",
    vendor: "xAI",
    direct: null,
    openrouter: "x-ai/grok-4.7",
    pricing: {input: 2, output: 6},
    context: 500000,
    speed: "medium",
    quality: "high",
    tier: "default",
    features: ["world-spec", "map-edit", "dungeon-import", "world-builder"]
  }
];

export const DEFAULT_MODEL_ID = "anthropic/claude-opus-5-5";

/** Ids that older saved preferences or specs may still carry. */
export const LEGACY_MODEL_ALIASES = {
  "openai/gpt-5.1": "openai/gpt-6.1-sol",
  "openai/gpt-5": "openai/gpt-6.1-sol",
  "anthropic/claude-opus-4-5-20251101": "anthropic/claude-opus-5-5",
  "anthropic/claude-opus-4.5": "anthropic/claude-opus-5-5",
  "anthropic/claude-sonnet-4-5-20250929": "anthropic/claude-sonnet-5-5",
  "anthropic/claude-sonnet-4.5": "anthropic/claude-sonnet-5-5",
  "google/gemini-3-pro-preview": "google/gemini-4-argon",
  "google/gemini-2.5-flash": "google/gemini-3.8-flash",
  "google/gemini-2.5-flash-preview-09-2025": "google/gemini-3.8-flash",
  "x-ai/grok-4-fast": "x-ai/grok-4.7",
  "x-ai/grok-4.1-fast:free": "x-ai/grok-4.7",
  "x-ai/grok-4.1-fast": "x-ai/grok-4.7"
};

export function getModel(id) {
  if (!id) return null;
  const resolved = LEGACY_MODEL_ALIASES[id] || id;
  return MODEL_REGISTRY.find(m => m.id === resolved) || MODEL_REGISTRY.find(m => m.openrouter === resolved) || null;
}

export function modelsForFeature(feature) {
  return MODEL_REGISTRY.filter(m => m.features.includes(feature));
}

/**
 * Decide how to call a model given which API keys exist.
 * Prefers the vendor's own API (strict structured outputs, no middleman),
 * falls back to OpenRouter, returns null when nothing can serve it.
 */
export function resolveRoute(model, keys = {}) {
  if (!model) return null;
  // keys.preferOpenRouter: true | ["anthropic", "openai"] forces those vendors through OpenRouter
  const forced = keys.preferOpenRouter === true ? ["anthropic", "openai"] : keys.preferOpenRouter || [];
  const direct = model.direct?.provider;
  const useDirect = direct && !(forced.includes(direct) && keys.openrouter && model.openrouter);
  if (useDirect && direct === "anthropic" && keys.anthropic) return {provider: "anthropic", model: model.direct.model};
  if (useDirect && direct === "openai" && keys.openai) return {provider: "openai", model: model.direct.model};
  if (keys.openrouter && model.openrouter) return {provider: "openrouter", model: model.openrouter};
  return null;
}

/** Models usable for a feature with the configured keys, in registry order. */
export function availableModels(feature, keys = {}) {
  return modelsForFeature(feature)
    .map(m => ({...m, route: resolveRoute(m, keys)}))
    .filter(m => m.route);
}

/** Legacy `{id: {name, provider}}` map the older UIs expect. */
export function toLegacyModelMap(models) {
  return Object.fromEntries(models.map(m => [m.id, {name: m.name, provider: m.vendor, tier: m.tier, pricing: m.pricing}]));
}

/** Rough cost of one call in USD. */
export function estimateCost(model, inputTokens = 0, outputTokens = 0) {
  if (!model?.pricing) return null;
  return Math.round(((inputTokens * model.pricing.input + outputTokens * model.pricing.output) / 1e6) * 10000) / 10000;
}

export const ModelRegistry = {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  LEGACY_MODEL_ALIASES,
  getModel,
  modelsForFeature,
  resolveRoute,
  availableModels,
  toLegacyModelMap,
  estimateCost
};
