import { describe, it, expect } from "vitest";
import {
  normalizeItemName,
  findSrdMatches,
  formatSpellDetails,
  formatFeatDetails,
  formatMagicItemDetails,
  formatEquipmentDetails,
  preferEdition,
  createSrdNameLookup,
} from "./srdDetails";
describe("normalizeItemName", () => {
  it("ignores capitals and extra spaces", () => {
    expect(normalizeItemName("  Fire   Bolt ")).toBe("fire bolt");
  });

  it("drops a trailing quantity like x20", () => {
    expect(normalizeItemName("Arrows x20")).toBe("arrows");
  });

  it("treats curly and straight apostrophes the same", () => {
    expect(normalizeItemName("Explorer’s Pack")).toBe("explorer's pack");
  });

  it("returns an empty string for a missing name", () => {
    expect(normalizeItemName(undefined)).toBe("");
  });
});

describe("findSrdMatches", () => {
  const entries = [
    { index: "grappler", name: "Grappler", edition: "2014" },
    { index: "grappler", name: "Grappler", edition: "2024" },
    { index: "alert", name: "Alert", edition: "2024" },
  ];

  it("matches regardless of capitals and spacing", () => {
    expect(findSrdMatches(" alert ", entries)).toEqual([entries[2]]);
  });

  it("returns every edition that has the name", () => {
    expect(findSrdMatches("Grappler", entries)).toHaveLength(2);
  });

  it("does not match partial names", () => {
    expect(findSrdMatches("Grapple", entries)).toEqual([]);
  });

  it("returns nothing for a blank name", () => {
    expect(findSrdMatches("   ", entries)).toEqual([]);
  });
});

describe("formatSpellDetails", () => {
  const spell = {
    name: "Test Blast",
    level: 3,
    school: { name: "Evocation" },
    casting_time: "1 action",
    range: "150 feet",
    components: ["V", "S", "M"],
    material: "a pinch of ash",
    duration: "Instantaneous",
    concentration: false,
    ritual: false,
    desc: ["First paragraph.", "Second paragraph."],
    higher_level: ["More damage at higher slots."],
  };

  it("labels a leveled spell with its level and school", () => {
    expect(formatSpellDetails(spell).kind).toBe("3rd-level Evocation");
  });

  it("labels a cantrip as a cantrip", () => {
    expect(formatSpellDetails({ ...spell, level: 0 }).kind).toBe(
      "Evocation cantrip",
    );
  });

  it("adds the material to the components", () => {
    expect(formatSpellDetails(spell).facts).toContainEqual({
      label: "Components",
      value: "V, S, M (a pinch of ash)",
    });
  });

  it("prefixes the duration for concentration spells", () => {
    const facts = formatSpellDetails({
      ...spell,
      concentration: true,
      duration: "Up to 1 minute",
    }).facts;

    expect(facts).toContainEqual({
      label: "Duration",
      value: "Concentration, up to 1 minute",
    });
  });

  it("leaves out Ritual when the spell isn't one", () => {
    const labels = formatSpellDetails(spell).facts.map((fact) => fact.label);
    expect(labels).not.toContain("Ritual");
  });

  it("puts the higher-level text after the description", () => {
    expect(formatSpellDetails(spell).paragraphs).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "At Higher Levels. More damage at higher slots.",
    ]);
  });

  it("defaults to the 2014 edition when none is given", () => {
    expect(formatSpellDetails(spell).edition).toBe("2014");
  });
});

describe("formatFeatDetails", () => {
  it("formats a 2014 feat's ability prerequisite", () => {
    const details = formatFeatDetails({
      name: "Grappler",
      edition: "2014",
      prerequisites: [{ ability_score: { name: "STR" }, minimum_score: 13 }],
      desc: ["You gain these benefits:", "- A benefit."],
    });

    expect(details.kind).toBe("Feat");
    expect(details.facts).toEqual([{ label: "Prerequisite", value: "STR 13" }]);
    expect(details.paragraphs).toEqual([
      "You gain these benefits:",
      "- A benefit.",
    ]);
  });

  it("formats a 2024 feat's type, level prerequisite, and bold headings", () => {
    const details = formatFeatDetails({
      name: "Grappler",
      edition: "2024",
      type: "general",
      prerequisites: { minimum_level: 4 },
      prerequisite_options: { desc: "Strength or Dexterity 13+" },
      description: "You gain these benefits.\n**Punch and Grab.** A benefit.",
    });

    expect(details.kind).toBe("General Feat");
    expect(details.facts).toEqual([
      { label: "Prerequisite", value: "Level 4+, Strength or Dexterity 13+" },
    ]);
    expect(details.paragraphs).toEqual([
      "You gain these benefits.",
      "Punch and Grab. A benefit.",
    ]);
  });

  it("turns a hyphenated feat type into words", () => {
    expect(
      formatFeatDetails({ name: "Archery", type: "fighting-style" }).kind,
    ).toBe("Fighting Style Feat");
  });

  it("leaves out Prerequisite when there isn't one", () => {
    expect(
      formatFeatDetails({ name: "Alert", desc: ["A benefit."] }).facts,
    ).toEqual([]);
  });
});

