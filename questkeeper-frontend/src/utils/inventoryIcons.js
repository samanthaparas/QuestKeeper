// Which small picture goes with an inventory category heading, or with the
// chosen Show filter. Only pictures: an item's category always comes from
// getInventoryCategory (the player's pick, else the app's guess), and
// filtering works exactly as before.
//
// Categories and filters are kept apart on purpose. The category "worn"
// means Worn items (cloaks, rings, boots: a cloak picture). The filter
// "worn" means Wearing (armor), whether armor is equipped right now (a
// shield with a check). So "category:worn" and "worn" never share a picture.
// Attuned, Wearing, Equipped weapons and Proficient are states, not
// categories.

export const CATEGORY_ICONS = Object.freeze({
  weapons: "weapons",
  armor: "armor",
  worn: "worn",
  gear: "gear",
  consumables: "consumables",
  treasure: "treasure",
});

export const FILTER_ICONS = Object.freeze({
  "": "all",
  all: "all",
  attuned: "attuned",
  worn: "wearing",
  wielded: "wielded",
  proficient: "proficient",
});

const has = (map, key) => typeof key === "string" && Object.hasOwn(map, key);

// The picture for a category key. Anything unknown gets the Gear & tools
// picture, as the app files unknown items under Gear & tools.
export function inventoryCategoryIconId(categoryKey) {
  return has(CATEGORY_ICONS, categoryKey) ? CATEGORY_ICONS[categoryKey] : "gear";
}

// The picture for a Show filter key ("" is All). "category:worn" uses the
// category's picture; a filter this doesn't know (Favourites, which has
// its own ♥) gets none (null) rather than a misleading one.
export function inventoryFilterIconId(filterKey) {
  if (typeof filterKey === "string" && filterKey.startsWith("category:")) {
    return inventoryCategoryIconId(filterKey.slice("category:".length));
  }
  return has(FILTER_ICONS, filterKey) ? FILTER_ICONS[filterKey] : null;
}
