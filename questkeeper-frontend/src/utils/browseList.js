// Small helpers for the browse pages' lists (Races, Spells, Classes...).
//
// Entries can share a name (Tome of Heroes' Minotaur and the official
// book's Minotaur) and even an id (an SRD spell in its 2014 and 2024
// editions), so an entry is only "the same" as another when its id, source
// and edition all match. Lists used to key cards by name, which let two
// different Minotaurs swap places and pile up as filters changed.

import { getSourceLabel } from "./sourceFilters";

// A unique, stable key for one entry: id, source and edition together.
export function entryKey(item) {
  return [item?.category ?? "", item?.index ?? item?.name ?? "", getSourceLabel(item), item?.edition ?? ""].join("|");
}

// Drops exact repeats (the same entry delivered twice, e.g. a homebrew
// that's both shared with you and your own), keeping the first. Different
// entries with the same name are all kept.
export function dedupeEntries(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = entryKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
