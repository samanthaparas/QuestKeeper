import { describe, it, expect } from "vitest";
import { dedupeEntries, entryKey } from "./browseList";

describe("browse list identity", () => {
  const toh = { index: "toh_minotaur", name: "Minotaur", category: "Race", source: "Tome of Heroes" };
  const book = {
    index: "book_minotaur",
    name: "Minotaur",
    category: "Race",
    source: "Mordenkainen Presents: Monsters of the Multiverse",
    sourceGroup: "Official books",
  };

  it("keeps different entries that share a name", () => {
    expect(dedupeEntries([toh, book])).toEqual([toh, book]);
    expect(entryKey(toh)).not.toBe(entryKey(book));
  });

  it("drops only exact repeats of the same entry", () => {
    expect(dedupeEntries([toh, { ...toh }, book])).toEqual([toh, book]);
  });

  it("tells 2014 and 2024 versions of the same id apart", () => {
    const old = { index: "acolyte", name: "Acolyte", category: "Background", edition: "2014" };
    const updated = { ...old, edition: "2024" };
    expect(dedupeEntries([old, updated])).toHaveLength(2);
  });
});
