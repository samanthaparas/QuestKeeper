import { describe, it, expect } from "vitest";
import { BOOK_FEATS, listBookFeats, findBookFeat } from "./bookFeats";
import { BOOK_RACES } from "./bookRaces";
import { BOOK_BACKGROUNDS, OFFICIAL_BOOKS_GROUP, isBookEntryId } from "./bookBackgrounds";
import { mapFeatToPanel } from "./srdDetails";

describe("bookFeats", () => {
  it("gives every feat a book and a Wikidot link, and no rules", () => {
    expect(BOOK_FEATS.length).toBeGreaterThan(60);
    for (const feat of BOOK_FEATS) {
      expect(isBookEntryId(feat.index)).toBe(true);
      expect(feat.book).toBeTruthy();
      expect(feat.link_url, feat.name).toMatch(/^https:\/\/dnd5e\.wikidot\.com\/feat:[a-z-]+$/);
      expect(feat.prerequisite).toBeUndefined();
      expect(feat.desc).toBeUndefined();
    }
  });

  it("never shares an ID with a book race or background, or repeats a name", () => {
    const others = new Set([...BOOK_RACES, ...BOOK_BACKGROUNDS].map((entry) => entry.index));
    const ids = BOOK_FEATS.map((feat) => feat.index);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => others.has(id))).toEqual([]);
    const names = BOOK_FEATS.map((feat) => feat.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps summaries to a vibe and a 'Good for' line (two sentences)", () => {
    for (const feat of BOOK_FEATS) {
      expect(feat.summary.split(/(?<=\.)\s+/), feat.name).toHaveLength(2);
    }
  });

  it("leaves out Grappler, which the SRD already has in full", () => {
    expect(BOOK_FEATS.find((feat) => feat.name === "Grappler")).toBeUndefined();
  });

  it("lists them in the Official books group with a hover preview", () => {
    const lucky = listBookFeats().find((feat) => feat.name === "Lucky");
    expect(lucky).toMatchObject({ source: "Player's Handbook (2014)", sourceGroup: OFFICIAL_BOOKS_GROUP });
    expect(lucky.preview).toMatch(/dice/);
    expect(findBookFeat(lucky.index).name).toBe("Lucky");
  });

  it("shows as a book entry in the detail panel, with a way to make it homebrew", () => {
    const panel = mapFeatToPanel(findBookFeat("book_feat_lucky"));
    expect(panel).toMatchObject({ category: "Feat", bookEntry: { category: "feat", name: "Lucky" } });
  });
});

describe("mapFeatToPanel for SRD feats", () => {
  it("shows the prerequisite and the text", () => {
    const panel = mapFeatToPanel({
      name: "Grappler",
      source: "SRD 5.1",
      edition: "2014",
      prerequisites: [{ ability_score: { name: "STR" }, minimum_score: 13 }],
      desc: ["You can hold on tight."],
    });
    expect(panel).toMatchObject({ category: "Feat", edition: "2014", prerequisite: "STR 13" });
    expect(panel.blocks).toHaveLength(1);
  });
});
