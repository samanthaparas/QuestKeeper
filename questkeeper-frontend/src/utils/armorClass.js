// AC from worn armor. Armor and shields in the inventory can be marked
// "Equipped"; while the sheet's AC is on auto (acMode "auto") it's worked
// out from them: armor base + Dexterity (capped for medium, none for heavy),
// + a shield, or Unarmored Defense with nothing on. Magic armor counts as
// the armor it's made from, plus its bonus (see magicArmorFor below). The number is still saved
// in combat.armorClass, so everything else (the table, the DM) sees it.
// Typing an AC switches to manual (acMode "manual"); older sheets have no
// acMode and stay manual until the player equips something.

import { computeStartingArmorClass } from "./characterSheet";

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
