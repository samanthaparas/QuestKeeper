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

import {
  attackWeaponFor,
  formatModifier,
  getFightingStyles,
  getProficiencyBonus,
  getWeaponAttackMath,
  hasFeat,
  isMagicWeaponAttack,
  spendSpellCasting,
} from "./characterSheet";
import { parseDamage } from "./attacks";

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
  if (isMagicWeaponAttack(attack)) return true;
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

// Adds a flat bonus to a damage text, folding it into the flat part that's
// already there: "1d8+7" and 10 make "1d8+17", not "1d8+7+10". Text the app
// can't read just gets "+10" on the end.
export function addFlatDamage(damageText, bonus) {
  const text = String(damageText ?? "").trim();
  if (!bonus) return text;
  if (!text) return String(bonus);
  const parts = parseDamage(text);
  if (!parts) return `${text}${bonus >= 0 ? "+" : ""}${bonus}`;
  const flat = parts.filter((part) => part.type === "flat").reduce((sum, part) => sum + part.sign * part.value, 0) + bonus;
  const dice = parts
    .filter((part) => part.type === "dice")
    .map((part, i) => `${part.sign < 0 ? "-" : i === 0 ? "" : "+"}${part.count}d${part.sides}`)
    .join("");
  if (!dice) return String(flat);
  return flat === 0 ? dice : `${dice}${flat > 0 ? "+" : ""}${flat}`;
}

// --- Sharpshooter ----------------------------------------------------------------
//
// Sharpshooter (the 2014 feat) lets a ranged weapon attack take -5 to hit
// for +10 damage. The 2024 feat has no such trade, so only the 2014 one
// (or one with no edition saved) offers it. It's chosen one attack at a time, never saved on the weapon. Its
// other benefits need no numbers: long range doesn't give disadvantage, and
// half and three-quarters cover don't count against your ranged weapon attacks.
export const SHARPSHOOTER = {
  toHit: -5,
  damage: 10,
  summary:
    "Before a ranged weapon attack, you can take -5 to hit for +10 damage if it hits. You also ignore half and three-quarters cover, and attacking at long range doesn't give you disadvantage.",
};

// Can this attack use Sharpshooter? The character needs the feat, and the
// attack must be a ranged weapon. A weapon QuestKeeper doesn't know (a
// homebrew one) is the player's call, so the choice is offered unless it's
// clearly not a weapon at all.
export function canUseSharpshooter(sheet, attack, weaponDetailsFor = () => null) {
  if (!hasFeat(sheet, "Sharpshooter", { edition: "2014" })) return false;
  if (/unarmed/i.test(attack?.name ?? "")) return false;
  const { weapon } = attackWeaponFor(attack, weaponDetailsFor);
  if (weapon) return weapon.weapon_range === "Ranged";
  return true;
}

// The weapon's own extra damage (Wisteria's Kiss's 1d4 psychic), as damage
// parts. One with a condition ("vs undead") is optional: it's only rolled
// when the player switches it on for that hit.
function weaponExtraParts(attack) {
  return (attack?.extraDamage ?? [])
    .filter((extra) => String(extra?.dice ?? "").trim())
    .map((extra, position) => ({
      dice: String(extra.dice).trim(),
      type: lower(extra.type),
      source: String(extra.source ?? "").trim() || attack?.name || "Extra",
      condition: String(extra.condition ?? "").trim(),
      key: `weapon-${position}`,
    }));
}

// The attack as it is right now, with its active effects counted:
//   toHit         the saved bonus plus any effect bonuses (and Sharpshooter)
//   damageParts   [{ dice, type, source }]: the weapon's own damage first,
//                 then the weapon's own extra damage (Wisteria's Kiss's
//                 psychic), then each effect's extra dice, each with its type
//   optionalParts extra damage with a condition ("vs undead"), rolled only
//                 when switched on for a hit (see options.useOptional)
//   modifiers     [{ source, text }] for "where does this come from"
//   effects       the active effects on it
// options: sharpshooter (true for this one attack: -5 to hit, +10 damage,
// added once, to the weapon's own damage) and useOptional (the keys of the
// optional parts switched on).
// The saved attack is never changed; with no effects it comes back with the
// same numbers and one damage part. `sheet` can be a preview (see
// previewEffect).
export function getEffectiveAttack(sheet, attack, { sharpshooter = false, useOptional = [] } = {}) {
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

  // Sharpshooter's +10 goes on the weapon's own damage once, never on each
  // extra part, so it's counted once per hit.
  if (sharpshooter) {
    toHit += SHARPSHOOTER.toHit;
    damageBonus += SHARPSHOOTER.damage;
  }

  const weaponExtras = weaponExtraParts(attack);
  const always = weaponExtras.filter((part) => !part.condition);
  const optionalParts = weaponExtras.filter((part) => part.condition);
  const chosen = optionalParts.filter((part) => useOptional.includes(part.key));

  const weaponDamage = String(attack?.damage ?? "").trim();
  return {
    ...attack,
    toHit,
    baseToHit: Number(attack?.toHit) || 0,
    damageParts: [
      {
        dice: damageBonus && weaponDamage ? addFlatDamage(weaponDamage, damageBonus) : weaponDamage,
        type: lower(attack?.damageType),
        source: attack?.name ?? "",
      },
      ...always,
      ...chosen,
      ...extraParts,
    ],
    optionalParts,
    modifiers,
    effects,
    sharpshooter,
    isEnchanted: effects.length > 0,
    isMagicWeapon: isMagicWeaponAttack(attack),
  };
}

