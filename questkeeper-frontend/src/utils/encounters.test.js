import { describe, it, expect } from "vitest";
import {
  combatantFromMonster,
  encounterMultiplier,
  formatChallenge,
  partyThresholds,
  rateEncounter,
  suggestEncounter,
} from "./encounters";

const goblin = { index: "goblin", name: "Goblin", xp: 50, type: "humanoid" };
const ogre = { index: "ogre", name: "Ogre", xp: 450, type: "giant" };
const zombie = { index: "zombie", name: "Zombie", xp: 50, type: "undead" };
const dragon = { index: "ancient", name: "Ancient Dragon", xp: 62000, type: "dragon" };

describe("partyThresholds", () => {
  it("adds up each character's budget", () => {
    expect(partyThresholds([1, 1, 1, 1])).toEqual({ easy: 100, medium: 200, hard: 300, deadly: 400 });
    expect(partyThresholds([3, 5])).toEqual({ easy: 325, medium: 650, hard: 975, deadly: 1500 });
  });

  it("keeps levels between 1 and 20", () => {
    expect(partyThresholds([0, 99])).toEqual({ easy: 25 + 2800, medium: 50 + 5700, hard: 75 + 8500, deadly: 100 + 12700 });
  });
});

describe("encounterMultiplier", () => {
  it("grows with the number of monsters", () => {
    expect([1, 2, 3, 6, 7, 11, 15].map((n) => encounterMultiplier(n, 4))).toEqual([1, 1.5, 2, 2, 2.5, 3, 4]);
  });

  it("steps up for small parties and down for big ones", () => {
    expect(encounterMultiplier(1, 2)).toBe(1.5);
    expect(encounterMultiplier(3, 2)).toBe(2.5);
    expect(encounterMultiplier(1, 6)).toBe(0.5);
    expect(encounterMultiplier(3, 7)).toBe(1.5);
  });
});

describe("rateEncounter", () => {
  const party = [3, 3, 3, 3];

  it("rates four goblins for four 3rd-level characters", () => {
    const result = rateEncounter([{ monster: goblin, count: 4 }], party);
    expect(result).toMatchObject({ count: 4, baseXp: 200, multiplier: 2, adjustedXp: 400, difficulty: "easy" });
  });

  it("reaches Deadly when the XP passes the top bar", () => {
    expect(rateEncounter([{ monster: ogre, count: 4 }], party).difficulty).toBe("deadly");
  });

  it("calls anything under Easy trivial, and an empty fight trivial", () => {
    expect(rateEncounter([{ monster: goblin, count: 1 }], party).difficulty).toBe("trivial");
    expect(rateEncounter([], party)).toMatchObject({ count: 0, adjustedXp: 0, difficulty: "trivial" });
  });
});

describe("suggestEncounter", () => {
  const levels = [3, 3, 3, 3];
  const monsters = [goblin, ogre, zombie, dragon];

  it("finds a fight of the chosen difficulty", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    ["easy", "medium", "hard", "deadly"].forEach((difficulty) => {
      const entries = suggestEncounter({ levels, difficulty, monsters, random });
      expect(rateEncounter(entries, levels).difficulty).toBe(difficulty);
    });
  });

  it("never offers a monster worth more than the whole budget", () => {
    const entries = suggestEncounter({ levels, difficulty: "deadly", monsters });
    expect(entries.every((entry) => entry.monster.index !== "ancient")).toBe(true);
  });

  it("sticks to a theme", () => {
    const entries = suggestEncounter({ levels, difficulty: "easy", monsters, theme: "undead" });
    expect(entries.every((entry) => entry.monster.type === "undead")).toBe(true);
  });

  it("gives null when nothing fits or there is no party", () => {
    expect(suggestEncounter({ levels, difficulty: "easy", monsters, theme: "fey" })).toBeNull();
    expect(suggestEncounter({ levels: [], difficulty: "easy", monsters })).toBeNull();
    expect(suggestEncounter({ levels, difficulty: "nonsense", monsters })).toBeNull();
  });
});

describe("formatChallenge", () => {
  it("writes fractions the way a stat block does", () => {
    expect([0.125, 0.25, 0.5, 1, 10].map(formatChallenge)).toEqual(["1/8", "1/4", "1/2", "1", "10"]);
  });
});

describe("combatantFromMonster", () => {
  const detail = {
    name: "Goblin",
    size: "Small",
    type: "humanoid",
    challenge_rating: 0.25,
    hit_points: 7,
    dexterity: 14,
    armor_class: [{ type: "armor", value: 15 }],
    proficiencies: [
      { value: 6, proficiency: { name: "Skill: Stealth" } },
      { value: 4, proficiency: { name: "Saving Throw: DEX" } },
    ],
    special_abilities: [{ name: "Nimble Escape" }],
    actions: [
      { name: "Scimitar", attack_bonus: 4, damage: [{ damage_dice: "1d6 + 2" }] },
      { name: "Multiattack (none)", desc: "Not an attack roll" },
    ],
  };

  it("turns an SRD monster into hit points, AC and a stat block", () => {
    expect(combatantFromMonster(detail)).toEqual({
      name: "Goblin",
      maxHp: 7,
      armorClass: 15,
      statBlock: {
        attacks: [{ name: "Scimitar", toHit: 4, damage: "1d6+2" }],
        notes: "CR 1/4 small humanoid. Traits: Nimble Escape",
        initiativeBonus: 2,
        saves: { dexterity: 4 },
      },
    });
  });

  it("copes with a monster that has no listed AC or attacks", () => {
    expect(combatantFromMonster({ name: "Blob", hit_points: 20, dexterity: 10 })).toMatchObject({
      armorClass: null,
      statBlock: { attacks: [] },
    });
  });
});
