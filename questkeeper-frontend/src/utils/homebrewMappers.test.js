import { describe, it, expect } from "vitest";
import {
  cleanHomebrewData,
  toHomebrewIndex,
  isHomebrewId,
  toHomebrewRace,
  toHomebrewSubrace,
  toHomebrewBackground,
  toHomebrewSubclass,
  getHomebrewSubraceRefs,
  getHomebrewSubclassRefs,
  findHomebrew,
  findHomebrewTrait,
  findHomebrewFeature,
  listHomebrew,
} from "./homebrewMappers";
import {
  mapRaceToSnapshot,
  mapSubraceToSnapshot,
  mapBackgroundToSnapshot,
  mapSubclassToSnapshot,
} from "./characterSnapshots";
import {
  mapRaceToPanel,
  mapBackgroundToPanel,
  mapSubclassToPanel,
} from "./srdDetails";

const owl = {
  id: "r1",
  category: "race",
  name: "Owlfolk",
  based_on: "Our table",
  summary: "Feathered scholars.",
  is_shared: true,
  data: {
    speed: 30,
    size: "Small",
    abilityBonuses: { wis: 2 },
    abilityChoice: { choose: 1, bonus: 1, from: ["int", "dex"] },
    languages: ["Common", "Auran"],
    languageChoices: 1,
    traits: [{ name: "Night Eyes", description: "See in the dark.\n\nUp to 60 feet." }],
  },
};

const snowy = {
  id: "s1",
  category: "subrace",
  name: "Snowy Owlfolk",
  data: {
    parentRace: "hb_r1",
    parentRaceName: "Owlfolk",
    abilityBonuses: { con: 1 },
    traits: [{ name: "Cold Feathers", description: "Shrug off the cold." }],
  },
};

const highElfCousin = {
  id: "s2",
  category: "subrace",
  name: "Moon Elf",
  data: { parentRace: "elf", parentRaceName: "Elf", abilityBonuses: { cha: 1 } },
};

const tavernHand = {
  id: "b1",
  category: "background",
  name: "Tavern Hand",
  summary: "You worked the bar.",
  data: {
    skills: ["insight"],
    skillChoice: { choose: 1, from: ["persuasion", "deception"] },
    languages: ["Dwarvish"],
    languageChoices: 1,
    tools: "Brewer's supplies",
    equipment: "An apron and 10 gp",
    feature: { name: "Regulars", description: "Locals tell you rumors." },
  },
};

const twilight = {
  id: "c1",
  category: "subclass",
  name: "Dusk Domain",
  summary: "Clerics of the evening.",
  data: {
    parentClass: "cleric",
    features: [
      { name: "Steps of Night", level: 6, description: "Fly in dim light." },
      { name: "Dusk Sight", level: 1, description: "See in the dark." },
    ],
  },
};

const all = [owl, snowy, highElfCousin, tavernHand, twilight];

describe("IDs", () => {
  it("prefixes homebrew IDs so they can't clash with SRD or Open5e ones", () => {
    expect(toHomebrewIndex("r1")).toBe("hb_r1");
    expect(isHomebrewId("hb_r1.night-eyes")).toBe(true);
    expect(isHomebrewId("elf")).toBe(false);
    expect(isHomebrewId("toh_catfolk")).toBe(false);
    expect(isHomebrewId(undefined)).toBe(false);
  });
});

describe("cleanHomebrewData", () => {
  it("fills in safe defaults for an empty race", () => {
    expect(cleanHomebrewData("race", {})).toEqual({
      speed: 30,
      size: "Medium",
      abilityBonuses: {},
      abilityChoice: null,
      languages: [],
      languageChoices: 0,
      traits: [],
    });
  });

  it("keeps numbers in range and drops junk", () => {
    const data = cleanHomebrewData("race", {
      speed: "999",
      size: "Gargantuan",
      abilityBonuses: { str: 9, dex: 0, luck: 2, wis: "1" },
      abilityChoice: { choose: 5, bonus: 1, from: ["str", "str", "dex", "luck"] },
      languages: [" Common ", "Common", ""],
      traits: [{ name: "  " }, { name: "Tough", description: "Hard to hurt." }],
    });

    expect(data.speed).toBe(120);
    expect(data.size).toBe("Medium");
    expect(data.abilityBonuses).toEqual({ str: 3, wis: 1 });
    // Can't choose more abilities than are on offer.
    expect(data.abilityChoice).toEqual({ choose: 2, bonus: 1, from: ["str", "dex"] });
    expect(data.languages).toEqual(["Common"]);
    expect(data.traits).toEqual([{ name: "Tough", description: "Hard to hurt." }]);
  });

  it("drops a pick of zero", () => {
    expect(
      cleanHomebrewData("race", { abilityChoice: { choose: 0, from: ["str"] } })
        .abilityChoice,
    ).toBeNull();
  });

  it("keeps only real skills for backgrounds", () => {
    const data = cleanHomebrewData("background", {
      skills: ["insight", "juggling"],
      skillChoice: { choose: 3, from: ["stealth"] },
    });
    expect(data.skills).toEqual(["insight"]);
    expect(data.skillChoice).toEqual({ choose: 1, from: ["stealth"] });
  });

  it("orders subclass features by level and rejects unknown classes", () => {
    const data = cleanHomebrewData("subclass", twilight.data);
    expect(data.features.map((feature) => feature.level)).toEqual([1, 6]);
    expect(cleanHomebrewData("subclass", { parentClass: "artificer" }).parentClass).toBe("");
  });
});