// --- Where an attack's numbers come from -----------------------------------------
//
// Lines like "+5 Dexterity", "+4 Proficiency", "+2 Archery", "+2 Magic",
// "-5 Sharpshooter", then the total, so a player can check the sheet and spot
// a bonus counted twice. For a weapon QuestKeeper knows, the saved to hit is
// split into its parts; anything the player typed on top shows as "Typed in
// by you". For a weapon it doesn't know, the saved number is one line.
// Returns { toHit: [{ label, value }], toHitTotal, damage: [{ label, text }] }.
export function getAttackBreakdown(sheet, attack, weaponDetailsFor = () => null, options = {}) {
  const live = getEffectiveAttack(sheet, attack, options);
  const saved = Number(attack?.toHit) || 0;
  const { weapon, magicBonus } = attackWeaponFor(attack, weaponDetailsFor);
  const toHit = [];
  const damage = [];

  if (weapon) {
    const proficiencyNames = (sheet?.proficiencies ?? []).map((proficiency) => proficiency.name);
    const mathWith = (names) =>
      getWeaponAttackMath({
        weapon,
        scores: sheet?.abilityScores,
        proficiencyNames: names,
        proficiencyBonus: getProficiencyBonus(sheet?.level ?? 1),
        magicBonus,
        fightingStyles: getFightingStyles(sheet?.features),
      });
    // Trained either way (an inventory weapon can be marked proficient on
    // its own); the one that matches the saved number explains it best.
    const choices = [mathWith(proficiencyNames), mathWith([...proficiencyNames, weapon.name])];
    const math = choices.find((option) => option.toHit === saved) ?? choices[0];
    const abilityLabel = math.ability === "dexterity" ? "Dexterity" : "Strength";
    toHit.push({ label: abilityLabel, value: math.abilityMod });
    if (math.proficient) toHit.push({ label: "Proficiency", value: math.proficiencyBonus });
    if (math.styleBonus) toHit.push({ label: "Archery Fighting Style", value: math.styleBonus });
    if (math.magicBonus) toHit.push({ label: "Magic weapon", value: math.magicBonus });
    if (saved !== math.toHit) toHit.push({ label: "Typed in by you", value: saved - math.toHit });

    damage.push({ label: `${weapon.name} dice`, text: weapon.damage.damage_dice });
    if (math.abilityMod) damage.push({ label: abilityLabel, text: formatModifier(math.abilityMod) });
    if (math.magicBonus) damage.push({ label: "Magic weapon", text: formatModifier(math.magicBonus) });
  } else {
    toHit.push({ label: "Saved to hit", value: saved });
    if (attack?.damage) damage.push({ label: "Saved damage", text: String(attack.damage) });
  }

  live.modifiers.forEach((modifier) => {
    const match = modifier.text.match(/^([+-]\d+) to hit$/);
    if (match) toHit.push({ label: modifier.source, value: Number(match[1]) });
  });
  if (live.sharpshooter) {
    toHit.push({ label: "Sharpshooter", value: SHARPSHOOTER.toHit });
    damage.push({ label: "Sharpshooter", text: formatModifier(SHARPSHOOTER.damage) });
  }
  live.damageParts.slice(1).forEach((part) => {
    damage.push({ label: part.source, text: `${part.dice}${part.type ? ` ${part.type}` : ""}` });
  });

  return { toHit, toHitTotal: live.toHit, damage };
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

// --- On-hit features (Dreadful Strikes) ---------------------------------------------
//
// Some features add damage when an attack hits, chosen hit by hit. Each rule
// below says:
//   trigger   when it's offered ("weaponHit": after a weapon attack hits)
//   has       whether this character has it (from their features or class,
//             never their name)
//   damage    the dice and type by class level (a homebrew subclass's own
//             "Extra damage" steps win, when it lists them)
//   limit     how often it can land: "oncePerTargetPerTurn" (each creature
//             once per turn, other creatures still can), or null for none
// A new feature is mostly a new entry here. Its damage is never part of the
// weapon: it's offered at the damage step after a hit, off unless ticked,
// and only counts as used once that damage is dealt, so a miss or a "not
// this time" uses nothing.
//
// Dreadful Strikes (Fey Wanderer) isn't in the SRD, so only its numbers and
// a short note in our own words are kept here.

const featureKey = (name) => String(name ?? "").trim().toLowerCase();
const hasFeatureNamed = (sheet, name) =>
  (sheet?.features ?? []).some((feature) => featureKey(feature.name) === featureKey(name));

export const ON_HIT_RULES = {
  "dreadful strikes": {
    name: "Dreadful Strikes",
    trigger: "weaponHit",
    has: (sheet) =>
      hasFeatureNamed(sheet, "Dreadful Strikes") ||
      (sheet?.class?.id === "ranger" && /fey wanderer/i.test(sheet?.class?.subclass?.name ?? "")),
    damage: [
      { level: 3, dice: "1d4", type: "psychic" },
      { level: 11, dice: "1d6", type: "psychic" },
    ],
    limit: "oncePerTargetPerTurn",
    note: "Each creature can take it once per turn.",
  },
};

const stepAt = (steps, level) => [...(steps ?? [])].reverse().find((step) => level >= step.level) ?? null;

// The on-hit features this character can use now for a trigger:
// [{ key, name, dice, type, limit, note }]. homebrewDamage: the subclass's
// features with damage steps (getSubclassFeatureDamage), when it's homebrew.
export function getOnHitFeatures(sheet, homebrewDamage = [], trigger = "weaponHit") {
  const level = Number(sheet?.level) || 1;
  return Object.entries(ON_HIT_RULES).flatMap(([key, rule]) => {
    if (rule.trigger !== trigger || !rule.has(sheet)) return [];
    const homebrew = (homebrewDamage ?? []).find((feature) => featureKey(feature.name) === key);
    const step = stepAt(homebrew?.damage, level) ?? stepAt(rule.damage, level);
    if (!step) return [];
    return [
      {
        key,
        name: rule.name,
        dice: step.dice,
        type: String(step.type || rule.damage[0].type).toLowerCase(),
        limit: rule.limit ?? null,
        note: rule.note,
      },
    ];
  });
}

// Which turn it is at a table: the round and whose turn. Both change on
// every Next Turn, so a new turn always has a new key. null when the table
// doesn't say (no fight running), so nothing is tracked by guesswork.
export function turnKeyFor(table) {
  if (!table?.combat_active || !table.current_combatant_id) return null;
  return `${table.round ?? 1}:${table.current_combatant_id}`;
}

// The creatures (combatant ids) a feature has landed on this turn. A
// different turn key means a new turn, so the list starts empty.
export function onHitTargetsThisTurn(sheet, key, turnKey) {
  const use = sheet?.onHitUses?.[key];
  return use && turnKey && use.turn === turnKey ? use.targets : [];
}

// Can this feature go on this hit?
//   { status: "ok" }       yes (and it will be tracked)
//   { status: "used" }     it already landed on this creature this turn
//   { status: "manual" }   it has a limit but the turn or target isn't
//                          known, so the player checks it themselves and
//                          nothing is tracked
export function onHitEligibility(sheet, feature, { turnKey = null, targetId = null } = {}) {
  if (feature?.limit !== "oncePerTargetPerTurn") return { status: "ok" };
  if (!turnKey || !targetId) return { status: "manual" };
  return onHitTargetsThisTurn(sheet, feature.key, turnKey).includes(targetId) ? { status: "used" } : { status: "ok" };
}

// Notes that the feature's damage was dealt to this creature this turn
// (only for limited features, and only when the turn and target are known).
export function recordOnHit(sheet, feature, turnKey, targetId) {
  if (feature?.limit !== "oncePerTargetPerTurn" || !turnKey || !targetId) return sheet;
  const targets = onHitTargetsThisTurn(sheet, feature.key, turnKey);
  if (targets.includes(targetId)) return sheet;
  return {
    ...sheet,
    onHitUses: { ...(sheet?.onHitUses ?? {}), [feature.key]: { turn: turnKey, targets: [...targets, targetId] } },
  };
}

// The feature as a damage part, rolled and logged in its own type.
export const onHitPart = (feature) => ({ dice: feature.dice, type: feature.type, source: feature.name });
