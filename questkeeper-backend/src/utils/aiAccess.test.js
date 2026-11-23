import { describe, it, expect, vi } from "vitest";
import { createAiAccess, fallbackOptions, modelFor } from "./aiAccess.js";

const ENV = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public-key" };

// A stand-in for Supabase: this token belongs to Pippa, anything else is refused.
function fakeSupabase() {
  return vi.fn(async (url, options) => {
    const token = options.headers.Authorization.replace("Bearer ", "");
    return token === "pippa-token"
      ? { ok: true, json: async () => ({ id: "user-pippa" }) }
      : { ok: false, json: async () => ({}) };
  });
}

const visitor = (ip = "1.1.1.1") => ({ ip, headers: {} });
const signedIn = (token = "pippa-token") => ({ ip: "2.2.2.2", headers: { authorization: `Bearer ${token}` } });

describe("aiAccess", () => {
  it("asks Supabase who a login token belongs to, and remembers it for a minute", async () => {
    const fetchImpl = fakeSupabase();
    const access = createAiAccess({ env: ENV, fetchImpl });

    const first = await access.check(signedIn(), { requireLogin: true });
    const second = await access.check(signedIn(), { requireLogin: true });

    expect(first).toMatchObject({ ok: true, key: "user:user-pippa" });
    expect(second.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://example.supabase.co/auth/v1/user");
    expect(fetchImpl.mock.calls[0][1].headers.apikey).toBe("public-key");
  });

  it("says to sign in when a login is required and there isn't one (or it's fake)", async () => {
    const access = createAiAccess({ env: ENV, fetchImpl: fakeSupabase() });
    expect(await access.check(visitor(), { requireLogin: true })).toMatchObject({ ok: false, status: 401 });
    expect(await access.check(signedIn("made-up"), { requireLogin: true })).toMatchObject({ ok: false, status: 401 });
  });

  it("says the server isn't set up when it can't check logins at all", async () => {
    const access = createAiAccess({ env: {}, fetchImpl: fakeSupabase() });
    expect(await access.check(signedIn(), { requireLogin: true })).toMatchObject({ ok: false, status: 503 });
  });

  it("lets a visitor try a few times a day, then asks them to sign in", async () => {
    const access = createAiAccess({ env: { ...ENV, AI_ANON_DAILY: "2" }, fetchImpl: fakeSupabase() });
    expect((await access.check(visitor())).ok).toBe(true);
    expect((await access.check(visitor())).ok).toBe(true);
    const third = await access.check(visitor());
    expect(third).toMatchObject({ ok: false, status: 429 });
    expect(third.message).toMatch(/Sign in/);
    // A different visitor is unaffected.
    expect((await access.check(visitor("9.9.9.9"))).ok).toBe(true);
  });

  it("gives a signed-in player a bigger daily allowance", async () => {
    const access = createAiAccess({ env: { ...ENV, AI_USER_DAILY: "3", AI_ANON_DAILY: "1" }, fetchImpl: fakeSupabase() });
    for (let i = 0; i < 3; i += 1) expect((await access.check(signedIn())).ok).toBe(true);
    expect(await access.check(signedIn())).toMatchObject({ ok: false, status: 429 });
  });

  it("stops everyone once the whole site's daily allowance is used", async () => {
    const access = createAiAccess({ env: { ...ENV, AI_GLOBAL_DAILY: "2" }, fetchImpl: fakeSupabase() });
    await access.check(visitor("1.1.1.1"));
    await access.check(visitor("2.2.2.2"));
    expect(await access.check(visitor("3.3.3.3"))).toMatchObject({ ok: false, status: 503 });
    expect(await access.check(signedIn())).toMatchObject({ ok: false, status: 503 });
  });

  it("starts the counts over on a new day", async () => {
    let time = Date.parse("2026-11-23T10:00:00Z");
    const access = createAiAccess({ env: { ...ENV, AI_ANON_DAILY: "1" }, fetchImpl: fakeSupabase(), now: () => time });
    expect((await access.check(visitor())).ok).toBe(true);
    expect((await access.check(visitor())).ok).toBe(false);
    time = Date.parse("2026-11-24T00:05:00Z");
    expect((await access.check(visitor())).ok).toBe(true);
  });

  it("treats a failed or slow Supabase check as signed out, not as an error", async () => {
    const access = createAiAccess({ env: ENV, fetchImpl: vi.fn(async () => { throw new Error("offline"); }) });
    expect(await access.check(signedIn())).toMatchObject({ ok: true, key: "visitor:2.2.2.2" });
  });
});

describe("which model each AI feature uses", () => {
  it("defaults to the current model, and a setting can switch one feature", () => {
    expect(modelFor("search", {})).toBe("claude-opus-5-5");
    expect(modelFor("recap", { AI_RECAP_MODEL: "claude-sonnet-5-5" })).toBe("claude-sonnet-5-5");
    expect(modelFor("search", { AI_RECAP_MODEL: "claude-sonnet-5-5" })).toBe("claude-opus-5-5");
  });

  it("only asks for the safer-model retry on models that support it", () => {
    expect(fallbackOptions("claude-opus-5-5")).toMatchObject({ fallbacks: "default" });
    expect(fallbackOptions("claude-sonnet-5-5")).toMatchObject({ fallbacks: "default" });
    expect(fallbackOptions("claude-haiku-5-5")).toEqual({});
  });
});
