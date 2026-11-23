// Who may use the AI features, and how much, so nobody can run up the bill.
//
//  - Recaps and summaries are for signed-in players only. AI search is open
//    to visitors too (it is the front door), but a signed-out visitor gets only
//    a small daily allowance, then is asked to sign in.
//  - Everyone has a daily allowance, and the whole site has one too, so even a
//    flood of new accounts can't spend without limit.
//  - "Signed in" is checked with Supabase: the browser sends its login token,
//    and Supabase says whose it is (or refuses). Nothing secret is needed here:
//    only the project address and the public key, which are already public.
//
// Counts are kept in the server's memory. A restart starts the day's counts
// over, which is fine as a safety net; set a spend limit in the Anthropic
// console too.

const TOKEN_CACHE_MS = 60 * 1000;
const MAX_CACHED_TOKENS = 1000;
const MAX_COUNTED_KEYS = 20000;

// Models that can retry a declined request on a safer model inside the same
// call. Others (such as Haiku) leave the option out, or the request is refused.
const FALLBACK_MODELS = /^claude-(opus-5|fable-5|mythos-5|sonnet-5-5)/;

// Which model each feature uses. The default is the current one; set
// AI_SEARCH_MODEL, AI_SUMMARY_MODEL or AI_RECAP_MODEL on the server to use a
// cheaper one without changing any code.
export function modelFor(feature, env = process.env) {
  const names = { search: "AI_SEARCH_MODEL", summary: "AI_SUMMARY_MODEL", recap: "AI_RECAP_MODEL" };
  return (env[names[feature]] || "").trim() || "claude-opus-5-5";
}

// The "retry on a safer model if declined" options, only for models that
// support them.
export function fallbackOptions(model) {
  return FALLBACK_MODELS.test(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {};
}

function numberFrom(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function createAiAccess({ env = process.env, now = Date.now, fetchImpl = (...args) => fetch(...args) } = {}) {
  const tokenCache = new Map();
  let today = "";
  let used = new Map();
  let total = 0;

  function startNewDayIfNeeded() {
    const day = new Date(now()).toISOString().slice(0, 10);
    if (day !== today) {
      today = day;
      used = new Map();
      total = 0;
    }
  }

  // Who the request is from, or null when signed out (or the check isn't set up).
  async function signedInUser(req) {
    const header = String(req.headers?.authorization ?? "");
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_PUBLISHABLE_KEY;
    if (!token || token.length > 4000 || !url || !key) return null;

    const cached = tokenCache.get(token);
    if (cached && now() - cached.at < TOKEN_CACHE_MS) return cached.user;

    try {
      const response = await fetchImpl(`${url.replace(/\/$/, "")}/auth/v1/user`, {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const body = await response.json();
      if (!body?.id) return null;
      if (tokenCache.size >= MAX_CACHED_TOKENS) tokenCache.clear();
      const user = { id: String(body.id) };
      tokenCache.set(token, { user, at: now() });
      return user;
    } catch {
      return null;
    }
  }

  // { ok: true, key } to go ahead (the key is who it counts against), or
  // { ok: false, status, message } to say no.
  async function check(req, { requireLogin = false } = {}) {
    const user = await signedInUser(req);
    if (requireLogin && !user) {
      return env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY
        ? { ok: false, status: 401, message: "Sign in to use this." }
        : { ok: false, status: 503, message: "Sign-in checks aren't set up on the server yet." };
    }

    startNewDayIfNeeded();
    if (total >= numberFrom(env.AI_GLOBAL_DAILY, 1500)) {
      return { ok: false, status: 503, message: "AI is resting for today. Try again tomorrow." };
    }

    const key = user ? `user:${user.id}` : `visitor:${req.ip ?? "unknown"}`;
    const limit = user ? numberFrom(env.AI_USER_DAILY, 100) : numberFrom(env.AI_ANON_DAILY, 5);
    const count = used.get(key) ?? 0;
    if (count >= limit) {
      return {
        ok: false,
        status: 429,
        message: user
          ? "You've used today's AI allowance. It starts again tomorrow."
          : "Sign in to keep using AI search. Visitors get a few a day.",
      };
    }

    if (used.size >= MAX_COUNTED_KEYS) used.clear();
    used.set(key, count + 1);
    total += 1;
    return { ok: true, key };
  }

  // For tests: start with nothing counted or remembered.
  function reset() {
    tokenCache.clear();
    used = new Map();
    total = 0;
    today = "";
  }

  return { check, reset };
}

export const aiAccess = createAiAccess();
