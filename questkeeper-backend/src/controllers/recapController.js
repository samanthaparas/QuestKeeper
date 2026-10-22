// POST /api/recap { sessionNumber, entries: [{ author, text }] } -> { recap }
//
// "Previously on...": Claude retells a session from the group's shared notes.
// The app only ever sends notes marked for the whole table, never a private
// note. The API key stays here on the server (ANTHROPIC_API_KEY); without one
// the endpoint answers 503 so the app can say it isn't set up. The notes are
// only used for this one request: they are never stored or logged.

import Anthropic from "@anthropic-ai/sdk";
import { createRateLimiter } from "../utils/aiSearch.js";
import { RECAP_INSTRUCTIONS, RECAP_SCHEMA, cleanEntries, cleanSession, pickRecap, recapPrompt } from "../utils/recap.js";

const MODEL = "claude-opus-5-5";

let client = null;
// Recaps cost more than searches, so the limit is lower.
let allowRecap = createRateLimiter({ limit: 10 });

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

function fail(res, status, message) {
  return res.status(status).json({ message, recap: "" });
}

export async function writeRecap(req, res) {
  const sessionNumber = cleanSession(req.body?.sessionNumber);
  const entries = cleanEntries(req.body?.entries);
  if (!sessionNumber) return fail(res, 400, "Pick a session first.");
  if (entries.length === 0) return fail(res, 400, "There are no shared notes to write a recap from yet.");

  const anthropic = getClient();
  if (!anthropic) return fail(res, 503, "Recaps aren't set up yet.");

  if (!allowRecap(req.ip)) {
    return fail(res, 429, "That's a lot of recaps. Try again in a few minutes.");
  }

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      // If the safety check ever declines a request, Anthropic retries it on
      // its recommended fallback model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: RECAP_SCHEMA },
      },
      system: [
        {
          type: "text",
          text: RECAP_INSTRUCTIONS,
          // Same instructions every time, so later recaps cost less.
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [{ role: "user", content: recapPrompt({ sessionNumber, entries }) }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ recap: "", message: "Couldn't write a recap from those notes." });
    }

    const answer = response.content.find((block) => block.type === "text")?.text ?? "";
    const recap = pickRecap(answer);
    if (recap === null) return fail(res, 502, "The recap didn't come out right. Try again in a moment.");
    if (recap === "") {
      return res.status(200).json({ recap: "", message: "The notes don't say what happened in the game yet." });
    }
    return res.status(200).json({ recap });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(res, 503, "Recaps aren't set up correctly (the API key was rejected).");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(res, 503, "Recaps are busy right now. Try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Recap failed: ${error.status} ${error.message}`);
      return fail(res, 502, "The recap didn't come back. Try again in a moment.");
    }
    console.error("Recap failed:", error?.message ?? error);
    return fail(res, 500, "The recap didn't work. Try again in a moment.");
  }
}

// For tests: forget the client and the rate-limit counts.
export function resetRecap() {
  client = null;
  allowRecap = createRateLimiter({ limit: 10 });
}
