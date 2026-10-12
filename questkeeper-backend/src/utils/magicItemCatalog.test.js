// Tests for magicItemCatalog.js, using small made-up items shaped like Open5e's.
import { describe, it, expect } from "vitest";
import {
  buildCatalog,
  getCatalogItem,
  wornSlot,
  isConsumable,
  attunementLimits,
  usefulFor,
  splitVersion,
} from "./magicItemCatalog.js";

const doc = (key) => ({ key });
const item = (overrides) => ({
  key: "srd-2024_x",
  name: "X",
  desc: "",
  category: { name: "Wondrous Item" },
  rarity: { name: "Uncommon" },
  requires_attunement: false,
  attunement_detail: null,
  weapon: null,
  armor: null,
  document: doc("srd-2024"),
  ...overrides,
});

describe("facts from one item", () => {
  it("finds where wondrous items are worn", () => {
    expect(wornSlot(item({ name: "Cloak of Elvenkind" }))).toBe("Shoulders");
    expect(wornSlot(item({ name: "Boots of Speed" }))).toBe("Feet");
    expect(wornSlot(item({ name: "Hat of Disguise" }))).toBe("Head");
    expect(wornSlot(item({ name: "Bag of Holding" }))).toBeNull();
    expect(wornSlot(item({ name: "Ring of Warmth", category: { name: "Ring" } }))).toBe("Ring");
    expect(wornSlot(item({ name: "Shield (+1)", category: { name: "Armor" } }))).toBe("Shield");
    expect(wornSlot(item({ name: "Adamantine Armor (Plate)", category: { name: "Armor" } }))).toBe("Armor");
  });

  it("spots consumables", () => {
    expect(isConsumable(item({ category: { name: "Potion" } }))).toBe(true);
    expect(isConsumable(item({ name: "Dust of Disappearance" }))).toBe(true);
    expect(isConsumable(item({ name: "Gem", desc: "Then it crumbles to dust." }))).toBe(true);
    expect(isConsumable(item({ name: "Bag of Holding" }))).toBe(false);
  });

  it("reads who can attune", () => {
    expect(attunementLimits(item({ attunement_detail: "Requires Attunement by a Cleric, Druid, or Paladin" }))).toMatchObject({
      classes: ["cleric", "druid", "paladin"],
      races: [],
    });
    expect(attunementLimits(item({ attunement_detail: "Requires Attunement by a Dwarf" })).races).toEqual(["dwarf"]);
    expect(attunementLimits(item({ attunement_detail: "Requires Attunement by a creature of good alignment" })).alignments).toEqual(["good"]);
    expect(attunementLimits(item({ attunement_detail: "Requires Attunement by a Spellcaster" })).spellcaster).toBe(true);
    expect(attunementLimits(item({})).classes).toEqual([]);
  });

  it("tags what an item is useful for, or Utility", () => {
    expect(usefulFor(item({ desc: "You regain 2d4 + 2 hit points." }))).toContain("Healing");
    expect(usefulFor(item({ desc: "You become invisible." }))).toContain("Stealth");
    expect(usefulFor(item({ desc: "The boots double your Speed." }))).toContain("Movement");
    expect(usefulFor(item({ desc: "Your Strength changes to a score granted by the belt." }))).toContain("Ability boost");
    expect(usefulFor(item({ desc: "It hums quietly." }))).toEqual(["Utility"]);
  });

  it("splits a version off a name", () => {
    expect(splitVersion("Battleaxe (+1)")).toEqual({ base: "Battleaxe", version: "+1" });
    expect(splitVersion("Bag of Holding")).toEqual({ base: "Bag of Holding", version: null });
  });
});

describe("buildCatalog", () => {
  const items = [
    item({ key: "srd-2024_belt-hill", name: "Belt of Giant Strength (Hill)", rarity: { name: "Rare" }, requires_attunement: true, desc: "Your Strength changes to 21." }),
    item({ key: "srd-2024_belt-storm", name: "Belt of Giant Strength (Storm)", rarity: { name: "Legendary" }, requires_attunement: true, desc: "Your Strength changes to 29." }),
    item({ key: "srd-2024_battleaxe-1", name: "Battleaxe (+1)", category: { name: "Weapon" }, weapon: { name: "Battleaxe" }, desc: "You have a +1 bonus to attack rolls and damage rolls." }),
    item({ key: "srd-2024_dagger-2", name: "Dagger (+2)", category: { name: "Weapon" }, weapon: { name: "Dagger" }, rarity: { name: "Rare" }, desc: "You have a +2 bonus to attack rolls and damage rolls." }),
    item({ key: "srd-2014_potion", name: "Potion of Healing", category: { name: "Potion" }, rarity: { name: "Common" }, document: doc("srd-2014"), desc: "You regain 2d4 + 2 hit points." }),
    item({ key: "a5e_thing", name: "Not Used", document: doc("a5e-ag") }),
  ];
  const catalog = buildCatalog(items);

  it("groups versions and folds plain +N weapons into one entry", () => {
    expect(catalog.map((entry) => entry.name)).toEqual([
      "Belt of Giant Strength",
      "Potion of Healing",
      "Weapon, +1, +2, or +3",
    ]);
    const weapons = catalog.find((entry) => entry.name.startsWith("Weapon"));
    expect(weapons.kinds).toEqual(["Battleaxe", "Dagger"]);
    expect(weapons.rarity).toBe("Uncommon to Rare");
  });

  it("labels the source and edition, and leaves out other books", () => {
    expect(catalog.find((entry) => entry.name === "Potion of Healing")).toMatchObject({
      source: "SRD 5.1",
      edition: "2014",
      type: "Potion",
      consumable: true,
      usefulFor: ["Healing"],
    });
    expect(catalog.find((entry) => entry.name === "Belt of Giant Strength")).toMatchObject({
      source: "SRD 5.2",
      edition: "2024",
      rarity: "Rare to Legendary",
      attunement: true,
      wornSlot: "Waist",
      versions: ["Hill", "Storm"],
    });
  });

  it("returns one entry with each version's text when they differ", () => {
    const belt = catalog.find((entry) => entry.name === "Belt of Giant Strength");
    const detail = getCatalogItem(items, belt.index);
    expect(detail.desc).toBeNull();
    expect(detail.versionDetails.map((v) => v.name)).toEqual([
      "Belt of Giant Strength (Hill)",
      "Belt of Giant Strength (Storm)",
    ]);
    expect(getCatalogItem(items, "mi_nope")).toBeNull();
  });
});
