// Helpers for the table journal: grouping entries into sessions and the
// little "Mon 8:42 pm" time stamps.

// [{ session, startedAt, entries }], newest session first, and the newest
// note first inside each session, so the latest update is always on top.
export function groupBySession(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const session = entry.session_number ?? 1;
    if (!groups.has(session)) groups.set(session, []);
    groups.get(session).push(entry);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([session, list]) => {
      // Newest note first, so the latest update is always at the top. The
      // session's date is still its first note's.
      const newestFirst = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { session, startedAt: newestFirst.at(-1).created_at, entries: newestFirst };
    });
}

// "Mon 8:42 pm"
export function formatStamp(when) {
  const date = new Date(when);
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const time = date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
  return `${day} ${time}`;
}

// "Mon Oct 19"
export function formatDay(when) {
  return new Date(when).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Edited at least a minute after it was written.
export function wasEdited(entry) {
  return new Date(entry.updated_at) - new Date(entry.created_at) > 60_000;
}

// The highest session number a note can be filed under.
export const MAX_SESSION = 9999;

// What was typed in a session box: a whole number from 1 to MAX_SESSION.
// Returns { value } or { error } in plain words. A blank box means "use the
// current session" ({ value: null }) when allowBlank is set.
export function readSessionNumber(text, { allowBlank = false } = {}) {
  const trimmed = String(text ?? "").trim();
  if (trimmed === "") {
    return allowBlank ? { value: null } : { error: "Type a session number, like 12." };
  }
  const number = Number(trimmed);
  if (!Number.isInteger(number) || number < 1 || number > MAX_SESSION) {
    return { error: `A session number is a whole number from 1 to ${MAX_SESSION}.` };
  }
  return { value: number };
}

// The "Look back at" choices: [{ session, count }], newest session first,
// with the table's current session always included.
export function sessionChoices(entries, currentSession) {
  const counts = new Map();
  for (const entry of entries) {
    const session = entry.session_number ?? 1;
    counts.set(session, (counts.get(session) ?? 0) + 1);
  }
  if (!counts.has(currentSession)) counts.set(currentSession, 0);
  return [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([session, count]) => ({ session, count }));
}

