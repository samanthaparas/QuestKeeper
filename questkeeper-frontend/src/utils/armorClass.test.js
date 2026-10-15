import { describe, it, expect, vi } from "vitest";
import { computeWornArmorClass, equipStartingArmor, isArmorDetails, withAutoArmorClass } from "./armorClass";

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
