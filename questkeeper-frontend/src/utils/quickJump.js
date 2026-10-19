// Quick-jump search: matching, ranking and recent picks. Pure functions only;
// quickJumpIndex.js gathers the entries.
//
// An entry: { id, label, category, hint, to, keywords? }
// to: where picking it goes, e.g. "/races?open=elf".

// The order result groups appear in.
export const CATEGORY_ORDER = [
  "Pages",
  "My Characters",
  "Races",
  "Classes",
  "Subclasses",
  "Backgrounds",
  "Feats",
  "Spells",
  "Magic Items",
];

// How many matches each group shows, so one big group (spells) can't push
// the others off screen.
export const PER_CATEGORY = 5;
// A group opened with "Show all" still stops here, to keep the list quick.
export const EXPANDED_LIMIT = 60;
// Shorter searches only match the start of words ("elf" shouldn't find
// "Alter Self").
const MIN_INSIDE_WORD = 4;

const RECENT_KEY = "qk-quick-jump-recent";
const RECENT_LIMIT = 5;

// "Tasha's Cauldron" -> "tashas cauldron"; accents and punctuation ignored.
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// How well an entry matches (0 = not at all). Name matches beat keyword
// matches; the start of the name beats the start of a later word, which
// beats anywhere inside a word.
export function scoreEntry(entry, query) {
  const q = normalize(query);
  if (!q) return 0;
  const name = normalize(entry.label);
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;

  const words = name.split(" ");
  const parts = q.split(" ");
  // Every typed word starts a word in the name ("fire bo" -> "Fire Bolt").
  if (parts.every((part) => words.some((word) => word.startsWith(part)))) return 60;
  if (q.length >= MIN_INSIDE_WORD && name.includes(q)) return 40;

  const keywords = normalize((entry.keywords ?? []).join(" "));
  if (keywords && parts.every((part) => keywords.split(" ").some((word) => word.startsWith(part)))) {
    return 30;
  }
  return 0;
}

// Matches grouped by category, best first, at most PER_CATEGORY per group
// unless the group is in `expanded`:
// [{ category, entries: [...], total }]
export function rankResults(entries, query, expanded = []) {
  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label));

  return CATEGORY_ORDER.map((category) => {
    const matches = scored.filter(({ entry }) => entry.category === category);
    const limit = expanded.includes(category) ? EXPANDED_LIMIT : PER_CATEGORY;
    return {
      category,
      entries: matches.slice(0, limit).map(({ entry }) => entry),
      total: matches.length,
    };
  }).filter((group) => group.entries.length > 0);
}

// --- Recent picks (this browser only) -----------------------------------------
// Storage can be blocked (private windows), so every read and write is
// allowed to fail quietly.

export function loadRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((entry) => entry?.to && entry?.label) : [];
  } catch {
    return [];
  }
}

// Newest first, no repeats.
export function saveRecent(entry) {
  const { id, label, category, hint, to } = entry;
  const next = [{ id, label, category, hint, to }, ...loadRecent().filter((saved) => saved.to !== to)].slice(
    0,
    RECENT_LIMIT,
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Not saved; the search still works.
  }
  return next;
}

export function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Nothing to clear.
  }
  return [];
}

// Where an AI search result opens: the same page as the matching quick-jump
// entry when it's loaded, else built from the id ("spell:cure-wounds").
const AI_RESULT_PAGES = {
  spell: "/spells",
  item: "/magic-items",
  class: "/classes",
  race: "/races",
};

export function aiResultLink(result, entries = []) {
  const known = entries.find((entry) => entry.id === result.id);
  if (known?.to) return known.to;
  const [kind, ...rest] = result.id.split(":");
  if (kind === "background") {
    const [edition, index] = rest;
    return `/backgrounds?${new URLSearchParams({ open: index, edition })}`;
  }
  const page = AI_RESULT_PAGES[kind];
  return page ? `${page}?${new URLSearchParams({ open: rest.join(":") })}` : null;
}

// Opens the header's search from anywhere else (the home page's "Describe
// what you need"), with words already in it; meaning: also runs the
// search by meaning right away. The header's QuickJump listens for it, so
// there's still only one search dialog.
export const OPEN_SEARCH_EVENT = "qk-open-search";

export function openQuickSearch({ query = "", meaning = false } = {}) {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: { query, meaning } }));
}
