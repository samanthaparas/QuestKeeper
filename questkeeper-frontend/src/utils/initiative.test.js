import { describe, it, expect, vi } from "vitest";
import {
  sortCombatants,
  getTurnOrder,
  getNowAndNext,
  getNextTurn,
  rollInitiative,
  rollMonsterInitiative,
} from "./initiative";

function makeCombatant(overrides) {
  return {
    id: overrides.name,
    kind: "player",
    initiative: null,
    status: "healthy",
    created_at: "2026-10-03T00:00:00.000Z",
    ...overrides,
  };
}

const fight = [
  makeCombatant({ name: "Billie", initiative: 17, created_at: "2026-10-03T00:00:01Z" }),
  makeCombatant({ name: "Kobold", kind: "monster", initiative: 12, created_at: "2026-10-03T00:00:02Z" }),
  makeCombatant({ name: "Thorn", initiative: 12, created_at: "2026-10-03T00:00:03Z" }),
  makeCombatant({ name: "Mira", initiative: 5, created_at: "2026-10-03T00:00:04Z" }),
];

describe("sortCombatants", () => {
  it("orders highest initiative first and breaks ties by who was added first", () => {
    expect(sortCombatants(fight).map((c) => c.name)).toEqual([
      "Billie",
      "Kobold",
      "Thorn",
      "Mira",
    ]);
  });

  it("leaves out combatants who have not set an initiative yet", () => {
    const withPending = [...fight, makeCombatant({ name: "Late", initiative: null })];
    expect(sortCombatants(withPending).map((c) => c.name)).not.toContain("Late");
  });

  it("keeps an initiative of 0", () => {
    const zero = [makeCombatant({ name: "Slow", initiative: 0 })];
    expect(sortCombatants(zero)).toHaveLength(1);
  });
});

describe("getTurnOrder", () => {
  it("skips defeated monsters but keeps downed players", () => {
    const hurt = fight.map((c) =>
      c.name === "Kobold" || c.name === "Mira" ? { ...c, status: "down" } : c,
    );
    expect(getTurnOrder(hurt).map((c) => c.name)).toEqual(["Billie", "Thorn", "Mira"]);
  });
});

describe("getNowAndNext", () => {
  it("returns the current combatant and the one after", () => {
    const { now, next } = getNowAndNext(fight, "Kobold");
    expect(now.name).toBe("Kobold");
    expect(next.name).toBe("Thorn");
  });

  it("wraps to the first combatant after the last", () => {
    expect(getNowAndNext(fight, "Mira").next.name).toBe("Billie");
  });

  it("returns nothing when no turn has been set", () => {
    expect(getNowAndNext(fight, null)).toEqual({ now: null, next: null });
  });

  it("has no next when only one combatant takes turns", () => {
    const solo = [makeCombatant({ name: "Billie", initiative: 10 })];
    expect(getNowAndNext(solo, "Billie").next).toBeNull();
  });
});

describe("getNextTurn", () => {
  it("starts with the highest initiative when no turn is set", () => {
    expect(getNextTurn(fight, null, 1)).toEqual({ currentId: "Billie", round: 1 });
  });

  it("moves to the next combatant in the same round", () => {
    expect(getNextTurn(fight, "Billie", 1)).toEqual({ currentId: "Kobold", round: 1 });
  });

  it("starts a new round after the last combatant", () => {
    expect(getNextTurn(fight, "Mira", 3)).toEqual({ currentId: "Billie", round: 4 });
  });

  it("skips a monster that was just defeated", () => {
    const defeated = fight.map((c) => (c.name === "Kobold" ? { ...c, status: "down" } : c));
    expect(getNextTurn(defeated, "Billie", 1)).toEqual({ currentId: "Thorn", round: 1 });
  });

  it("still advances when the current monster was defeated on its own turn", () => {
    const defeated = fight.map((c) => (c.name === "Kobold" ? { ...c, status: "down" } : c));
    expect(getNextTurn(defeated, "Kobold", 1)).toEqual({ currentId: "Thorn", round: 1 });
  });

  it("ends combat's turn pointer when nobody can act", () => {
    const monstersOnly = [
      makeCombatant({ name: "A", kind: "monster", initiative: 5, status: "down" }),
    ];
    expect(getNextTurn(monstersOnly, "A", 2)).toEqual({ currentId: null, round: 2 });
  });
});

describe("rollInitiative", () => {
  it("adds the Dexterity modifier to a d20", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
    expect(rollInitiative(16)).toEqual({ roll: 11, modifier: 3, total: 14 });
    vi.restoreAllMocks();
  });

  it("treats a missing Dexterity as 10", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollInitiative(undefined)).toEqual({ roll: 1, modifier: 0, total: 1 });
    vi.restoreAllMocks();
  });
});

describe("rollMonsterInitiative", () => {
  it("adds the stat block bonus to a d20", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
    expect(rollMonsterInitiative(2)).toEqual({ roll: 11, modifier: 2, total: 13 });
    expect(rollMonsterInitiative(-1).total).toBe(10);
    vi.restoreAllMocks();
  });

  it("treats a missing or blank bonus as 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(rollMonsterInitiative().total).toBe(11);
    expect(rollMonsterInitiative("").total).toBe(11);
    vi.restoreAllMocks();
  });
});
