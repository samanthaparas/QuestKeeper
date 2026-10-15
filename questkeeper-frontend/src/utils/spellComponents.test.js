import { describe, it, expect, vi } from "vitest";
import { componentsText, fillMissingComponents, spellsMissingComponents } from "./spellComponents";
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