describe("formatMagicItemDetails", () => {
  it("reads a 2014 item's attunement from its first line", () => {
    const details = formatMagicItemDetails({
      name: "Cloak of Testing",
      edition: "2014",
      equipment_category: { name: "Wondrous Items" },
      rarity: { name: "Uncommon" },
      desc: ["Wondrous item, uncommon (requires attunement)", "A benefit."],
    });

    expect(details.kind).toBe("Wondrous Item");
    expect(details.facts).toEqual([
      { label: "Rarity", value: "Uncommon" },
      { label: "Attunement", value: "Required" },
    ]);
    expect(details.paragraphs).toEqual([
      "Wondrous item, uncommon (requires attunement)",
      "A benefit.",
    ]);
  });

  it("splits a 2024 item's description string and reads its attunement flag", () => {
    const details = formatMagicItemDetails({
      name: "Blade of Testing",
      edition: "2024",
      equipment_category: { name: "Weapons" },
      rarity: { name: "Rare" },
      attunement: true,
      desc: "Weapon (Any Melee Weapon)  \n A benefit.",
    });

    expect(details.kind).toBe("Weapon");
    expect(details.facts).toContainEqual({
      label: "Attunement",
      value: "Required",
    });
    expect(details.paragraphs).toEqual([
      "Weapon (Any Melee Weapon)",
      "A benefit.",
    ]);
  });

  it("leaves out Attunement when the item doesn't need it", () => {
    const labels = formatMagicItemDetails({
      name: "Bag of Testing",
      rarity: { name: "Uncommon" },
      desc: ["Wondrous item, uncommon", "A benefit."],
    }).facts.map((fact) => fact.label);

    expect(labels).not.toContain("Attunement");
  });
});

