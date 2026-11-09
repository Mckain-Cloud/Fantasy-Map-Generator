/**
 * World Spec Service (Node only)
 *
 * Generates a world specification from a preprocessed adventure with any
 * registry model, validates it, and returns the same payload the
 * /api/ai/world-spec endpoint sends. Shared by the Vite API plugin and the
 * model sweep harness so both exercise identical code.
 */

import {generateStructured} from "./ai-client.js";
import {getModel, resolveRoute, estimateCost} from "../modules/ai/model-registry.js";
import {getKeys} from "./ai-client.js";

export async function generateWorldSpec({
  modelId,
  preprocessedAdventure,
  expansionLevel = "moderate",
  effort,
  buildSystemPrompt,
  buildUserMessage,
  getSchemaForProvider,
  analyzeWorldSpec,
  getWorldSpecStats
}) {
  const model = getModel(modelId);
  if (!model) throw Object.assign(new Error(`Unknown model '${modelId}'`), {status: 400});
  const route = resolveRoute(model, getKeys());
  if (!route) throw Object.assign(new Error(`No API key configured for ${model.name}`), {status: 503});

  const systemPrompt = buildSystemPrompt(expansionLevel);
  const userMessage = buildUserMessage(preprocessedAdventure);
  // Every provider gets the strict variant (all properties required): OpenAI
  // demands it, and Claude's grammar compiler rejects schemas with more than
  // a couple dozen optional properties.
  const schema = getSchemaForProvider(route.provider === "anthropic" ? "anthropic" : "openai");

  const result = await generateStructured({
    modelId: model.id,
    system: systemPrompt,
    user: userMessage,
    schema,
    maxTokens: 32000,
    effort: effort || (model.tier === "budget" ? "medium" : "high"),
    schemaName: schema.name
  });

  const worldSpec = result.data;
  const analysis = analyzeWorldSpec(worldSpec);
  const stats = getWorldSpecStats(worldSpec);

  return {
    success: true,
    model: result.model,
    providerModel: result.providerModel,
    provider: result.provider,
    duration: (result.durationMs / 1000).toFixed(1),
    tokens: result.usage?.total_tokens || 0,
    usage: result.usage,
    estimatedCostUsd: estimateCost(model, result.usage?.input_tokens, result.usage?.output_tokens),
    worldSpec,
    analysis,
    stats,
    expansionLevel
  };
}
