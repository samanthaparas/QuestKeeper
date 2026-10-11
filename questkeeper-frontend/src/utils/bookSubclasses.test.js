import { describe, it, expect } from "vitest";
import {
  BOOK_SUBCLASSES,
  BOOK_CLASSES,
  getBookSubclassRefs,
  findBookSubclass,
  findBookClass,
  listBookClasses,
} from "./bookSubclasses";
import { OFFICIAL_BOOKS_GROUP } from "./bookBackgrounds";
import { mapClassToPanel, mapSubclassToPanel } from "./srdDetails";

describe("bookSubclasses", () => {
  it("lists 115 subclasses and 2 classes, each with a book and a Wikidot link", () => {
    expect(BOOK_SUBCLASSES).toHaveLength(115);
    expect(BOOK_CLASSES.map((entry) => entry.name)).toEqual(["Artificer", "Blood Hunter"]);
    for (const entry of [...BOOK_SUBCLASSES, ...BOOK_CLASSES]) {
      expect(entry.index, entry.name).toMatch(/^book_/);
      expect(entry.book, entry.name).toBeTruthy();
      expect(entry.link_url, entry.name).toMatch(/^https:\/\/dnd5e\.wikidot\.com\/[a-z-]+(:[a-z-]+)?$/);
    }
  });

  it("uses unique IDs, even for names shared across classes", () => {
    const ids = BOOK_SUBCLASSES.map((entry) => entry.index);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findBookSubclass("book_barbarian-path-of-wild-magic")).toBeTruthy();
    expect(findBookSubclass("book_sorcerer-wild-magic")).toBeTruthy();
  });

  it("leaves out the SRD's own subclasses and playtest material", () => {
    const names = BOOK_SUBCLASSES.map((entry) => entry.name);
    for (const srd of ["Thief", "Champion", "Life Domain", "School of Evocation"]) {
      expect(names).not.toContain(srd);
    }
    expect(names).not.toContain("Fate Domain");
    expect(names).not.toContain("Circle of the Primeval");
    expect(BOOK_SUBCLASSES.some((entry) => /unearthed/i.test(entry.book))).toBe(false);
  });

  it("keeps summaries short and includes no features", () => {
    for (const entry of BOOK_SUBCLASSES) {
      expect(entry.summary.split(/(?<=\.)\s+/), entry.name).toHaveLength(2);
      expect(entry.features).toEqual([]);
    }
  });

  it("labels Blood Hunter as Matthew Mercer's, not a WotC book", () => {
    expect(findBookClass("book_blood-hunter").book).toMatch(/Matthew Mercer/);
    expect(getBookSubclassRefs("blood-hunter")).toHaveLength(4);
  });

  it("only lets subclasses of SRD classes become homebrew", () => {
    expect(findBookSubclass("book_rogue-swashbuckler").can_make_homebrew).toBe(true);
    expect(findBookSubclass("book_artificer-armorer").can_make_homebrew).toBe(false);
    expect(findBookSubclass("book_blood-hunter-order-of-the-lycan").can_make_homebrew).toBe(false);
  });

  it("lists book subclasses per class, with hover previews in the Official books group", () => {
    const rogue = getBookSubclassRefs("rogue");
    expect(rogue.map((ref) => ref.name)).toContain("Swashbuckler");
    expect(rogue[0]).toMatchObject({ sourceGroup: OFFICIAL_BOOKS_GROUP });
    expect(rogue[0].preview).toBeTruthy();
    expect(listBookClasses()[0]).toMatchObject({ name: "Artificer", tagline: "Magical inventor and tinkerer" });
  });

  it("shows book classes and subclasses as summary-and-link panels", () => {
    const artificer = mapClassToPanel(findBookClass("book_artificer"));
    expect(artificer.bookEntry).toMatchObject({ category: "class", book: "Tasha's Cauldron of Everything" });
    expect(artificer.subclassGroups[0].items.map((item) => item.name)).toEqual([
      "Alchemist",
      "Armorer",
      "Artillerist",
      "Battle Smith",
    ]);

    const twilight = mapSubclassToPanel(findBookSubclass("book_cleric-twilight-domain"));
    expect(twilight.bookEntry).toMatchObject({
      category: "subclass",
      classIndex: "cleric",
      className: "Cleric",
      canMakeHomebrew: true,
    });
  });
});
