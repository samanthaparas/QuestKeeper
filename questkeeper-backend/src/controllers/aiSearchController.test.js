import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// A stand-in for the Anthropic SDK: no network, and each test says what
// Claude "answers".
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class Anthropic {
    constructor() {
      this.beta = { messages: { create } };
    }
  }
  Anthropic.APIError = APIError;
  Anthropic.AuthenticationError = AuthenticationError;
  Anthropic.RateLimitError = RateLimitError;
  return { default: Anthropic };
});

vi.mock("../utils/dnd5eApiClient.js", () => ({
  fetchDnd5eList: vi.fn(async (resource) =>
    resource === "spells" ? [{ index: "cure-wounds", name: "Cure Wounds" }] : [],
  ),
}));

const { aiSearch, resetAiSearch } = await import("./aiSearchController.js");

function fakeResponse() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

async function search(query, ip = "1.2.3.4") {
  const res = fakeResponse();
  await aiSearch({ body: { query }, ip }, res);
  return res;
}

beforeEach(() => {
  resetAiSearch();
  create.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/ai-search", () => {
  it("asks Claude with the cached catalog and returns checked results", async () => {
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({ results: [{ id: "spell:cure-wounds", why: "Heals someone you touch." }] }),
        },
      ],
    });

    const res = await search("heal my friend");

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toEqual([
      { id: "spell:cure-wounds", name: "Cure Wounds", category: "Spells", why: "Heals someone you touch." },
    ]);
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.messages).toEqual([{ role: "user", content: "heal my friend" }]);
    expect(request.system[0].text).toContain("spell:cure-wounds | Cure Wounds");
    expect(request.system[0].cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    expect(request.output_config.format.type).toBe("json_schema");
  });

  it("says it isn't set up when there's no API key, without calling Claude", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const res = await search("heal");

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toBe("AI search isn't set up yet.");
    expect(create).not.toHaveBeenCalled();
  });

  it("needs at least two characters", async () => {
    const res = await search(" a ");

    expect(res.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns no results when the search is declined", async () => {
    create.mockResolvedValue({ stop_reason: "refusal", content: [] });

    const res = await search("something odd");

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it("explains a rejected API key instead of crashing", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    create.mockRejectedValue(new Anthropic.AuthenticationError("bad key"));

    const res = await search("heal");

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toMatch(/API key was rejected/);
  });
});