describe("formatEquipmentDetails", () => {
  it("formats a melee weapon's damage, two-handed damage, and properties", () => {
    const details = formatEquipmentDetails({
      name: "Longsword",
      equipment_categories: [
        { index: "weapon", name: "Weapon" },
        { index: "martial-melee-weapons", name: "Martial Melee Weapons" },
      ],
      damage: { damage_dice: "1d8", damage_type: { name: "Slashing" } },
      two_handed_damage: {
        damage_dice: "1d10",
        damage_type: { name: "Slashing" },
      },
      range: { normal: 5 },
      properties: [{ name: "Versatile" }],
      cost: { quantity: 15, unit: "gp" },
      weight: 3,
    });

    expect(details.kind).toBe("Martial Melee Weapon");
    expect(details.facts).toEqual([
      { label: "Damage", value: "1d8 slashing (1d10 two-handed)" },
      { label: "Properties", value: "Versatile" },
      { label: "Cost", value: "15 gp" },
      { label: "Weight", value: "3 lb." },
    ]);
  });

  it("shows a ranged weapon's normal and long range", () => {
    const details = formatEquipmentDetails({
      name: "Longbow",
      range: { normal: 150, long: 600 },
    });

    expect(details.facts).toContainEqual({
      label: "Range",
      value: "150/600 ft.",
    });
  });

  it("uses the thrown range for thrown melee weapons", () => {
    const details = formatEquipmentDetails({
      name: "Dagger",
      range: { normal: 5 },
      throw_range: { normal: 20, long: 60 },
    });

    expect(details.facts).toContainEqual({
      label: "Range",
      value: "20/60 ft.",
    });
  });

  it("formats heavy armor's AC, Strength requirement, and stealth", () => {
    const details = formatEquipmentDetails({
      name: "Chain Mail",
      equipment_categories: [
        { index: "armor", name: "Armor" },
        { index: "heavy-armor", name: "Heavy Armor" },
      ],
      armor_class: { base: 16, dex_bonus: false },
      str_minimum: 13,
      stealth_disadvantage: true,
    });

    expect(details.kind).toBe("Heavy Armor");
    expect(details.facts).toEqual([
      { label: "Armor Class", value: "16" },
      { label: "Strength", value: "Str 13" },
      { label: "Stealth", value: "Disadvantage" },
    ]);
  });

  it("adds the Dex modifier, with a cap for medium armor", () => {
    const light = formatEquipmentDetails({
      name: "Leather Armor",
      armor_class: { base: 11, dex_bonus: true },
    });
    const medium = formatEquipmentDetails({
      name: "Scale Mail",
      armor_class: { base: 14, dex_bonus: true, max_bonus: 2 },
    });

    expect(light.facts).toContainEqual({
      label: "Armor Class",
      value: "11 + Dex modifier",
    });
    expect(medium.facts).toContainEqual({
      label: "Armor Class",
      value: "14 + Dex modifier (max 2)",
    });
  });

  it("shows a shield's AC as a bonus", () => {
    const details = formatEquipmentDetails({
      name: "Shield",
      equipment_categories: [
        { index: "armor", name: "Armor" },
        { index: "shields", name: "Shields" },
      ],
      armor_class: { base: 2, dex_bonus: false },
    });

    expect(details.kind).toBe("Shield");
    expect(details.facts).toContainEqual({ label: "Armor Class", value: "+2" });
  });

  it("lists a pack's contents with quantities", () => {
    const details = formatEquipmentDetails({
      name: "Explorer's Pack",
      contents: [
        { item: { name: "Backpack" }, quantity: 1 },
        { item: { name: "Torch" }, quantity: 10 },
      ],
    });

    expect(details.facts).toContainEqual({
      label: "Contents",
      value: "Backpack, Torch x10",
    });
  });

  it("reads rules text from 2014 special and 2024 description", () => {
    const older = formatEquipmentDetails({
      name: "Net",
      desc: [],
      special: ["A special rule."],
    });
    const newer = formatEquipmentDetails({
      name: "Longbow",
      description: ["A description."],
      mastery: { name: "Slow" },
    });

    expect(older.paragraphs).toEqual(["A special rule."]);
    expect(newer.paragraphs).toEqual(["A description."]);
    expect(newer.facts).toContainEqual({ label: "Mastery", value: "Slow" });
  });

  it("falls back to the general category for gear", () => {
    const older = formatEquipmentDetails({
      name: "Rope",
      equipment_category: { name: "Adventuring Gear" },
      equipment_categories: [
        { index: "adventuring-gear", name: "Adventuring Gear" },
      ],
    });
    const newer = formatEquipmentDetails({
      name: "Rope",
      equipment_categories: [
        { index: "adventuring-gear", name: "Adventuring Gear" },
      ],
    });

    expect(older.kind).toBe("Adventuring Gear");
    expect(newer.kind).toBe("Adventuring Gear");
  });
});

describe("preferEdition", () => {
  const matches = [
    { index: "grappler", name: "Grappler", edition: "2014" },
    { index: "grappler", name: "Grappler", edition: "2024" },
  ];

  it("keeps only the saved edition when it's among the matches", () => {
    expect(preferEdition(matches, "2024")).toEqual([matches[1]]);
  });

  it("keeps every match when no edition was saved", () => {
    expect(preferEdition(matches, undefined)).toEqual(matches);
  });

  it("keeps every match when the saved edition isn't among them", () => {
    expect(preferEdition([matches[0]], "2024")).toEqual([matches[0]]);
  });
});

describe("createSrdNameLookup", () => {
  const entries = [
    { index: "longsword", name: "Longsword", edition: "2014" },
    { index: "longsword", name: "Longsword", edition: "2024" },
    {
      index: "cloak-of-protection",
      name: "Cloak of Protection",
      edition: "2014",
    },
  ];
  const findMatches = createSrdNameLookup(entries);

  it("finds every entry with the same cleaned-up name", () => {
    expect(findMatches("  longsword ")).toEqual([entries[0], entries[1]]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(findMatches("Night Terror Longsword")).toEqual([]);
  });

  it("matches exactly the same names as findSrdMatches", () => {
    for (const name of ["LONGSWORD", "Cloak of Protection x2", "Long", ""]) {
      expect(findMatches(name)).toEqual(findSrdMatches(name, entries));
    }
  });
});
