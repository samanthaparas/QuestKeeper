// A short summary of a fight, built from the table's activity log when the DM
// ends combat, for the DM to edit and post to the journal (or skip).
//
// Only lines everyone at the table can already read are used, so the summary
// can never reveal a monster's HP, AC or anything else the DM keeps hidden.

import { NEW_ENCOUNTER_MESSAGE } from "./tableGuidance";

// Written to the log when the DM starts and ends a fight, so the summary knows
// where this fight's lines begin.
export const FIGHT_START_MESSAGE = "⚔️ The fight begins.";
export const FIGHT_END_MESSAGE = "🏁 The fight is over.";

// This fight's log lines, oldest first. `events` are newest first, as the
// table page loads them; reading stops at this fight's start, an earlier
// fight's end, or a new encounter.
export function fightEvents(events = []) {
  const lines = [];
  for (const event of events) {
    const message = event?.message ?? "";
    if (message === FIGHT_START_MESSAGE || message === FIGHT_END_MESSAGE || message === NEW_ENCOUNTER_MESSAGE) break;
    lines.push(message);
  }
  return lines.reverse();
}

const DOWN = /^(.+) is down!$/;
const DEALS = /^(.+?) deals (\d+) damage(?: \([^)]*\))? to (.+?)( \(critical hit\))?\.$/;
const TAKES = /^(.+) takes (\d+) damage\.$/;
const RECOVERS = /^(.+) recovers (\d+) HP\.$/;
const DENIED = /^The DM denied (.+)'s attack \((\d+) damage undone\)\.$/;

// Adds `amount` to `name` in a Map, keeping names in the order first seen.
function add(map, name, amount) {
  map.set(name, (map.get(name) ?? 0) + amount);
}

// "Pippa 12, Billie 14" (or "Billie (1)" with inBrackets, for counts).
function listTotals(map, inBrackets = false) {
  return [...map.entries()]
    .filter(([, total]) => total > 0)
    .map(([name, total]) => (inBrackets ? `${name} (${total})` : `${name} ${total}`))
    .join(", ");
}

// The summary text, or "" when nothing worth summing up happened.
// combatants: the fight's list (to tell the party from the enemies).
// rounds: how many rounds the fight lasted.
export function buildFightSummary({ events = [], combatants = [], rounds = 1 }) {
  const kindOf = new Map(combatants.map((combatant) => [combatant.name, combatant.kind]));
  // Players and allies are the party; anyone else who fell was an enemy.
  const isParty = (name) => kindOf.get(name) === "player" || kindOf.get(name) === "ally";

  const defeated = [];
  const wentDown = [];
  const dealt = new Map();
  const taken = new Map();
  const healed = new Map();
  const crits = new Map();

  for (const line of fightEvents(events)) {
    let match = line.match(DOWN);
    if (match) {
      const list = isParty(match[1]) ? wentDown : defeated;
      if (!list.includes(match[1])) list.push(match[1]);
      continue;
    }
    match = line.match(DEALS);
    if (match) {
      add(dealt, match[1], Number(match[2]));
      if (match[4]) add(crits, match[1], 1);
      continue;
    }
    match = line.match(DENIED);
    if (match) {
      add(dealt, match[1], -Number(match[2]));
      continue;
    }
    match = line.match(TAKES);
    if (match && isParty(match[1])) {
      add(taken, match[1], Number(match[2]));
      continue;
    }
    match = line.match(RECOVERS);
    if (match && isParty(match[1])) add(healed, match[1], Number(match[2]));
  }

  const rows = [
    defeated.length > 0 && `Defeated: ${defeated.join(", ")}`,
    wentDown.length > 0 && `Went down: ${wentDown.join(", ")}`,
    listTotals(dealt) && `Damage dealt: ${listTotals(dealt)}`,
    listTotals(taken) && `Damage taken: ${listTotals(taken)}`,
    listTotals(healed) && `Healing: ${listTotals(healed)}`,
    listTotals(crits) && `Critical hits: ${listTotals(crits, true)}`,
  ].filter(Boolean);

  if (rows.length === 0) return "";
  const length = Math.max(1, Number(rounds) || 1);
  return [`⚔️ Fight summary (${length} ${length === 1 ? "round" : "rounds"})`, ...rows].join("\n");
}
