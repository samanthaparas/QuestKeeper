import { describe, it, expect } from "vitest";
import {
  filterMagicItems,
  filtersFromParams,
  filtersToParams,
  activeFilterCount,
  usableByClass,
  attunementLine,
  kindLine,
} from "./magicItemFilters";
import { BOOK_MAGIC_ITEMS } from "./bookMagicItems";

const base = {
  type: "Wondrous Item",
  kinds: [],
  rarities: ["Uncommon"],
  rarity: "Uncommon",
  rarityRank: 1,
  attunement: false,
  attunementLimits: { classes: [], races: [], alignments: [], spellcaster: false },
  wornSlot: null,
  consumable: false,
  usefulFor: ["Utility"],
  source: "SRD 5.1",
};
const items = [
  { ...base, index: "1", name: "Cloak of Elvenkind", wornSlot: "Shoulders", attunement: true, usefulFor: ["Stealth"] },
  { ...base, index: "2", name: "Potion of Healing", type: "Potion", consumable: true, rarities: ["Common"], rarity: "Common", rarityRank: 0, usefulFor: ["Healing"] },
  { ...base, index: "3", name: "Holy Avenger", type: "Weapon", kinds: ["Longsword"], rarities: ["Legendary"], rarity: "Legendary", rarityRank: 4, attunement: true, attunementLimits: { ...base.attunementLimits, classes: ["paladin"] }, usefulFor: ["Damage"] },
  { ...base, index: "4", name: "Shield, +1, +2, or +3", type: "Shield", wornSlot: "Shield", rarities: ["Uncommon", "Rare", "Very Rare"], usefulFor: ["Defense"], source: "SRD 5.2" },
  { ...base, index: "5", name: "Pearl of Power", attunement: true, attunementLimits: { ...base.attunementLimits, spellcaster: true } },
  { ...base, index: "6", name: "Deck of Many Things", source: "Dungeon Master's Guide", sourceGroup: "Official books", consumable: null, usefulFor: [] },
];
const names = (list) => list.map((item) => item.name);

describe("filterMagicItems", () => {
  it("searches by name", () => {
    expect(names(filterMagicItems(items, { q: "cloak" }))).toEqual(["Cloak of Elvenkind"]);
  });

  it("filters by any of the chosen rarities, including items with several", () => {
    expect(names(filterMagicItems(items, { rarity: ["Rare"] }))).toEqual(["Shield, +1, +2, or +3"]);
    expect(filterMagicItems(items, { rarity: ["Common", "Legendary"] })).toHaveLength(2);
  });

  it("filters by type, worn slot and anything worn", () => {
    expect(names(filterMagicItems(items, { type: "Shield" }))).toEqual(["Shield, +1, +2, or +3"]);
    expect(names(filterMagicItems(items, { slot: "Shoulders" }))).toEqual(["Cloak of Elvenkind"]);
    expect(names(filterMagicItems(items, { slot: "worn" }))).toEqual(["Cloak of Elvenkind", "Shield, +1, +2, or +3"]);
  });

  it("shows only or hides consumables (unknown counts as not consumable)", () => {
    expect(names(filterMagicItems(items, { consumable: "only" }))).toEqual(["Potion of Healing"]);
    expect(names(filterMagicItems(items, { consumable: "hide" }))).not.toContain("Potion of Healing");
    expect(names(filterMagicItems(items, { consumable: "hide" }))).toContain("Deck of Many Things");
  });

  it("filters by attunement and by who can use it", () => {
    expect(filterMagicItems(items, { attunement: "none" }).every((item) => !item.attunement)).toBe(true);
    expect(names(filterMagicItems(items, { usableBy: "rogue" }))).not.toContain("Holy Avenger");
    expect(names(filterMagicItems(items, { usableBy: "rogue" }))).not.toContain("Pearl of Power");
    expect(names(filterMagicItems(items, { usableBy: "paladin" }))).toContain("Holy Avenger");
    expect(usableByClass(items[4], "wizard")).toBe(true);
  });

  it("filters by use and by source (book items share one group)", () => {
    expect(names(filterMagicItems(items, { uses: ["Healing", "Stealth"] }))).toEqual(["Cloak of Elvenkind", "Potion of Healing"]);
    expect(names(filterMagicItems(items, { source: "Official books" }))).toEqual(["Deck of Many Things"]);
    expect(names(filterMagicItems(items, { source: "SRD 5.2" }))).toEqual(["Shield, +1, +2, or +3"]);
  });

  it("sorts by name or by rarity", () => {
    expect(names(filterMagicItems(items, { sort: "rarity" }))[0]).toBe("Potion of Healing");
    expect(names(filterMagicItems(items, { sort: "rarity" })).at(-1)).toBe("Holy Avenger");
  });
});

describe("filters in the page address", () => {
  it("round-trips, keeping only what differs from the defaults", () => {
    const filters = { ...filtersFromParams(new URLSearchParams()), rarity: ["Rare", "Legendary"], slot: "worn", attunement: "none" };
    const params = filtersToParams(filters);
    expect(params).toEqual({ rarity: "Rare,Legendary", slot: "worn", attunement: "none" });
    expect(filtersFromParams(new URLSearchParams(params))).toMatchObject({ rarity: ["Rare", "Legendary"], slot: "worn" });
    expect(activeFilterCount(filters)).toBe(3);
  });
});

describe("display lines", () => {
  it("describes attunement in plain words", () => {
    expect(attunementLine(items[0])).toBe("Requires attunement");
    expect(attunementLine(items[2])).toBe("Requires attunement by a Paladin");
    expect(attunementLine({ attunement: true, attunementLimits: { classes: ["cleric", "druid", "paladin"] } })).toBe(
      "Requires attunement by a Cleric, Druid or Paladin",
    );
    expect(attunementLine({ attunement: true, attunementLimits: { alignments: ["good"] } })).toBe("Requires attunement by a good creature");
    expect(attunementLine(items[1])).toBeNull();
  });

  it("names the weapon or armor kind, or summarizes many", () => {
    expect(kindLine(items[2])).toBe("Longsword");
    expect(kindLine({ type: "Weapon", kinds: ["A", "B", "C", "D"] })).toBe("Any of 4 weapons");
    expect(kindLine(items[0])).toBeNull();
  });
});

describe("book magic items", () => {
  it("are facts only, with Wikidot links and the Official books group", () => {
    expect(BOOK_MAGIC_ITEMS.length).toBeGreaterThan(600);
    for (const item of BOOK_MAGIC_ITEMS) {
      expect(item.link_url, item.name).toMatch(/^https:\/\/dnd5e\.wikidot\.com\//);
      expect(item.sourceGroup).toBe("Official books");
      expect(item.desc).toBeUndefined();
    }
    const ids = BOOK_MAGIC_ITEMS.map((item) => item.index);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("works out shields, worn slots and potions from the name and type", () => {
    const byName = (name) => BOOK_MAGIC_ITEMS.find((item) => item.name === name);
    const cloak = BOOK_MAGIC_ITEMS.find((item) => /^Cloak of /.test(item.name));
    expect(cloak.wornSlot).toBe("Shoulders");
    const potion = BOOK_MAGIC_ITEMS.find((item) => item.type === "Potion");
    expect(potion.consumable).toBe(true);
    expect(byName("Deck of Many Things")).toBeUndefined(); // the SRD has it
  });
});
