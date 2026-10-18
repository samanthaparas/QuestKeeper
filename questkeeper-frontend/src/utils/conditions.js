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

// --- Timers ("Poisoned for 3 rounds") ---------------------------------------
// A condition can carry `rounds`: how many rounds it has left. Each new round
// at the table takes one off, and at 0 it's gone. Conditions without
// `rounds` last until someone removes them, like before.

// Sets (or, with 0 or less, clears) a condition's rounds left.
export function setConditionRounds(conditions = [], key, rounds) {
  return conditions.map((condition) => {
    if (condition.key !== key) return condition;
    const rest = { ...condition };
    delete rest.rounds;
    return rounds > 0 ? { ...rest, rounds } : rest;
  });
}

// `elapsed` rounds have passed: timers go down and the ones that reach 0
// end. Returns the remaining conditions and the keys that ended.
export function tickConditionRounds(conditions = [], elapsed) {
  if (!(elapsed > 0)) return { conditions, ended: [] };
  const ended = [];
  const remaining = [];
  for (const condition of conditions) {
    if (typeof condition.rounds !== "number") {
      remaining.push(condition);
    } else if (condition.rounds - elapsed <= 0) {
      ended.push(condition.key);
    } else {
      remaining.push({ ...condition, rounds: condition.rounds - elapsed });
    }
  }
  return { conditions: remaining, ended };
}

// How many of your own turns have ended since the sheet last looked (see
// countMyTurnsEnded). None when it's a different table, a new fight (the count
// went back down), or older saved data that counted rounds instead.
export function turnsElapsed(seen, tableId, turns) {
  if (!seen || seen.tableId !== tableId || typeof turns !== "number") return 0;
  if (typeof seen.turns !== "number") return 0;
  return Math.max(0, turns - seen.turns);
}