describe("races", () => {
  const race = toHomebrewRace(owl, all);

  it("uses the SRD race shape with a Homebrew source", () => {
    expect(race).toMatchObject({
      index: "hb_r1",
      name: "Owlfolk",
      source: "Homebrew",
      based_on: "Our table",
      speed: 30,
      size: "Small",
      ability_bonuses: [{ ability_score: { index: "wis", name: "WIS" }, bonus: 2 }],
      languages: [{ name: "Common" }, { name: "Auran" }],
      language_options: { choose: 1 },
    });
    expect(race.ability_bonus_options.from.options).toHaveLength(2);
  });

  it("includes trait text and its homebrew subraces", () => {
    expect(race.traitDetails).toEqual([
      { index: "hb_r1.night-eyes", name: "Night Eyes", desc: ["See in the dark.", "Up to 60 feet."] },
    ]);
    expect(race.subraces.map((subrace) => subrace.name)).toEqual(["Snowy Owlfolk"]);
  });

  it("works with the existing snapshot and detail panel", () => {
    expect(mapRaceToSnapshot(race)).toMatchObject({
      id: "hb_r1",
      source: "Homebrew",
      speed: 30,
      abilityScoreIncreases: { wisdom: 2 },
      abilityScoreChoice: { choose: 1 },
    });
    expect(mapRaceToPanel(race)).toMatchObject({
      source: "Homebrew",
      abilityBonuses: "WIS +2, plus +1 to 1 other abilities of your choice (INT or DEX)",
      languages: "Common, Auran, plus 1 of your choice",
    });
  });
});

describe("subraces", () => {
  it("adds homebrew subraces to SRD races too", () => {
    expect(getHomebrewSubraceRefs(all, "elf")).toEqual([
      { index: "hb_s2", name: "Moon Elf", source: "Homebrew" },
    ]);
  });

  it("works with the existing subrace snapshot", () => {
    expect(mapSubraceToSnapshot(toHomebrewSubrace(snowy))).toMatchObject({
      id: "hb_s1",
      source: "Homebrew",
      abilityScoreIncreases: { constitution: 1 },
      traits: ["Cold Feathers"],
    });
  });
});

describe("backgrounds", () => {
  const background = toHomebrewBackground(tavernHand);

  it("works with the existing snapshot (skills, pick, languages, gear)", () => {
    expect(mapBackgroundToSnapshot(background)).toMatchObject({
      id: "hb_b1",
      source: "Homebrew",
      skillProficiencies: [{ index: "insight", name: "Insight" }],
      skillChoice: { choose: 1 },
      languages: ["Dwarvish"],
      feature: "Regulars",
      equipmentDescription: "An apron and 10 gp",
      toolProficiencies: "Brewer's supplies",
    });
  });

  it("works with the existing detail panel", () => {
    expect(mapBackgroundToPanel(background)).toMatchObject({
      skillChoice: "Choose 1: Persuasion or Deception",
      languages: "Dwarvish, plus 1 of your choice",
      featureName: "Regulars",
    });
  });

  it("has no feature when the name is blank", () => {
    const plain = toHomebrewBackground({ ...tavernHand, data: { skills: [] } });
    expect(plain.feature).toBeNull();
  });
});

describe("subclasses", () => {
  const subclass = toHomebrewSubclass(twilight);

  it("uses the class's subclass wording and orders features by level", () => {
    expect(subclass.subclass_flavor).toBe("Divine Domain");
    expect(subclass.class).toEqual({ index: "cleric", name: "Cleric" });
    expect(subclass.features.map((feature) => [feature.name, feature.level])).toEqual([
      ["Dusk Sight", 1],
      ["Steps of Night", 6],
    ]);
  });

  it("works with the existing snapshot and panel", () => {
    expect(mapSubclassToSnapshot(subclass)).toEqual({
      id: "hb_c1",
      name: "Dusk Domain",
      source: "Homebrew",
      flavor: "Divine Domain",
    });
    expect(mapSubclassToPanel(subclass).description).toBe("Clerics of the evening.");
  });

  it("lists homebrew subclasses for a class", () => {
    expect(getHomebrewSubclassRefs(all, "cleric").map((ref) => ref.name)).toEqual([
      "Dusk Domain",
    ]);
    expect(getHomebrewSubclassRefs(all, "rogue")).toEqual([]);
  });
});

describe("lookups", () => {
  it("finds any entry by ID, converted for its category", () => {
    expect(findHomebrew(all, "hb_b1").name).toBe("Tavern Hand");
    expect(findHomebrew(all, "hb_c1").subclass_flavor).toBe("Divine Domain");
    expect(findHomebrew(all, "hb_nope")).toBeNull();
  });

  it("finds race and subrace traits", () => {
    expect(findHomebrewTrait(all, "hb_r1.night-eyes")).toMatchObject({
      name: "Night Eyes",
      races: [{ index: "hb_r1", name: "Owlfolk" }],
      subraces: [],
    });
    expect(findHomebrewTrait(all, "hb_s1.cold-feathers").subraces).toEqual([
      { index: "hb_s1", name: "Snowy Owlfolk" },
    ]);
    expect(findHomebrewTrait(all, "hb_r1.flying")).toBeNull();
  });

  it("finds subclass features", () => {
    const [first] = toHomebrewSubclass(twilight).features;
    expect(findHomebrewFeature(all, first.index)).toMatchObject({
      name: "Dusk Sight",
      level: 1,
      subclass: { index: "hb_c1", name: "Dusk Domain" },
    });
  });

  it("lists one category for pickers", () => {
    expect(listHomebrew(all, "subrace").map((item) => item.name)).toEqual([
      "Snowy Owlfolk",
      "Moon Elf",
    ]);
  });
});
