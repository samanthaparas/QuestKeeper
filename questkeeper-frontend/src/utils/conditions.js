// Conditions a character can have (Prone, Poisoned...), stored on the sheet
// as [{ key: "poisoned" }, { key: "exhaustion", level: 2 }]. Their names and
// one-line meanings come from the rules words, so they read the same
// everywhere.

import { findRulesWord } from "./rulesWords";

export const CONDITION_KEYS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "exhaustion",
];

export const MAX_EXHAUSTION = 6;

export function conditionWord(key) {
  return findRulesWord(key);
}

// Conditions that change your own d20 rolls, and what to tell the player on
// the roll bar. (Others, like Prone, mostly change how enemies roll at you.)
const ROLL_NOTES = {
  poisoned: "disadvantage on attack rolls and ability checks",
  frightened: "disadvantage on attack rolls and ability checks while you can see what scares you",
  blinded: "disadvantage on attack rolls",
  restrained: "disadvantage on attack rolls and Dexterity saves",
  prone: "disadvantage on attack rolls",
};

// [{ name: "Poisoned", note: "disadvantage on ..." }] for the roll bar.
export function rollNotesFor(conditions = []) {
  return conditions
    .filter((condition) => ROLL_NOTES[condition.key])
    .map((condition) => ({ name: conditionWord(condition.key)?.name ?? condition.key, note: ROLL_NOTES[condition.key] }));
}

export function hasCondition(conditions = [], key) {
  return conditions.some((condition) => condition.key === key);
}

// Adds a condition, or removes it if it's already there. Exhaustion starts
// at level 1.
export function toggleCondition(conditions = [], key) {
  if (hasCondition(conditions, key)) return conditions.filter((condition) => condition.key !== key);
  return [...conditions, key === "exhaustion" ? { key, level: 1 } : { key }];
}

// Exhaustion up or down a level; at 0 it's gone.
export function setExhaustion(conditions = [], level) {
  const clamped = Math.max(0, Math.min(MAX_EXHAUSTION, level));
  const others = conditions.filter((condition) => condition.key !== "exhaustion");
  return clamped === 0 ? others : [...others, { key: "exhaustion", level: clamped }];
}

// A long rest takes away one level of exhaustion.
export function afterLongRest(conditions = []) {
  const exhaustion = conditions.find((condition) => condition.key === "exhaustion");
  return exhaustion ? setExhaustion(conditions, (exhaustion.level ?? 1) - 1) : conditions;
}
