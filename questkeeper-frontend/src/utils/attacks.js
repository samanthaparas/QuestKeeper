import { rollDie } from "./characterSheet";

// Reads a damage string from an attack on the sheet, like "2d8+10", "1d4",
// "1d6 + 2", "1d8-1", or a flat "5". Returns a list of parts, or null when the
// text can't be understood (the player can then type their damage in by hand).
export function parseDamage(damageText) {
  const cleaned = String(damageText ?? "").replace(/\s+/g, "");
  if (!cleaned) return null;

  const tokens = cleaned.match(/[+-]?[^+-]+/g);
  if (!tokens) return null;

  const parts = [];

  for (const token of tokens) {
    const dice = token.match(/^([+-]?)(\d*)d(\d+)$/i);
    const flat = token.match(/^([+-]?)(\d+)$/);

    if (dice) {
      const count = dice[2] === "" ? 1 : Number(dice[2]);
      const sides = Number(dice[3]);
      if (count < 1 || count > 50 || sides < 2 || sides > 100) return null;
      parts.push({ type: "dice", sign: dice[1] === "-" ? -1 : 1, count, sides });
    } else if (flat) {
      parts.push({ type: "flat", sign: flat[1] === "-" ? -1 : 1, value: Number(flat[2]) });
    } else {
      return null;
    }
  }

  return parts.length > 0 ? parts : null;
}

// Rolls damage. On a critical hit the dice are rolled once and what they show
// is doubled, then the flat bonus is added (1d8+3 rolling a 5 deals 5 x 2 + 3
// = 13). That's the group's table rule; the book rule rolls twice the dice.
export function rollDamage(damageText, { crit = false } = {}) {
  const parts = parseDamage(damageText);
  if (!parts) return null;

  let total = 0;
  const pieces = [];

  for (const part of parts) {
    if (part.type === "dice") {
      const rolls = Array.from({ length: part.count }, () => rollDie(part.sides));
      const multiplier = crit ? 2 : 1;
      const subtotal = rolls.reduce((sum, roll) => sum + roll, 0) * multiplier * part.sign;
      total += subtotal;
      pieces.push(
        `${part.sign < 0 ? "-" : ""}${part.count}d${part.sides} [${rolls.join(", ")}]${crit ? " ×2" : ""}`,
      );
    } else {
      total += part.value * part.sign;
      pieces.push(`${part.sign < 0 ? "-" : "+"}${part.value}`);
    }
  }

  total = Math.max(0, total);

  return { total, text: `${pieces.join(" ")} = ${total}` };
}

// "6, 2, 3 5" -> [6, 2, 3, 5]: the numbers a player read off their real dice.
// null when it isn't a list of whole numbers.
export function parseDiceNumbers(text) {
  const tokens = String(text ?? "")
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const numbers = tokens.map(Number);
  return numbers.every((number) => Number.isInteger(number)) ? numbers : null;
}

// What dice a damage text uses, in order: "1d8+2d6+3" -> [{ count: 1, sides: 8 },
// { count: 2, sides: 6 }]. Empty when it can't be read or has no dice.
export function diceNeeded(damageText) {
  return (parseDamage(damageText) ?? [])
    .filter((part) => part.type === "dice")
    .map(({ count, sides }) => ({ count, sides }));
}

// "10d6", or "1d8 and 2d6".
export function describeDiceNeeded(damageText) {
  return diceNeeded(damageText)
    .map(({ count, sides }) => `${count}d${sides}`)
    .join(" and ");
}

