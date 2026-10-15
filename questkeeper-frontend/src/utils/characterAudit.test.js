// The character audit (Pippa: Half-Elf Ranger, Charlatan): feature choices,
// background features, starting gold, tools, languages, the setup list and
// level 1 Ranger spellcasting. SRD shapes are imitated where needed.
import { describe, it, expect, vi } from "vitest";
import {
  choicesFor,
  choicesFromSrd,
  describePicks,
  missingPicks,
  pickChoice,
} from "./featureChoices";
import {
  backgroundFeatureFrom,
  buildLanguagesText,
  languageChoicesFor,
  splitTools,
  startingGold,
  STANDARD_LANGUAGES,
} from "./startingCharacter";
import { getSetupTasks } from "./setupTasks";
import {
  createCharacterSheet,
  createFeat,
  getEffectiveArmorClass,
  getMaxSpellLevel,
  getProficiencyBonus,
  getSkillModifier,
  getSpellSlotProgression,
  getSpellsStartAt,
} from "./characterSheet";

vi.mock("./supabaseClient", () => ({ supabase: {} }));

// The SRD's Favored Enemy and Natural Explorer, as the API returns them.
const FAVORED_ENEMY = {
  enemy_type_options: {
    desc: "one enemy type",
    choose: 1,
    type: "string",
    from: { option_set_type: "options_array", options: ["aberrations", "beasts", "undead", "humanoids"] },
  },
  invocations: [],
};
const NATURAL_EXPLORER = {
  terrain_type_options: {
    choose: 1,
    type: "string",
    from: { options: ["arctic", "coast", "forest", "swamp"] },
  },
};

// Pippa's homebrew Charlatan (made from the book's facts, no book text).
const CHARLATAN = {
  id: "hb_charlatan",
  name: "Charlatan",
  feature: "False Identity",
  toolProficiencies: "Disguise kit, forgery kit",
  equipmentDescription: "Fine clothes, a disguise kit, tools of the con, and a pouch containing 15gp",
  languages: [],
};

describe("TEST 1: Pippa's level 1 numbers stay right", () => {
  it("matches the expected AC, saves and skill bonuses", () => {
    const scores = { strength: 12, dexterity: 16, constitution: 13, intelligence: 12, wisdom: 14, charisma: 13 };
    const prof = getProficiencyBonus(1);
    expect(prof).toBe(2);
    expect(getEffectiveArmorClass({ combat: { armorClass: 14 }, acBonus: 0 })).toBe(14);
    // Ranger saves: Strength +3, Dexterity +5.
    expect(getSkillModifier(scores.strength, true, prof)).toBe(3);
    expect(getSkillModifier(scores.dexterity, true, prof)).toBe(5);
    const bonus = (ability) => getSkillModifier(scores[ability], true, prof);
    expect({
      stealth: bonus("dexterity"),
      perception: bonus("wisdom"),
      survival: bonus("wisdom"),
      deception: bonus("charisma"),
      sleightOfHand: bonus("dexterity"),
      persuasion: bonus("charisma"),
      insight: bonus("wisdom"),
    }).toEqual({ stealth: 5, perception: 4, survival: 4, deception: 3, sleightOfHand: 5, persuasion: 3, insight: 4 });
  });
});

describe("TEST 3: Ranger feature choices", () => {
  it("reads the SRD's enemy and terrain lists, picking nothing", () => {
    const [enemy] = choicesFromSrd(FAVORED_ENEMY);
    expect(enemy).toEqual({
      key: "enemy_type_options",
      label: "Enemy type",
      choose: 1,
      options: ["aberrations", "beasts", "undead", "humanoids"],
      picked: [],
    });
    expect(choicesFromSrd(NATURAL_EXPLORER)[0].label).toBe("Terrain type");
    // Choices that point at other features (a Dragon Ancestor colour) aren't plain lists.
    expect(choicesFromSrd({ subfeature_options: { type: "feature", from: { options: [{}] } } })).toEqual([]);
  });

  it("saves a pick, shows it, and knows when it's still missing", () => {
    const feature = createFeat({ name: "Favored Enemy (1 type)", choices: choicesFromSrd(FAVORED_ENEMY) });
    expect(missingPicks(feature.choices)).toBe(1);

    const picked = pickChoice(feature.choices, "enemy_type_options", 0, "undead");
    expect(missingPicks(picked)).toBe(0);
    expect(describePicks(picked)).toBe("Undead");

    // Saved and reloaded as JSON, the pick is still there.
    const reloaded = JSON.parse(JSON.stringify({ ...feature, choices: picked }));
    expect(describePicks(reloaded.choices)).toBe("Undead");
  });

  it("lets an older character's feature (saved before choices) still choose", () => {
    const entries = [{ name: "Natural Explorer (1 terrain type)", choices: choicesFromSrd(NATURAL_EXPLORER) }];
    const legacy = { index: "f1", name: "Natural Explorer (1 terrain type)", description: "…" };
    expect(choicesFor(legacy, entries)[0].options).toContain("forest");
    expect(choicesFor({ name: "Darkvision" }, entries)).toEqual([]);
  });
});

describe("TEST 4: optional Tasha's features are not granted", () => {
  it("never adds Deft Explorer or Canny on its own, but typed expertise still doubles", () => {
    const sheet = createCharacterSheet({ name: "Pippa" });
    expect(sheet.features.map((feature) => feature.name)).not.toContain("Deft Explorer");
    // Canny added by hand: Stealth with expertise is +3 Dex + 2×2.
    expect(getSkillModifier(16, true, 2, { expertise: true })).toBe(7);
  });
});

