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

// Rolls damage. A critical hit doubles the number of dice (not the flat bonus),
// which is the standard 5e rule.
export function rollDamage(damageText, { crit = false } = {}) {
  const parts = parseDamage(damageText);
  if (!parts) return null;

  let total = 0;
  const pieces = [];

  for (const part of parts) {
    if (part.type === "dice") {
      const count = crit ? part.count * 2 : part.count;
      const rolls = Array.from({ length: count }, () => rollDie(part.sides));
      const subtotal = rolls.reduce((sum, roll) => sum + roll, 0) * part.sign;
      total += subtotal;
      pieces.push(`${part.sign < 0 ? "-" : ""}${count}d${part.sides} [${rolls.join(", ")}]`);
    } else {
      total += part.value * part.sign;
      pieces.push(`${part.sign < 0 ? "-" : "+"}${part.value}`);
    }
  }

  total = Math.max(0, total);

  return { total, text: `${pieces.join(" ")} = ${total}` };
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
