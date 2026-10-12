import { describe, it, expect } from "vitest";
import { BOOK_RACES, listBookRaces, findBookRace } from "./bookRaces";
import { BOOK_BACKGROUNDS, OFFICIAL_BOOKS_GROUP, isBookEntryId } from "./bookBackgrounds";
import { mapRaceToPanel } from "./srdDetails";

describe("bookRaces", () => {
  it("lists all 37 races, each with a book and a Wikidot link", () => {
    expect(BOOK_RACES).toHaveLength(37);
    for (const race of BOOK_RACES) {
      expect(isBookEntryId(race.index)).toBe(true);
      expect(race.book).toBeTruthy();
      expect(race.link_url).toMatch(/^https:\/\/dnd5e\.wikidot\.com\/lineage:[a-z-]+$/);
    }
  });

  it("never shares an ID with a book background", () => {
    const backgroundIds = new Set(BOOK_BACKGROUNDS.map((entry) => entry.index));
    const raceIds = BOOK_RACES.map((race) => race.index);
    expect(new Set(raceIds).size).toBe(raceIds.length);
    expect(raceIds.filter((id) => backgroundIds.has(id))).toEqual([]);
  });

  it("keeps summaries short and includes no rules", () => {
    for (const race of BOOK_RACES) {
      expect(race.summary.split(/(?<=\.)\s+/), race.name).toHaveLength(2);
      expect(race.traits).toEqual([]);
      expect(race.ability_bonuses).toBeUndefined();
      expect(race.speed).toBeUndefined();
    }
  });

  it("lists them with a hover preview in the Official books group", () => {
    const owlin = listBookRaces().find((race) => race.name === "Owlin");
    expect(owlin).toMatchObject({
      index: "book_owlin",
      source: "Strixhaven: A Curriculum of Chaos",
      sourceGroup: OFFICIAL_BOOKS_GROUP,
    });
    expect(owlin.preview).toMatch(/Owl-folk/);
  });

  it("shows only the summary and link in the race panel", () => {
    const panel = mapRaceToPanel(findBookRace("book_minotaur"));
    expect(panel).toMatchObject({
      name: "Minotaur",
      category: "Race",
      bookEntry: {
        category: "race",
        book: "Mordenkainen Presents: Monsters of the Multiverse",
        openVersion: expect.stringMatching(/Tome of Heroes/),
      },
    });
    expect(panel.speed).toBeUndefined();
    expect(findBookRace("book_nope")).toBeNull();
  });

  it("gives every race a short tagline for the list", () => {
    for (const race of BOOK_RACES) {
      expect(race.tagline, race.name).toBeTruthy();
      expect(race.tagline.length, race.name).toBeLessThan(40);
    }
    expect(listBookRaces().find((race) => race.name === "Tabaxi").tagline).toBe(
      "Curious, wandering cat-folk",
    );
  });
});
