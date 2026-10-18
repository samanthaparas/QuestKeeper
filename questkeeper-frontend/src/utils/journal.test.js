import { describe, it, expect } from "vitest";
import { formatStamp, groupBySession, wasEdited, readSessionNumber, sessionChoices } from "./journal";

const entry = (id, session, created_at, extra = {}) => ({
  id,
  session_number: session,
  created_at,
  updated_at: created_at,
  ...extra,
});

describe("journal helpers", () => {
  it("groups notes by session, newest session first, newest note first inside", () => {
    const groups = groupBySession([
      entry("b", 1, "2026-10-12T02:10:00Z"),
      entry("c", 2, "2026-10-19T01:00:00Z"),
      entry("a", 1, "2026-10-12T01:00:00Z"),
    ]);

    expect(groups.map((group) => group.session)).toEqual([2, 1]);
    expect(groups[1].entries.map((note) => note.id)).toEqual(["b", "a"]);
    expect(groups[1].startedAt).toBe("2026-10-12T01:00:00Z");
  });

  it("writes a short day and time", () => {
    // A Monday evening, read in the test's own time zone.
    const local = new Date(2026, 9, 19, 20, 42);
    expect(formatStamp(local)).toBe("Mon 8:42 pm");
  });

  it("only calls a note edited when it changed after the first minute", () => {
    expect(wasEdited(entry("a", 1, "2026-10-19T01:00:00Z", { updated_at: "2026-10-19T01:00:30Z" }))).toBe(false);
    expect(wasEdited(entry("a", 1, "2026-10-19T01:00:00Z", { updated_at: "2026-10-19T01:05:00Z" }))).toBe(true);
  });
});

describe("readSessionNumber", () => {
  it("reads a whole number from 1 to 9999", () => {
    expect(readSessionNumber("41")).toEqual({ value: 41 });
    expect(readSessionNumber(" 7 ")).toEqual({ value: 7 });
    expect(readSessionNumber("9999")).toEqual({ value: 9999 });
  });

  it("says what's wrong, in plain words", () => {
    expect(readSessionNumber("0").error).toMatch(/whole number from 1 to 9999/);
    expect(readSessionNumber("2.5").error).toMatch(/whole number/);
    expect(readSessionNumber("10000").error).toMatch(/whole number/);
    expect(readSessionNumber("").error).toMatch(/Type a session number/);
  });

  it("treats a blank as the current session when that's allowed", () => {
    expect(readSessionNumber("", { allowBlank: true })).toEqual({ value: null });
  });
});

describe("sessionChoices", () => {
  it("counts each session's notes, newest session first, and always lists the current one", () => {
    const entries = [{ session_number: 1 }, { session_number: 1 }, { session_number: 3 }];
    expect(sessionChoices(entries, 5)).toEqual([
      { session: 5, count: 0 },
      { session: 3, count: 1 },
      { session: 1, count: 2 },
    ]);
  });
});

