"use strict";

/**
 * Browser-side model list loader shared by every AI dialog.
 *
 * Five dialogs used to each call GET /api/ai/models at start-up, which meant
 * five identical requests (and five 404 console errors when the app is served
 * statically with no API). This fetches once, caches the result for the page
 * lifetime, and hands every caller the same Response-like object.
 */

const API_BASE = "/api/ai";
let pending = null;

/**
 * @returns {Promise<{ok: boolean, status: number, json: () => Promise<object>}>}
 */
export function fetchAiModels({force = false} = {}) {
  if (pending && !force) return pending;
  pending = (async () => {
    let status = 0;
    let body = null;
    try {
      const response = await fetch(`${API_BASE}/models`);
      status = response.status;
      try {
        body = await response.json();
      } catch {
        body = {error: `Unexpected response (${status}) from ${API_BASE}/models`};
      }
    } catch (error) {
      status = 0;
      body = {error: error.message || "Network error"};
    }
    const ok = status >= 200 && status < 300;
    if (!ok && status === 404) {
      // Static hosting without the API: say so once instead of five console errors
      console.info("[AI] /api/ai/models is not served here; AI features need the dev or Express server");
    }
    return {ok, status, json: async () => body};
  })();
  return pending;
}

if (typeof window !== "undefined") {
  window.fetchAiModels = fetchAiModels;
}
