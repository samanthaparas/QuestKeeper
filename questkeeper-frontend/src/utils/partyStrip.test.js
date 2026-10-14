import { describe, it, expect } from "vitest";
import { getHealthState, getPassiveScore, toPartyRow } from "./partyStrip";

const sheet = {
  id: "c1",
  name: "Billie",
  level: 5,
  class: { name: "Rogue" },
  combat: { hitPoints: { current: 12, max: 30, temporary: 4 }, armorClass: 14 },
  acBonus: 2,
  abilityScores: { wisdom: 14, intelligence: 8 },
  skills: { perception: true, investigation: true },
  skillExpertise: { perception: true },
  skillBonuses: { insight: 1 },
  conditions: [{ key: "prone" }],
};

describe("party strip", () => {
  it("works out passive scores the way the sheet does", () => {
    // Wis +2, proficiency +3 doubled by expertise: 10 + 2 + 6.
    expect(getPassiveScore(sheet, "perception")).toBe(18);
    // Wis +2 and a +1 bonus, not proficient.
    expect(getPassiveScore(sheet, "insight")).toBe(13);
    // Int -1, proficient +3.
    expect(getPassiveScore(sheet, "investigation")).toBe(12);
  });

  it("calls half HP or less Bloodied and 0 HP Down", () => {
    expect(getHealthState(20, 20)).toBe("healthy");
    expect(getHealthState(10, 20)).toBe("bloodied");
    expect(getHealthState(0, 20)).toBe("down");
    expect(getHealthState(0, 0)).toBe("healthy");
  });

  it("builds a row with the HP bar, AC bonus and conditions", () => {
    const row = toPartyRow(sheet, { withPassives: true });
    expect(row).toMatchObject({
      name: "Billie",
      summary: "Level 5 Rogue",
      hp: { current: 12, max: 30, temporary: 4 },
      hpPercent: 40,
      health: "bloodied",
      armorClass: 16,
      conditions: [{ key: "prone" }],
    });
    expect(row.passives.map((p) => p.score)).toEqual([18, 13, 12]);
  });

  it("leaves passives out unless asked, and copes with a bare mini sheet", () => {
    const row = toPartyRow({ id: "c2", name: "Rook" });
    expect(row.passives).toEqual([]);
    expect(row).toMatchObject({ hp: { current: 0, max: 0 }, hpPercent: 0, armorClass: 10 });
  });
});
