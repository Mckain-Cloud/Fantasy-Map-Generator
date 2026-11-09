import {describe, test, expect} from "vitest";
import {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  LEGACY_MODEL_ALIASES,
  getModel,
  modelsForFeature,
  resolveRoute,
  availableModels,
  toLegacyModelMap,
  estimateCost
} from "./model-registry.js";

describe("model registry", () => {
  test("ids are unique and well-formed", () => {
    const ids = MODEL_REGISTRY.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MODEL_REGISTRY) {
      expect(m.id).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/);
      expect(m.openrouter).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/);
      expect(m.pricing.input).toBeGreaterThan(0);
      expect(m.pricing.output).toBeGreaterThan(0);
      expect(m.features.length).toBeGreaterThan(0);
    }
  });

  test("default model exists and supports every feature", () => {
    const m = getModel(DEFAULT_MODEL_ID);
    expect(m).toBeTruthy();
    expect(m.features).toEqual(expect.arrayContaining(["world-spec", "map-edit", "dungeon-import", "world-builder"]));
  });

  test("legacy ids resolve to current models", () => {
    for (const [legacy, current] of Object.entries(LEGACY_MODEL_ALIASES)) {
      expect(getModel(legacy)?.id, legacy).toBe(current);
    }
    expect(getModel("anthropic/claude-opus-4-5-20251101").id).toBe("anthropic/claude-opus-5-5");
    expect(getModel("nonsense/model")).toBeNull();
    expect(getModel(null)).toBeNull();
  });

  test("openrouter ids also resolve", () => {
    expect(getModel("anthropic/claude-opus-5.5").id).toBe("anthropic/claude-opus-5-5");
  });

  test("routing prefers the vendor API and falls back to OpenRouter", () => {
    const opus = getModel("anthropic/claude-opus-5-5");
    expect(resolveRoute(opus, {anthropic: "k"})).toEqual({provider: "anthropic", model: "claude-opus-5-5"});
    expect(resolveRoute(opus, {openrouter: "k"})).toEqual({provider: "openrouter", model: "anthropic/claude-opus-5.5"});
    expect(resolveRoute(opus, {})).toBeNull();

    expect(resolveRoute(opus, {anthropic: "k", openrouter: "k", preferOpenRouter: true}).provider).toBe("openrouter");
    expect(resolveRoute(opus, {anthropic: "k", openrouter: "k", preferOpenRouter: ["openai"]}).provider).toBe("anthropic");
    expect(resolveRoute(opus, {anthropic: "k", preferOpenRouter: true}).provider).toBe("anthropic"); // no OpenRouter key: keep direct

    const gemini = getModel("google/gemini-4-argon");
    expect(resolveRoute(gemini, {openai: "k", anthropic: "k"})).toBeNull();
    expect(resolveRoute(gemini, {openrouter: "k"}).provider).toBe("openrouter");
  });

  test("availableModels filters by feature and keys", () => {
    const none = availableModels("world-spec", {});
    expect(none).toEqual([]);
    const anthropicOnly = availableModels("world-spec", {anthropic: "k"});
    expect(anthropicOnly.every(m => m.vendor === "Anthropic")).toBe(true);
    const all = availableModels("world-spec", {openrouter: "k"});
    expect(all.length).toBe(modelsForFeature("world-spec").length);
    expect(all.every(m => m.route.provider === "openrouter")).toBe(true);
  });

  test("legacy map keeps the {id: {name, provider}} shape", () => {
    const map = toLegacyModelMap(modelsForFeature("map-edit"));
    expect(map["anthropic/claude-opus-5-5"]).toMatchObject({name: "Claude Opus 5.5", provider: "Anthropic"});
  });

  test("estimateCost uses per-million pricing", () => {
    const opus = getModel("anthropic/claude-opus-5-5");
    expect(estimateCost(opus, 1_000_000, 1_000_000)).toBe(24);
    expect(estimateCost(opus, 25_000, 15_000)).toBeCloseTo(0.4, 3);
    expect(estimateCost(null, 1, 1)).toBeNull();
  });
});
