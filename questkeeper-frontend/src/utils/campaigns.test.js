import { describe, it, expect } from "vitest";
import {
  campaignLabel,
  campaignNumbers,
  campaignOf,
  campaignShortName,
  countSplit,
  sessionLabel,
  startOfDay,
  suggestSplit,
  toDateInput,
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

describe("suggestSplit", () => {
  it("finds the biggest quiet stretch between two notes", () => {
    const entries = [
      note("2024-03-01T20:00:00Z"),
      note("2024-03-08T20:00:00Z"),
      note("2024-03-15T20:00:00Z"),
      note("2026-02-02T20:00:00Z"),
      note("2026-02-09T20:00:00Z"),
    ];
    const split = suggestSplit(entries);
    expect(split.cutoff).toBe("2026-02-02T20:00:00Z");
    expect(split.last.created_at).toBe("2024-03-15T20:00:00Z");
    expect(split.gapDays).toBeGreaterThan(600);
  });

  it("suggests nothing when the notes run along evenly, or there are too few", () => {
    const weekly = Array.from({ length: 8 }, (_, index) => note(new Date(2026, 0, 1 + index * 7).toISOString()));
    expect(suggestSplit(weekly)).toBeNull();
    expect(suggestSplit([note("2026-01-01T00:00:00Z")])).toBeNull();
    expect(suggestSplit([])).toBeNull();
  });
});

describe("countSplit", () => {
  it("counts notes before and from the cutoff", () => {
    const entries = [note("2024-01-01T00:00:00Z"), note("2024-02-01T00:00:00Z"), note("2026-01-01T00:00:00Z")];
    expect(countSplit(entries, "2025-01-01T00:00:00Z")).toEqual({ before: 2, after: 1 });
    expect(countSplit(entries, "2026-01-01T00:00:00Z")).toEqual({ before: 2, after: 1 });
  });
});

describe("date boxes", () => {
  it("round-trips a day in the person's own time zone", () => {
    expect(toDateInput(startOfDay("2026-01-15"))).toBe("2026-01-15");
    expect(startOfDay("")).toBeNull();
    expect(startOfDay("nonsense")).toBeNull();
  });
});
