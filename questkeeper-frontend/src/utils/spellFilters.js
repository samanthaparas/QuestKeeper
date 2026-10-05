// Filtering helpers for the Spells reference page. The spell list from
// /api/spells carries level, school and classes for each spell; when the
// backend falls back to the plain SRD list only level is present, so the
// school and class filters are offered only when the data has them.

export const ALL = "all";

// The Spells page shows the list a page at a time instead of all ~319 at once.
export const SPELLS_PAGE_SIZE = 40;

export const EMPTY_SPELL_FILTERS = {
  query: "",
  level: ALL,
  classIndex: ALL,
  school: ALL,
};

export function formatSpellLevel(level) {
  return level === 0 ? "Cantrip" : `Level ${level}`;
}

// "Level 2 · Evocation" or "Cantrip · Conjuration" for a result card.
export function describeSpellListing(spell) {
  const parts = [];
  if (typeof spell.level === "number")
    parts.push(formatSpellLevel(spell.level));
  if (spell.school?.name) parts.push(spell.school.name);
  return parts.join(" · ");
}

function uniqueByIndex(items) {
  const byIndex = new Map();
  items.forEach((item) => {
    if (item?.index && !byIndex.has(item.index)) byIndex.set(item.index, item);
  });
  return [...byIndex.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// The choices each dropdown should offer, built from the spells themselves.
export function getSpellFilterOptions(spells) {
  const levels = [
    ...new Set(
      spells
        .map((spell) => spell.level)
        .filter((level) => typeof level === "number"),
    ),
  ].sort((a, b) => a - b);

  return {
    levels: levels.map((level) => ({
      value: String(level),
      label: level === 0 ? "Cantrips" : `Level ${level}`,
    })),
    classes: uniqueByIndex(spells.flatMap((spell) => spell.classes ?? [])).map(
      (item) => ({ value: item.index, label: item.name }),
    ),
    schools: uniqueByIndex(spells.map((spell) => spell.school)).map((item) => ({
      value: item.index,
      label: item.name,
    })),
  };
}

export function filterSpells(spells, filters) {
  const query = filters.query.trim().toLowerCase();

  return spells.filter((spell) => {
    if (query && !spell.name.toLowerCase().includes(query)) return false;

    if (filters.level !== ALL && String(spell.level) !== filters.level) {
      return false;
    }

    if (
      filters.classIndex !== ALL &&
      !(spell.classes ?? []).some((item) => item.index === filters.classIndex)
    ) {
      return false;
    }

    if (filters.school !== ALL && spell.school?.index !== filters.school) {
      return false;
    }

    return true;
  });
}

export function hasActiveSpellFilters(filters) {
  return (
    filters.level !== ALL ||
    filters.classIndex !== ALL ||
    filters.school !== ALL
  );
}
