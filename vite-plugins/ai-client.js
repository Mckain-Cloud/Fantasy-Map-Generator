/**
 * AI Client (Node only)
 *
 * One function, `generateStructured`, that asks any registry model for a
 * JSON document matching a schema, routed to the vendor's own API when we
 * hold a key for it and to OpenRouter otherwise.
 *
 *   Anthropic  @anthropic-ai/sdk  messages.create + output_config.format
 *   OpenAI     openai             chat.completions + response_format json_schema (strict)
 *   OpenRouter @openrouter/sdk    chat.send + responseFormat json_schema
 *
 * Returns {data, raw, usage, model, provider, durationMs} or throws an Error
 * with `.provider`, `.status` and, for Claude safety refusals, `.refusal`.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {OpenRouter} from "@openrouter/sdk";
import {getModel, resolveRoute, availableModels} from "../modules/ai/model-registry.js";

const REFERER = "https://azgaar.github.io/Fantasy-Map-Generator";
const TITLE = "Fantasy Map Generator";

// Hard ceiling per request. World specs take 1-5 minutes on the slow models;
// anything past this is treated as a hung upstream.
export const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 8 * 60 * 1000);

let clients = null;

export function getKeys(env = process.env) {
  // AI_PREFER_OPENROUTER=all | anthropic | openai | anthropic,openai
  // routes those vendors' models through OpenRouter even when a vendor key is set
  const prefer = String(env.AI_PREFER_OPENROUTER || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return {
    anthropic: env.ANTHROPIC_API_KEY || null,
    openai: env.OPENAI_API_KEY || null,
    openrouter: env.OPENROUTER_API_KEY || null,
    preferOpenRouter: prefer.includes("all") || prefer.includes("true") ? true : prefer
  };
}

function getClients() {
  if (clients) return clients;
  const keys = getKeys();
  clients = {
    anthropic: keys.anthropic ? new Anthropic({apiKey: keys.anthropic, timeout: REQUEST_TIMEOUT_MS, maxRetries: 2}) : null,
    openai: keys.openai ? new OpenAI({apiKey: keys.openai, timeout: REQUEST_TIMEOUT_MS, maxRetries: 2}) : null,
    openrouter: keys.openrouter
      ? new OpenRouter({
          apiKey: keys.openrouter,
          defaultHeaders: {"HTTP-Referer": REFERER, "X-Title": TITLE},
          // the SDK has no default deadline; a hung upstream would otherwise block forever
          timeoutMs: REQUEST_TIMEOUT_MS
        })
      : null
  };
  return clients;
}

/** Models usable for a feature with the keys in the environment. */
export function listModels(feature) {
  return availableModels(feature, getKeys());
}

/**
 * Normalise a JSON schema wrapper. Callers pass either {name, schema, strict}
 * or a bare schema object.
 */
function normalizeSchema(schema, fallbackName) {
  if (schema && schema.schema && typeof schema.schema === "object") {
    return {name: schema.name || fallbackName, schema: schema.schema, strict: schema.strict !== false};
  }
  return {name: fallbackName, schema, strict: true};
}

/**
 * @param {object} options
 * @param {string} options.modelId     registry id (legacy ids are aliased)
 * @param {string} options.system      system prompt
 * @param {string} options.user        user message
 * @param {object} options.schema      {name, schema, strict?} or bare JSON schema
 * @param {number} [options.maxTokens=16384]
 * @param {string} [options.effort]    low | medium | high | xhigh | max (Anthropic; mapped for OpenAI)
 * @param {string} [options.schemaName="response"]
 */
export async function generateStructured({modelId, system, user, schema, maxTokens = 16384, effort, schemaName = "response"}) {
  const model = getModel(modelId);
  if (!model) throw Object.assign(new Error(`Unknown model '${modelId}'`), {status: 400});

  const route = resolveRoute(model, getKeys());
  if (!route) throw Object.assign(new Error(`No API key configured for ${model.name}`), {status: 503});

  const spec = normalizeSchema(schema, schemaName);
  const started = Date.now();
  let result;

  let fallbackFrom = null;
  try {
    if (route.provider === "anthropic") result = await callAnthropic(route.model, {system, user, spec, maxTokens, effort});
    else if (route.provider === "openai") result = await callOpenAI(route.model, {system, user, spec, maxTokens, effort});
    else result = await callOpenRouter(route.model, {system, user, spec, maxTokens, effort});
  } catch (error) {
    // A vendor account that is out of credits or rate-limited should not take
    // the feature down when OpenRouter can serve the same model.
    const billing = error.status === 402 || error.status === 429 || /credits|billing|quota|insufficient/i.test(error.message || "");
    if (route.provider !== "openrouter" && billing && getKeys().openrouter && model.openrouter) {
      console.warn(`[ai-client] ${route.provider} failed (${error.message.slice(0, 120)}); retrying ${model.name} via OpenRouter`);
      fallbackFrom = route.provider;
      route.provider = "openrouter";
      route.model = model.openrouter;
      result = await callOpenRouter(route.model, {system, user, spec, maxTokens, effort});
    } else {
      throw error;
    }
  }

  let data;
  try {
    data = JSON.parse(result.raw);
  } catch (error) {
    throw Object.assign(new Error(`${model.name} returned invalid JSON: ${error.message}`), {
      status: 422,
      provider: route.provider,
      raw: result.raw
    });
  }

  return {
    data,
    raw: result.raw,
    usage: normalizeUsage(result.usage),
    model: model.id,
    providerModel: result.model || route.model,
    provider: route.provider,
    schemaMode: result.schemaMode || "grammar",
    fallbackFrom,
    durationMs: Date.now() - started
  };
}

