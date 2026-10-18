// Click-to-roll on the character sheet: the dice for a check (skill, save,
// ability, initiative, attack) or for damage, and how each roll is written
// in the table's activity log. Pure apart from the dice themselves.

import { formatModifier, rollD20 } from "./characterSheet";
import { rollDamage, damageFromDice } from "./attacks";

export const ROLL_MODES = ["normal", "advantage", "disadvantage"];

// "d20 15 + 2", or "d20 with advantage (15, 7) + 2".
function describeCheck({ mode, rolls, bonus }) {
  const dice = mode === "normal" ? `d20 ${rolls[0]}` : `d20 with ${mode} (${rolls.join(", ")})`;
  if (bonus === 0) return dice;
  return `${dice} ${bonus < 0 ? "-" : "+"} ${Math.abs(bonus)}`;
}

// A d20 check. `attack`: the attack's damage, so a natural 20 can offer the
// critical damage roll straight away.
export function rollCheck({ label, bonus = 0, mode = "normal", attack = null }) {
  const safeBonus = Number.isFinite(Number(bonus)) ? Number(bonus) : 0;
  const { rolls, result: natural } = rollD20(ROLL_MODES.includes(mode) ? mode : "normal");
  const roll = {
    kind: "check",
    label,
    mode,
    rolls,
    natural,
    bonus: safeBonus,
    total: natural + safeBonus,
    isNatural20: natural === 20,
    isNatural1: natural === 1,
    attack,
  };
  return { ...roll, detail: describeCheck(roll) };
}

// The same d20 check, but with the number(s) the player read off real dice:
// one d20, or both with advantage or disadvantage. Returns the roll, or
// { error } in plain words.
export function checkFromDice({ label, bonus = 0, mode = "normal", dice, attack = null }) {
  const safeMode = ROLL_MODES.includes(mode) ? mode : "normal";
  const needed = safeMode === "normal" ? 1 : 2;
  if (!Array.isArray(dice) || dice.length !== needed) {
    return {
      error:
        needed === 1
          ? "Type the number on your d20."
          : `With ${safeMode}, type both d20 numbers, like 14, 7.`,
    };
  }
  const bad = dice.find((die) => die < 1 || die > 20);
  if (bad !== undefined) return { error: `A d20 only shows 1 to 20, not ${bad}.` };

  const safeBonus = Number.isFinite(Number(bonus)) ? Number(bonus) : 0;
  const natural = safeMode === "advantage" ? Math.max(...dice) : safeMode === "disadvantage" ? Math.min(...dice) : dice[0];
  const roll = {
    kind: "check",
    label,
    mode: safeMode,
    rolls: dice,
    natural,
    bonus: safeBonus,
    total: natural + safeBonus,
    isNatural20: natural === 20,
    isNatural1: natural === 1,
    attack,
  };
  return { ...roll, detail: describeCheck(roll) };
}

// Damage from the dice a player rolled in real life; { error } if the numbers
// don't fit the damage text.
export function damageRollFromDice({ label, damage, dice, crit = false }) {
  const rolled = damageFromDice(damage, dice, { crit });
  if (rolled.error) return { error: rolled.error };
  return {
    kind: "damage",
    label: crit ? `${label} (critical)` : label,
    total: rolled.total,
    detail: rolled.text.replace(/ = \d+$/, ""),
    isCrit: crit,
  };
}

// Damage from a sheet's damage text ("1d8+3"); null when it can't be read.
export function rollDamageFor({ label, damage, crit = false }) {
  const rolled = rollDamage(damage, { crit });
  if (!rolled) return null;
  return {
    kind: "damage",
    label: crit ? `${label} (critical)` : label,
    total: rolled.total,
    detail: rolled.text.replace(/ = \d+$/, ""),
    isCrit: crit,
  };
}

// What a roll button says to screen readers: "Roll Stealth, +5".
export function rollButtonLabel(label, bonus) {
  return `Roll ${label}, ${formatModifier(bonus)}`;
}
