// Temporary combat effects: spells and features that change an attack for a
// while (Elemental Weapon now; Magic Weapon, Hunter's Mark and others later).
//
// The idea: a weapon attack's saved numbers (to hit +9, damage 1d4+5) never
// change. An active effect is kept beside them on the sheet
// (sheet.activeEffects), and getEffectiveAttack works out the attack's live
// numbers from both whenever it's shown or rolled. Ending the effect just
// removes it, so the weapon is exactly as it was. Nothing here writes to an
// attack, which also keeps the "out of date" notice and the
// follow-your-scores updates looking at the real saved numbers.
//
// An effect that needs concentration is tied to it by id: the sheet's
// concentration says { spell, effectId }. If concentration ends any way at
// all (dropped, a failed save, 0 HP, casting something else), the effect is
// no longer active, and withEffectsEnded tidies it away as the sheet saves.
//
// Elemental Weapon isn't in the SRD, so only its numbers and a short summary
// in our own words are kept here; the book has the full wording.

import { attackWeaponFor, spendSpellCasting } from "./characterSheet";

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// --- What each effect does ---------------------------------------------------
//
// Each template says how it's cast and what it changes, so a new spell is
// mostly a new entry here. modifiers(level, choices) lists the changes at a
// spell level, each one of:
//   { kind: "toHit", value }                 added to attack rolls only
//   { kind: "damageBonus", value }           added to the weapon's own damage
//   { kind: "extraDice", dice, type }        rolled separately, on every hit
// Kept separate on purpose: a +1 to attack is not a +1 to damage, and extra
// dice keep their own damage type (fire stays fire, for resistances).
export const EFFECT_TEMPLATES = {
  elementalWeapon: {
    key: "elementalWeapon",
    spell: "Elemental Weapon",
    baseLevel: 3,
    concentration: true,
    // Up to 1 hour. A short rest takes at least an hour, so any rest ends it.
    durationMinutes: 60,
    durationText: "Concentration, up to 1 hour",
    // One nonmagical weapon (it becomes a magic weapon while it lasts).
    target: "weapon",
    damageTypes: ["Acid", "Cold", "Fire", "Lightning", "Thunder"],
    summary:
      "Touch a nonmagical weapon: it becomes magic, with a bonus to attack rolls and extra damage of the type you choose on every hit.",
    // 3rd-4th level slot: +1 and 1d4. 5th-6th: +2 and 2d4. 7th or higher:
    // +3 and 3d4. No bonus to the weapon's own damage.
    modifiers(level, choices) {
      const bonus = level >= 7 ? 3 : level >= 5 ? 2 : 1;
      return [
        { kind: "toHit", value: bonus },
        { kind: "extraDice", dice: `${bonus}d4`, type: choices.damageType },
      ];
    },
  },
};

// The template for a spell on the sheet ("Elemental Weapon"), or null.
export function effectTemplateForSpell(spellName) {
  return Object.values(EFFECT_TEMPLATES).find((template) => sameName(template.spell, spellName)) ?? null;
}

// --- Active effects ------------------------------------------------------------------

// Still going? One needing concentration only while that concentration is
// held for it (by id, so recasting the same spell later can't revive an old
// one). Its weapon must still be on the sheet too.
export function isEffectActive(sheet, effect) {
  if (!EFFECT_TEMPLATES[effect?.key]) return false;
  if (effect.concentration && sheet?.concentration?.effectId !== effect.id) return false;
  if (effect.attackIndex && !(sheet?.attacks ?? []).some((attack) => attack.index === effect.attackIndex)) {
    return false;
  }
  return true;
}

export function getActiveEffects(sheet) {
  return (sheet?.activeEffects ?? []).filter((effect) => isEffectActive(sheet, effect));
}

// The active effects on one attack.
export function getAttackEffects(sheet, attack) {
  return getActiveEffects(sheet).filter((effect) => effect.attackIndex && effect.attackIndex === attack?.index);
}

