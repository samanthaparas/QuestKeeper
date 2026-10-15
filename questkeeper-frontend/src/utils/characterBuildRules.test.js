// Character creation rules found in real testing: racial skill choices
// (Half-Elf Skill Versatility) and subclass features (a Shadow Sorcerer was
// given Draconic Bloodline's). The SRD responses are imitated below with the
// same shapes the real API returns.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFeatureChoices, loadFeatureEntries } from "./srdDetails";
import { collectSkills, grantFromTrait, loadRaceSkillGrants, missingRacePicks } from "./skillGrants";
import {
  findStraySubclassFeatures,
  getFeatureSubclassId,
  swapSubclassFeatures,
} from "./featureSources";
import { createFeat } from "./characterSheet";
import { toHomebrewRace } from "./homebrewMappers";
import { getReviewIssues } from "./creationSteps";
import {
  getClassFeatures,
  getFeatureDetails,
  getRaceTraits,
  getSubclassFeatures,
  getTraitDetails,
} from "./api";

vi.mock("./supabaseClient", () => ({ supabase: {} }));
vi.mock("./api", () => ({
  getClassFeatures: vi.fn(),
  getSubclassFeatures: vi.fn(),
  getRaceTraits: vi.fn(),
  getSubraceTraits: vi.fn().mockResolvedValue([]),
  getFeatureDetails: vi.fn(),
  getTraitDetails: vi.fn(),
}));

const skill = (index) => ({ option_type: "reference", item: { index: `skill-${index}`, name: index } });
const ALL_SKILLS = [
  "acrobatics", "animal-handling", "arcana", "athletics", "deception", "history",
  "insight", "intimidation", "investigation", "medicine", "nature", "perception",
  "performance", "persuasion", "religion", "sleight-of-hand", "stealth", "survival",
];

// --- The SRD, as the API returns it -----------------------------------------
const TRAITS = {
  darkvision: { index: "darkvision", name: "Darkvision", proficiencies: [] },
  "fey-ancestry": { index: "fey-ancestry", name: "Fey Ancestry", proficiencies: [] },
  "skill-versatility": {
    index: "skill-versatility",
    name: "Skill Versatility",
    proficiencies: [],
    proficiency_choices: { choose: 2, type: "proficiencies", from: { options: ALL_SKILLS.map(skill) } },
  },
  "keen-senses": { index: "keen-senses", name: "Keen Senses", proficiencies: [{ index: "skill-perception" }] },
  "shadar-kai-trait": { index: "shadar-kai-trait", name: "Blessing of the Raven Queen", proficiencies: [] },
};

// The SRD's Sorcerer feature list includes Draconic Bloodline's features.
const SORCERER_FEATURES = [
  { index: "spellcasting-sorcerer", name: "Spellcasting", level: 1 },
  { index: "sorcerous-origin", name: "Sorcerous Origin", level: 1 },
  { index: "dragon-ancestor", name: "Dragon Ancestor", level: 1, subclass: "draconic" },
  { index: "dragon-ancestor-red", name: "Dragon Ancestor: Red", level: 1, subclass: "draconic", parent: "Dragon Ancestor" },
  { index: "draconic-resilience", name: "Draconic Resilience", level: 1, subclass: "draconic" },
  { index: "font-of-magic", name: "Font of Magic", level: 2 },
  { index: "metamagic-1", name: "Metamagic", level: 3 },
  { index: "metamagic-careful-spell", name: "Metamagic: Careful Spell", level: 3, parent: "Metamagic" },
  { index: "elemental-affinity", name: "Elemental Affinity", level: 6, subclass: "draconic" },
  { index: "dragon-wings", name: "Dragon Wings", level: 14, subclass: "draconic" },
];
const DRACONIC_FEATURES = SORCERER_FEATURES.filter((feature) => feature.subclass === "draconic");

