// Campaigns: a table can run several campaigns one after another ("season
// 2"), each with its own session numbers. These helpers name them, label
// sessions ("1.17" is campaign 1, session 17), and help the DM find where one
// campaign ended and the next began in a journal where they got mixed.

// A table's notes are Campaign 1 unless sorted otherwise.
export const campaignOf = (entry) => entry.campaign_number ?? 1;

// "Campaign 1: The first campaign" (or just "Campaign 2" without a name).
export function campaignLabel(names, number) {
  const name = String(names?.[String(number)] ?? "").trim();
  return name ? `Campaign ${number}: ${name}` : `Campaign ${number}`;
}

// Just the name, or "Campaign N".
export function campaignShortName(names, number) {
  return String(names?.[String(number)] ?? "").trim() || `Campaign ${number}`;
}

// All the campaign numbers the table has, newest first. current is the
// table's current campaign, which always counts even with no notes yet.
export function campaignNumbers(entries, current = 1) {
  const numbers = new Set([current]);
  for (const entry of entries) numbers.add(campaignOf(entry));
  return [...numbers].sort((a, b) => b - a);
}

// "1.17" when the table has more than one campaign, plain "17" when it has
// one, so a table that never uses campaigns looks exactly as before.
export function sessionLabel(campaign, session, hasSeveral) {
  return hasSeveral ? `${campaign}.${session}` : String(session);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Where a journal most likely switched from one campaign to the next: the
// biggest quiet stretch between two notes, if it's at least two weeks long.
// Returns { cutoff, gapDays, last, first } (last: the note before the gap,
// first: the note after, which is where the new campaign starts) or null.
export function suggestSplit(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let best = null;
  for (let index = 1; index < sorted.length; index += 1) {
    const gap = new Date(sorted[index].created_at) - new Date(sorted[index - 1].created_at);
    if (!best || gap > best.gap) best = { gap, last: sorted[index - 1], first: sorted[index] };
  }
  if (!best || best.gap < 14 * DAY_MS) return null;
  return {
    cutoff: best.first.created_at,
    gapDays: Math.round(best.gap / DAY_MS),
    last: best.last,
    first: best.first,
  };
}

// How many notes would stay before a cutoff and how many would move on.
export function countSplit(entries, cutoff) {
  const time = new Date(cutoff).getTime();
  let before = 0;
  let after = 0;
  for (const entry of entries) {
    if (new Date(entry.created_at).getTime() >= time) after += 1;
    else before += 1;
  }
  return { before, after };
}

// A date picked in a date box ("2026-01-01") as the start of that day, in the
// person's own time zone, as a time the database understands.
export function startOfDay(dateText) {
  const [year, month, day] = String(dateText).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toISOString();
}

// The reverse: a time as the value for a date box.
export function toDateInput(when) {
  const date = new Date(when);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
