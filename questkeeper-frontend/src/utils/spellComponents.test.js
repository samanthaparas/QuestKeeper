import { describe, it, expect, vi } from "vitest";
import {
  componentsText,
  fillMissingComponents,
  spellsMissingComponents,
  spellsNeedingTypedComponents,
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
    expect(getSpellDetails).not.toHaveBeenCalledWith("cure-wounds");
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
    expect(getSpellDetails.mock.calls.map(([index]) => index)).toEqual(["silence", "misty-step"]);
    expect(filled.spellsKnown.map((spell) => spell.components)).toEqual(["", "V, S", "V", "V, S, M"]);
  });
});
