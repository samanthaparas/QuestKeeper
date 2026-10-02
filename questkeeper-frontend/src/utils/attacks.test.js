import { describe, it, expect, vi, afterEach } from "vitest";
import { parseDamage, rollDamage, applyDamageToHitPoints } from "./attacks";

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

  it("doubles the dice but not the bonus on a critical hit", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d4 -> 3
    expect(rollDamage("1d4+3", { crit: true })).toEqual({
      total: 9,
      text: "2d4 [3, 3] +3 = 9",
    });
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
