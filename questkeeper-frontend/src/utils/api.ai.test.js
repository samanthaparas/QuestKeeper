// The AI helpers send the player's sign-in token, so the server can tell who
// is asking (and refuse signed-out recaps and summaries).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./homebrewCache", () => ({ loadHomebrew: vi.fn() }));
const session = vi.hoisted(() => ({ current: null }));
vi.mock("./supabaseClient", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: session.current } }) } },
}));

import { searchByMeaning, summarizeForGroup, writeRecapFromNotes } from "./api";

describe("AI helpers and the sign-in token", () => {
  beforeEach(() => {
    session.current = null;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ results: [], summary: "", recap: "" }) })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the token when signed in, for all three", async () => {
    session.current = { access_token: "abc123" };
    await searchByMeaning("heal my friend");
    await summarizeForGroup({ category: "feat", name: "X", text: "y".repeat(30) });
    await writeRecapFromNotes({ sessionNumber: 1, entries: [{ author: "DM", text: "hi" }] });

    for (const [, options] of fetch.mock.calls) {
      expect(options.headers.Authorization).toBe("Bearer abc123");
    }
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("sends no token when signed out, and still works", async () => {
    await searchByMeaning("heal my friend");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("shows the server's message when it says no", async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Sign in to use this." }) });
    const result = await writeRecapFromNotes({ sessionNumber: 1, entries: [] });
    expect(result).toEqual({ recap: "", message: "Sign in to use this." });
  });
});