// ----------------------------------------------------------------------------
// Prompted-JSON fallback (schema too large for constrained decoding)
// ----------------------------------------------------------------------------

/** Anthropic rejects large schemas; OpenRouter forwards that error wrapped in metadata. */
function isGrammarTooLarge(error) {
  const text = errorText(error);
  return /compiled grammar is too large|too many optional parameters|reduce the number of strict/i.test(text);
}

/** Collect every message an SDK error may carry (OpenRouter nests the vendor's raw error). */
function errorText(error) {
  const parts = [error?.message];
  const body = error?.body ?? error?.data ?? error?.error;
  try {
    parts.push(typeof body === "string" ? body : JSON.stringify(body));
  } catch {}
  return parts.filter(Boolean).join(" ");
}

function promptedJsonSystem(system, schema) {
  return (
    system +
    "\n\n## Output format\nRespond with ONLY a single JSON object, no markdown fences and no commentary. " +
    "It must validate against this JSON Schema (every listed property is required; use 0, \"\" or [] when you have nothing to say):\n" +
    JSON.stringify(schema)
  );
}

function stripJsonFences(text) {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  return first >= 0 && last > first ? text.slice(first, last + 1) : text;
}

// ----------------------------------------------------------------------------
// Anthropic
// ----------------------------------------------------------------------------

async function callAnthropic(model, {system, user, spec, maxTokens, effort}) {
  const client = getClients().anthropic;
  // No temperature: sampling parameters are rejected by Claude 5.x models.
  // Thinking is adaptive by default; effort controls depth (Opus 5.5 defaults to medium).
  const request = {
    model,
    max_tokens: Math.min(maxTokens, 128000),
    system,
    messages: [{role: "user", content: user}],
    output_config: {
      format: {type: "json_schema", schema: spec.schema},
      ...(effort ? {effort} : {})
    }
  };

  let response;
  let schemaMode = "grammar";
  try {
    response = await client.messages.create(request);
  } catch (error) {
    if (!isGrammarTooLarge(error)) throw wrap(error, "anthropic", model);

    // Large schemas exceed Claude's constrained-decoding grammar limit. Fall
    // back to prompt-level JSON: Claude 5.x follows a schema reliably, and the
    // caller validates the result anyway.
    console.warn(`[ai-client] ${model}: schema too large for grammar mode, falling back to prompted JSON`);
    schemaMode = "prompt";
    delete request.output_config.format;
    if (!Object.keys(request.output_config).length) delete request.output_config;
    request.system = promptedJsonSystem(system, spec.schema);
    try {
      response = await client.messages.create(request);
    } catch (retryError) {
      throw wrap(retryError, "anthropic", model);
    }
  }

  if (response.stop_reason === "refusal") {
    const details = response.stop_details;
    throw Object.assign(new Error(`${model} declined the request (${details?.category || "safety"})${details?.explanation ? `: ${details.explanation}` : ""}`), {
      status: 422,
      provider: "anthropic",
      refusal: details || {category: null}
    });
  }
  if (response.stop_reason === "max_tokens") {
    throw Object.assign(new Error(`${model} hit max_tokens (${request.max_tokens}) before finishing the JSON`), {status: 422, provider: "anthropic"});
  }

  let raw = response.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("")
    .trim();
  if (schemaMode === "prompt") raw = stripJsonFences(raw);
  return {raw, usage: response.usage, model: response.model, schemaMode};
}

// ----------------------------------------------------------------------------
// OpenAI
// ----------------------------------------------------------------------------

const OPENAI_EFFORT = {low: "low", medium: "medium", high: "high", xhigh: "high", max: "high"};

