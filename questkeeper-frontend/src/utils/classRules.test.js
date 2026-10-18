// The class rule helpers read homebrew classes' own rules, and still look
// up the SRD classes by ID.
import { describe, it, expect } from "vitest";
import {
  getSpellSlotProgression,
  getSpellcastingType,
  getSpellcastingAbility,
  getSubclassLevel,
  getLevelUpStepKeys,
  getStartingSpellCounts,
  getMaxSpellLevel,
} from "./characterSheet";
import { mapClassToSnapshot } from "./characterSnapshots";
import { toHomebrewClass } from "./homebrewMappers";

const firstLevelSlots = (classRef, level) => getSpellSlotProgression(classRef, level)[0].max;

describe("class rules", () => {
  it("still knows the SRD classes by ID", () => {
    expect(getSpellcastingType("wizard")).toBe("prepared");
    expect(getSpellcastingAbility("bard")).toBe("charisma");
    expect(getSubclassLevel("fighter")).toBe(3);
    expect(firstLevelSlots("paladin", 1)).toBe(0);
    expect(firstLevelSlots("paladin", 2)).toBe(2);
    expect(firstLevelSlots("fighter", 5)).toBe(0);
  });

  it("gives an Artificer-style half caster slots from level 1", () => {
    const tinkerer = { id: "hb_1", casterProgression: "half-early" };
    expect(firstLevelSlots(tinkerer, 1)).toBe(2);
    expect(firstLevelSlots(tinkerer, 3)).toBe(3);
    expect(getSpellSlotProgression(tinkerer, 5)[1].max).toBe(2);
  });

  it("caps learnable spell levels by each class's own slots", () => {
    expect(getMaxSpellLevel("wizard", 5)).toBe(3);
    expect(getMaxSpellLevel("wizard", 20)).toBe(9);
    // Half casters lag behind: Paladin and Ranger get 2nd-level spells at 5, 5th at 17.
    expect(getMaxSpellLevel("paladin", 1)).toBe(0);
    expect(getMaxSpellLevel("paladin", 2)).toBe(1);
    expect(getMaxSpellLevel("paladin", 5)).toBe(2);
    expect(getMaxSpellLevel("ranger", 9)).toBe(3);
    expect(getMaxSpellLevel("ranger", 20)).toBe(5);
    // Warlock follows Pact Magic's slot level.
    expect(getMaxSpellLevel("warlock", 3)).toBe(2);
    expect(getMaxSpellLevel("warlock", 11)).toBe(5);
    expect(getMaxSpellLevel({ id: "hb_1", casterProgression: "half-early" }, 3)).toBe(1);
    expect(getMaxSpellLevel({ id: "hb_2", casterProgression: "half" }, 9)).toBe(3);
    expect(getMaxSpellLevel("fighter", 10)).toBe(0);
  });

  it("reads a homebrew class's own rules, for snapshots and raw API classes", () => {
    const raw = toHomebrewClass({
      id: "1",
      name: "Tinkerer",
      data: {
        hitDie: 8,
        savingThrows: ["con", "int"],
        skillChoice: { choose: 2, from: ["arcana", "history"] },
        armor: "Light armor, shields",
        progression: "half-early",
        spellcastingAbility: "intelligence",
        spellcastingType: "prepared",
        cantripsAtFirst: 2,
        subclassLevel: 3,
        equipment: "Thieves' tools",
      },
    });
    expect(getSpellcastingAbility(raw)).toBe("intelligence");

    const snapshot = mapClassToSnapshot(raw);
    expect(snapshot).toMatchObject({
      id: "hb_1",
      hitDie: 8,
      savingThrowProficiencies: ["constitution", "intelligence"],
      spellcastingType: "prepared",
      spellcastingAbility: "intelligence",
      casterProgression: "half-early",
      subclassLevel: 3,
      equipmentDescription: "Thieves' tools",
      skillChoice: { choose: 2, options: [{ index: "arcana", name: "Arcana" }, { index: "history", name: "History" }] },
    });
    // A prepared homebrew caster has no spells-known table, so nothing to learn.
    expect(getLevelUpStepKeys(3, snapshot)).toEqual(["hitPoints", "subclass"]);
    // A prepared caster picks cantrips only at creation.
    expect(getStartingSpellCounts(snapshot, raw.levelOneSpellcasting)).toEqual({ cantrips: 2, spells: 0 });
  });

  it("treats a homebrew class with no spellcasting as a non-caster", () => {
    const raw = toHomebrewClass({ id: "2", name: "Brute", data: { savingThrows: ["str", "con"] } });
    const snapshot = mapClassToSnapshot(raw);
    expect(snapshot.spellcastingType).toBeNull();
    expect(firstLevelSlots(snapshot, 10)).toBe(0);
  });
});
