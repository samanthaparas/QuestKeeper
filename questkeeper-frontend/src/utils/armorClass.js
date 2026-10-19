// AC from worn armor. Armor and shields in the inventory can be marked
// "Equipped"; while the sheet's AC is on auto (acMode "auto") it's worked
// out from them: armor base + Dexterity (capped for medium, none for heavy),
// + a shield, or Unarmored Defense with nothing on. Magic armor counts as
// the armor it's made from, plus its bonus (see magicArmorFor below). The number is still saved
// in combat.armorClass, so everything else (the table, the DM) sees it.
// Typing an AC switches to manual (acMode "manual"); older sheets have no
// acMode and stay manual until the player equips something.

import { computeStartingArmorClass, getFightingStyles } from "./characterSheet";

const ARMOR_CATEGORIES = ["Light", "Medium", "Heavy", "Shield"];

export function isArmorDetails(details) {
  return ARMOR_CATEGORIES.includes(details?.armor_category);
}

// Magic armor isn't in the SRD's plain equipment list, so it has no AC of its
// own there. Each one is really a normal armor underneath ("Armor (plate)"
// in its description), sometimes with a bonus. These are the SRD's magic
// armors and shields that name one armor, with their bonus to AC.
const MAGIC_ARMOR = [
  { name: "armor of invulnerability", base: "plate-armor", bonus: 0 },
  { name: "armor of vulnerability", base: "plate-armor", bonus: 0 },
  { name: "demon armor", base: "plate-armor", bonus: 1 },
  { name: "dwarven plate", base: "plate-armor", bonus: 2 },
  { name: "plate armor of etherealness", base: "plate-armor", bonus: 0 },
  { name: "elven chain", base: "chain-shirt", bonus: 1 },
  { name: "glamoured studded leather", base: "studded-leather-armor", bonus: 1 },
  // Covers every color too ("Red Dragon Scale Mail").
  { name: "dragon scale mail", base: "scale-mail", bonus: 1 },
  { name: "animated shield", base: "shield", bonus: 0 },
  { name: "arrow-catching shield", base: "shield", bonus: 0 },
  { name: "shield of missile attraction", base: "shield", bonus: 0 },
  { name: "spellguard shield", base: "shield", bonus: 0 },
];

// Plain armor names, longest first so "half plate" wins over "plate" and
// "studded leather" over "leather".
const BASE_ARMOR_WORDS = [
  ["studded leather", "studded-leather-armor"],
  ["half plate", "half-plate-armor"],
  ["chain shirt", "chain-shirt"],
  ["chain mail", "chain-mail"],
  ["scale mail", "scale-mail"],
  ["ring mail", "ring-mail"],
  ["breastplate", "breastplate"],
  ["padded", "padded-armor"],
  ["leather", "leather-armor"],
  ["splint", "splint-armor"],
  ["plate", "plate-armor"],
  ["hide", "hide-armor"],
  ["shield", "shield"],
];

// Magic armor that can be any armor (+1 Armor, Mithral, Adamantine, Armor of
// Resistance): the player says which by putting it in the name, like
// "+1 Leather Armor" or "Mithral Half Plate".
const ANY_ARMOR_CUES = /\+[1-3]\b|\bmithral\b|\badamantine\b|\barmor of resistance\b/;

// For an inventory name that's magic armor: the plain armor it's made from
// (an SRD equipment index) and its bonus to AC. Null when it isn't magic
// armor, or the name doesn't say which armor it is.
export function magicArmorFor(name) {
  const text = String(name ?? "").toLowerCase();
  const known = MAGIC_ARMOR.find((entry) => text.includes(entry.name));
  if (known) return { base: known.base, bonus: known.bonus };
  if (!ANY_ARMOR_CUES.test(text)) return null;
  const word = BASE_ARMOR_WORDS.find(([armorWord]) =>
    new RegExp(`\\b${armorWord}\\b`).test(text),
  );
  if (!word) return null;
  const bonus = Number(text.match(/\+([1-3])\b/)?.[1] ?? 0);
  return { base: word[1], bonus };
}

// The plain armor's details with the magic bonus added to its AC, so the AC
// math treats "+1 Chain Mail" as chain mail with a 17 instead of a 16.
export function withArmorBonus(details, bonus) {
  if (!details || !bonus) return details;
  const armorClass = details.armor_class ?? {};
  return {
    ...details,
    armor_class: { ...armorClass, base: (armorClass.base ?? 0) + bonus },
  };
}

