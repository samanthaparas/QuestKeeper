import { describe, it, expect } from "vitest";
import { CATEGORY_ICONS, FILTER_ICONS, inventoryCategoryIconId, inventoryFilterIconId } from "./inventoryIcons";
import { INVENTORY_CATEGORIES } from "./characterSheet";
import { inventoryIconShapes } from "../components/InventoryIcon/inventoryIconShapes";

describe("inventory icons", () => {
  it("has a picture for every category the app has, and a drawing for every picture", () => {
    expect(Object.keys(CATEGORY_ICONS).sort()).toEqual(INVENTORY_CATEGORIES.map((category) => category.key).sort());
    for (const id of [...Object.values(CATEGORY_ICONS), ...Object.values(FILTER_ICONS)]) {
      expect(inventoryIconShapes[id], id).toBeDefined();
    }
    expect(Object.keys(inventoryIconShapes)).toHaveLength(11);
  });

  it("keeps Worn items (a category) apart from Wearing (armor) (a filter)", () => {
    expect(inventoryCategoryIconId("worn")).toBe("worn");
    expect(inventoryFilterIconId("category:worn")).toBe("worn");
    expect(inventoryFilterIconId("worn")).toBe("wearing");
    expect(inventoryFilterIconId("worn")).not.toBe(inventoryFilterIconId("category:worn"));
  });

  it("gives each Show filter its own picture, with All for no filter", () => {
    expect(inventoryFilterIconId("")).toBe("all");
    expect(inventoryFilterIconId("attuned")).toBe("attuned");
    expect(inventoryFilterIconId("wielded")).toBe("wielded");
    expect(inventoryFilterIconId("proficient")).toBe("proficient");
    for (const category of INVENTORY_CATEGORIES) {
      expect(inventoryFilterIconId(`category:${category.key}`)).toBe(category.key);
    }
  });

  it("falls back safely for anything unknown", () => {
    for (const key of ["unknown", "constructor", "__proto__", "", undefined, null, 4]) {
      expect(inventoryCategoryIconId(key), String(key)).toBe("gear");
    }
    expect(inventoryFilterIconId("category:mystery")).toBe("gear");
    // A filter with its own mark (Favourites' ♥) or one this doesn't know: no picture.
    for (const key of ["favorites", "unknown", "constructor", undefined]) {
      expect(inventoryFilterIconId(key), String(key)).toBeNull();
    }
  });
});
