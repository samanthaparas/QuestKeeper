// AC from worn armor. Armor and shields in the inventory can be marked
// "Equipped"; while the sheet's AC is on auto (acMode "auto") it's worked
// out from them: armor base + Dexterity (capped for medium, none for heavy),
// + a shield, or Unarmored Defense with nothing on. The number is still saved
// in combat.armorClass, so everything else (the table, the DM) sees it.
// Typing an AC switches to manual (acMode "manual"); older sheets have no
// acMode and stay manual until the player equips something.

import { computeStartingArmorClass } from "./characterSheet";

const ARMOR_CATEGORIES = ["Light", "Medium", "Heavy", "Shield"];

export function isArmorDetails(details) {
  return ARMOR_CATEGORIES.includes(details?.armor_category);
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
