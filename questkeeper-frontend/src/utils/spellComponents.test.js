import { describe, it, expect, vi } from "vitest";
import {
  componentsText,
  fillMissingComponents,
  spellsMissingComponents,
  spellsMissingDetails,
  spellsNeedingTypedComponents,
  castingTimeGroup,
  durationGroup,
  durationRounds,
  spellFactsFrom,
  spellFactsFromForm,
} from "./spellComponents";
import { buildStartingSpellcasting, addRacialCantrip } from "./characterSheet";
import { getSpellDetails } from "./api";

vi.mock("./supabaseClient", () => ({ supabase: {} }));
vi.mock("./api", () => ({
  getSpellDetails: vi.fn(async (index) => {
    const known = { "cure-wounds": ["V", "S"], thaumaturgy: ["V"], bless: ["V", "S", "M"] };
    if (!known[index]) throw new Error("not in the SRD");
    return { index, components: known[index] };
  }),
}));

describe("spell components", () => {
  it("joins the SRD's list", () => {
    expect(componentsText(["V", "S", "M"])).toBe("V, S, M");
    expect(componentsText("V, S")).toBe("V, S");
    expect(componentsText(undefined)).toBe("");
  });

  it("fills starting spells and racial cantrips from the SRD", async () => {
    const spellcasting = addRacialCantrip(
      buildStartingSpellcasting({ id: "cleric" }, [], [{ index: "cure-wounds", name: "Cure Wounds", level: 1 }]),
      { index: "thaumaturgy", name: "Thaumaturgy" },
      "your race (Tiefling)",
    );
    expect(spellsMissingComponents(spellcasting)).toHaveLength(2);

    const filled = await fillMissingComponents(spellcasting);
    expect(filled.spellsKnown[0].components).toBe("V, S");
    expect(filled.cantripsKnown[0]).toMatchObject({ components: "V", locked: true });
  });

  it("never changes typed components, and leaves unknown spells alone", async () => {
    getSpellDetails.mockClear();
    const spellcasting = {
      cantripsKnown: [],
      spellsKnown: [
        { index: "x1", name: "Bless", level: 1, components: "" },
        { index: "x2", name: "Cure Wounds", level: 1, components: "V, S (my note)" },
        { index: "x3", name: "My Homebrew Bolt", level: 1, components: "" },
      ],
    };
    const byName = (name) => ({ Bless: "bless", "Cure Wounds": "cure-wounds" })[name] ?? null;

    const filled = await fillMissingComponents(spellcasting, byName);
    expect(filled.spellsKnown.map((spell) => spell.components)).toEqual(["V, S, M", "V, S (my note)", ""]);
  });

  it("fills a spell's school, casting time, duration, concentration and ritual, keeping typed ones", async () => {
    getSpellDetails.mockReset();
    getSpellDetails.mockImplementation((index) =>
      Promise.resolve({
        index,
        components: ["V", "S"],
        school: { name: index === "silence" ? "Illusion" : "Enchantment" },
        casting_time: "1 action",
        duration: "Up to 10 minutes",
        concentration: true,
        ritual: index === "silence",
      }),
    );
    const spellcasting = {
      cantripsKnown: [],
      spellsKnown: [
        { index: "silence", name: "Silence", level: 2, components: "V, S" },
        { index: "x2", name: "Charm Person", level: 1, components: "V, S", school: "Enchantment", duration: "1 hour" },
      ],
    };
    expect(spellsMissingDetails(spellcasting).map(({ spell }) => spell.name)).toEqual(["Silence"]);
    const filled = await fillMissingComponents(spellcasting);
    expect(filled.spellsKnown[0]).toEqual({
      index: "silence",
      name: "Silence",
      level: 2,
      components: "V, S",
      school: "Illusion",
      castingTime: "1 action",
      duration: "Up to 10 minutes",
      concentration: true,
      ritual: true,
    });
    // Typed details are never replaced.
    expect(filled.spellsKnown[1]).toBe(spellcasting.spellsKnown[1]);
  });
});

describe("spells the SRD can't fill", () => {
  // Beast Sense (Primal Awareness) isn't in the SRD; its made-up index must
  // not be mistaken for an SRD one.
  const spellcasting = {
    cantripsKnown: [],
    spellsKnown: [
      { index: "6f1c2a3b-1111-4222-8333-944455556666", name: "Beast Sense", level: 2, components: "" },
      { index: "silence", name: "Silence", level: 2, components: "" },
      { index: "4b0c2a3b-1111-4222-8333-944455556666", name: "Misty Step", level: 2, components: "" },
      { index: "x", name: "Goodberry", level: 1, components: "V, S, M" },
    ],
  };
  const byName = (name) => ({ silence: "silence", "misty step": "misty-step" })[name.toLowerCase()] ?? null;

  it("only counts spells the SRD has as fillable", () => {
    expect(spellsMissingComponents(spellcasting, byName).map(({ spell }) => spell.name)).toEqual([
      "Silence",
      "Misty Step",
    ]);
  });

  it("names the ones to type in by hand", () => {
    expect(spellsNeedingTypedComponents(spellcasting, byName).map((spell) => spell.name)).toEqual(["Beast Sense"]);
  });

  it("never asks the SRD for a made-up index, so filling can finish", async () => {
    getSpellDetails.mockReset();
    getSpellDetails.mockImplementation((index) => Promise.resolve({ components: index === "silence" ? ["V", "S"] : ["V"] }));
    const filled = await fillMissingComponents(spellcasting, byName);
    // Goodberry has its components, but not its other details yet.
    expect(getSpellDetails.mock.calls.map(([index]) => index)).toEqual(["silence", "misty-step", "x"]);
    expect(filled.spellsKnown.map((spell) => spell.components)).toEqual(["", "V, S", "V", "V, S, M"]);
  });
});

describe("spell details for sorting", () => {
  it("reads the SRD's shape and ours, leaving out what's missing", () => {
    expect(
      spellFactsFrom({ school: { name: "Illusion" }, casting_time: "1 action", duration: "Up to 10 minutes", concentration: true, ritual: true }),
    ).toEqual({ school: "Illusion", castingTime: "1 action", duration: "Up to 10 minutes", concentration: true, ritual: true });
    expect(spellFactsFrom({ school: "Divination" })).toEqual({ school: "Divination" });
    expect(spellFactsFrom(null)).toEqual({});
  });

  it("cleans the form: blanks left off a new spell, kept (to clear) on an edit", () => {
    const values = { school: "Wizardry", castingTime: " 1 action ", duration: "", concentration: true, ritual: false };
    expect(spellFactsFromForm(values)).toEqual({ castingTime: "1 action", concentration: true });
    expect(spellFactsFromForm(values, { keepBlank: true })).toEqual({
      school: "",
      castingTime: "1 action",
      duration: "",
      concentration: true,
      ritual: false,
    });
  });

  it("orders durations from instant to until dispelled, and names casting times", () => {
    const order = ["Until dispelled", "1 round", "Up to 8 hours", "Instantaneous", "Up to 1 minute", "Special", "10 minutes"]
      .map((duration) => ({ duration }))
      .sort((a, b) => durationRounds(a) - durationRounds(b))
      .map(durationGroup);
    expect(order).toEqual(["Instantaneous", "1 round", "1 minute", "10 minutes", "8 hours", "Until dispelled", "Special"]);
    expect(
      ["1 reaction, which you take when...", "1 bonus action", "1 action", "1 minute", ""].map((castingTime) =>
        castingTimeGroup({ castingTime }),
      ),
    ).toEqual(["Reaction", "Bonus action", "Action", "Longer", "Not filled in"]);
  });
});
