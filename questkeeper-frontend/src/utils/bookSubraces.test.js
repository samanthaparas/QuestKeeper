import { describe, it, expect } from "vitest";
import { BOOK_SUBRACES, findBookSubrace, getBookSubraceRefs } from "./bookSubraces";
import { mapSubraceToPanel } from "./srdDetails";
import { OFFICIAL_BOOKS_GROUP } from "./bookBackgrounds";

describe("book subraces", () => {
  it("adds the Player's Handbook subraces the SRD leaves out, under their race", () => {
    expect(getBookSubraceRefs("elf").map((ref) => ref.name)).toEqual(["Wood Elf", "Drow"]);
    expect(getBookSubraceRefs("dwarf").map((ref) => ref.name)).toEqual(["Mountain Dwarf"]);
    expect(getBookSubraceRefs("halfling").map((ref) => ref.name)).toEqual(["Stout Halfling"]);
    expect(getBookSubraceRefs("gnome").map((ref) => ref.name)).toEqual(["Forest Gnome"]);
    expect(getBookSubraceRefs("human")).toEqual([]);
  });

  it("lists them in the Official books group, with a preview and a book id", () => {
    expect(getBookSubraceRefs("elf")[0]).toMatchObject({
      index: "book_sub_wood-elf",
      source: "Player's Handbook",
      sourceGroup: OFFICIAL_BOOKS_GROUP,
    });
  });

  it("shows only the summary and link in the subrace panel, never rules", () => {
    const panel = mapSubraceToPanel(findBookSubrace("book_sub_drow"));
    expect(panel).toMatchObject({
      name: "Drow",
      category: "Subrace",
      bookEntry: { category: "subrace", book: "Player's Handbook", linkUrl: "https://dnd5e.wikidot.com/lineage:elf" },
    });
    expect(panel.traits).toBeUndefined();
    expect(findBookSubrace("book_sub_nope")).toBeNull();
  });

  it("keeps summaries and taglines short, in our own words", () => {
    for (const entry of BOOK_SUBRACES) {
      expect(entry.tagline.length, entry.name).toBeLessThan(40);
      expect(entry.summary.length, entry.name).toBeLessThan(200);
    }
  });
});
