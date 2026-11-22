// "What does this mean?" under a roll: what the number the player just rolled
// is for, in plain words, for people new to D&D. Works it out from the kind
// of roll and its label ("Stealth", "Dexterity save", "Longbow attack").
// Returns a list of short sentences.

import { formatModifier } from "./characterSheet";

// What sort of d20 roll this was, from its label.
export function rollType(roll) {
  if (roll?.kind === "damage") return "damage";
  const label = String(roll?.label ?? "").toLowerCase();
  if (label.includes("death save")) return "deathSave";
  if (label.includes("initiative")) return "initiative";
  if (/\battack\b|to hit/.test(label)) return "attack";
  if (/\bsave\b|saving throw/.test(label)) return "save";
  return "check";
}

export function explainRoll(roll) {
  if (!roll) return [];
  const type = rollType(roll);
  const total = roll.total;

  if (type === "damage") {
    return [
      `${total} is how much damage this does: the dice added up${roll.isCrit ? " (doubled for a critical hit)" : ""}, plus any bonus. The target loses that many hit points.`,
      "Some creatures resist a damage type (they take half) or are weak to it (they take double). Your DM handles that.",
    ];
  }

  const lines = [];
  if (type === "deathSave") {
    lines.push(
      "A death save, rolled at 0 HP: 10 or more is a success, under 10 a failure. Three successes and you're stable; three failures and you die.",
      "A natural 20 brings you back with 1 HP. A natural 1 counts as two failures.",
    );
  } else if (type === "initiative") {
    lines.push(`Initiative decides the turn order in a fight: the highest total goes first, so ${total} is your place in line.`);
  } else if (type === "attack") {
    lines.push(
      `Your DM compares ${total} with the target's Armor Class (AC). If it's equal or higher, you hit, and then you roll damage.`,
      "A natural 20 always hits, as a critical hit. A natural 1 always misses.",
    );
  } else if (type === "save") {
    lines.push(
      `A saving throw resists something done to you: a spell, a poison, a trap. Your DM compares ${total} with its difficulty (DC). Equal or higher, and you resist it or take less.`,
    );
  } else {
    lines.push(
      `Your DM compares ${total} with a difficulty (DC) they pick: about 10 is easy, 15 is medium and 20 is hard. Equal or higher, and you succeed.`,
    );
  }

  if (roll.bonus && type !== "deathSave") {
    lines.push(
      `The ${formatModifier(roll.bonus)} is your bonus for this roll: an ability modifier, plus your proficiency bonus when you're trained in it.`,
    );
  }
  if (roll.mode === "advantage") {
    lines.push(`With advantage you rolled two d20s and kept the higher one (${roll.natural}).`);
  } else if (roll.mode === "disadvantage") {
    lines.push(`With disadvantage you rolled two d20s and kept the lower one (${roll.natural}).`);
  }
  return lines;
}
