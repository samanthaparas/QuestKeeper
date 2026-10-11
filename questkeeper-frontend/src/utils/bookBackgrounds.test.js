import { describe, it, expect } from "vitest";
import {
  BOOK_BACKGROUNDS,
  OFFICIAL_BOOKS_GROUP,
  listBookBackgrounds,
  findBookBackground,
  isBookEntryId,
} from "./bookBackgrounds";
import { mapBackgroundToPanel } from "./srdDetails";
import { getSourceOptions } from "./sourceFilters";

describe("bookBackgrounds", () => {
  it("lists 47 book backgrounds (Acolyte is already in the SRD)", () => {
    expect(BOOK_BACKGROUNDS).toHaveLength(47);
    expect(BOOK_BACKGROUNDS.map((entry) => entry.name)).not.toContain("Acolyte");
  });

  it("gives every entry a unique book_ ID, a book and a Wikidot link", () => {
    const ids = BOOK_BACKGROUNDS.map((entry) => entry.index);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of BOOK_BACKGROUNDS) {
      expect(isBookEntryId(entry.index)).toBe(true);
      expect(entry.book).toBeTruthy();
      expect(entry.link_url).toMatch(/^https:\/\/dnd5e\.wikidot\.com\/background:[a-z-]+$/);
    }
  });

  it("keeps summaries short: two sentences, our own words", () => {
    for (const entry of BOOK_BACKGROUNDS) {
      expect(entry.summary.split(/(?<=\.)\s+/), entry.name).toHaveLength(2);
      expect(entry.summary.length, entry.name).toBeLessThan(200);
    }
  });

  it("points variants at their parent background's page", () => {
    const gladiator = findBookBackground("book_gladiator");
    expect(gladiator.variant_of).toBe("Entertainer");
    expect(gladiator.link_url).toBe(findBookBackground("book_entertainer").link_url);
    expect(findBookBackground("book_investigator-scag").variant_of).toBe("City Watch");
    expect(findBookBackground("book_nope")).toBeNull();
  });

  it("lists them with a hover preview and one filter group", () => {
    const [first] = listBookBackgrounds();
    expect(first).toMatchObject({ sourceGroup: OFFICIAL_BOOKS_GROUP, edition: "2014" });
    expect(first.preview).toBe(BOOK_BACKGROUNDS[0].summary);
    expect(getSourceOptions(listBookBackgrounds())).toEqual([
      { source: OFFICIAL_BOOKS_GROUP, count: 47 },
    ]);
  });

  it("shows only the summary and link in the detail panel", () => {
    const panel = mapBackgroundToPanel(findBookBackground("book_criminal"));
    expect(panel).toMatchObject({
      name: "Criminal",
      source: "Player's Handbook (2014)",
      bookEntry: {
        book: "Player's Handbook (2014)",
        linkUrl: "https://dnd5e.wikidot.com/background:criminal",
        openVersion: expect.stringMatching(/SRD 5.2/),
      },
    });
    expect(panel.startingProficiencies).toBeUndefined();
  });
});
