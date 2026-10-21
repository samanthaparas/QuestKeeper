import { describe, it, expect } from "vitest";
import { describeCoins, rollCoins, rollHoard, rollItem, rollValuable, tierOf } from "./loot";

// A steady "random": returns the numbers in turn, then repeats.
const sequence = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const CATALOG = [
  { index: "a", name: "Potion of Healing", rarities: ["Common"], consumable: true },
  { index: "b", name: "Cloak of Protection", rarities: ["Uncommon"], consumable: false },
  { index: "c", name: "Ring of Spell Storing", rarities: ["Rare"], consumable: false },
  { index: "d", name: "Holy Avenger", rarities: ["Legendary"], consumable: false },
  { index: "e", name: "Orb of Everything", rarities: ["Artifact"], consumable: false },
  { index: "f", name: "Scroll of Fire", rarities: ["Rare"], consumable: true },
];

describe("tierOf", () => {
  it("groups levels into the four tiers", () => {
    expect([1, 4, 5, 10, 11, 16, 17, 20].map(tierOf)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("describeCoins", () => {
  it("reads naturally", () => {
    expect(describeCoins({ gp: 132, sp: 14, cp: 37 })).toBe("132 gp, 14 sp and 37 cp");
    expect(describeCoins({ gp: 50, sp: 0, cp: 3 })).toBe("50 gp and 3 cp");
    expect(describeCoins({ gp: 50, sp: 0, cp: 0 })).toBe("50 gp");
    expect(describeCoins({ gp: 0, sp: 0, cp: 0 })).toBe("no coins");
  });
});

describe("rollCoins", () => {
  it("scales with the party's tier and how hard the fight was", () => {
    const steady = () => 0.5;
    const low = rollCoins({ level: 3, fight: "medium", random: steady }).gp;
    const tougher = rollCoins({ level: 3, fight: "deadly", random: steady }).gp;
    const higher = rollCoins({ level: 12, fight: "medium", random: steady }).gp;
    expect(tougher).toBeGreaterThan(low);
    expect(higher).toBeGreaterThan(low * 10);
  });

  it("always gives at least a coin of gold, and says it in words", () => {
    const result = rollCoins({ level: 1, fight: "easy", random: () => 0 });
    expect(result.gp).toBeGreaterThanOrEqual(1);
    expect(result.text).toContain("gp");
  });
});

describe("rollItem", () => {
  it("picks an item of a rarity suited to the tier", () => {
    const found = rollItem({ level: 2, catalog: CATALOG, random: () => 0.1 });
    expect(["Common", "Uncommon", "Rare"]).toContain(found.rarity);
    expect(found.item.rarities).toContain(found.rarity);
  });

  it("never gives an artifact", () => {
    for (let n = 0; n < 40; n += 1) {
      const found = rollItem({ level: 18, catalog: CATALOG, random: Math.random });
      expect(found.item.index).not.toBe("e");
    }
  });

  it("can be limited to consumables", () => {
    for (let n = 0; n < 40; n += 1) {
      const found = rollItem({ level: 6, catalog: CATALOG, consumablesOnly: true, random: Math.random });
      expect(found.item.consumable).toBe(true);
    }
  });

  it("still answers from the nearest rarity when the chosen one has nothing", () => {
    const thin = [{ index: "x", name: "Only Rare", rarities: ["Rare"], consumable: false }];
    expect(rollItem({ level: 1, catalog: thin, random: () => 0.01 }).item.index).toBe("x");
  });

  it("gives null for an empty or unusable catalog", () => {
    expect(rollItem({ level: 5, catalog: [] })).toBeNull();
    expect(rollItem({ level: 5, catalog: [CATALOG[4]] })).toBeNull();
    expect(rollItem({ level: 5, catalog: [CATALOG[1]], consumablesOnly: true })).toBeNull();
  });
});

describe("rollValuable", () => {
  it("names a gem or art object with its worth", () => {
    const found = rollValuable({ level: 3, random: sequence(0.2, 0.3, 0.4) });
    expect(found.text).toMatch(/\(\d+ gp\)$/);
    expect(found.value).toBeGreaterThan(0);
  });

  it("is worth more at higher tiers", () => {
    const mean = (level) => {
      let sum = 0;
      for (let n = 0; n < 200; n += 1) sum += rollValuable({ level, random: Math.random }).value;
      return sum / 200;
    };
    expect(mean(18)).toBeGreaterThan(mean(2));
  });
});

describe("rollHoard", () => {
  it("brings coins, at least one valuable, and sometimes items", () => {
    const hoard = rollHoard({ level: 6, fight: "hard", catalog: CATALOG, random: sequence(0.3, 0.6, 0.2, 0.9, 0.1) });
    expect(hoard.coins.gp).toBeGreaterThan(0);
    expect(hoard.valuables.length).toBeGreaterThanOrEqual(1);
    expect(hoard.items.length).toBeLessThanOrEqual(2);
  });

  it("never lists the same item twice", () => {
    for (let n = 0; n < 50; n += 1) {
      const { items } = rollHoard({ level: 6, catalog: CATALOG, random: Math.random });
      expect(new Set(items.map((entry) => entry.item.index)).size).toBe(items.length);
    }
  });
});
