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
    expect(getLevelUpStepKeys(3, snapshot)).toEqual(["hitPoints", "subclass", "spells"]);
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
