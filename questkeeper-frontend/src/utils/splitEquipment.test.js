import { describe, it, expect } from "vitest";
import { splitEquipmentItem } from "./characterSheet";

const arrows = { index: "a1", name: "Arrows", quantity: 10, description: "+1", attuned: true, equipped: true, favorite: true };

describe("splitting a stack", () => {
  it("moves some into a new row right after, as a fresh unequipped copy", () => {
    const list = splitEquipmentItem([arrows, { index: "r1", name: "Rope", quantity: 1 }], "a1", 3);
    expect(list.map((item) => [item.name, item.quantity])).toEqual([
      ["Arrows", 7],
      ["Arrows", 3],
      ["Rope", 1],
    ]);
    expect(list[1].index).not.toBe("a1");
    expect(list[1]).toMatchObject({ description: "+1", attuned: false, equipped: false, wielded: false, favorite: false });
    // The original keeps its marks.
    expect(list[0]).toMatchObject({ index: "a1", attuned: true, equipped: true });
  });

  it("does nothing unless each stack keeps at least 1", () => {
    const list = [arrows];
    expect(splitEquipmentItem(list, "a1", 10)).toBe(list);
    expect(splitEquipmentItem(list, "a1", 0)).toBe(list);
    expect(splitEquipmentItem(list, "missing", 2)).toBe(list);
  });
});
