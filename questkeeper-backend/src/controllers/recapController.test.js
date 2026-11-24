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

// Who may use the AI is checked in aiAccess (tested on its own); here every
// request is let through, counted against its address, unless a test says no.
const access = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock("../utils/aiAccess.js", async (importOriginal) => ({
  ...(await importOriginal()),
  aiAccess: access,
}));

const { writeRecap, resetRecap } = await import("./recapController.js");

const ENTRIES = [
  { author: "DM", text: "The bridge collapsed." },
  { author: "Pippa", text: "I caught the rope." },
];

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

async function recap(body, ip = "1.2.3.4") {
  const res = fakeResponse();
  await writeRecap({ body, ip }, res);
  return res;
}

const answer = (recapText) => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text: JSON.stringify({ recap: recapText }) }],
});

beforeEach(() => {
  access.check.mockReset().mockImplementation(async (req) => ({ ok: true, key: req.ip }));
  resetRecap();
  create.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/recap", () => {
  it("asks Claude with the shared notes and returns the recap", async () => {
    create.mockResolvedValue(answer("Pippa caught the rope as the bridge fell."));

    const res = await recap({ sessionNumber: 4, entries: ENTRIES });

    expect(res.statusCode).toBe(200);
    expect(res.body.recap).toBe("Pippa caught the rope as the bridge fell.");
    const sent = create.mock.calls[0][0];
    expect(sent.messages[0].content).toContain("[Pippa] I caught the rope.");
    expect(sent.messages[0].content).toContain("Session 4");
  });

  it("needs a session and some notes", async () => {
    expect((await recap({ entries: ENTRIES })).statusCode).toBe(400);
    expect((await recap({ sessionNumber: 2, entries: [] })).statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("says so when no key is set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await recap({ sessionNumber: 1, entries: ENTRIES });
    expect(res.statusCode).toBe(503);
    expect(res.body.message).toMatch(/aren't set up/);
  });

  it("passes on a note when the notes hold nothing that happened", async () => {
    create.mockResolvedValue(answer(""));
    const res = await recap({ sessionNumber: 1, entries: ENTRIES });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ recap: "", message: expect.stringMatching(/don't say what happened/) });
  });

  it("fails softly when the answer is unusable or Claude errors", async () => {
    create.mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "text", text: "nope" }] });
    expect((await recap({ sessionNumber: 1, entries: ENTRIES })).statusCode).toBe(502);

    create.mockRejectedValue(new Error("boom"));
    expect((await recap({ sessionNumber: 1, entries: ENTRIES })).statusCode).toBe(500);
  });

  it("needs a signed-in player", async () => {
    access.check.mockResolvedValue({ ok: false, status: 401, message: "Sign in to use this." });
    const res = fakeResponse();
    await writeRecap({ body: { sessionNumber: 1, entries: ENTRIES }, ip: "1.2.3.4", headers: {} }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Sign in to use this.");
    expect(create).not.toHaveBeenCalled();
    expect(access.check).toHaveBeenCalledWith(expect.anything(), { requireLogin: true });
  });

  it("limits how often one visitor can ask", async () => {
    create.mockResolvedValue(answer("A recap."));
    for (let n = 0; n < 10; n += 1) {
      expect((await recap({ sessionNumber: 1, entries: ENTRIES }, "9.9.9.9")).statusCode).toBe(200);
    }
    expect((await recap({ sessionNumber: 1, entries: ENTRIES }, "9.9.9.9")).statusCode).toBe(429);
  });
});
