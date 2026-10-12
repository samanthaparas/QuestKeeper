import { describe, it, expect } from "vitest";
import {
  CONDITION_KEYS,
  afterLongRest,
  conditionWord,
  rollNotesFor,
  setExhaustion,
  toggleCondition,
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
