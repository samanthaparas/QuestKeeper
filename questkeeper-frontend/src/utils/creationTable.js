// "Making this character for a table?" in character creation. A DM can mark
// races, classes and backgrounds as not allowed at their table (see
// contentRules.js). When a player says which table the character is for,
// creation hides those options, so a new player isn't tempted by something
// they can't play. It's still a guide: the hidden options are one tap away.

import { cleanBanned, countBanned, isBanned } from "./contentRules";

const STORAGE_KEY = "qk-creation-table";

// The tables the player plays at (not ones they run) that have any rules,
// with their tidy lists: [{ id, name, banned, count }].
export function tablesWithRules(tables = [], userId = null) {
  return tables
    .filter((table) => table.dm_id !== userId)
    .map((table) => {
      const banned = cleanBanned(table.banned_content);
      return { id: table.id, name: table.name, banned, count: countBanned(banned) };
    })
    .filter((table) => table.count > 0);
}

// The table picked last time on this device: an id, "none", or null if never
// picked. With exactly one table that has rules and no choice yet, that one
// is used, since it's almost certainly the one.
export function chooseRulesTable(tables, saved) {
  if (saved === "none") return null;
  const match = tables.find((table) => table.id === saved);
  if (match) return match;
  return tables.length === 1 ? tables[0] : null;
}

export function readSavedRulesTable() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveRulesTable(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value || "none");
  } catch {
    // Storage blocked: it just asks again next time.
  }
}

// Whether an option on a picker is one this table doesn't allow. kind is
// "race", "class" or "background" (a subrace is checked as a race too, so
// "Drow" on the race list hides the Drow subrace).
export function isBlockedAt(table, kind, item) {
  if (!table) return false;
  return isBanned(table.banned, kind, item?.name);
}
