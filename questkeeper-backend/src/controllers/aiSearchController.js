// POST /api/ai-search { query } -> { results: [{ id, name, category, why }] }
//
// Asks Claude which catalog entries match what the player means. The API
// key stays here on the server (ANTHROPIC_API_KEY); the browser never sees
// it. Without a key the endpoint answers 503 so the app can say AI search
// isn't set up, and everything else keeps working.

import Anthropic from "@anthropic-ai/sdk";
import {
  RESULT_SCHEMA,
  SEARCH_INSTRUCTIONS,
  catalogText,
  cleanQuery,
  createRateLimiter,
  loadCatalog,
  pickResults,
} from "../utils/aiSearch.js";

const MODEL = "claude-opus-5-5";
const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let client = null;
let catalogCache = { entries: [], loadedAt: 0 };
const allowSearch = createRateLimiter();

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

// The catalog is loaded once and kept for a day (it only changes when the
// SRD does). An empty catalog is tried again on the next search.
async function getCatalog() {
  const fresh = Date.now() - catalogCache.loadedAt < CATALOG_MAX_AGE_MS;
  if (catalogCache.entries.length > 0 && fresh) return catalogCache.entries;
  const entries = await loadCatalog();
  catalogCache = { entries, loadedAt: Date.now() };
  return entries;
}

function fail(res, status, message) {
  return res.status(status).json({ message, results: [] });
}

export async function aiSearch(req, res) {
  const query = cleanQuery(req.body?.query);
  if (query.length < 2) return fail(res, 400, "Type a few words to search for.");

  const anthropic = getClient();
  if (!anthropic) return fail(res, 503, "AI search isn't set up yet.");

  if (!allowSearch(req.ip)) {
    return fail(res, 429, "That's a lot of searches. Try again in a few minutes.");
  }

  try {
    const catalog = await getCatalog();
    if (catalog.length === 0) return fail(res, 503, "The rules lists couldn't be loaded. Try again soon.");

    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // If the safety check ever declines a search, Anthropic retries it on
      // its recommended fallback model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // A quick pick from a list: low effort keeps it fast and cheap.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: RESULT_SCHEMA },
      },
      system: [
        {
          type: "text",
          text: `${SEARCH_INSTRUCTIONS}\n\n${catalogText(catalog)}`,
          // The instructions and catalog are the same every time, so they
          // are cached for an hour and later searches cost much less.
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [{ role: "user", content: query }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ results: [], message: "No matches for that search." });
    }

    const text = response.content.find((block) => block.type === "text")?.text ?? "";
    return res.status(200).json({ results: pickResults(text, catalog) });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(res, 503, "AI search isn't set up correctly (the API key was rejected).");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(res, 503, "AI search is busy right now. Try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`AI search failed: ${error.status} ${error.message}`);
      return fail(res, 502, "AI search didn't answer. Try again in a moment.");
    }
    console.error("AI search failed:", error);
    return fail(res, 500, "AI search didn't work. Try again in a moment.");
  }
}

// For tests: forget the cached catalog and client.
export function resetAiSearch() {
  client = null;
  catalogCache = { entries: [], loadedAt: 0 };
}
