// Where someone was headed when a page asked them to sign in, so they get
// there afterwards with what they were carrying (a character quiz build, a
// table invite code), even if:
// - they reload the sign-in page, or
// - they sign up, confirm their email in a new tab, and sign in there.
//
// It's kept on this device only (localStorage), for a day, and only ever
// points at QuestKeeper's own pages. A blocked storage (private window)
// just means the tab's own history carries it, as before.

import { findQuizBuild } from "./quizBuild";

const KEY = "qk-continue-after-login";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Only QuestKeeper's own pages ("/characters/new?x=1"), never "//other.site"
// or the sign-in page itself.
// Backslashes, spaces and control characters are refused too: some browsers
// read "/\other.site" as another website.
export function isSafeDestination(path) {
  return (
    typeof path === "string" &&
    path.length <= 500 &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !/[\\\s]/.test(path) &&
    ![...path].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127) &&
    !/^\/login(?=$|[/?#])/.test(path)
  );
}

// Only the few plain values a page passes along (a quiz build's id, a
// table's invite code), never whole objects, so nothing odd is stored or
// handed to a page.
function plainState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const kept = {};
  for (const [key, value] of Object.entries(state).slice(0, 10)) {
    const plain =
      (typeof value === "string" && value.length <= 200) || typeof value === "number" || typeof value === "boolean";
    if (plain) kept[key] = value;
  }
  return Object.keys(kept).length ? kept : null;
}

export function rememberDestination({ from, fromState = null }) {
  if (!isSafeDestination(from)) return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ from, fromState: plainState(fromState), savedAt: Date.now() }),
    );
  } catch {
    // Storage blocked: the tab's history still carries it.
  }
}

// { from, fromState } or null (none, too old, or not one of our pages).
// Anything too old or unusable is removed, so it can't turn up later.
export function readDestination() {
  let saved;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw == null) return null;
    saved = JSON.parse(raw);
  } catch {
    clearDestination();
    return null;
  }
  const age = Date.now() - saved?.savedAt;
  if (!saved || !isSafeDestination(saved.from) || !(age >= 0 && age < MAX_AGE_MS)) {
    clearDestination();
    return null;
  }
  return { from: saved.from, fromState: plainState(saved.fromState) };
}

// For the history state a page hands the sign-in page: the same checks.
export function safeDestination(destination) {
  if (!destination || !isSafeDestination(destination.from)) return null;
  return { from: destination.from, fromState: plainState(destination.fromState) };
}

export function clearDestination() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

// What the destination is, in words, for the sign-in page and the home
// page's "Pick up where you left off". Only things QuestKeeper really does.
export function describeDestination(destination) {
  if (!destination) return null;
  const { from, fromState } = destination;
  const build = findQuizBuild(fromState?.quizBuild);
  if (from.startsWith("/characters/new")) {
    return build
      ? {
          title: `Save your ${build.name}`,
          next: `After you sign in, character creation opens with the ${build.name} from your quiz already filled in.`,
          action: `Continue creating your ${build.name}`,
        }
      : {
          title: "Create a character",
          next: "After you sign in, character creation opens, and the character you make is saved to your account.",
          action: "Continue creating your character",
        };
  }
  if (from.startsWith("/games") || from.startsWith("/tables") || from.startsWith("/dm")) {
    return {
      title: "Join or run a table",
      next: "After you sign in, you'll go straight back to the table page you were opening.",
      action: "Continue to your table",
    };
  }
  if (from.startsWith("/characters")) {
    return {
      title: "Open your characters",
      next: "After you sign in, you'll go straight back to your characters.",
      action: "Continue to your characters",
    };
  }
  if (from.startsWith("/homebrew")) {
    return {
      title: "Open your homebrew",
      next: "After you sign in, you'll go straight back to your homebrew.",
      action: "Continue to your homebrew",
    };
  }
  return {
    title: "Continue where you were",
    next: "After you sign in, you'll go straight back to the page you were opening.",
    action: "Continue where you left off",
  };
}