function mockSrd() {
  getClassFeatures.mockImplementation(async (id) =>
    id === "sorcerer" ? SORCERER_FEATURES.map(({ index, name }) => ({ index, name })) : [],
  );
  getSubclassFeatures.mockImplementation(async (id) =>
    // Book subclasses (Shadow Magic) have no features in QuestKeeper.
    id === "draconic" ? DRACONIC_FEATURES.map(({ index, name }) => ({ index, name })) : [],
  );
  getRaceTraits.mockImplementation(async (id) =>
    id === "half-elf"
      ? [{ index: "darkvision" }, { index: "fey-ancestry" }, { index: "skill-versatility" }]
      : id === "shadar-kai"
        ? [{ index: "shadar-kai-trait" }]
        : [],
  );
  getTraitDetails.mockImplementation(async (id) => TRAITS[id]);
  getFeatureDetails.mockImplementation(async (id) => {
    const feature = SORCERER_FEATURES.find((entry) => entry.index === id);
    return {
      index: feature.index,
      name: feature.name,
      level: feature.level,
      desc: [`${feature.name} text.`],
      class: { index: "sorcerer", name: "Sorcerer" },
      ...(feature.subclass ? { subclass: { index: feature.subclass, name: "Draconic" } } : {}),
      ...(feature.parent ? { parent: { name: feature.parent } } : {}),
    };
  });
}

const names = (list) => list.map((entry) => entry.name);
const ticked = (choices) => names(choices.filter((choice) => choice.defaultSelected));

beforeEach(() => {
  vi.clearAllMocks();
  mockSrd();
});

// --- A: Half-Elf Ranger with the Charlatan background -------------------------
describe("A: a level 1 Half-Elf Ranger (Charlatan) gets 7 skills", () => {
  const charlatan = {
    name: "Charlatan",
    skillProficiencies: [
      { index: "deception", name: "Deception" },
      { index: "sleight-of-hand", name: "Sleight of Hand" },
    ],
  };
  const rangerPicks = [
    { index: "stealth", name: "Stealth" },
    { index: "perception", name: "Perception" },
    { index: "survival", name: "Survival" },
  ];

  it("finds Skill Versatility's 2 choices on the race's traits", async () => {
    const grants = await loadRaceSkillGrants({
      raceRaw: { index: "half-elf", name: "Half-Elf", traits: [{ index: "darkvision" }, { index: "fey-ancestry" }, { index: "skill-versatility" }] },
    });

    expect(grants).toEqual([
      expect.objectContaining({ from: "Half-Elf (Skill Versatility)", choose: 2, fixed: [] }),
    ]);
    expect(grants[0].options).toHaveLength(18);
  });

  it("counts Ranger, Charlatan and Half-Elf skills once each", async () => {
    const [versatility] = await loadRaceSkillGrants({
      raceRaw: { index: "half-elf", name: "Half-Elf", traits: [{ index: "skill-versatility" }] },
    });
    const racePicks = {
      [versatility.id]: [
        { index: "persuasion", name: "Persuasion" },
        { index: "insight", name: "Insight" },
      ],
    };

    const skills = collectSkills({
      background: charlatan,
      classSkills: rangerPicks,
      raceGrants: [versatility],
      racePicks,
      className: "Ranger",
    });

    expect(skills).toHaveLength(7);
    expect(new Set(skills.map((entry) => entry.index)).size).toBe(7);
    expect(skills.filter((entry) => entry.from === "Half-Elf (Skill Versatility)").map((entry) => entry.name)).toEqual([
      "Persuasion",
      "Insight",
    ]);
  });

  it("won't let the character be created until the racial picks are made", () => {
    const grant = grantFromTrait(TRAITS["skill-versatility"], "Half-Elf");
    const issues = getReviewIssues({
      steps: ["review"],
      race: { id: "half-elf" },
      characterClass: { name: "Ranger", skillChoice: { choose: 3 } },
      background: charlatan,
      classSkills: rangerPicks,
      raceSkillGaps: missingRacePicks([grant], { [grant.id]: [{ index: "insight" }] }),
      spellChoices: {},
      abilityScores: {},
    });

    expect(issues).toEqual([
      { step: "classSkills", message: "Choose 1 more Half-Elf (Skill Versatility) skill" },
    ]);
  });

  it("also keeps fixed racial skills, like an Elf's Perception", () => {
    const keenSenses = grantFromTrait(TRAITS["keen-senses"], "Elf");
    const skills = collectSkills({ raceGrants: [keenSenses], className: "Wizard" });
    expect(skills).toEqual([{ index: "perception", name: "Perception", from: "Elf (Keen Senses)" }]);
  });
});

