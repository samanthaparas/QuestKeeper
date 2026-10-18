import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseDamage,
  rollDamage,
  applyDamageToHitPoints,
  parseDiceNumbers,
  damageFromDice,
  checkExtraDamage,
  rollDamageWithExtra,
  damageFromDiceWithExtra,
} from "./attacks";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseDamage", () => {
  it("reads dice with a flat bonus", () => {
    expect(parseDamage("2d8+10")).toEqual([
      { type: "dice", sign: 1, count: 2, sides: 8 },
      { type: "flat", sign: 1, value: 10 },
    ]);
  });

  it("ignores spaces and reads a negative modifier", () => {
    expect(parseDamage("1d6 - 1")).toEqual([
      { type: "dice", sign: 1, count: 1, sides: 6 },
      { type: "flat", sign: -1, value: 1 },
    ]);
  });

  it("treats a missing dice count as one", () => {
    expect(parseDamage("d10")[0]).toMatchObject({ count: 1, sides: 10 });
  });

  it("reads a flat number and several dice terms", () => {
    expect(parseDamage("5")).toEqual([{ type: "flat", sign: 1, value: 5 }]);
    expect(parseDamage("1d8+1d6")).toHaveLength(2);
  });

  it("returns null for text it cannot understand", () => {
    expect(parseDamage("")).toBeNull();
    expect(parseDamage(undefined)).toBeNull();
    expect(parseDamage("fire damage")).toBeNull();
    expect(parseDamage("1d1")).toBeNull();
    expect(parseDamage("999d6")).toBeNull();
  });
});

describe("rollDamage", () => {
  it("rolls each die and adds the bonus", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d8 -> 5
    expect(rollDamage("2d8+10")).toEqual({
      total: 20,
      text: "2d8 [5, 5] +10 = 20",
    });
  });

  it("doubles what the dice show, but not the bonus, on a critical hit", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5); // d4 -> 3
    expect(rollDamage("1d4+3", { crit: true })).toEqual({
      total: 9,
      text: "1d4 [3] ×2 +3 = 9",
    });
    // The dice are rolled once, not twice.
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("never goes below zero", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // d4 -> 1
    expect(rollDamage("1d4-5").total).toBe(0);
  });

  it("returns null when the damage cannot be parsed", () => {
    expect(rollDamage("unknown")).toBeNull();
  });
});

describe("applyDamageToHitPoints", () => {
  it("takes from temporary HP first", () => {
    expect(applyDamageToHitPoints({ max: 20, current: 20, temporary: 5 }, 3)).toEqual({
      max: 20,
      current: 20,
      temporary: 2,
    });
  });

  it("spills over from temporary HP into current HP", () => {
    expect(applyDamageToHitPoints({ max: 20, current: 20, temporary: 5 }, 8)).toEqual({
      max: 20,
      current: 17,
      temporary: 0,
    });
  });

  it("never drops current HP below zero", () => {
    expect(applyDamageToHitPoints({ max: 10, current: 4, temporary: 0 }, 99).current).toBe(0);
  });

  it("handles a sheet with no temporary HP set", () => {
    expect(applyDamageToHitPoints({ max: 10, current: 10 }, 4)).toMatchObject({
      current: 6,
      temporary: 0,
    });
  });
});

describe("parseDiceNumbers", () => {
  it("reads numbers separated by commas, spaces or both", () => {
    expect(parseDiceNumbers("6, 2, 3 5")).toEqual([6, 2, 3, 5]);
    expect(parseDiceNumbers(" 4 ")).toEqual([4]);
  });

  it("says no to anything that isn't whole numbers", () => {
    expect(parseDiceNumbers("")).toBeNull();
    expect(parseDiceNumbers("6, two")).toBeNull();
    expect(parseDiceNumbers("2.5")).toBeNull();
  });
});

