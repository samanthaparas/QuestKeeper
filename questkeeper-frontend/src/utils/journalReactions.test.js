import { describe, it, expect } from "vitest";
import { describeNames, mostLovedNotes, summarizeReactions, toggleReaction } from "./journalReactions";

const R = (entry_id, user_id, reactor_name, emoji, created_at = "2026-11-09T20:00:00Z") => ({
  entry_id,
  user_id,
  reactor_name,
  emoji,
  created_at,
});

describe("journal reactions", () => {
  it("counts one note's reactions in a fixed order, and marks yours", () => {
    const reactions = [
      R("n1", "ash", "Ash", "😂"),
      R("n1", "me", "Pippa", "❤️", "2026-11-09T21:00:00Z"),
      R("n1", "dm", "DM", "❤️", "2026-11-09T20:30:00Z"),
      R("n2", "ash", "Ash", "👍"),
    ];
    expect(summarizeReactions(reactions, "n1", "me")).toEqual([
      { emoji: "❤️", label: "Love", count: 2, mine: true, names: ["DM", "You"] },
      { emoji: "😂", label: "Funny", count: 1, mine: false, names: ["Ash"] },
    ]);
  });

  it("adds a reaction, and takes it back on the second tap", () => {
    const added = toggleReaction([], { entryId: "n1", emoji: "🎲", userId: "me" });
    expect(summarizeReactions(added, "n1", "me")[0]).toMatchObject({ emoji: "🎲", count: 1, mine: true });
    expect(toggleReaction(added, { entryId: "n1", emoji: "🎲", userId: "me" })).toEqual([]);
  });

  it("never takes back someone else's reaction", () => {
    const theirs = [R("n1", "ash", "Ash", "🎲")];
    expect(toggleReaction(theirs, { entryId: "n1", emoji: "🎲", userId: "me" })).toHaveLength(2);
  });

  it("names who reacted in a short sentence", () => {
    expect(describeNames(["Ash"])).toBe("Ash");
    expect(describeNames(["Ash", "DM"])).toBe("Ash and DM");
    expect(describeNames(["Ash", "DM", "You"])).toBe("Ash, DM and You");
    expect(describeNames(["Ash", "DM", "You", "Rook", "Nova"])).toBe("Ash, DM, You and 2 more");
  });
});

describe("most-loved notes in a session", () => {
  const note = (id, extra = {}) => ({ id, body: `Note ${id}`, visibility: "table", created_at: `2026-11-09T20:0${id}:00Z`, ...extra });
  const react = (entryId, emoji, user) => ({ entry_id: entryId, emoji, user_id: user });

  it("lists the notes with the most reactions, best first, two or more only", () => {
    const entries = [note(1), note(2), note(3), note(4, { visibility: "private" })];
    const reactions = [
      react(1, "👍", "a"),
      react(2, "❤️", "a"), react(2, "❤️", "b"), react(2, "😂", "c"),
      react(3, "🎲", "a"), react(3, "🎲", "b"),
      react(4, "❤️", "a"), react(4, "❤️", "b"), react(4, "❤️", "c"),
    ];
    const loved = mostLovedNotes(entries, reactions);
    expect(loved.map((item) => [item.entry.id, item.total])).toEqual([[2, 3], [3, 2]]);
    expect(loved[0].summary.map((item) => `${item.emoji}${item.count}`)).toEqual(["❤️2", "😂1"]);
  });

  it("is empty when nothing has two reactions", () => {
    expect(mostLovedNotes([note(1)], [react(1, "👍", "a")])).toEqual([]);
  });
});
