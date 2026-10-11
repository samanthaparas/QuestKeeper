// Tests for open5eMappers.js. Each test feeds in a small, made-up Open5e
// entry shaped like the real ones and checks that QuestKeeper gets back the
// SRD-shaped data it expects. No internet is needed.

import { describe, it, expect } from "vitest";
import {
  slugify,
  toParagraphs,
  splitChildIndex,
  mapOpen5eRaces,
  mapOpen5eSubraces,
  getOpen5eSubraceRefsForSrdRace,
  findOpen5eTrait,
  mapOpen5eBackgrounds,
  mapOpen5eSubclasses,
  getOpen5eSubclassRefsForClass,
  findOpen5eFeature,
  mergeByName,
} from "./open5eMappers.js";
import { isOpen5eId } from "./open5eClient.js";

const catfolk = {
  key: "toh_catfolk",
  name: "Catfolk",
  is_subspecies: false,
  subspecies_of: null,
  desc: "Your catfolk character has the following traits.",
  traits: [
    { name: "Ability Score Increase", desc: "Your Dexterity score increases by 2." },
    { name: "Speed", desc: "Your base walking speed is 30 feet." },
    { name: "Size", desc: "Your size is Medium" },
    { name: "Languages", desc: "You can speak, read, and write Common." },
    { name: "Darkvision", desc: "You can see in dim light within 60 feet." },
    { name: "Cat's Claws", desc: "Your claws are natural weapons.\n\nThey deal 1d4." },
  ],
};

const malkin = {
  key: "toh_malkin",
  name: "Malkin",
  is_subspecies: true,
  subspecies_of: { key: "toh_catfolk", name: "Catfolk" },
  desc: "",
  traits: [
    { name: "Ability Score Increase", desc: "Your Intelligence score increases by 1." },
    { name: "Curiously Clever", desc: "You have proficiency in Investigation." },
  ],
};

const stoor = {
  key: "open5e_stoor-halfling",
  name: "Stoor Halfling",
  is_subspecies: true,
  subspecies_of: { key: "srd_halfling", name: "Halfling" },
  desc: "",
  traits: [{ name: "Stoor Hardiness", desc: "Resistance to poison damage." }],
};

// Not in the hand-checked table, so it must never appear.
const shade = {
  key: "toh_shade",
  name: "Shade",
  is_subspecies: false,
  traits: [],
};

const species = [catfolk, malkin, stoor, shade];

describe("helpers", () => {
  it("turns names into IDs", () => {
    expect(slugify("Cat's Claws")).toBe("cats-claws");
    expect(slugify("Up, Over, and In")).toBe("up-over-and-in");
  });

  it("splits text on blank lines", () => {
    expect(toParagraphs("One.\n\nTwo.\n  \nThree.")).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
    expect(toParagraphs(undefined)).toEqual([]);
  });

  it("splits parent.child IDs at the first dot", () => {
    expect(splitChildIndex("toh_catfolk.cats-claws")).toEqual({
      parentKey: "toh_catfolk",
      childKey: "cats-claws",
    });
    expect(splitChildIndex("toh_catfolk")).toEqual({
      parentKey: "toh_catfolk",
      childKey: null,
    });
  });

  it("tells Open5e IDs from SRD IDs", () => {
    expect(isOpen5eId("toh_catfolk")).toBe(true);
    expect(isOpen5eId("tdcs_runechild.tdcs_runechild_glyphs")).toBe(true);
    expect(isOpen5eId("open5e_stoor-halfling")).toBe(true);
    expect(isOpen5eId("half-elf")).toBe(false);
    // A book QuestKeeper doesn't use is not treated as Open5e content.
    expect(isOpen5eId("a5e-ag_marshal")).toBe(false);
    expect(isOpen5eId(undefined)).toBe(false);
  });

  it("merges lists alphabetically", () => {
    const merged = mergeByName(
      [{ index: "elf", name: "Elf" }],
      [{ index: "toh_catfolk", name: "Catfolk" }],
    );
    expect(merged.map((entry) => entry.name)).toEqual(["Catfolk", "Elf"]);
  });
});