describe("damageFromDice", () => {
  it("adds up ten d6 and the bonus", () => {
    // The player's own example: 6, 2, 3, 6, 1, 1, 5, 4, 6, 2 on 10d6+4.
    const result = damageFromDice("10d6+4", [6, 2, 3, 6, 1, 1, 5, 4, 6, 2]);
    expect(result.total).toBe(36 + 4);
    expect(result.text).toBe("10d6 [6, 2, 3, 6, 1, 1, 5, 4, 6, 2] +4 = 40");
  });

  it("doubles the dice, not the bonus, on a critical hit", () => {
    expect(damageFromDice("1d6+3", [4], { crit: true }).total).toBe(11);
  });

  it("handles mixed dice in the order the damage is written", () => {
    expect(damageFromDice("1d8+2d6+1", [5, 3, 4]).total).toBe(5 + 7 + 1);
  });

  it("says how many numbers it needs when the count is wrong", () => {
    expect(damageFromDice("2d6+3", [4]).error).toBe("2d6 needs 2 numbers, and you typed 1.");
    expect(damageFromDice("2d6+3", []).error).toMatch(/Type the number on each die/);
  });

  it("rejects a number a die can't show", () => {
    expect(damageFromDice("1d6+3", [7]).error).toBe("A d6 only shows 1 to 6, not 7.");
    expect(damageFromDice("1d6+3", [0]).error).toBe("A d6 only shows 1 to 6, not 0.");
  });

  it("explains damage with no dice", () => {
    expect(damageFromDice("5", [3]).error).toMatch(/no dice the app can read/);
    expect(damageFromDice("special", [3]).error).toMatch(/no dice the app can read/);
  });
});

describe("extra damage on top of a weapon", () => {
  it("reads the extra damage text", () => {
    expect(checkExtraDamage("2d8")).toEqual({ dice: 2 });
    expect(checkExtraDamage("1d6+2")).toEqual({ dice: 1 });
    expect(checkExtraDamage("+2")).toEqual({ dice: 0 });
    expect(checkExtraDamage("smite").error).toMatch(/like 2d8/);
  });

  it("adds a smite's real dice after the weapon's, with the bonus on the weapon only", () => {
    // Longsword 2d8+3 rolling 5 and 3, then Smite 2d8 rolling 6 and 2.
    const result = damageFromDiceWithExtra("2d8+3", "2d8", [5, 3, 6, 2], { label: "Smite" });
    expect(result.total).toBe(5 + 3 + 3 + 6 + 2);
    expect(result.text).toBe("2d8 [5, 3] +3 = 11 | Smite 2d8 [6, 2] = 8");
    expect(result.extra).toEqual({ label: "Smite", total: 8 });
  });

  it("doubles both sets of dice on a critical hit, never the bonus", () => {
    const result = damageFromDiceWithExtra("1d8+3", "2d8", [5, 3, 2], { crit: true, label: "Smite" });
    expect(result.total).toBe(5 * 2 + 3 + (3 + 2) * 2);
  });

  it("says how many numbers it needs in all", () => {
    expect(damageFromDiceWithExtra("2d8+3", "2d8", [5, 3, 6], { label: "Smite" }).error).toMatch(
      /need 4 numbers in all, and you typed 3/,
    );
  });

  it("lets a flat extra (+2) add without any dice", () => {
    expect(damageFromDiceWithExtra("1d8+3", "+2", [5], { label: "Rage" }).total).toBe(5 + 3 + 2);
  });

  it("asks for a readable extra", () => {
    expect(damageFromDiceWithExtra("1d8", "smite", [4]).error).toMatch(/like 2d8/);
    expect(rollDamageWithExtra("1d8", "nonsense").error).toMatch(/like 2d8/);
  });

  it("rolls both with the app, adding the totals", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d8 -> 5
    const result = rollDamageWithExtra("1d8+3", "2d8", { label: "Smite" });
    expect(result.total).toBe(5 + 3 + 10);
    expect(result.text).toContain("| Smite 2d8 [5, 5] = 10");
  });
});

