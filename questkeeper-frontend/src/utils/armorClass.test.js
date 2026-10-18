import { describe, it, expect, vi } from "vitest";
import {
  computeWornArmorClass,
  equipStartingArmor,
  isArmorDetails,
  magicArmorFor,
  withArmorBonus,
  withAutoArmorClass,
} from "./armorClass";

vi.mock("./supabaseClient", () => ({ supabase: {} }));

// SRD armor, as the API describes it.
const GEAR = {
  "leather armor": { index: "leather-armor", armor_category: "Light", armor_class: { base: 11, dex_bonus: true } },
  "scale mail": { index: "scale-mail", armor_category: "Medium", armor_class: { base: 14, dex_bonus: true, max_bonus: 2 } },
  "chain mail": { index: "chain-mail", armor_category: "Heavy", armor_class: { base: 16, dex_bonus: false } },
  shield: { index: "shield", armor_category: "Shield", armor_class: { base: 2 } },
  dagger: { index: "dagger", weapon_category: "Simple" },
};
const detailsFor = (item) => GEAR[item.name.toLowerCase()] ?? null;

const pippa = (equipment, extra = {}) => ({
  acMode: "auto",
  class: { id: "ranger" },
  abilityScores: { dexterity: 16, constitution: 13, wisdom: 14 },
  combat: { armorClass: 10 },
  equipment,
  ...extra,
});

describe("AC from worn armor", () => {
  it("knows armor and shields from other gear", () => {
    expect(isArmorDetails(GEAR.shield)).toBe(true);
    expect(isArmorDetails(GEAR.dagger)).toBe(false);
    expect(isArmorDetails(null)).toBe(false);
  });

  it("works out light, medium (Dex capped) and heavy armor, plus a shield", () => {
    expect(computeWornArmorClass(pippa([{ name: "Leather Armor", equipped: true }]), detailsFor)).toBe(14);
    expect(computeWornArmorClass(pippa([{ name: "Scale Mail", equipped: true }]), detailsFor)).toBe(16);
    expect(
      computeWornArmorClass(
        pippa([{ name: "Chain Mail", equipped: true }, { name: "Shield", equipped: true }]),
        detailsFor,
      ),
    ).toBe(18);
  });

  it("counts only what's worn, and uses Unarmored Defense with nothing on", () => {
    expect(computeWornArmorClass(pippa([{ name: "Chain Mail", equipped: false }]), detailsFor)).toBe(13);
    const barbarian = pippa([], { class: { id: "barbarian" } });
    expect(computeWornArmorClass(barbarian, detailsFor)).toBe(14); // 10 + Dex 3 + Con 1
  });

  it("waits until every worn item is looked up", () => {
    expect(computeWornArmorClass(pippa([{ name: "Leather Armor", equipped: true }]), () => undefined)).toBeNull();
  });

  it("only changes a sheet that's on auto", () => {
    const worn = [{ name: "Leather Armor", equipped: true }];
    expect(withAutoArmorClass(pippa(worn), detailsFor).combat.armorClass).toBe(14);
    const manual = pippa(worn, { acMode: "manual", combat: { armorClass: 19 } });
    expect(withAutoArmorClass(manual, detailsFor)).toBe(manual);
    const older = pippa(worn, { acMode: undefined, combat: { armorClass: 12 } });
    expect(withAutoArmorClass(older, detailsFor).combat.armorClass).toBe(12);
  });

  it("follows Dexterity changes while on auto", () => {
    const worn = [{ name: "Leather Armor", equipped: true }];
    const sheet = pippa(worn, { abilityScores: { dexterity: 18 } });
    expect(withAutoArmorClass(sheet, detailsFor).combat.armorClass).toBe(15);
  });
});

describe("starting armor", () => {
  it("wears the best body armor and any shield, nothing else", () => {
    const equipment = [
      { index: "leather-armor", name: "Leather Armor" },
      { index: "chain-mail", name: "Chain Mail" },
      { index: "shield", name: "Shield" },
      { index: "dagger", name: "Dagger" },
    ];
    const worn = equipStartingArmor(equipment, Object.values(GEAR), { scores: { dexterity: 10 }, classId: "fighter" });
    expect(worn.filter((item) => item.equipped).map((item) => item.name)).toEqual(["Chain Mail", "Shield"]);
  });
});

describe("magic armor", () => {
  it("knows the SRD magic armor that names one armor, with its bonus", () => {
    expect(magicArmorFor("Armor of Invulnerability")).toEqual({ base: "plate-armor", bonus: 0 });
    expect(magicArmorFor("Dwarven Plate")).toEqual({ base: "plate-armor", bonus: 2 });
    expect(magicArmorFor("Elven Chain")).toEqual({ base: "chain-shirt", bonus: 1 });
    expect(magicArmorFor("Red Dragon Scale Mail")).toEqual({ base: "scale-mail", bonus: 1 });
    expect(magicArmorFor("Animated Shield")).toEqual({ base: "shield", bonus: 0 });
  });

  it("reads the armor from the name for magic armor that can be any armor", () => {
    expect(magicArmorFor("+1 Leather Armor")).toEqual({ base: "leather-armor", bonus: 1 });
    expect(magicArmorFor("Chain Mail +2")).toEqual({ base: "chain-mail", bonus: 2 });
    expect(magicArmorFor("Mithral Half Plate")).toEqual({ base: "half-plate-armor", bonus: 0 });
    expect(magicArmorFor("Adamantine Plate")).toEqual({ base: "plate-armor", bonus: 0 });
    expect(magicArmorFor("Studded Leather Armor of Resistance")).toEqual({ base: "studded-leather-armor", bonus: 0 });
    expect(magicArmorFor("Shield, +3")).toEqual({ base: "shield", bonus: 3 });
  });

  it("leaves alone anything that isn't magic armor, or doesn't say which armor", () => {
    expect(magicArmorFor("+1 Longsword")).toBeNull();
    expect(magicArmorFor("Armor, +1")).toBeNull();
    expect(magicArmorFor("Wayfarer's Boots")).toBeNull();
    expect(magicArmorFor("Leather Pouch")).toBeNull();
  });

  it("adds the bonus to the armor it's made from", () => {
    expect(withArmorBonus(GEAR["chain mail"], 1).armor_class).toEqual({ base: 17, dex_bonus: false });
    expect(withArmorBonus(GEAR["chain mail"], 0)).toBe(GEAR["chain mail"]);
    expect(withArmorBonus(null, 2)).toBeNull();
  });

  it("counts worn magic armor and a magic shield in the AC", () => {
    const magic = {
      "+1 scale mail": withArmorBonus(GEAR["scale mail"], 1),
      "+2 shield": withArmorBonus(GEAR.shield, 2),
    };
    const magicDetailsFor = (item) => magic[item.name.toLowerCase()] ?? null;
    const worn = pippa([
      { name: "+1 Scale Mail", equipped: true },
      { name: "+2 Shield", equipped: true },
    ]);
    // Scale mail 14 + 1, Dex +2 (the most medium armor allows), shield 2 + 2.
    expect(computeWornArmorClass(worn, magicDetailsFor)).toBe(21);
  });
});