describe("TEST 5: starting gold", () => {
  it("reads the purse from the gear description", () => {
    expect(startingGold({ background: CHARLATAN })).toBe(15);
  });

  it("knows the SRD Acolyte's 15 gp, and doesn't invent gold", () => {
    expect(startingGold({ background: { id: "acolyte" } })).toBe(15);
    expect(startingGold({ background: { id: "hb_x", equipmentDescription: "A shovel" } })).toBe(0);
    expect(startingGold({})).toBe(0);
  });
});

describe("TEST 6: tool proficiencies", () => {
  it("splits a list of tools into separate entries", () => {
    expect(splitTools("Disguise kit, forgery kit")).toEqual(["Disguise kit", "Forgery kit"]);
    expect(splitTools("Thieves' tools and navigator's tools.")).toEqual(["Thieves' tools", "Navigator's tools"]);
  });

  it("keeps a choice together, and skips 'no additional'", () => {
    expect(splitTools("One type of gaming set or a musical instrument")).toEqual([
      "One type of gaming set or a musical instrument",
    ]);
    expect(splitTools("No additional tool proficiencies")).toEqual([]);
    expect(splitTools(null)).toEqual([]);
  });
});

describe("TEST 7: background features", () => {
  it("turns the background's feature into a sheet feature with its source", () => {
    const raw = { feature: { name: "False Identity", desc: ["You have a second identity."] } };
    expect(backgroundFeatureFrom(raw, CHARLATAN)).toEqual({
      name: "False Identity",
      description: "You have a second identity.",
      source: { type: "background", id: "hb_charlatan", key: "background:hb_charlatan", level: null },
    });
    expect(backgroundFeatureFrom({}, CHARLATAN)).toBeNull();
  });
});

describe("TEST 8: languages", () => {
  const halfElf = {
    name: "Half-Elf",
    languages: [{ name: "Common" }, { name: "Elvish" }],
    language_options: { choose: 1, from: { options: [{ item: { name: "Dwarvish" } }, { item: { name: "Orc" } }] } },
  };

  it("offers the race's own list, and any language for 'choose any'", () => {
    const choices = languageChoicesFor({
      raceRaw: halfElf,
      backgroundRaw: { name: "Acolyte", language_options: { choose: 2, from: { option_set_type: "resource_list" } } },
    });
    expect(choices).toEqual([
      { id: "race", from: "Half-Elf", choose: 1, options: ["Dwarvish", "Orc"] },
      { id: "background", from: "Acolyte", choose: 2, options: STANDARD_LANGUAGES },
    ]);
  });

  it("writes what they speak, never chooses for them, and doesn't repeat a language", () => {
    const choices = languageChoicesFor({ raceRaw: halfElf });
    expect(buildLanguagesText({ fixed: ["Common", "Elvish"], choices, picks: {} })).toBe(
      "Common, Elvish\nChoose 1 more (Half-Elf)",
    );
    expect(buildLanguagesText({ fixed: ["Common", "Elvish"], choices, picks: { race: ["Dwarvish"] } })).toBe(
      "Common, Elvish, Dwarvish",
    );
    expect(buildLanguagesText({ fixed: ["Common", "common"], choices: [], picks: {} })).toBe("Common");
  });
});

describe("TEST 13 and 14: Ranger spellcasting by level", () => {
  const ranger = { id: "ranger", name: "Ranger" };

  it("has no Ranger slots at level 1 and says when they start", () => {
    expect(getSpellSlotProgression(ranger, 1).every((row) => row.max === 0)).toBe(true);
    expect(getSpellsStartAt(ranger, 1)).toEqual({ className: "Ranger", level: 2 });
  });

  it("starts at level 2 and keeps going", () => {
    expect(getSpellsStartAt(ranger, 2)).toBeNull();
    expect(getMaxSpellLevel(ranger, 2)).toBe(1);
    expect(getMaxSpellLevel(ranger, 5)).toBe(2);
    expect(getProficiencyBonus(5)).toBe(3);
  });

  it("says nothing for classes without spellcasting", () => {
    expect(getSpellsStartAt({ id: "fighter", name: "Fighter" }, 1)).toBeNull();
  });
});

describe("Character setup list (TEST 13 and 15)", () => {
  it("lists what Pippa still has to choose, without changing anything", () => {
    const pippa = {
      level: 1,
      class: { id: "ranger", name: "Ranger" },
      background: CHARLATAN,
      languages: "Common, Elvish\nChoose 1 more (your race)",
      features: [
        { index: "a", name: "Darkvision" },
        { index: "b", name: "Favored Enemy (1 type)" },
        { index: "c", name: "Natural Explorer (1 terrain type)", choices: [{ ...choicesFromSrd(NATURAL_EXPLORER)[0], picked: ["forest"] }] },
      ],
    };
    const entries = [{ name: "Favored Enemy (1 type)", choices: choicesFromSrd(FAVORED_ENEMY) }];
    const before = JSON.stringify(pippa);

    expect(getSetupTasks(pippa, entries).map((task) => task.label)).toEqual([
      "Choose 1 more language (your race)",
      "Choose for Favored Enemy (1 type)",
      "Add False Identity (your background)",
    ]);
    expect(JSON.stringify(pippa)).toBe(before);
  });

  it("asks for a subclass only once the class has reached it", () => {
    const fighter = (level) => ({ level, class: { id: "fighter" }, features: [] });
    expect(getSetupTasks(fighter(2))).toEqual([]);
    expect(getSetupTasks(fighter(3)).map((task) => task.key)).toEqual(["subclass"]);
  });

  it("is empty for a finished character", () => {
    expect(getSetupTasks({ level: 1, class: { id: "wizard" }, languages: "Common, Elvish", features: [] })).toEqual([]);
  });
});
