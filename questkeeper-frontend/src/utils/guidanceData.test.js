import { describe, it, expect } from "vitest";
import { SPELL_SUMMARIES, getSpellSummary } from "./spellSummaries";
import {
  RACE_GUIDANCE,
  CLASS_GUIDANCE,
  getRaceGuidance,
  getClassGuidance,
  getStepTips,
  BACKGROUND_SUMMARIES,
  getCardPreview,
} from "./beginnerGuidance";

const SRD_RACES = [
  "dragonborn",
  "dwarf",
  "elf",
  "gnome",
  "half-elf",
  "half-orc",
  "halfling",
  "human",
  "tiefling",
];
const SRD_CLASSES = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
];

describe("beginner guidance", () => {
  it("covers every SRD race and class with a tagline and a good-if line", () => {
    for (const index of SRD_RACES) {
      expect(RACE_GUIDANCE[index]?.tagline, index).toBeTruthy();
      expect(RACE_GUIDANCE[index]?.goodIf, index).toBeTruthy();
    }
    for (const index of SRD_CLASSES) {
      expect(CLASS_GUIDANCE[index]?.tagline, index).toBeTruthy();
      expect(CLASS_GUIDANCE[index]?.goodIf, index).toBeTruthy();
      expect(CLASS_GUIDANCE[index]?.role, index).toBeTruthy();
      expect(CLASS_GUIDANCE[index]?.difficulty, index).toBeTruthy();
    }
  });

  it("gives nothing back for an unknown race or class", () => {
    expect(getRaceGuidance("homebrew")).toBeNull();
    expect(getClassGuidance("artificer")).toBeNull();
  });

  it("uses the same three difficulty labels everywhere", () => {
    const labels = new Set(
      Object.values(CLASS_GUIDANCE).map((entry) => entry.difficulty),
    );
    expect([...labels].sort()).toEqual([
      "A bit more to track",
      "Easy to play",
      "Lots to manage",
    ]);
  });
});

describe("spell summaries", () => {
  it("has a known tag and a short sentence for every entry", () => {
    const tags = new Set([
      "Damage",
      "Healing",
      "Buff",
      "Defense",
      "Control",
      "Social",
      "Utility",
    ]);

    for (const [index, summary] of Object.entries(SPELL_SUMMARIES)) {
      expect(tags.has(summary.tag), `${index} tag`).toBe(true);
      expect(summary.text.length, `${index} text`).toBeGreaterThan(10);
      expect(summary.text.length, `${index} too long`).toBeLessThan(100);
    }
  });

  it("covers every spell a new character can pick, with 24 cantrips and 47 first-level spells", () => {
    expect(Object.keys(SPELL_SUMMARIES)).toHaveLength(71);
    for (const index of [
      "fire-bolt",
      "guidance",
      "magic-missile",
      "cure-wounds",
      "bless",
      "sleep",
    ]) {
      expect(getSpellSummary(index), index).not.toBeNull();
    }
    expect(getSpellSummary("wish")).toBeNull();
  });
});

describe("step tips", () => {
  it("has tips for the narrow steps and none for the wide ones", () => {
    for (const step of [
      "name",
      "subraceCantrip",
      "classSkills",
      "classSpells",
      "abilities",
    ]) {
      expect(getStepTips(step)?.title, step).toBeTruthy();
      expect(getStepTips(step).tips.length, step).toBeGreaterThan(1);
    }
    expect(getStepTips("race")).toBeNull();
    expect(getStepTips("review")).toBeNull();
  });

  it("gives every class its own ability advice and puts it first on the abilities step", () => {
    for (const classId of Object.keys(CLASS_GUIDANCE)) {
      expect(CLASS_GUIDANCE[classId].abilityTip, classId).toBeTruthy();
      expect(getStepTips("abilities", classId).tips[0]).toBe(
        CLASS_GUIDANCE[classId].abilityTip,
      );
    }
  });

  it("still gives general ability tips when no class is chosen yet", () => {
    const { tips } = getStepTips("abilities");
    expect(tips.some((tip) => tip.includes("modifier"))).toBe(true);
  });

  it("gives every background QuestKeeper has rules for a two-sentence summary", () => {
    const backgrounds = [
      "acolyte", "criminal", "sage", "soldier", "open5e_con-artist",
      "tdcs_crime-syndicate-member", "tdcs_elemental-warden", "tdcs_lyceum-student",
      "tdcs_recovered-cultist", "toh_court-servant", "toh_desert-runner", "toh_destined",
      "toh_diplomat", "toh_forest-dweller", "toh_former-adventurer", "toh_freebooter",
      "toh_gamekeeper", "toh_innkeeper", "toh_mercenary-company-scion", "toh_mercenary-recruit",
      "toh_monstrous-adoptee", "toh_mysterious-origins", "toh_northern-minstrel", "toh_occultist",
      "toh_parfumier", "toh_scoundrel", "toh_sentry", "toh_trophy-hunter",
    ];
    for (const index of backgrounds) {
      const summary = BACKGROUND_SUMMARIES[index];
      expect(summary, index).toBeTruthy();
      expect(summary.split(/(?<=\.)\s+/), index).toHaveLength(2);
    }
  });

  it("gives every race, class and background card a hover preview", () => {
    expect(getCardPreview("Race", { index: "dwarf" })).toMatch(/^Good if you want to be hard to kill/);
    expect(getCardPreview("Class", { index: "rogue" })).toMatch(/^Good if you want/);
    expect(getCardPreview("Background", { index: "acolyte" })).toMatch(/temple/);
    // Book entries and homebrew bring their own summary.
    expect(getCardPreview("Race", { index: "book_tabaxi", preview: "Cat-folk." })).toBe("Cat-folk.");
    // Homebrew without a summary still gets something, so no card is blank.
    expect(getCardPreview("Background", { index: "hb_x" })).toMatch(/No summary yet/);
    expect(getCardPreview("Spell", { index: "fireball" })).toBeNull();
  });
});
