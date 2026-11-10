import { describe, it, expect } from "vitest";
import { describeNames, summarizeReactions, toggleReaction } from "./journalReactions";

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
