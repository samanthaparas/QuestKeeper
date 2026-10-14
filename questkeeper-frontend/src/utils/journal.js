// Helpers for the table journal: grouping entries into sessions and the
// little "Mon 8:42 pm" time stamps.

// [{ session, startedAt, entries }], newest session first; entries inside a
// session read top to bottom in the order they were written, like a story.
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
      const sorted = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return { session, startedAt: sorted[0].created_at, entries: sorted };
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
