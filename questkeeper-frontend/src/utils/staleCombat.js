// "Still in combat?": a fight left open after the session ended. When a table
// is in combat but nothing has happened in its activity log for a while, the
// DM is reminded to end it (on the DM Screen list and the table's own screen).

// How long a fight can sit with no activity before it looks forgotten. Long
// enough that a dinner break mid-session never triggers it.
export const STALE_COMBAT_MS = 3 * 60 * 60 * 1000;

// lastActivityAt: when the newest activity-log line was written (or null).
export function isStaleCombat(table, lastActivityAt, now = Date.now()) {
  if (!table?.combat_active || !lastActivityAt) return false;
  const last = new Date(lastActivityAt).getTime();
  return Number.isFinite(last) && now - last >= STALE_COMBAT_MS;
}

// "3 hours", "1 day", "6 days": how long it's been quiet, in round words.
export function describeQuiet(lastActivityAt, now = Date.now()) {
  const hours = Math.floor((now - new Date(lastActivityAt).getTime()) / (60 * 60 * 1000));
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