// Damage from dice the player rolled in real life: they type just the number
// on each die (10d6 -> ten numbers) and the app adds them up, doubles the dice
// on a critical hit (the group's rule, same as rollDamage), and adds the flat
// bonus. Returns { total, text } or { error } in plain words.
export function damageFromDice(damageText, values, { crit = false } = {}) {
  const parts = parseDamage(damageText);
  const dice = diceNeeded(damageText);
  if (!parts || dice.length === 0) {
    return { error: "This attack's damage has no dice the app can read. Type your total damage instead." };
  }

  const needed = dice.reduce((sum, { count }) => sum + count, 0);
  if (!Array.isArray(values) || values.length === 0) {
    return { error: `Type the number on each die: ${needed} ${needed === 1 ? "number" : "numbers"} for ${describeDiceNeeded(damageText)}.` };
  }
  if (values.length !== needed) {
    return {
      error: `${describeDiceNeeded(damageText)} needs ${needed} ${needed === 1 ? "number" : "numbers"}, and you typed ${values.length}.`,
    };
  }

  let total = 0;
  let next = 0;
  const pieces = [];
  for (const part of parts) {
    if (part.type === "dice") {
      const rolls = values.slice(next, next + part.count);
      next += part.count;
      const bad = rolls.find((roll) => roll < 1 || roll > part.sides);
      if (bad !== undefined) return { error: `A d${part.sides} only shows 1 to ${part.sides}, not ${bad}.` };
      total += rolls.reduce((sum, roll) => sum + roll, 0) * (crit ? 2 : 1) * part.sign;
      pieces.push(`${part.sign < 0 ? "-" : ""}${part.count}d${part.sides} [${rolls.join(", ")}]${crit ? " ×2" : ""}`);
    } else {
      total += part.value * part.sign;
      pieces.push(`${part.sign < 0 ? "-" : "+"}${part.value}`);
    }
  }

  total = Math.max(0, total);
  return { total, text: `${pieces.join(" ")} = ${total}` };
}

// --- Extra damage on top of a weapon (Divine Smite, Sneak Attack, Hunter's Mark) --

// Common extra damage for the picker, so a beginner doesn't have to know the
// dice: { group, name, dice, label }. Picking one fills in the dice and the
// name; both can still be changed. The numbers come from each feature's own
// description (and your level), so check yours.
const SNEAK_ATTACK_BY_LEVEL = [
  ["1st to 2nd", "1d6"],
  ["3rd to 4th", "2d6"],
  ["5th to 6th", "3d6"],
  ["7th to 8th", "4d6"],
  ["9th to 10th", "5d6"],
  ["11th to 12th", "6d6"],
  ["13th to 14th", "7d6"],
  ["15th to 16th", "8d6"],
  ["17th to 18th", "9d6"],
  ["19th to 20th", "10d6"],
];

export const EXTRA_DAMAGE_PRESETS = [
  { group: "Paladin", name: "Divine Smite, 1st-level slot (2d8)", dice: "2d8", label: "Divine Smite" },
  { group: "Paladin", name: "Divine Smite, 2nd-level slot (3d8)", dice: "3d8", label: "Divine Smite" },
  { group: "Paladin", name: "Divine Smite, 3rd-level slot (4d8)", dice: "4d8", label: "Divine Smite" },
  { group: "Paladin", name: "Divine Smite, 4th-level slot or higher (5d8)", dice: "5d8", label: "Divine Smite" },
  { group: "Paladin", name: "Divine Favor (1d4)", dice: "1d4", label: "Divine Favor" },
  ...SNEAK_ATTACK_BY_LEVEL.map(([levels, dice]) => ({
    group: "Rogue: Sneak Attack by level",
    name: `Sneak Attack, level ${levels} (${dice})`,
    dice,
    label: "Sneak Attack",
  })),
  { group: "Ranger", name: "Hunter's Mark (1d6)", dice: "1d6", label: "Hunter's Mark" },
  { group: "Ranger", name: "Colossus Slayer (1d8)", dice: "1d8", label: "Colossus Slayer" },
  { group: "Warlock", name: "Hex (1d6)", dice: "1d6", label: "Hex" },
  { group: "Barbarian: Rage damage by level", name: "Rage, level 1 to 8 (+2)", dice: "+2", label: "Rage" },
  { group: "Barbarian: Rage damage by level", name: "Rage, level 9 to 15 (+3)", dice: "+3", label: "Rage" },
  { group: "Barbarian: Rage damage by level", name: "Rage, level 16 and up (+4)", dice: "+4", label: "Rage" },
  { group: "Magic weapons", name: "Flaming weapon, like a Flame Tongue (2d6)", dice: "2d6", label: "Fire damage" },
];