describe("races", () => {
  const [race] = mapOpen5eRaces(species);

  it("only returns hand-checked main races", () => {
    expect(mapOpen5eRaces(species).map((entry) => entry.index)).toEqual([
      "toh_catfolk",
    ]);
  });

  it("uses the hand-checked numbers", () => {
    expect(race.speed).toBe(30);
    expect(race.size).toBe("Medium");
    expect(race.ability_bonuses).toEqual([
      { ability_score: { index: "dex", name: "DEX" }, bonus: 2 },
    ]);
    expect(race.ability_bonus_options).toBeNull();
    expect(race.languages).toEqual([{ name: "Common" }]);
    expect(race.source).toBe("Tome of Heroes");
  });

  it("keeps facts like Speed out of the trait list and includes trait text", () => {
    expect(race.traits.map((trait) => trait.name)).toEqual([
      "Darkvision",
      "Cat's Claws",
    ]);
    expect(race.traitDetails[1]).toEqual({
      index: "toh_catfolk.cats-claws",
      name: "Cat's Claws",
      desc: ["Your claws are natural weapons.", "They deal 1d4."],
    });
  });

  it("lists the race's subraces", () => {
    expect(race.subraces.map((subrace) => subrace.index)).toEqual([
      "toh_malkin",
    ]);
  });

  it("writes ability choices the way the SRD does", () => {
    const [gearforged] = mapOpen5eRaces([
      { key: "toh_gearforged", name: "Gearforged", is_subspecies: false, traits: [] },
    ]);
    expect(gearforged.ability_bonus_options.choose).toBe(2);
    expect(gearforged.ability_bonus_options.from.options).toHaveLength(6);
    expect(gearforged.ability_bonus_options.from.options[0]).toMatchObject({
      ability_score: { name: "STR" },
      bonus: 1,
    });
    expect(gearforged.dm_note).toMatch(/check with your DM/);
  });
});

describe("subraces", () => {
  it("maps subraces with their race and bonuses", () => {
    const subraces = mapOpen5eSubraces(species);
    const malkinResult = subraces.find((entry) => entry.index === "toh_malkin");

    expect(malkinResult.race).toEqual({ index: "toh_catfolk", name: "Catfolk" });
    expect(malkinResult.ability_bonuses).toEqual([
      { ability_score: { index: "int", name: "INT" }, bonus: 1 },
    ]);
    expect(malkinResult.racial_traits.map((trait) => trait.name)).toEqual([
      "Curiously Clever",
    ]);
  });

  it("points subraces of SRD races at the SRD's own ID", () => {
    const stoorResult = mapOpen5eSubraces(species).find(
      (entry) => entry.index === "open5e_stoor-halfling",
    );
    expect(stoorResult.race.index).toBe("halfling");
    expect(getOpen5eSubraceRefsForSrdRace(species, "halfling")).toEqual([
      {
        index: "open5e_stoor-halfling",
        name: "Stoor Halfling",
        source: "Open5e Originals",
        source_key: "open5e",
      },
    ]);
  });
});

describe("traits", () => {
  it("finds a race trait by its parent.trait ID", () => {
    const trait = findOpen5eTrait(species, "toh_catfolk.darkvision");
    expect(trait.name).toBe("Darkvision");
    expect(trait.races).toEqual([{ index: "toh_catfolk", name: "Catfolk" }]);
    expect(trait.subraces).toEqual([]);
  });

  it("finds a subrace trait", () => {
    const trait = findOpen5eTrait(species, "toh_malkin.curiously-clever");
    expect(trait.subraces).toEqual([{ index: "toh_malkin", name: "Malkin" }]);
  });

  it("returns null for unknown traits", () => {
    expect(findOpen5eTrait(species, "toh_catfolk.flying")).toBeNull();
    expect(findOpen5eTrait(species, "toh_shade.anything")).toBeNull();
  });
});