// --- B and C: Sorcerer subclasses -------------------------------------------
describe("B: a level 1 Shadar-kai Shadow Sorcerer", () => {
  it("gets Sorcerer and racial features, and nothing from Draconic Bloodline", async () => {
    const entries = await loadFeatureEntries({
      classId: "sorcerer",
      subclassId: "book-shadow-magic",
      raceId: "shadar-kai",
    });
    const choices = buildFeatureChoices(entries, 1, []);

    expect(ticked(choices)).toEqual([
      "Blessing of the Raven Queen",
      "Sorcerous Origin",
      "Spellcasting",
    ]);
    expect(names(choices).some((name) => /Dragon|Draconic/.test(name))).toBe(false);
  });
});

describe("C: a level 1 Draconic Bloodline Sorcerer", () => {
  it("gets Draconic features once each, with the ancestor colour left to choose", async () => {
    const entries = await loadFeatureEntries({ classId: "sorcerer", subclassId: "draconic" });
    const choices = buildFeatureChoices(entries, 1, []);

    expect(ticked(choices)).toEqual([
      "Sorcerous Origin",
      "Spellcasting",
      "Draconic Resilience",
      "Dragon Ancestor",
    ]);
    // Listed (so they can pick theirs) but not ticked.
    expect(choices.find((choice) => choice.name === "Dragon Ancestor: Red")).toMatchObject({
      defaultSelected: false,
      optionOf: "Dragon Ancestor",
    });
    const all = names(choices);
    expect(all.filter((name) => name === "Draconic Resilience")).toHaveLength(1);
    expect(entries.find((entry) => entry.name === "Draconic Resilience").owner).toMatchObject({
      type: "subclass",
      id: "draconic",
    });
  });
});

// --- D: changing subclass ----------------------------------------------------
describe("D: changing a Sorcerer's subclass", () => {
  it("removes only the old subclass's features and adds the new one's", async () => {
    const homebrewWings = { index: "hb-1", name: "Shadow Walk", level: 1 };
    getSubclassFeatures.mockImplementation(async (id) =>
      id === "hb_shadow" ? [homebrewWings] : DRACONIC_FEATURES.map(({ index, name }) => ({ index, name })),
    );
    getFeatureDetails.mockImplementation(async (id) =>
      id === "hb-1"
        ? { index: "hb-1", name: "Shadow Walk", level: 1, desc: ["Step through shadows."], subclass: { index: "hb_shadow", name: "Shadow" } }
        : {
            ...SORCERER_FEATURES.find((entry) => entry.index === id),
            desc: [],
            class: { index: "sorcerer" },
            subclass: { index: "draconic", name: "Draconic" },
          },
    );

    const before = [
      createFeat({ name: "Spellcasting", description: "", source: { type: "class", id: "sorcerer" } }),
      createFeat({ name: "Draconic Resilience", description: "", source: { type: "subclass", id: "draconic" } }),
      createFeat({ name: "Blessing of the Raven Queen", description: "", source: { type: "race", id: "shadar-kai" } }),
      createFeat({ name: "Dragon Resilience notes", description: "My own homebrew note" }),
    ];
    const newEntries = await loadFeatureEntries({ classId: "sorcerer", subclassId: "hb_shadow" });

    const after = swapSubclassFeatures(before, {
      fromSubclassId: "draconic",
      newEntries,
      level: 1,
      makeFeature: createFeat,
    });

    expect(names(after)).toEqual([
      "Spellcasting",
      "Blessing of the Raven Queen",
      "Dragon Resilience notes",
      "Shadow Walk",
    ]);
    expect(after.at(-1).source).toMatchObject({ type: "subclass", id: "hb_shadow" });
  });
});