// Drops effects that have ended some other way (see the top of the file), so
// the saved sheet never shows one as still going. Run as the sheet saves.
export function withEffectsEnded(sheet) {
  const effects = sheet?.activeEffects;
  if (!Array.isArray(effects) || effects.length === 0) return sheet;
  const active = effects.filter((effect) => isEffectActive(sheet, effect));
  return active.length === effects.length ? sheet : { ...sheet, activeEffects: active };
}

// --- Which weapons can take it ---------------------------------------------------

// An attack that's already magic: a +1 in its name or base weapon, or an
// active effect already enchanting it (two enchantments never stack).
// ignoreConcentration: leave out effects held by concentration, because a
// new concentration spell ends them (recasting on the same weapon is fine).
export function isMagicAttack(sheet, attack, { ignoreConcentration = false } = {}) {
  if (attackWeaponFor(attack, () => null).magicBonus > 0) return true;
  return getAttackEffects(sheet, attack).some((effect) => !(ignoreConcentration && effect.concentration));
}

// The attacks a weapon effect can go on: weapons that aren't already magic.
// QuestKeeper can't always tell a magic weapon with a plain name ("Night
// Terror Longsword"), so the cast panel reminds the player too.
export function getEligibleWeapons(sheet, template) {
  if (template?.target !== "weapon") return [];
  return (sheet?.attacks ?? []).filter(
    (attack) =>
      !/unarmed/i.test(attack.name ?? "") &&
      !isMagicAttack(sheet, attack, { ignoreConcentration: Boolean(template.concentration) }),
  );
}

// --- Casting and ending ------------------------------------------------------------

// Casts a template's spell. choices: { attackIndex, damageType, slotLevel }.
// Spends the slot, starts concentration on it (ending any other, as casting a
// concentration spell does), and adds the effect. Returns { sheet, effect }
// or { error } in plain words; nothing changes on an error.
export function castEffect(sheet, key, choices = {}) {
  const template = EFFECT_TEMPLATES[key];
  if (!template) return { error: "QuestKeeper can't cast that spell for you yet." };

  const level = Number(choices.slotLevel);
  if (!Number.isInteger(level) || level < template.baseLevel || level > 9) {
    return { error: `${template.spell} needs a spell slot of level ${template.baseLevel} or higher.` };
  }
  if (template.damageTypes && !template.damageTypes.includes(choices.damageType)) {
    return { error: `Choose a damage type: ${template.damageTypes.join(", ")}.` };
  }
  let attack = null;
  if (template.target === "weapon") {
    attack = getEligibleWeapons(sheet, template).find((item) => item.index === choices.attackIndex);
    if (!attack) return { error: `Choose a nonmagical weapon for ${template.spell}.` };
  }

  const paid = spendSpellCasting(sheet, { spell: template.spell, level, payWith: "slot" });
  if (!paid) return { error: `No level ${level} spell slots left.` };

  const effect = {
    id: crypto.randomUUID(),
    key: template.key,
    spell: template.spell,
    slotLevel: level,
    ...(attack ? { attackIndex: attack.index, attackName: attack.name } : {}),
    ...(choices.damageType ? { damageType: choices.damageType } : {}),
    concentration: Boolean(template.concentration),
    // When it was cast, for the player's reference only. Effects never end
    // by the clock: in-game time isn't real time (see endEffectsForRest).
    castAt: new Date().toISOString(),
  };
  const next = {
    ...paid,
    activeEffects: [...(paid.activeEffects ?? []), effect],
    ...(template.concentration ? { concentration: { spell: template.spell, effectId: effect.id } } : {}),
  };
  // Anything that needed the old concentration ends now.
  return { sheet: withEffectsEnded(next), effect };
}

// Ends an effect by hand (its End button). Concentration held for it ends too.
export function endEffect(sheet, effectId) {
  const holdsConcentration = sheet?.concentration?.effectId === effectId;
  return {
    ...sheet,
    activeEffects: (sheet?.activeEffects ?? []).filter((effect) => effect.id !== effectId),
    ...(holdsConcentration ? { concentration: null } : {}),
  };
}

