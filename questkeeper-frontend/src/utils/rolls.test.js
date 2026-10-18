import { describe, it, expect } from "vitest";
import { checkFromDice, damageRollFromDice } from "./rolls";

describe("checkFromDice", () => {
  it("adds the bonus to the d20 the player rolled", () => {
    const roll = checkFromDice({ label: "Stealth", bonus: 5, dice: [14] });
    expect(roll).toMatchObject({ natural: 14, total: 19, detail: "d20 14 + 5", isNatural20: false });
  });

  it("keeps the higher d20 with advantage and the lower with disadvantage", () => {
    expect(checkFromDice({ label: "x", bonus: 2, mode: "advantage", dice: [14, 7] }).natural).toBe(14);
    expect(checkFromDice({ label: "x", bonus: 2, mode: "disadvantage", dice: [14, 7] }).natural).toBe(7);
  });

  it("flags natural 20s and 1s", () => {
    expect(checkFromDice({ label: "x", dice: [20] }).isNatural20).toBe(true);
    expect(checkFromDice({ label: "x", dice: [1] }).isNatural1).toBe(true);
  });

  it("asks for the right number of dice and rejects numbers off a d20", () => {
    expect(checkFromDice({ label: "x", dice: [] }).error).toBe("Type the number on your d20.");
    expect(checkFromDice({ label: "x", mode: "advantage", dice: [9] }).error).toMatch(/both d20 numbers/);
    expect(checkFromDice({ label: "x", dice: [25] }).error).toBe("A d20 only shows 1 to 20, not 25.");
  });
});

describe("damageRollFromDice", () => {
  it("builds a damage roll from the typed dice", () => {
    expect(damageRollFromDice({ label: "Sword damage", damage: "1d8+3", dice: [5] })).toMatchObject({
      kind: "damage",
      total: 8,
      detail: "1d8 [5] +3",
    });
  });

  it("marks a critical hit and doubles the dice", () => {
    const roll = damageRollFromDice({ label: "Sword damage", damage: "1d8+3", dice: [5], crit: true });
    expect(roll).toMatchObject({ total: 13, label: "Sword damage (critical)", isCrit: true });
  });

  it("passes the problem on in plain words", () => {
    expect(damageRollFromDice({ label: "x", damage: "2d6", dice: [3] }).error).toMatch(/needs 2 numbers/);
  });
});