async function callOpenAI(model, {system, user, spec, maxTokens, effort}) {
  const client = getClients().openai;
  const request = {
    model,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user}
    ],
    response_format: {type: "json_schema", json_schema: {name: spec.name, schema: spec.schema, strict: spec.strict}},
    max_completion_tokens: maxTokens,
    ...(effort && OPENAI_EFFORT[effort] ? {reasoning_effort: OPENAI_EFFORT[effort]} : {})
  };

  let completion;
  try {
    completion = await client.chat.completions.create(request);
  } catch (error) {
    throw wrap(error, "openai", model);
  }

  const choice = completion.choices?.[0];
  if (choice?.message?.refusal) {
    throw Object.assign(new Error(`${model} declined the request: ${choice.message.refusal}`), {status: 422, provider: "openai", refusal: {explanation: choice.message.refusal}});
  }
  if (choice?.finish_reason === "length") {
    throw Object.assign(new Error(`${model} hit max_completion_tokens (${maxTokens}) before finishing the JSON`), {status: 422, provider: "openai"});
  }
  const raw = choice?.message?.content;
  if (!raw) throw Object.assign(new Error(`No content in ${model} response`), {status: 502, provider: "openai"});
  return {raw, usage: completion.usage, model: completion.model};
}

// ----------------------------------------------------------------------------
// OpenRouter
// ----------------------------------------------------------------------------

async function callOpenRouter(model, {system, user, spec, maxTokens, effort}) {
  const client = getClients().openrouter;
  const chatRequest = {
    model,
    messages: [
      {role: "system", content: system},
      {role: "user", content: user}
    ],
    responseFormat: {type: "json_schema", jsonSchema: {name: spec.name, schema: spec.schema, strict: spec.strict}},
    maxTokens,
    stream: false,
    ...(effort ? {reasoning: {effort: OPENAI_EFFORT[effort] || "medium"}} : {})
  };

  let completion;
  let schemaMode = "grammar";
  try {
    completion = await withTimeout(client.chat.send({chatRequest}, {timeoutMs: REQUEST_TIMEOUT_MS}), REQUEST_TIMEOUT_MS, model);
  } catch (error) {
    if (!isGrammarTooLarge(error)) throw wrap(error, "openrouter", model);
    // The upstream vendor (Anthropic) refused the schema size; ask for JSON in the prompt instead
    console.warn(`[ai-client] ${model} via OpenRouter: schema too large for grammar mode, falling back to prompted JSON`);
    schemaMode = "prompt";
    delete chatRequest.responseFormat;
    chatRequest.messages[0] = {role: "system", content: promptedJsonSystem(system, spec.schema)};
    try {
      completion = await withTimeout(client.chat.send({chatRequest}, {timeoutMs: REQUEST_TIMEOUT_MS}), REQUEST_TIMEOUT_MS, model);
    } catch (retryError) {
      throw wrap(retryError, "openrouter", model);
    }
  }

  const choice = completion.choices?.[0];
  let raw = choice?.message?.content;
  if (choice?.finishReason === "length" || choice?.finish_reason === "length") {
    throw Object.assign(new Error(`${model} hit maxTokens (${maxTokens}) before finishing the JSON`), {status: 422, provider: "openrouter"});
  }
  if (!raw) throw Object.assign(new Error(`No content in ${model} response`), {status: 502, provider: "openrouter"});
  if (schemaMode === "prompt") raw = stripJsonFences(raw.trim());
  return {raw, usage: completion.usage, model: completion.model, schemaMode};
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function withTimeout(promise, ms, model) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`${model} did not respond within ${Math.round(ms / 1000)}s`), {status: 504})), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

function wrap(error, provider, model) {
  const status = error?.status || error?.statusCode || 502;
  let message = error?.error?.error?.message || error?.error?.message || error?.message || String(error);
  if (provider === "openrouter") {
    // OpenRouter wraps the upstream vendor error: {"error":{"message":"Provider returned error","metadata":{"raw":"..."}}}
    const rawUpstream = errorText(error).match(/\\"message\\":\\"([^"\\]+)/);
    if (rawUpstream) message += ` — upstream: ${rawUpstream[1]}`;
  }
  return Object.assign(new Error(`[${provider}:${model}] ${message}`), {status, provider, cause: error});
}

export function normalizeUsage(usage) {
  if (!usage) return null;
  const input = usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokens ?? 0;
  const output = usage.output_tokens ?? usage.completion_tokens ?? usage.completionTokens ?? 0;
  return {
    input_tokens: input,
    output_tokens: output,
    total_tokens: input + output,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0
  };
}

/** Send a structured error as JSON on a Node response. */
export function sendError(res, error) {
  res.statusCode = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({error: error.message, provider: error.provider, refusal: error.refusal, raw: error.raw}));
}