// The last extra damage typed ("2d8" called "Smite"), kept so the next attack
// can reuse it. It is never switched on by itself.
export function readExtra() {
  try {
    const saved = JSON.parse(window.localStorage.getItem("qk-extra-damage") ?? "null");
    return { text: String(saved?.text ?? ""), label: String(saved?.label ?? "") };
  } catch {
    return { text: "", label: "" };
  }
}

export function rememberExtra(text, label) {
  try {
    window.localStorage.setItem("qk-extra-damage", JSON.stringify({ text, label }));
  } catch {
    // Remembering is a convenience; the extra damage still works this time.
  }
}

// The extra damage text, checked: "2d8", "1d6+2" or even a flat "+2". Returns
// { dice: how many dice it uses } or { error } in plain words.
export function checkExtraDamage(extraText) {
  const parts = parseDamage(extraText);
  if (!parts) return { error: "Write the extra damage like 2d8 or 1d6+2." };
  const dice = parts.reduce((sum, part) => sum + (part.type === "dice" ? part.count : 0), 0);
  return { dice };
}

// "Longsword 2d8 [5, 3] +3 = 11 | Smite 2d8 [6, 2] = 8" and the two totals added.
function joinDamage(first, second, label) {
  return {
    total: first.total + second.total,
    text: `${first.text} | ${label} ${second.text}`,
    extra: { label, total: second.total },
  };
}

// The app rolls both: the weapon's damage and the extra damage. On a critical
// hit the dice of both are doubled (the group's rule, same as rollDamage).
// Returns { total, text, extra } or { error }.
export function rollDamageWithExtra(damageText, extraText, { crit = false, label = "Extra" } = {}) {
  const check = checkExtraDamage(extraText);
  if (check.error) return { error: check.error };
  const main = rollDamage(damageText, { crit });
  if (!main) return { error: "This attack's damage can't be read as dice." };
  return joinDamage(main, rollDamage(extraText, { crit }), label);
}

// Real dice for both: the player types the weapon's dice first, then the extra
// dice, in one list ("5, 3, 6, 2" for 2d8 and 2d8). Returns { total, text,
// extra } or { error } in plain words.
export function damageFromDiceWithExtra(damageText, extraText, values, { crit = false, label = "Extra" } = {}) {
  const check = checkExtraDamage(extraText);
  if (check.error) return { error: check.error };

  const mainCount = diceNeeded(damageText).reduce((sum, { count }) => sum + count, 0);
  const wanted = mainCount + check.dice;
  if (!Array.isArray(values) || values.length === 0) {
    return { error: `Type the number on each die: ${wanted} ${wanted === 1 ? "number" : "numbers"}, the weapon's first, then ${label}'s.` };
  }
  if (values.length !== wanted) {
    return {
      error: `${describeDiceNeeded(damageText)} for the weapon and ${check.dice} for ${label} need ${wanted} numbers in all, and you typed ${values.length}.`,
    };
  }

  const main = damageFromDice(damageText, values.slice(0, mainCount), { crit });
  if (main.error) return main;
  // A flat-only extra ("+2") uses no dice; give it nothing to read.
  const extra = check.dice === 0 ? damageFromDiceFlat(extraText) : damageFromDice(extraText, values.slice(mainCount), { crit });
  if (extra.error) return extra;
  return joinDamage(main, extra, label);
}

// An extra with no dice at all ("+2"): just its number.
function damageFromDiceFlat(extraText) {
  const parts = parseDamage(extraText) ?? [];
  const total = Math.max(0, parts.reduce((sum, part) => sum + part.sign * part.value, 0));
  return { total, text: `${parts.map((part) => `${part.sign < 0 ? "-" : "+"}${part.value}`).join(" ")} = ${total}` };
}