// detailsFor(item): the item's SRD details, or null if unknown/not loaded.
// Returns null when an equipped item's details haven't loaded yet, so a
// half-known AC is never saved.
export function computeWornArmorClass(sheet, detailsFor) {
  const equipped = (sheet?.equipment ?? []).filter((item) => item.equipped);
  const details = equipped.map(detailsFor);
  if (details.some((entry) => entry === undefined)) return null;
  return computeStartingArmorClass({
    gear: details.filter(isArmorDetails),
    scores: sheet.abilityScores,
    classId: sheet.class?.id,
    fightingStyles: getFightingStyles(sheet.features),
  });
}

// The sheet with its AC worked out, when it's on auto and the numbers are known.
export function withAutoArmorClass(sheet, detailsFor) {
  if (sheet?.acMode !== "auto") return sheet;
  const armorClass = computeWornArmorClass(sheet, detailsFor);
  if (armorClass === null || armorClass === sheet.combat?.armorClass) return sheet;
  return { ...sheet, combat: { ...sheet.combat, armorClass } };
}

// Starting gear, worn: any shield, plus the one body armor that gives the
// best AC (a character starting with two armors wears one). gear: SRD
// details of each item, matched by index.
export function equipStartingArmor(equipment = [], gear = [], { scores, classId } = {}) {
  const detailsByIndex = new Map(gear.map((details) => [details.index, details]));
  const acWith = (details) => computeStartingArmorClass({ gear: [details], scores, classId });
  const bodyArmor = equipment
    .map((item) => detailsByIndex.get(item.index))
    .filter((details) => ["Light", "Medium", "Heavy"].includes(details?.armor_category))
    .sort((a, b) => acWith(b) - acWith(a))[0];

  return equipment.map((item) => {
    const details = detailsByIndex.get(item.index);
    const wear = details?.armor_category === "Shield" || (bodyArmor && details === bodyArmor);
    return wear ? { ...item, equipped: true } : item;
  });
}

// --- One body armor and one shield at a time --------------------------------------
//
// A character wears one body armor (light, medium or heavy) and at most one
// shield. The AC above already copes with more (it counts the best body armor
// and the first shield), but wearing two is a mistake, so equipping is
// checked here. Only the "equipped" mark ever changes: nothing is removed
// from the inventory.

// Which slot an armor fills: "body", "shield", or null for anything else.
export function armorSlot(details) {
  if (details?.armor_category === "Shield") return "shield";
  return ["Light", "Medium", "Heavy"].includes(details?.armor_category) ? "body" : null;
}

// The items already worn in the same slot as this one (not counting it).
export function wornInSameSlot(sheet, item, detailsFor) {
  const slot = armorSlot(detailsFor(item));
  if (!slot) return [];
  return (sheet?.equipment ?? []).filter(
    (other) => other.index !== item.index && other.equipped && armorSlot(detailsFor(other)) === slot,
  );
}

// Puts an armor or shield on. If something is already worn in its slot it
// isn't equipped; { blockedBy: [items] } says what's in the way, so the
// player can choose to swap. swap: take those off and put this on.
// Returns { sheet } or { sheet, blockedBy } (then the sheet is unchanged).
export function equipArmor(sheet, itemIndex, detailsFor, { swap = false } = {}) {
  const item = (sheet?.equipment ?? []).find((entry) => entry.index === itemIndex);
  if (!item) return { sheet };
  const blockedBy = wornInSameSlot(sheet, item, detailsFor);
  if (blockedBy.length > 0 && !swap) return { sheet, blockedBy };
  const takeOff = new Set(blockedBy.map((other) => other.index));
  return {
    sheet: {
      ...sheet,
      equipment: sheet.equipment.map((entry) =>
        entry.index === itemIndex ? { ...entry, equipped: true } : takeOff.has(entry.index) ? { ...entry, equipped: false } : entry,
      ),
    },
  };
}

// Sheets saved before this check can wear two of a kind. Each conflict says
// which slot, the items worn, and which one the AC counts now (the best body
// armor; the first shield), so the player can take one off.
export function findArmorConflicts(sheet, detailsFor) {
  const worn = (sheet?.equipment ?? []).filter((item) => item.equipped);
  return ["body", "shield"].flatMap((slot) => {
    const items = worn.filter((item) => armorSlot(detailsFor(item)) === slot);
    if (items.length < 2) return [];
    const acWith = (item) => computeStartingArmorClass({ gear: [detailsFor(item)], scores: sheet.abilityScores });
    const counted = slot === "body" ? [...items].sort((a, b) => acWith(b) - acWith(a))[0] : items[0];
    return [{ slot, items, counted }];
  });
}
