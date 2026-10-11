import { describe, it, expect, vi } from "vitest";

vi.mock("./api", () => ({
  getRaceTraits: vi
    .fn()
    .mockResolvedValue([{ index: "infernal-legacy", name: "Infernal Legacy" }]),
  getSubraceTraits: vi.fn(),
  getClassFeatures: vi.fn().mockResolvedValue([
    { index: "divine-sense", name: "Divine Sense" },
    { index: "aura-of-protection", name: "Aura of Protection" },
  ]),
  getSubclassFeatures: vi.fn(),
  getRaceDetails: vi.fn().mockResolvedValue({
    index: "tiefling",
    name: "Tiefling",
    speed: 30,
    size: "Medium",
    size_description: "About the same size as humans.",
    age: "Mature like humans.",
    alignment: "Often chaotic.",
    ability_bonuses: [
      { ability_score: { name: "INT" }, bonus: 1 },
      { ability_score: { name: "CHA" }, bonus: 2 },
    ],
    languages: [{ name: "Common" }, { name: "Infernal" }],
    traits: [{ index: "infernal-legacy", name: "Infernal Legacy" }, { index: "darkvision", name: "Darkvision" }],
    subraces: [],
  }),
  getClassDetails: vi.fn().mockResolvedValue({
    index: "paladin",
    name: "Paladin",
    hit_die: 10,
    saving_throws: [{ name: "WIS" }, { name: "CHA" }],
    proficiencies: [{ name: "All armor" }, { name: "Saving Throw: WIS" }],
    proficiency_choices: [{ desc: "Choose two from Athletics and Insight" }],
    starting_equipment: [{ equipment: { name: "Chain Mail" }, quantity: 1 }],
    subclasses: [{ name: "Devotion" }],
  }),
  getClassLevel: vi.fn().mockResolvedValue({
    features: [{ index: "divine-sense", name: "Divine Sense" }],
    spellcasting: undefined,
  }),
  getEquipmentDetails: vi.fn((index) =>
    index === "mystery"
      ? Promise.reject(new Error("nope"))
      : Promise.resolve({ index, name: index }),
  ),
  getTraitDetails: vi.fn().mockResolvedValue({
    name: "Infernal Legacy",
    desc: ["You know the **thaumaturgy** cantrip."],
  }),
  getFeatureDetails: vi.fn((index) =>
    Promise.resolve(
      index === "divine-sense"
        ? {
            name: "Divine Sense",
            level: 1,
            class: { name: "Paladin" },
            desc: ["Detect fiends.", "|a|b|"],
          }
        : {
            name: "Aura of Protection",
            level: 6,
            class: { name: "Paladin" },
            desc: ["Add Charisma to saves."],
          },
    ),
  ),
}));