// A rest is the one clear marker of in-game time passing outside a fight: a
// short rest is at least an hour, a long rest at least eight. Effects that
// can't outlast it end (Elemental Weapon lasts up to an hour, so either rest
// ends it). Returns the sheet and the names of the spells that ended.
export function endEffectsForRest(sheet, restType) {
  const restMinutes = restType === "long" ? 480 : 60;
  const ending = getActiveEffects(sheet).filter(
    (effect) => (EFFECT_TEMPLATES[effect.key].durationMinutes ?? 0) <= restMinutes,
  );
  const next = ending.reduce((current, effect) => endEffect(current, effect.id), withEffectsEnded(sheet));
  return { sheet: next, ended: ending.map((effect) => effect.spell) };
}

// --- An attack's live numbers ------------------------------------------------------

const lower = (text) => String(text ?? "").trim().toLowerCase();

// The attack as it is right now, with its active effects counted:
//   toHit         the saved bonus plus any effect bonuses
//   damageParts   [{ dice, type, source }]: the weapon's own damage first,
//                 then each effect's extra dice, each with its own type
//   modifiers     [{ source, text }] for "where does this come from"
//   effects       the active effects on it
// The saved attack is never changed; with no effects it comes back with the
// same numbers and one damage part. `sheet` can be a preview (see
// previewEffect).
export function getEffectiveAttack(sheet, attack) {
  const effects = getAttackEffects(sheet, attack);
  let toHit = Number(attack?.toHit) || 0;
  let damageBonus = 0;
  const extraParts = [];
  const modifiers = [];

  effects.forEach((effect) => {
    EFFECT_TEMPLATES[effect.key].modifiers(effect.slotLevel, effect).forEach((modifier) => {
      if (modifier.kind === "toHit") {
        toHit += modifier.value;
        modifiers.push({ source: effect.spell, text: `+${modifier.value} to hit` });
      } else if (modifier.kind === "damageBonus") {
        damageBonus += modifier.value;
        modifiers.push({ source: effect.spell, text: `+${modifier.value} damage` });
      } else if (modifier.kind === "extraDice") {
        extraParts.push({ dice: modifier.dice, type: lower(modifier.type), source: effect.spell });
        modifiers.push({ source: effect.spell, text: `+${modifier.dice} ${lower(modifier.type)} damage` });
      }
    });
  });

  const weaponDamage = String(attack?.damage ?? "").trim();
  return {
    ...attack,
    toHit,
    baseToHit: Number(attack?.toHit) || 0,
    damageParts: [
      {
        dice: damageBonus && weaponDamage ? `${weaponDamage}+${damageBonus}` : weaponDamage,
        type: lower(attack?.damageType),
        source: attack?.name ?? "",
      },
      ...extraParts,
    ],
    modifiers,
    effects,
    isEnchanted: effects.length > 0,
  };
}

// "1d4+5 piercing + 1d4 fire": the damage parts as one line to read.
export function describeDamageParts(parts = []) {
  return parts
    .filter((part) => part.dice)
    .map((part) => `${part.dice}${part.type ? ` ${part.type}` : ""}`)
    .join(" + ");
}

// --- For the cast panel -------------------------------------------------------------

// The slot levels this spell can be cast with: its own level and up, only
// levels the character has slots at, with how many are left.
export function getCastSlotLevels(sheet, template) {
  return (sheet?.spellcasting?.spellSlots ?? [])
    .filter((slot) => slot.level >= template.baseLevel && slot.max > 0)
    .map((slot) => ({ level: slot.level, current: slot.current, max: slot.max }));
}

// What casting would make an attack, before it's cast (the panel's preview).
export function previewEffect(sheet, key, choices) {
  const template = EFFECT_TEMPLATES[key];
  const attack = (sheet?.attacks ?? []).find((item) => item.index === choices.attackIndex);
  if (!template || !attack) return null;
  const effect = {
    id: "preview",
    key,
    spell: template.spell,
    slotLevel: Number(choices.slotLevel) || template.baseLevel,
    attackIndex: attack.index,
    damageType: choices.damageType,
    concentration: false,
  };
  return getEffectiveAttack({ ...sheet, activeEffects: [effect] }, attack);
}
