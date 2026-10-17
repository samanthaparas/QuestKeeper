// POST /api/homebrew-summary { category, name, text } -> { summary, items, dropped }
//
// "Summarize for my group": Claude writes a short, own-words summary of the
// rules a player pasted from a book they own. The API key stays here on the
// server (ANTHROPIC_API_KEY); without one the endpoint answers 503 so the app
// can say it isn't set up. The pasted text is only used for this one request:
// it is never stored or logged.

import Anthropic from "@anthropic-ai/sdk";
import { createRateLimiter } from "../utils/aiSearch.js";
import {
  SUMMARY_INSTRUCTIONS,
  SUMMARY_SCHEMA,
  cleanCategory,
  cleanText,
  pickSummary,
  summaryPrompt,
} from "../utils/homebrewSummary.js";

const MODEL = "claude-opus-5-5";

let client = null;
// Summaries cost more than searches, so the limit is lower.
let allowSummary = createRateLimiter({ limit: 10 });

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

function fail(res, status, message) {
  return res.status(status).json({ message, summary: "", items: [], dropped: 0 });
}

export async function homebrewSummary(req, res) {
  const category = cleanCategory(req.body?.category);
  const text = cleanText(req.body?.text);
  if (!category) return fail(res, 400, "Pick what kind of option this is first.");
  if (text.length < 20) return fail(res, 400, "Paste the rules text first.");

  const anthropic = getClient();
  if (!anthropic) return fail(res, 503, "Summaries aren't set up yet.");

  if (!allowSummary(req.ip)) {
    return fail(res, 429, "That's a lot of summaries. Try again in a few minutes.");
  }

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // If the safety check ever declines a request, Anthropic retries it on
      // its recommended fallback model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SUMMARY_SCHEMA },
      },
      system: [
        {
          type: "text",
          text: SUMMARY_INSTRUCTIONS,
          // Same instructions every time, so later summaries cost less.
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [{ role: "user", content: summaryPrompt({ category, name: req.body?.name, text }) }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ summary: "", items: [], dropped: 0, message: "Couldn't summarize that text." });
    }

    const answer = response.content.find((block) => block.type === "text")?.text ?? "";
    const picked = pickSummary(answer, text);
    if (!picked) return fail(res, 502, "The summary didn't come out right. Try again in a moment.");
    return res.status(200).json(picked);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(res, 503, "Summaries aren't set up correctly (the API key was rejected).");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(res, 503, "Summaries are busy right now. Try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Homebrew summary failed: ${error.status} ${error.message}`);
      return fail(res, 502, "The summary didn't come back. Try again in a moment.");
    }
    console.error("Homebrew summary failed:", error?.message ?? error);
    return fail(res, 500, "The summary didn't work. Try again in a moment.");
  }
}

// For tests: forget the client and the rate-limit counts.
export function resetHomebrewSummary() {
  client = null;
  allowSummary = createRateLimiter({ limit: 10 });
}
