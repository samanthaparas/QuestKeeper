// Helpers for filtering lists by the book an entry comes from.

// Entries without a source (e.g. spells, classes) are core SRD content.
export function getSourceLabel(item) {
  return item?.source ?? "SRD";
}

// SRD first, then the other books A-Z, so the core rules always lead.
function compareSources(a, b) {
  const aSrd = a.startsWith("SRD");
  const bSrd = b.startsWith("SRD");
  if (aSrd !== bSrd) return aSrd ? -1 : 1;
  return a.localeCompare(b);
}

// [{ source: "SRD 5.1", count: 9 }, { source: "Tome of Heroes", count: 10 }]
export function getSourceOptions(items = []) {
  const counts = new Map();
  for (const item of items) {
    const source = getSourceLabel(item);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return [...counts.keys()]
    .sort(compareSources)
    .map((source) => ({ source, count: counts.get(source) }));
}

// "all" (or nothing) keeps every entry.
export function filterBySource(items = [], source) {
  if (!source || source === "all") return items;
  return items.filter((item) => getSourceLabel(item) === source);
}

// { "SRD 5.1": [...], "Tome of Heroes": [...] } in the same order as above,
// for showing a class's subclasses grouped by book.
export function groupBySource(items = []) {
  return getSourceOptions(items).map(({ source }) => ({
    source,
    items: filterBySource(items, source),
  }));
}