// --- Damage in typed parts (a weapon plus Elemental Weapon's fire) ------------------
//
// parts: [{ dice: "1d4+5", type: "piercing", source: "Darling Deceiver" },
//         { dice: "1d4", type: "fire", source: "Elemental Weapon" }]
// Each part is rolled on its own and keeps its type, so a monster that
// resists fire can be dealt the right amount later. On a critical hit every
// part's dice are doubled (the group's rule, as in rollDamage). Returns
// { total, text, parts: [{ amount, type, source }] } or { error }.

const typeLabel = (part) => (part.type ? ` ${part.type}` : "");

function joinParts(results, parts) {
  const rolled = results.map((result, i) => ({
    amount: result.total,
    type: parts[i].type ?? "",
    source: parts[i].source ?? "",
  }));
  const text = results
    .map((result, i) => `${i === 0 ? "" : `${parts[i].source || "Extra"} `}${result.text}${typeLabel(parts[i])}`)
    .join(" | ");
  return { total: rolled.reduce((sum, part) => sum + part.amount, 0), text, parts: rolled };
}

export function rollDamageParts(parts, { crit = false } = {}) {
  const usable = (parts ?? []).filter((part) => String(part.dice ?? "").trim());
  if (usable.length === 0 || !parseDamage(usable[0].dice)) {
    return { error: "This attack's damage can't be read as dice." };
  }
  const results = [];
  for (const part of usable) {
    const result = rollDamage(part.dice, { crit });
    if (!result) return { error: `Write ${part.source || "the extra"} damage like 2d8 or 1d6+2.` };
    results.push(result);
  }
  return joinParts(results, usable);
}

// Real dice for every part: the player types the number on each die in
// order (the weapon's dice first, then each extra's), in one list.
export function damageFromDiceParts(parts, values, { crit = false } = {}) {
  const usable = (parts ?? []).filter((part) => String(part.dice ?? "").trim());
  if (usable.some((part) => !parseDamage(part.dice))) {
    return { error: "Some of this damage can't be read as dice. Type your total damage instead." };
  }
  const counts = usable.map((part) => diceNeeded(part.dice).reduce((sum, { count }) => sum + count, 0));
  const wanted = counts.reduce((sum, count) => sum + count, 0);
  if (wanted === 0) {
    return { error: "This attack's damage has no dice the app can read. Type your total damage instead." };
  }
  const order = usable
    .map((part) => describeDiceNeeded(part.dice))
    .filter(Boolean)
    .join(", then ");
  if (!Array.isArray(values) || values.length !== wanted) {
    const numbers = `${wanted} ${wanted === 1 ? "number" : "numbers"}`;
    return {
      error:
        usable.length === 1
          ? `${order} needs ${numbers}, and you typed ${values?.length ?? 0}.`
          : `${order} need ${numbers} in all, and you typed ${values?.length ?? 0}.`,
    };
  }
  const results = [];
  let next = 0;
  for (const [i, part] of usable.entries()) {
    const result = counts[i] === 0 ? damageFromDiceFlat(part.dice) : damageFromDice(part.dice, values.slice(next, next + counts[i]), { crit });
    if (result.error) return result;
    next += counts[i];
    results.push(result);
  }
  return joinParts(results, usable);
}

// "6 piercing, 3 fire": what each part dealt, for messages.
export function describeDealtParts(parts = []) {
  return parts.map((part) => `${part.amount}${part.type ? ` ${part.type}` : ""}`).join(", ");
}

// Applies incoming damage to a sheet's hit points: temporary HP absorbs first,
// then current HP, which never drops below 0.
export function applyDamageToHitPoints(hitPoints, amount) {
  const temporary = hitPoints.temporary ?? 0;
  const absorbed = Math.min(temporary, amount);
  const remaining = amount - absorbed;

  return {
    ...hitPoints,
    temporary: temporary - absorbed,
    current: Math.max(0, hitPoints.current - remaining),
  };
}
