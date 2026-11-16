import { describe, it, expect } from "vitest";
import { concentrationCheck, concentrationOf, constitutionSave } from "./monsterConcentration";

const shroom = (damageTaken, status = "healthy") => ({ id: "c1", status, damage_taken: damageTaken });

describe("a monster's concentration", () => {
  it("is the spell it's holding, unless it's down", () => {
    expect(concentrationOf(shroom(0), { concentration: "Hold Person" })).toBe("Hold Person");
    expect(concentrationOf(shroom(30, "down"), { concentration: "Hold Person" })).toBe("");
    expect(concentrationOf(shroom(0), { concentration: null })).toBe("");
    expect(concentrationOf(shroom(0), null)).toBe("");
  });

  it("asks for a save after new damage: DC 10, or half the damage when that's more", () => {
    const secret = { concentration: "Hold Person", concentration_damage: 4 };
    expect(concentrationCheck(shroom(4), secret)).toBeNull();
    expect(concentrationCheck(shroom(16), secret)).toEqual({ damage: 12, dc: 10 });
    expect(concentrationCheck(shroom(29), secret)).toEqual({ damage: 25, dc: 12 });
  });

  it("asks nothing when it isn't concentrating or is down", () => {
    expect(concentrationCheck(shroom(20), { concentration: null, concentration_damage: 0 })).toBeNull();
    expect(concentrationCheck(shroom(20, "down"), { concentration: "Bless", concentration_damage: 0 })).toBeNull();
  });

  it("reads the Constitution save from the stat block", () => {
    expect(constitutionSave({ saves: { constitution: 3 } })).toBe(3);
    expect(constitutionSave({})).toBe(0);
  });
});
