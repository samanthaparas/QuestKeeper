// Subraces from the Player's Handbook that the free SRD doesn't include (the
// SRD has High Elf, Hill Dwarf, Lightfoot Halfling and Rock Gnome only).
// Same rule as bookRaces.js: no rules from the book, just the name, the book,
// a summary in our own words, and a link to read it. A player picks one with
// "Pick it now, add details later" (a private homebrew draft) or "Make it as
// homebrew", and fills in the rules themselves.

import { OFFICIAL_BOOKS_GROUP } from "./bookBackgrounds";

const WIKIDOT = "https://dnd5e.wikidot.com/lineage:";
const PHB = "Player's Handbook";

// [SRD race id, name, page on Wikidot, summary, tagline]
const ENTRIES = [
  ["elf", "Wood Elf", "elf", "An elf of the deep forests, quick on their feet and hard to spot among the trees. Good for a ranger, scout or anyone at home in the wild.", "Swift, hidden forest elf"],
  ["elf", "Drow", "elf", "A dark elf from the world underground, with sharp eyes in the dark and a touch of innate magic. Good for a mysterious character with a shadowed past.", "Dark elf from below"],
  ["dwarf", "Mountain Dwarf", "dwarf", "A strong, hardy dwarf from the high mountains, trained to wear armor. Good for a sturdy front-line fighter.", "Strong, armored mountain-folk"],
  ["halfling", "Stout Halfling", "halfling", "A tough halfling who shrugs off poison better than most. Good for a small but resilient character.", "Small, tough and hardy"],
  ["gnome", "Forest Gnome", "gnome", "A shy gnome of the woods with a knack for small illusions and a way with little animals. Good for a playful, nature-loving character.", "Shy illusion-loving woodland gnome"],
];

function toIndex(name) {
  return `book_sub_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

// Full entries, in the shape getSubraceDetails returns.
export const BOOK_SUBRACES = ENTRIES.map(([race, name, page, summary, tagline]) => ({
  index: toIndex(name),
  name,
  parentRace: race,
  category: "subrace",
  source: PHB,
  sourceGroup: OFFICIAL_BOOKS_GROUP,
  is_book_entry: true,
  book: PHB,
  summary,
  tagline,
  link_url: `${WIKIDOT}${page}`,
  racial_traits: [],
}));

// The short refs a race's subrace list shows, for one SRD race.
export function getBookSubraceRefs(raceIndex) {
  return BOOK_SUBRACES.filter((entry) => entry.parentRace === raceIndex).map(
    ({ index, name, source, sourceGroup, summary, tagline }) => ({
      index,
      name,
      source,
      sourceGroup,
      tagline,
      preview: summary,
    }),
  );
}

export function findBookSubrace(index) {
  return BOOK_SUBRACES.find((entry) => entry.index === index) ?? null;
}