// --- E: saving and reopening ------------------------------------------------
describe("E: saved characters", () => {
  it("keep each feature's source and don't get duplicates when reopened", async () => {
    const entries = await loadFeatureEntries({ classId: "sorcerer", subclassId: "draconic" });
    const created = buildFeatureChoices(entries, 1, [])
      .filter((choice) => choice.defaultSelected)
      .map((choice) => createFeat({ name: choice.name, description: choice.description, source: choice.owner }));

    // Save and load (the sheet is stored as JSON).
    const reopened = JSON.parse(JSON.stringify(created));
    expect(reopened.find((feature) => feature.name === "Draconic Resilience").source).toMatchObject({
      type: "subclass",
      id: "draconic",
    });

    const again = buildFeatureChoices(entries, 1, names(reopened));
    expect(ticked(again)).toEqual([]);
  });

  it("stop using the old subclass id once the subclass is retyped", () => {
    const picked = { subclass: { id: "draconic", name: "Draconic" } };
    expect(getFeatureSubclassId(picked)).toBe("draconic");
    expect(
      getFeatureSubclassId({ subclass: { id: "draconic", name: "Shadow Magic", originalName: "Draconic" } }),
    ).toBeNull();
    expect(
      getFeatureSubclassId({ subclass: { id: "draconic", name: "draconic ", originalName: "Draconic" } }),
    ).toBe("draconic");
  });
});

// --- F: levelling through subclass milestones -------------------------------
describe("F: a Draconic Sorcerer levelling up", () => {
  it("is offered each subclass feature at its own level, and nothing from other subclasses", async () => {
    const entries = await loadFeatureEntries({ classId: "sorcerer", subclassId: "draconic" });
    const at = (level, have = []) => ticked(buildFeatureChoices(entries, level, have));

    const levelOne = at(1);
    expect(levelOne).not.toContain("Elemental Affinity");
    expect(at(6, levelOne)).toEqual(["Font of Magic", "Metamagic", "Elemental Affinity"]);
    expect(at(14, [...levelOne, "Font of Magic", "Metamagic", "Elemental Affinity"])).toEqual([
      "Dragon Wings",
    ]);
  });
});

// --- Old characters ---------------------------------------------------------
describe("older characters with another subclass's features", () => {
  it("lists them for review without touching typed-in features", async () => {
    const entries = await loadFeatureEntries({ classId: "sorcerer", subclassId: "book-shadow-magic" });
    const features = [
      { index: "1", name: "Spellcasting" },
      { index: "2", name: "Draconic Resilience" },
      { index: "3", name: "My shadow notes" },
      { index: "4", name: "Dragon Wings", source: { type: "subclass", id: "draconic" } },
    ];

    const strays = findStraySubclassFeatures(features, entries, "book-shadow-magic");
    expect(strays.map(({ feature }) => feature.name)).toEqual(["Draconic Resilience", "Dragon Wings"]);
    expect(strays[0].guessed).toBe(true);
    expect(strays[1].guessed).toBeUndefined();
  });
});

// --- G: homebrew skill choices ----------------------------------------------
describe("G: a homebrew race that grants skill choices", () => {
  it("is recognised and its picks are kept", async () => {
    const raw = toHomebrewRace({
      id: "1",
      name: "Moonkin",
      category: "race",
      data: {
        skills: ["nature"],
        skillChoice: { choose: 2, from: ["arcana", "history", "religion"] },
        traits: [],
      },
    });

    const [grant] = await loadRaceSkillGrants({ raceRaw: raw });
    expect(grant).toMatchObject({
      from: "Moonkin",
      fixed: [{ index: "nature", name: "Nature" }],
      choose: 2,
    });
    expect(grant.options.map((option) => option.index)).toEqual(["arcana", "history", "religion"]);

    const skills = collectSkills({
      raceGrants: [grant],
      racePicks: { [grant.id]: [{ index: "arcana", name: "Arcana" }, { index: "religion", name: "Religion" }] },
    });
    expect(skills.map((entry) => entry.index)).toEqual(["nature", "arcana", "religion"]);
    expect(getTraitDetails).not.toHaveBeenCalled();
  });
});
