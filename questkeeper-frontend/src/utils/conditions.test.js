import { describe, it, expect } from "vitest";
import {
  CONDITION_KEYS,
  afterLongRest,
  conditionWord,
  rollNotesFor,
  setExhaustion,
  toggleCondition,
  setConditionRounds,
  tickConditionRounds,
  turnsElapsed,
} from "./conditions";
import { applyRest, createCharacterSheet } from "./characterSheet";

describe("conditions", () => {
  it("has a name and meaning for every condition", () => {
    for (const key of CONDITION_KEYS) expect(conditionWord(key)?.meaning, key).toBeTruthy();
  });

  it("toggles conditions, starting exhaustion at level 1", () => {
    let list = toggleCondition([], "poisoned");
    list = toggleCondition(list, "exhaustion");
    expect(list).toEqual([{ key: "poisoned" }, { key: "exhaustion", level: 1 }]);
    expect(toggleCondition(list, "poisoned")).toEqual([{ key: "exhaustion", level: 1 }]);
  });

  it("keeps exhaustion between 1 and 6, and removes it at 0", () => {
    expect(setExhaustion([{ key: "exhaustion", level: 6 }], 7)).toEqual([{ key: "exhaustion", level: 6 }]);
    expect(setExhaustion([{ key: "exhaustion", level: 1 }], 0)).toEqual([]);
  });

  it("lowers exhaustion by one on a long rest and leaves the rest to the DM", () => {
    const list = [{ key: "prone" }, { key: "exhaustion", level: 2 }];
    expect(afterLongRest(list)).toEqual([{ key: "prone" }, { key: "exhaustion", level: 1 }]);

    const sheet = { ...createCharacterSheet({ name: "Bram" }), conditions: list };
    expect(applyRest(sheet, "long").conditions).toEqual([{ key: "prone" }, { key: "exhaustion", level: 1 }]);
    expect(applyRest(sheet, "short").conditions).toEqual(list);
  });

  it("notes the conditions that change your own rolls", () => {
    expect(rollNotesFor([{ key: "poisoned" }, { key: "deafened" }])).toEqual([
      { name: "Poisoned", note: "disadvantage on attack rolls and ability checks" },
    ]);
  });
});

describe("condition timers", () => {
  it("sets and clears a condition's rounds", () => {
    const timed = setConditionRounds([{ key: "poisoned" }, { key: "prone" }], "poisoned", 3);
    expect(timed).toEqual([{ key: "poisoned", rounds: 3 }, { key: "prone" }]);
    expect(setConditionRounds(timed, "poisoned", 0)).toEqual([{ key: "poisoned" }, { key: "prone" }]);
  });

  it("counts timers down and ends the ones that run out, leaving untimed ones alone", () => {
    const { conditions, ended } = tickConditionRounds(
      [{ key: "poisoned", rounds: 1 }, { key: "frightened", rounds: 3 }, { key: "prone" }],
      1,
    );
    expect(ended).toEqual(["poisoned"]);
    expect(conditions).toEqual([{ key: "frightened", rounds: 2 }, { key: "prone" }]);
  });

  it("only counts your own turns at the same table, going forward", () => {
    expect(turnsElapsed({ tableId: "t1", turns: 2 }, "t1", 4)).toBe(2);
    expect(turnsElapsed({ tableId: "t1", turns: 5 }, "t1", 1)).toBe(0);
    expect(turnsElapsed({ tableId: "t2", turns: 2 }, "t1", 4)).toBe(0);
    expect(turnsElapsed(undefined, "t1", 4)).toBe(0);
    // Older saved sheets counted whole rounds instead; they start fresh.
    expect(turnsElapsed({ tableId: "t1", round: 2 }, "t1", 4)).toBe(0);
  });
});

