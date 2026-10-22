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

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Is this note inside the window? A missing from / until means "no limit".
export function inWindow(entry, from, until) {
  const time = new Date(entry.created_at).getTime();
  return (!from || time >= new Date(from).getTime()) && (!until || time <= new Date(until).getTime());
}

const byTime = (a, b) => new Date(a.created_at) - new Date(b.created_at);

// A short description of a group of notes, so the person can tell which
// campaign it is: how many, who wrote them, when, and which sessions.
export function describeNotes(entries) {
  const sorted = [...entries].sort(byTime);
  const writers = new Map();
  for (const entry of sorted) writers.set(entry.author_name, (writers.get(entry.author_name) ?? 0) + 1);
  const sessions = sorted.map((entry) => entry.session_number ?? 1);
  return {
    count: sorted.length,
    writers: [...writers.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    first: sorted[0]?.created_at ?? null,
    last: sorted.at(-1)?.created_at ?? null,
    firstSession: sessions.length ? Math.min(...sessions) : null,
    lastSession: sessions.length ? Math.max(...sessions) : null,
  };
}

// A guess at which notes are the older campaign, from how they were written:
//  - "batch": five or more notes by one person typed in within a short time
//    (each less than 45 minutes after the last), which looks like an old
//    campaign being entered all at once, and
//  - "gap": otherwise, a quiet stretch of two weeks or more, with everything
//    before it being the older campaign.
// Returns { kind, from, until, count, writer, minutes?, gapDays? } or null.
// It's only a suggestion: the person checks it against what's in each group.
export function suggestOlderNotes(entries) {
  const sorted = [...entries].sort(byTime);

  let best = null;
  const writers = [...new Set(sorted.map((entry) => entry.author_name))];
  for (const writer of writers) {
    const mine = sorted.filter((entry) => entry.author_name === writer);
    let cluster = [];
    const finish = () => {
      if (cluster.length >= 5 && (!best || cluster.length > best.length)) best = cluster;
      cluster = [];
    };
    for (const entry of mine) {
      const previous = cluster.at(-1);
      if (previous && new Date(entry.created_at) - new Date(previous.created_at) > 45 * MINUTE_MS) finish();
      cluster.push(entry);
    }
    finish();
  }
  if (best) {
    return {
      kind: "batch",
      from: best[0].created_at,
      until: best.at(-1).created_at,
      count: best.length,
      writer: best[0].author_name,
      minutes: Math.max(1, Math.round((new Date(best.at(-1).created_at) - new Date(best[0].created_at)) / MINUTE_MS)),
    };
  }

  let gap = null;
  for (let index = 1; index < sorted.length; index += 1) {
    const size = new Date(sorted[index].created_at) - new Date(sorted[index - 1].created_at);
    if (!gap || size > gap.size) gap = { size, last: sorted[index - 1], first: sorted[index] };
  }
  if (gap && gap.size >= 14 * DAY_MS) {
    return {
      kind: "gap",
      from: null,
      until: gap.last.created_at,
      count: sorted.filter((entry) => new Date(entry.created_at) <= new Date(gap.last.created_at)).length,
      writer: null,
      gapDays: Math.round(gap.size / DAY_MS),
    };
  }
  return null;
}

// A date-and-time box's value as a time the database understands, or null
// when it's empty. endOfMinute: include the whole minute typed (a note written
// at 8:34:40 counts as "until 8:34").
export function fromDateTimeInput(text, { endOfMinute = false } = {}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(text ?? ""));
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const when = new Date(year, month - 1, day, hour, minute, endOfMinute ? 59 : 0, endOfMinute ? 999 : 0);
  return Number.isNaN(when.getTime()) ? null : when.toISOString();
}
