import { describe, it, expect, vi } from "vitest";
import { loadHomebrewStart } from "./homebrewStart";
import { startFromFor } from "./homebrewMappers";

vi.mock("./supabaseClient", () => ({ supabase: {} }));

vi.mock("./srdDetails", () => ({
  loadRaceDetails: vi.fn().mockResolvedValue({
    index: "elf",
    name: "Elf",
    source: "SRD 5.1",
    speed: 30,
    size: "Medium",
    ability_bonuses: [{ ability_score: { index: "dex" }, bonus: 2 }],
    languages: [{ name: "Common" }, { name: "Elvish" }],
    traits: [{ index: "darkvision", name: "Darkvision" }],
    traitDetails: [{ index: "darkvision", name: "Darkvision", desc: ["You see in the dark."] }],
  }),
}));

vi.mock("./api", () => ({
  getBackgroundDetails: vi.fn().mockResolvedValue({
    index: "acolyte",
    name: "Acolyte",
    starting_proficiencies: [{ name: "Skill: Insight" }, { name: "Skill: Religion" }],
    language_options: { choose: 2 },
    starting_equipment: [{ equipment: { name: "Incense" }, quantity: 5 }],
    feature: { name: "Shelter of the Faithful", desc: ["Temples help you."] },
  }),
  getSubclassDetails: vi.fn().mockResolvedValue({
    index: "evocation",
    name: "Evocation",
    class: { index: "wizard" },
    desc: ["You focus on evocation."],
  }),
  getSubclassFeatures: vi.fn().mockResolvedValue([{ index: "sculpt-spells" }]),
  getFeatureDetails: vi.fn().mockResolvedValue({ name: "Sculpt Spells", level: 2, desc: ["Protect allies."] }),
  getSubraceDetails: vi.fn(),
  getSubraceTraits: vi.fn(),
  getTraitDetails: vi.fn(),
}));

describe("loadHomebrewStart", () => {
  it("copies a race, text included", async () => {
    const start = await loadHomebrewStart("race", "elf");
    expect(start).toMatchObject({
      category: "race",
      name: "Elf (my version)",
      basedOn: "SRD 5.1",
      data: {
        speed: 30,
        abilityBonuses: { dex: 2 },
        languages: "Common, Elvish",
        traits: [{ name: "Darkvision", description: "You see in the dark." }],
      },
    });
  });

  it("copies a background's skills, languages, gear and feature", async () => {
    const { data, summary } = await loadHomebrewStart("background", "acolyte");
    expect(summary).toBe("");
    expect(data).toMatchObject({
      skills: ["insight", "religion"],
      languageChoices: 2,
      equipment: "Incense x5",
      feature: { name: "Shelter of the Faithful", description: "Temples help you." },
    });
  });

  it("fetches an SRD subclass's features with their levels", async () => {
    const { data } = await loadHomebrewStart("subclass", "evocation");
    expect(data).toEqual({
      parentClass: "wizard",
      features: [{ name: "Sculpt Spells", level: 2, description: "Protect allies." }],
    });
  });
});

describe("startFromFor", () => {
  it("only offers free, copyable options", () => {
    expect(startFromFor("race", { index: "elf" })).toEqual({ category: "race", index: "elf" });
    expect(startFromFor("race", { index: "book_aasimar", is_book_entry: true })).toBeUndefined();
    expect(startFromFor("race", { index: "hb_123" })).toBeUndefined();
    expect(startFromFor("background", { index: "acolyte", edition: "2024" })).toBeUndefined();
    expect(startFromFor("subclass", { index: "x", class: { index: "artificer" } })).toBeUndefined();
  });
});