import {
  normalizeItemName,
  findSrdMatches,
  formatSpellDetails,
  formatFeatDetails,
  formatMagicItemDetails,
  formatEquipmentDetails,
  preferEdition,
  createSrdNameLookup,
  getEditionTabLabels,
  groupMarkdownTables,
  formatClassFeatureDetails,
  formatTraitDetails,
  descriptionFromSrd,
  buildFeatureChoices,
  loadFeatureEntries,
  loadStartingGear,
  loadRaceDetails,
  mapRaceToPanel,
  loadClassDetails,
  mapClassToPanel,
  describeClassSpellcasting,
  mapSpellToPanel,
  mapSubraceToPanel,
  mapSubclassToPanel,
  mapBackgroundToPanel,
} from "./srdDetails";
import { getRaceDetails, getTraitDetails } from "./api";
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
    expect(formatSpellDetails(spell).blocks).toEqual([
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
    expect(details.blocks).toEqual([
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
    expect(details.blocks).toEqual([
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
    expect(details.blocks).toEqual([
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
    expect(details.blocks).toEqual(["Weapon (Any Melee Weapon)", "A benefit."]);
  });

  it("leaves out Attunement when the item doesn't need it", () => {
    const labels = formatMagicItemDetails({
      name: "Bag of Testing",
      rarity: { name: "Uncommon" },
      desc: ["Wondrous item, uncommon", "A benefit."],
    }).facts.map((fact) => fact.label);

    expect(labels).not.toContain("Attunement");
  });

  it("flags text where sentences run together", () => {
    const details = formatMagicItemDetails({
      name: "Wand of Testing",
      desc: "Wand  \n It crumbles and is destroyed.Wand of Testing Effects1d100",
    });

    expect(details.hasGarbledText).toBe(true);
  });

  it("doesn't flag clean text", () => {
    const details = formatMagicItemDetails({
      name: "Bag of Testing",
      desc: ["Wondrous item, uncommon", "It holds things. It is roomy."],
    });

    expect(details.hasGarbledText).toBe(false);
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

    expect(older.blocks).toEqual(["A special rule."]);
    expect(newer.blocks).toEqual(["A description."]);
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

describe("getEditionTabLabels", () => {
  it("labels each version by its edition", () => {
    expect(
      getEditionTabLabels([{ edition: "2014" }, { edition: "2024" }]),
    ).toEqual(["2014 SRD", "2024 SRD"]);
  });

  it("numbers a second version from the same edition", () => {
    expect(
      getEditionTabLabels([
        { edition: "2014" },
        { edition: "2014" },
        { edition: "2024" },
      ]),
    ).toEqual(["2014 SRD", "2014 SRD (2)", "2024 SRD"]);
  });
});

describe("groupMarkdownTables", () => {
  it("turns a markdown table into a table block between paragraphs", () => {
    expect(
      groupMarkdownTables([
        "Intro.",
        "| d4 | Effect |",
        "|---|---|",
        "| 1 | Sparks. |",
        "| 2-4 | Smoke. |",
        "Outro.",
      ]),
    ).toEqual([
      "Intro.",
      {
        header: ["d4", "Effect"],
        rows: [
          ["1", "Sparks."],
          ["2-4", "Smoke."],
        ],
      },
      "Outro.",
    ]);
  });

  it("keeps two tables separate when text sits between them", () => {
    const blocks = groupMarkdownTables([
      "| A |",
      "|---|",
      "| 1 |",
      "Between.",
      "| B |",
      "|---|",
      "| 2 |",
    ]);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].header).toEqual(["A"]);
    expect(blocks[2].header).toEqual(["B"]);
  });

  it("reads a row that's missing its closing pipe", () => {
    const [table] = groupMarkdownTables([
      "| d6 | Effect |",
      "|---|---|",
      "| 1 | Fog.",
    ]);

    expect(table.rows).toEqual([["1", "Fog."]]);
  });

  it("leaves text with no tables unchanged", () => {
    expect(groupMarkdownTables(["One.", "Two."])).toEqual(["One.", "Two."]);
  });
});

describe("formatClassFeatureDetails", () => {
  it("labels a class feature with its class and level", () => {
    const details = formatClassFeatureDetails({
      name: "Divine Smite",
      class: { name: "Paladin" },
      level: 2,
      desc: ["A benefit."],
    });

    expect(details.kind).toBe("Paladin Feature");
    expect(details.edition).toBe("2014");
    expect(details.facts).toEqual([{ label: "Level", value: "2" }]);
    expect(details.blocks).toEqual(["A benefit."]);
  });

  it("labels a subclass feature with its subclass", () => {
    const details = formatClassFeatureDetails({
      name: "Channel Divinity: Sacred Weapon",
      class: { name: "Paladin" },
      subclass: { name: "Devotion" },
      level: 3,
    });

    expect(details.kind).toBe("Devotion Feature");
  });

  it("lists the options a feature lets you choose", () => {
    const details = formatClassFeatureDetails({
      name: "Fighting Style",
      class: { name: "Paladin" },
      level: 2,
      feature_specific: {
        subfeature_options: {
          from: {
            options: [
              { item: { name: "Fighting Style: Defense" } },
              { item: { name: "Fighting Style: Dueling" } },
            ],
          },
        },
      },
    });

    expect(details.facts).toContainEqual({
      label: "Options",
      value: "Fighting Style: Defense, Fighting Style: Dueling",
    });
  });
});

describe("formatTraitDetails", () => {
  it("names the one race or subrace a trait belongs to", () => {
    const details = formatTraitDetails({
      name: "Elf Weapon Training",
      races: [],
      subraces: [{ name: "High Elf" }],
      proficiencies: [{ name: "Longswords" }, { name: "Shortbows" }],
      desc: ["A benefit."],
    });

    expect(details.kind).toBe("High Elf Trait");
    expect(details.facts).toEqual([
      { label: "Proficiencies", value: "Longswords, Shortbows" },
    ]);
  });

  it("uses a general label for a trait many races share", () => {
    const details = formatTraitDetails({
      name: "Darkvision",
      races: [{ name: "Dwarf" }, { name: "Elf" }, { name: "Tiefling" }],
      subraces: [],
      proficiencies: [],
      desc: ["A benefit."],
    });

    expect(details.kind).toBe("Racial Trait");
    expect(details.facts).toEqual([]);
  });
});

describe("descriptionFromSrd", () => {
  it("joins paragraphs with new lines and strips markdown bold and tables", () => {
    expect(
      descriptionFromSrd([
        "You gain **bold** stuff.",
        "",
        "|a|b|",
        "Second line.",
      ]),
    ).toBe("You gain bold stuff.\nSecond line.");
  });
});

describe("loadFeatureEntries", () => {
  it("gathers racial traits and class features with their levels", async () => {
    const entries = await loadFeatureEntries({
      classId: "paladin",
      raceId: "tiefling",
    });

    expect(
      entries.map((entry) => [entry.name, entry.level, entry.sourceLabel]),
    ).toEqual([
      ["Infernal Legacy", null, "Racial trait"],
      ["Divine Sense", 1, "Paladin"],
      ["Aura of Protection", 6, "Paladin"],
    ]);
    expect(entries[0].description).toBe("You know the thaumaturgy cantrip.");
    expect(entries[1].description).toBe("Detect fiends.");
  });
});

describe("buildFeatureChoices", () => {
  const entries = [
    {
      key: "feature:aura",
      name: "Aura of Protection",
      level: 6,
      order: 2,
      description: "",
    },
    {
      key: "feature:sense",
      name: "Divine Sense",
      level: 1,
      order: 2,
      description: "",
    },
    {
      key: "trait:legacy",
      name: "Infernal Legacy",
      level: null,
      order: 0,
      description: "",
    },
  ];

  it("lists race first, then class by level, and ticks what the character has reached", () => {
    const choices = buildFeatureChoices(entries, 3, []);

    expect(choices.map((choice) => choice.name)).toEqual([
      "Infernal Legacy",
      "Divine Sense",
      "Aura of Protection",
    ]);
    expect(choices.map((choice) => choice.defaultSelected)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("marks features already on the sheet and does not tick them", () => {
    const choices = buildFeatureChoices(entries, 15, ["divine sense"]);
    const sense = choices.find((choice) => choice.name === "Divine Sense");

    expect(sense.alreadyAdded).toBe(true);
    expect(sense.defaultSelected).toBe(false);
  });
});

describe("loadStartingGear", () => {
  it("looks up each item, keeps its quantity, and skips ones that fail", async () => {
    const gear = await loadStartingGear([
      { index: "dagger", quantity: 2 },
      { index: "mystery", quantity: 1 },
      { index: "chain-mail" },
    ]);

    expect(gear).toEqual([
      { index: "dagger", name: "dagger", quantity: 2 },
      { index: "chain-mail", name: "chain-mail", quantity: 1 },
    ]);
  });
});

describe("race detail panel", () => {
  it("loads the full text of every trait and shows languages, age and size", async () => {
    const panel = mapRaceToPanel(await loadRaceDetails("tiefling"));

    expect(panel).toMatchObject({
      name: "Tiefling",
      abilityBonuses: "INT +1, CHA +2",
      languages: "Common, Infernal",
      age: "Mature like humans.",
      sizeDescription: "About the same size as humans.",
    });
    expect(panel.traits[0]).toEqual({
      name: "Infernal Legacy",
      description: "You know the thaumaturgy cantrip.",
    });
  });

  it("mentions the free ability and language picks", () => {
    const panel = mapRaceToPanel({
      name: "Half-Elf",
      ability_bonuses: [{ ability_score: { name: "CHA" }, bonus: 2 }],
      ability_bonus_options: { choose: 2, from: { options: [{ bonus: 1 }] } },
      languages: [{ name: "Common" }, { name: "Elvish" }],
      language_options: { choose: 1 },
    });

    expect(panel.abilityBonuses).toBe("CHA +2, plus +1 to 2 other abilities of your choice");
    expect(panel.languages).toBe("Common, Elvish, plus 1 of your choice");
  });

  it("falls back to trait names when the full text has not loaded", () => {
    const panel = mapRaceToPanel({
      name: "Elf",
      ability_bonuses: [],
      traits: [{ name: "Trance" }],
    });
    expect(panel.traits).toEqual([{ name: "Trance", description: "" }]);
  });
});

describe("Open5e race detail panel", () => {
  const gearforged = {
    index: "toh_gearforged",
    name: "Gearforged",
    source: "Tome of Heroes",
    dm_note: "Check speed with your DM.",
    ability_bonuses: [],
    ability_bonus_options: {
      choose: 2,
      from: {
        options: ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((name) => ({
          ability_score: { name },
          bonus: 1,
        })),
      },
    },
    traitDetails: [{ index: "toh_gearforged.living-construct", name: "Living Construct", desc: ["No food needed."] }],
  };

  it("skips the per-trait lookups when trait text came with the race", async () => {
    getRaceDetails.mockResolvedValueOnce(gearforged);
    getTraitDetails.mockClear();

    const race = await loadRaceDetails("toh_gearforged");

    expect(race).toBe(gearforged);
    expect(getTraitDetails).not.toHaveBeenCalled();
  });

  it("shows the source, the DM note and a choice-only bonus line", () => {
    const panel = mapRaceToPanel(gearforged);

    expect(panel.source).toBe("Tome of Heroes");
    expect(panel.dmNote).toBe("Check speed with your DM.");
    expect(panel.abilityBonuses).toBe("+1 to 2 abilities of your choice");
    expect(panel.traits).toEqual([
      { name: "Living Construct", description: "No food needed." },
    ]);
  });

  it("names the options when only a few abilities are allowed", () => {
    const panel = mapRaceToPanel({
      name: "Erina",
      ability_bonuses: [{ ability_score: { name: "DEX" }, bonus: 2 }],
      ability_bonus_options: {
        choose: 1,
        from: {
          options: [
            { ability_score: { name: "WIS" }, bonus: 1 },
            { ability_score: { name: "CHA" }, bonus: 1 },
          ],
        },
      },
    });
    expect(panel.abilityBonuses).toBe(
      "DEX +2, plus +1 to 1 other abilities of your choice (WIS or CHA)",
    );
  });
});

describe("subrace and subclass panels", () => {
  it("maps a subrace with its source and bonuses", () => {
    expect(
      mapSubraceToPanel({
        name: "Malkin",
        source: "Tome of Heroes",
        desc: "",
        ability_bonuses: [{ ability_score: { name: "INT" }, bonus: 1 }],
        racial_traits: [{ name: "Curiously Clever" }],
      }),
    ).toMatchObject({
      category: "Subrace",
      source: "Tome of Heroes",
      abilityBonuses: "INT +1",
      traits: ["Curiously Clever"],
    });
  });

  it("maps a subclass", () => {
    expect(
      mapSubclassToPanel({
        name: "Cat Burglar",
        source: "Tome of Heroes",
        desc: ["Sneaky.", "Very sneaky."],
        subclass_flavor: "Roguish Archetype",
      }),
    ).toEqual({
      name: "Cat Burglar",
      category: "Subclass",
      source: "Tome of Heroes",
      description: "Sneaky. Very sneaky.",
      flavor: "Roguish Archetype",
    });
  });
});

describe("background detail panel", () => {
  it("shows an SRD background the same way as before", () => {
    const panel = mapBackgroundToPanel({
      name: "Acolyte",
      source: "SRD 5.1",
      starting_proficiencies: [{ name: "Skill: Insight" }],
      language_options: { choose: 2 },
      starting_equipment: [{ equipment: { name: "Holy Symbol" }, quantity: 1 }],
      starting_gold: { quantity: 15, unit: "gp" },
      feature: { name: "Shelter of the Faithful", desc: ["Temples help you."] },
      personality_traits: { choose: 2 },
      ideals: { choose: 1 },
      bonds: { choose: 1 },
      flaws: { choose: 1 },
    });

    expect(panel).toMatchObject({
      startingProficiencies: ["Skill: Insight"],
      languages: "2 of your choice",
      startingEquipment: ["Holy Symbol x1"],
      startingGold: "15 gp",
      featureName: "Shelter of the Faithful",
      featureDescription: "Temples help you.",
      personalityTraits: "Choose 2",
    });
  });

  it("handles an Open5e background with a skill pick and gear as text", () => {
    const panel = mapBackgroundToPanel({
      name: "Crime Syndicate Member",
      source: "Tal'Dorei Campaign Setting",
      starting_proficiencies: [{ name: "Skill: Deception" }],
      skill_choice: {
        choose: 1,
        options: [
          { index: "sleight-of-hand", name: "Sleight of Hand" },
          { index: "stealth", name: "Stealth" },
        ],
      },
      languages: [{ name: "Thieves' Cant" }],
      language_options: { choose: 0 },
      starting_equipment: [],
      equipment_description: "Dark clothes and 10 gp.",
      tool_proficiencies_description: "One of Thieves' Tools or a Disguise Kit.",
      feature: { name: "A Favor In Turn", desc: ["Call in favors."] },
    });

    expect(panel).toMatchObject({
      skillChoice: "Choose 1: Sleight of Hand or Stealth",
      languages: "Thieves' Cant",
      equipmentText: "Dark clothes and 10 gp.",
      tools: "One of Thieves' Tools or a Disguise Kit.",
      startingGold: null,
      personalityTraits: null,
    });
  });
});

describe("class detail panel", () => {
  it("lists level 1 features with their text and hides the duplicate saving throw lines", async () => {
    const panel = mapClassToPanel(await loadClassDetails("paladin"));

    expect(panel.hitDie).toBe("d10");
    expect(panel.proficiencies).toEqual(["All armor"]);
    expect(panel.levelOneFeatures).toEqual([
      { name: "Divine Sense", description: "Detect fiends." },
    ]);
    expect(panel.laterFeatures).toBe("Aura of Protection");
  });

  it("keeps each proficiency choice on its own line", () => {
    const panel = mapClassToPanel({
      name: "Bard",
      hit_die: 8,
      proficiency_choices: [{ desc: "Choose any three" }, { desc: "Three musical instruments of your choice" }],
    });
    expect(panel.skillChoiceLines).toEqual(["Choose any three", "Three musical instruments of your choice"]);
  });
});

describe("describeClassSpellcasting", () => {
  it("is empty for a class that does not cast", () => {
    expect(describeClassSpellcasting({ index: "fighter" })).toBe("");
  });

  it("says spellcasting starts at level 2 for half casters", () => {
    expect(describeClassSpellcasting({ index: "paladin", levelOneSpellcasting: null })).toBe(
      "Casts with Charisma. Spellcasting starts at level 2.",
    );
  });

  it("summarises cantrips, spells known and slots, joined naturally", () => {
    expect(
      describeClassSpellcasting({
        index: "bard",
        levelOneSpellcasting: { cantrips_known: 2, spells_known: 4, spell_slots_level_1: 2 },
      }),
    ).toBe("Casts with Charisma. At level 1: 2 cantrips, 4 spells known and 2 first-level spell slots.");
    expect(
      describeClassSpellcasting({
        index: "wizard",
        levelOneSpellcasting: { cantrips_known: 3, spell_slots_level_1: 2 },
      }),
    ).toBe(
      "Casts with Intelligence. At level 1: 3 cantrips and 2 first-level spell slots. You choose which spells to ready each day.",
    );
  });
});

describe("spell detail panel", () => {
  it("shows every paragraph, the components, concentration and who can cast it", () => {
    const panel = mapSpellToPanel({
      name: "Bless",
      level: 1,
      school: { name: "Enchantment" },
      casting_time: "1 action",
      range: "30 feet",
      components: ["V", "S", "M"],
      material: "A sprinkling of holy water",
      duration: "1 minute",
      concentration: true,
      desc: ["First paragraph.", "Second paragraph."],
      higher_level: ["Choose one more creature per slot level."],
      classes: [{ name: "Cleric" }, { name: "Paladin" }],
    });

    expect(panel.kind).toBe("1st-level Enchantment");
    expect(panel.classes).toBe("Cleric, Paladin");
    expect(panel.facts).toEqual(
      expect.arrayContaining([
        { label: "Components", value: "V, S, M (A sprinkling of holy water)" },
        { label: "Duration", value: "Concentration, 1 minute" },
      ]),
    );
    expect(panel.blocks).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "At Higher Levels. Choose one more creature per slot level.",
    ]);
  });
});
