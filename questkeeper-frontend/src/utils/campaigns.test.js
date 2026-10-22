import { describe, it, expect } from "vitest";
import {
  campaignLabel,
  campaignNumbers,
  campaignOf,
  campaignShortName,
  describeNotes,
  fromDateTimeInput,
  inWindow,
  sessionLabel,
  suggestOlderNotes,
  toDateTimeInput,
} from "./campaigns";

const note = (created_at, extra = {}) => ({ id: created_at, created_at, ...extra });

describe("names and labels", () => {
  it("falls back to Campaign N, and shows a name when there is one", () => {
    expect(campaignLabel({}, 2)).toBe("Campaign 2");
    expect(campaignLabel({ 1: "The first campaign" }, 1)).toBe("Campaign 1: The first campaign");
    expect(campaignLabel({ 2: "   " }, 2)).toBe("Campaign 2");
    expect(campaignShortName({ 2: "Two Years Later" }, 2)).toBe("Two Years Later");
    expect(campaignShortName({}, 3)).toBe("Campaign 3");
  });

  it("treats notes without a campaign as Campaign 1", () => {
    expect(campaignOf({})).toBe(1);
    expect(campaignOf({ campaign_number: 3 })).toBe(3);
  });

  it("labels sessions as campaign.session only when there are several campaigns", () => {
    expect(sessionLabel(1, 17, true)).toBe("1.17");
    expect(sessionLabel(1, 17, false)).toBe("17");
  });
});

describe("campaignNumbers", () => {
  it("lists every campaign newest first, and always the current one", () => {
    expect(campaignNumbers([{ campaign_number: 1 }, { campaign_number: 2 }, {}], 2)).toEqual([2, 1]);
    expect(campaignNumbers([], 3)).toEqual([3]);
  });
});

describe("inWindow", () => {
  it("counts notes inside the window, with either end open", () => {
    const entry = note("2026-10-22T20:00:00Z");
    expect(inWindow(entry, "2026-10-22T19:00:00Z", "2026-10-22T21:00:00Z")).toBe(true);
    expect(inWindow(entry, "2026-10-22T20:30:00Z", null)).toBe(false);
    expect(inWindow(entry, null, "2026-10-22T19:00:00Z")).toBe(false);
    expect(inWindow(entry, null, null)).toBe(true);
  });
});

describe("describeNotes", () => {
  it("says how many, by whom, when and which sessions", () => {
    const group = describeNotes([
      note("2026-10-22T19:00:00Z", { author_name: "Ash", session_number: 3 }),
      note("2026-10-22T20:00:00Z", { author_name: "Ash", session_number: 5 }),
      note("2026-10-22T19:30:00Z", { author_name: "DM", session_number: 4 }),
    ]);
    expect(group).toMatchObject({
      count: 3,
      writers: [{ name: "Ash", count: 2 }, { name: "DM", count: 1 }],
      first: "2026-10-22T19:00:00Z",
      last: "2026-10-22T20:00:00Z",
      firstSession: 3,
      lastSession: 5,
    });
    expect(describeNotes([])).toMatchObject({ count: 0, first: null, firstSession: null });
  });
});

describe("suggestOlderNotes", () => {
  // Game-night notes on different days, then one person typing in a whole old campaign in one evening.
  const gameNights = [
    note("2026-10-05T01:00:00Z", { author_name: "DM" }),
    note("2026-10-12T01:00:00Z", { author_name: "Pippa" }),
    note("2026-10-19T01:00:00Z", { author_name: "DM" }),
  ];
  const batch = Array.from({ length: 15 }, (_, index) =>
    note(new Date(Date.UTC(2026, 9, 23, 0, 22 + index * 5)).toISOString(), { author_name: "Ash Moonshade" }),
  );

  it("spots a batch typed in all at once, even though it is the newest", () => {
    const suggestion = suggestOlderNotes([...gameNights, ...batch]);
    expect(suggestion).toMatchObject({ kind: "batch", count: 15, writer: "Ash Moonshade" });
    expect(suggestion.from).toBe(batch[0].created_at);
    expect(suggestion.until).toBe(batch.at(-1).created_at);
    expect(suggestion.minutes).toBe(70);
  });

  it("falls back to a long quiet stretch, with everything before it as the older campaign", () => {
    const entries = [
      note("2024-03-01T20:00:00Z"),
      note("2024-03-08T20:00:00Z"),
      note("2026-02-02T20:00:00Z"),
    ];
    const suggestion = suggestOlderNotes(entries);
    expect(suggestion).toMatchObject({ kind: "gap", from: null, until: "2024-03-08T20:00:00Z", count: 2 });
    expect(suggestion.gapDays).toBeGreaterThan(600);
  });

  it("suggests nothing for notes that run along evenly, or too few", () => {
    const weekly = Array.from({ length: 6 }, (_, index) => note(new Date(2026, 0, 1 + index * 7).toISOString()));
    expect(suggestOlderNotes(weekly)).toBeNull();
    expect(suggestOlderNotes([])).toBeNull();
  });
});

describe("date-and-time boxes", () => {
  it("round-trips a moment in the person's own time zone", () => {
    expect(toDateTimeInput(fromDateTimeInput("2026-10-22T19:22"))).toBe("2026-10-22T19:22");
    expect(fromDateTimeInput("")).toBeNull();
    expect(fromDateTimeInput("nonsense")).toBeNull();
  });

  it("can include the whole minute typed", () => {
    const start = new Date(fromDateTimeInput("2026-10-22T20:34")).getTime();
    const end = new Date(fromDateTimeInput("2026-10-22T20:34", { endOfMinute: true })).getTime();
    expect(end - start).toBe(59_999);
  });
});
