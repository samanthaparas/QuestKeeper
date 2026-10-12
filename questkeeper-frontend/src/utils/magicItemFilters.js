// Filtering and sorting for the Magic Items page, plus reading and writing the
// filters in the page address (so a DM can bookmark "Rare, worn, no
// attunement"). Works on catalog entries from the backend and on the book
// items in bookMagicItems.js, which share one shape.

import { getSourceLabel } from "./sourceFilters";

export const RARITIES = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];
export const TYPES = [
  "Wondrous Item", "Weapon", "Armor", "Shield", "Ring", "Potion", "Scroll",
  "Rod", "Staff", "Wand", "Ammunition",
];
export const SLOTS = [
  "Head", "Eyes", "Neck", "Shoulders", "Body", "Hands", "Wrists", "Waist",
  "Feet", "Ring", "Armor", "Shield",
];
export const USES = [
  "Healing", "Damage", "Defense", "Movement", "Stealth", "Senses",
  "Communication", "Storage", "Control", "Summoning", "Ability boost", "Utility",
];
export const CLASSES = [
  "artificer", "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
];
// Who counts as a "spellcaster" when an item asks for one.
const SPELLCASTERS = new Set(["artificer", "bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"]);

export const DEFAULT_FILTERS = {
  q: "",
  rarity: [], // any of these rarities
  type: "",
  slot: "", // "" any, "worn" anything worn, or one slot
  consumable: "any", // "any" | "only" | "hide"
  attunement: "any", // "any" | "required" | "none"
  usableBy: "", // a class, or "" for no limit
  uses: [], // any of these
  source: "all",
  sort: "name", // "name" | "rarity"
};

// Can this class use the item? Items with no class limit are usable by all.
export function usableByClass(item, classIndex) {
  if (!classIndex) return true;
  const limits = item.attunementLimits ?? {};
  if (limits.classes?.length > 0) return limits.classes.includes(classIndex);
  if (limits.spellcaster) return SPELLCASTERS.has(classIndex);
  return true;
}

export function filterMagicItems(items, filters) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const query = f.q.trim().toLowerCase();

  const matches = items.filter((item) => {
    if (query && !item.name.toLowerCase().includes(query)) return false;
    if (f.rarity.length > 0 && !item.rarities.some((r) => f.rarity.includes(r))) return false;
    if (f.type && item.type !== f.type) return false;
    if (f.slot === "worn" && !item.wornSlot) return false;
    if (f.slot && f.slot !== "worn" && item.wornSlot !== f.slot) return false;
    if (f.consumable === "only" && item.consumable !== true) return false;
    if (f.consumable === "hide" && item.consumable === true) return false;
    if (f.attunement === "required" && !item.attunement) return false;
    if (f.attunement === "none" && item.attunement) return false;
    if (!usableByClass(item, f.usableBy)) return false;
    if (f.uses.length > 0 && !item.usefulFor.some((u) => f.uses.includes(u))) return false;
    if (f.source !== "all" && getSourceLabel(item) !== f.source) return false;
    return true;
  });

  return [...matches].sort((a, b) =>
    f.sort === "rarity"
      ? a.rarityRank - b.rarityRank || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name) || a.source.localeCompare(b.source),
  );
}

// --- Filters <-> page address ("?rarity=Rare,Legendary&slot=worn") ------------

const LIST_KEYS = ["rarity", "uses"];

export function filtersFromParams(params) {
  const filters = { ...DEFAULT_FILTERS };
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    const value = params.get(key);
    if (value === null) continue;
    filters[key] = LIST_KEYS.includes(key) ? value.split(",").filter(Boolean) : value;
  }
  return filters;
}

// Only filters that differ from the defaults, so the address stays short.
export function filtersToParams(filters) {
  const params = {};
  for (const [key, value] of Object.entries(filters)) {
    const fallback = DEFAULT_FILTERS[key];
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = value.join(",");
    } else if (value !== fallback && value !== "") {
      params[key] = value;
    }
  }
  return params;
}

export function activeFilterCount(filters) {
  return Object.keys(filtersToParams({ ...filters, sort: DEFAULT_FILTERS.sort })).length;
}

// "Requires attunement by a Cleric or Paladin", "...by a good creature",
// "Requires attunement", or null when it doesn't need attunement.
export function attunementLine(item) {
  if (!item.attunement) return null;
  const limits = item.attunementLimits ?? {};
  const capitalize = (name) => name.charAt(0).toUpperCase() + name.slice(1);

  const who = [
    ...(limits.classes ?? []).map(capitalize),
    ...(limits.races ?? []).map(capitalize),
    ...(limits.spellcaster ? ["spellcaster"] : []),
  ];
  if (limits.alignments?.length > 0) who.push(`${limits.alignments.join(" or ")} creature`);
  if (who.length === 0) return "Requires attunement";

  const list = who.length > 1 ? `${who.slice(0, -1).join(", ")} or ${who.at(-1)}` : who[0];
  return `Requires attunement by a ${list}`;
}

// "Longsword" / "Any of 39 weapons" / null, for weapons and armor.
export function kindLine(item) {
  const kinds = item.kinds ?? [];
  if (kinds.length === 0) return null;
  if (kinds.length <= 3) return kinds.join(", ");
  const noun = item.type === "Armor" ? "armor types" : "weapons";
  return `Any of ${kinds.length} ${noun}`;
}

// The class names for a colored rarity pill ("Rare to Legendary" uses Rare).
export function rarityClass(rarity) {
  const first = String(rarity).split(" to ")[0];
  return `magic-item-rarity magic-item-rarity--${first.toLowerCase().replace(/\s+/g, "-")}`;
}