describe("backgrounds", () => {
  const innkeeper = {
    key: "toh_innkeeper",
    name: "Innkeeper",
    desc: "You ran an inn.",
    benefits: [
      { type: "equipment", name: "Equipment", desc: "A dagger and 20 gp" },
      { type: "feature", name: "I Know Someone", desc: "You know people." },
      { type: "skill_proficiency", name: "Skill Proficiencies", desc: "Insight plus one" },
    ],
  };
  const duplicateScoundrel = {
    key: "open5e_scoundrel",
    name: "Scoundrel",
    benefits: [],
  };

  const backgrounds = mapOpen5eBackgrounds([innkeeper, duplicateScoundrel]);

  it("skips backgrounds that aren't hand-checked", () => {
    expect(backgrounds.map((entry) => entry.index)).toEqual(["toh_innkeeper"]);
  });

  it("maps skills, the skill choice and languages", () => {
    const [background] = backgrounds;
    expect(background.starting_proficiencies).toEqual([
      { index: "skill-insight", name: "Skill: Insight" },
    ]);
    expect(background.skill_choice).toEqual({
      choose: 1,
      options: [
        { index: "intimidation", name: "Intimidation" },
        { index: "persuasion", name: "Persuasion" },
      ],
    });
    expect(background.language_options).toEqual({ choose: 2 });
  });

  it("keeps gear as text and the feature in SRD shape", () => {
    const [background] = backgrounds;
    expect(background.starting_equipment).toEqual([]);
    expect(background.equipment_description).toBe("A dagger and 20 gp");
    expect(background.feature).toEqual({
      name: "I Know Someone",
      desc: ["You know people."],
    });
  });
});

describe("subclasses", () => {
  const catBurglar = {
    key: "toh_cat-burglar",
    name: "Cat Burglar",
    subclass_of: { key: "srd_rogue", name: "Rogue" },
    desc: "Sneaky.\n\nVery sneaky.",
    features: [
      {
        key: "toh_cat-burglar_cats-eye",
        name: "Cat's Eye",
        desc: "Advantage on Perception.",
        gained_at: [{ level: 9 }],
      },
      {
        key: "toh_cat-burglar_artful-dodger",
        name: "Artful Dodger",
        desc: "Dodge traps.",
        gained_at: [{ level: 3 }, { level: 7 }],
      },
    ],
  };
  const noFeatures = {
    key: "toh_path-of-hellfire",
    name: "Path of Hellfire",
    subclass_of: { key: "srd_barbarian", name: "Barbarian" },
    desc: "",
    features: [],
  };
  const for2024Rules = {
    key: "open5e_example",
    name: "Example",
    subclass_of: { key: "srd-2024_wizard", name: "Wizard" },
    desc: "",
    features: [{ key: "x", name: "X", desc: "", gained_at: [{ level: 3 }] }],
  };
  const baseClass = { key: "srd_rogue", name: "Rogue", subclass_of: null, features: [] };

  const classes = [catBurglar, noFeatures, for2024Rules, baseClass];
  const subclasses = mapOpen5eSubclasses(classes);

  it("keeps only 2014 SRD-class subclasses that have features", () => {
    expect(subclasses.map((entry) => entry.index)).toEqual(["toh_cat-burglar"]);
  });

  it("maps a subclass in the SRD's shape", () => {
    const [subclass] = subclasses;
    expect(subclass.class).toEqual({ index: "rogue", name: "Rogue" });
    expect(subclass.subclass_flavor).toBe("Roguish Archetype");
    expect(subclass.desc).toEqual(["Sneaky.", "Very sneaky."]);
    expect(subclass.source).toBe("Tome of Heroes");
  });

  it("orders features by the level they're first gained", () => {
    const [subclass] = subclasses;
    expect(subclass.features.map((feature) => [feature.name, feature.level])).toEqual([
      ["Artful Dodger", 3],
      ["Cat's Eye", 9],
    ]);
  });

  it("lists subclasses for a class and finds a feature", () => {
    expect(getOpen5eSubclassRefsForClass(classes, "rogue")).toEqual([
      {
        index: "toh_cat-burglar",
        name: "Cat Burglar",
        source: "Tome of Heroes",
        source_key: "toh",
      },
    ]);
    expect(getOpen5eSubclassRefsForClass(classes, "wizard")).toEqual([]);

    const feature = findOpen5eFeature(
      classes,
      "toh_cat-burglar.toh_cat-burglar_cats-eye",
    );
    expect(feature).toMatchObject({
      name: "Cat's Eye",
      level: 9,
      subclass: { index: "toh_cat-burglar", name: "Cat Burglar" },
      desc: ["Advantage on Perception."],
    });
    expect(findOpen5eFeature(classes, "toh_cat-burglar.nope")).toBeNull();
  });
});
