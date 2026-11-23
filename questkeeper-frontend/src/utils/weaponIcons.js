// Which small picture to show beside a weapon's name on the Actions tab.
//
// This is only for recognising a weapon at a glance. It never decides or
// changes anything about the weapon: to hit, damage, proficiency and the
// item's type all come from the weapon's own facts, as before.
//
// The picture comes from what the weapon is, never from guessing at words:
//   1. the weapon type saved on the attack ("Longbow" for "Wisteria's Kiss"),
//   2. the weapon type of the inventory item it's linked to,
//   3. the attack's own name, only when it is exactly a weapon's name
//      ("Longbow", "+1 Dagger", "Crossbow, light", "Light Crossbow"),
//   4. the linked item's name, the same way.
// Anything else (a homebrew "Frost Bow of Secrets") gets the plain
// custom-item tag, which doesn't look like any one weapon. "Club Sandwich"
// is not a club. Magic items that can be any weapon (a Flame Tongue, a
// Defender) take their picture from the weapon type saved on them.
import { splitMagicWeaponName } from "./characterSheet";

// The 39 ordinary weapons: the 37 in the 2014 rules plus the 2024 Pistol
// and Musket. Same spellings as the rules server's weapon ids.
export const BASE_WEAPON_ICON_IDS = Object.freeze([
  "club", "dagger", "greatclub", "handaxe", "javelin", "light-hammer",
  "mace", "quarterstaff", "sickle", "spear", "crossbow-light", "dart",
  "shortbow", "sling", "battleaxe", "flail", "glaive", "greataxe",
  "greatsword", "halberd", "lance", "longsword", "maul", "morningstar",
  "pike", "rapier", "scimitar", "shortsword", "trident", "war-pick",
  "warhammer", "whip", "blowgun", "crossbow-hand", "crossbow-heavy",
  "longbow", "net", "pistol", "musket",
]);

// Pictures for creatures' natural attacks (a wolf's Bite), plus a few
// extra weapon shapes from the pack and the two fallbacks. Having a picture
// doesn't add any of these weapons or their rules to QuestKeeper.
export const NATURAL_ATTACK_ICON_IDS = Object.freeze(["unarmed-strike", "bite", "claw", "horn", "tail", "tentacle"]);
export const EXTRA_ICON_IDS = Object.freeze([
  "boomerang", "yklwa", "double-bladed-scimitar", "hoopak",
  ...NATURAL_ATTACK_ICON_IDS,
  "improvised-weapon", "custom-weapon",
]);

export const FALLBACK_ICON_ID = "custom-weapon";

const KNOWN = new Set([...BASE_WEAPON_ICON_IDS, ...EXTRA_ICON_IDS]);

// Other ways the same weapon is written. The 2024 rules say "Light
// Crossbow" where 2014 says "Crossbow, light", for example.
const ALIASES = Object.freeze({
  "light-crossbow": "crossbow-light",
  "hand-crossbow": "crossbow-hand",
  "heavy-crossbow": "crossbow-heavy",
  "long-bow": "longbow",
  "short-bow": "shortbow",
  "short-sword": "shortsword",
  "long-sword": "longsword",
  "great-sword": "greatsword",
  "hand-axe": "handaxe",
  "battle-axe": "battleaxe",
  "great-axe": "greataxe",
  "great-club": "greatclub",
  "war-hammer": "warhammer",
  "morning-star": "morningstar",
  "quarter-staff": "quarterstaff",
  "warpick": "war-pick",
  unarmed: "unarmed-strike",
  fist: "unarmed-strike",
  punch: "unarmed-strike",
  claws: "claw",
  // A bird's talons are drawn with the claw picture.
  talon: "claw",
  talons: "claw",
  horns: "horn",
  tentacles: "tentacle",
  improvised: "improvised-weapon",
  // Magic weapons on the rules server's 2014 weapon list that are always
  // one particular weapon (a Dagger of Venom is a dagger). Ones that can
  // be any sword or any weapon (Flame Tongue, Vorpal Sword) aren't here:
  // they show what their weapon type says, or the plain picture.
  "dagger-of-venom": "dagger",
  "javelin-of-lightning": "javelin",
  "mace-of-disruption": "mace",
  "mace-of-smiting": "mace",
  "mace-of-terror": "mace",
  "oathbow": "longbow",
  "scimitar-of-speed": "scimitar",
  "trident-of-fish-command": "trident",
  "dwarven-thrower": "warhammer",
  "hammer-of-thunderbolts": "maul",
});

// "+1 Dagger" / "Dagger +1" -> "dagger"; "Crossbow, light" ->
// "crossbow-light". The +1 is taken off the same way the rest of the sheet
// reads it (splitMagicWeaponName).
function toKey(value) {
  const text = splitMagicWeaponName(String(value ?? "").normalize("NFKC")).baseName;
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The picture for exactly this name or id, or null.
function exactIcon(value) {
  const candidates = value && typeof value === "object" ? [value.index, value.id, value.name] : [value];
  for (const candidate of candidates) {
    const key = toKey(candidate);
    if (!key) continue;
    const id = ALIASES[key] ?? key;
    if (KNOWN.has(id)) return id;
  }
  return null;
}

// The pack's own order: a chosen picture, then the saved weapon type, then
// a weapon id, then an exact ordinary name, then the plain picture.
export function resolveWeaponIcon({ iconId, baseWeapon, weaponId, name } = {}) {
  return exactIcon(iconId) ?? exactIcon(baseWeapon) ?? exactIcon(weaponId) ?? exactIcon(name) ?? FALLBACK_ICON_ID;
}

const sameText = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// The picture for one of the character's attacks. item: the inventory
// weapon it's linked to (linkedItemFor), if any. spellNames: the spells on
// the sheet; an attack that is just one of them ("Fire Bolt" typed in as
// an attack) gets no weapon picture at all (null).
export function weaponIconForAttack(attack, { item = null, spellNames = [] } = {}) {
  const typed =
    exactIcon(attack?.baseWeapon) ?? exactIcon(item?.baseWeapon) ?? exactIcon(attack?.name) ?? exactIcon(item?.name);
  if (typed) return typed;
  const hasWeaponType = String(attack?.baseWeapon ?? "").trim() || String(item?.baseWeapon ?? "").trim();
  if (!hasWeaponType && !item && spellNames.some((spell) => sameText(spell, attack?.name))) return null;
  return FALLBACK_ICON_ID;
}

// The picture for a companion's attack: only when its name is exactly a
// natural attack or a weapon ("Bite", "Claws", "Talons", "Shortsword").
// Nothing is guessed from the creature itself; anything else gets the plain
// custom-item tag.
export function weaponIconForCompanionAttack(attack) {
  return exactIcon(attack?.name) ?? FALLBACK_ICON_ID;
}
