// Everything quick-jump search can find, gathered from the same lists the
// pages use. Loaded the first time the search opens (not at start-up), then
// kept for the visit. Characters are loaded fresh each time, since they
// change and belong to whoever is signed in.

import {
  getBackgrounds,
  getClassDetails,
  getClasses,
  getMagicItemCatalog,
  getRaces,
  getSpells,
} from "./api";
import { findBookClass } from "./bookSubclasses";
import { BOOK_MAGIC_ITEMS } from "./bookMagicItems";
import { describeSpellListing } from "./spellFilters";
import { getClassGuidance, getRaceGuidance } from "./beginnerGuidance";
import { listCharacters } from "./characterStore";
import { NAV_GROUPS } from "../components/Header/Navigation/navGroups";

// Pages, with a few other words people might type for them.
const EXTRA_PAGES = [
  { to: "/", label: "Home", hint: "The QuestKeeper front page", keywords: ["start", "main"] },
  { to: "/characters/new", label: "New Character", hint: "Make a new hero step by step", keywords: ["create", "build", "make"] },
  { to: "/attributions", label: "Attributions", hint: "Licenses for the open rules", keywords: ["license", "credits", "ogl", "srd"] },
];

const PAGE_KEYWORDS = {
  "/quiz": ["quiz", "recommend", "suggest", "build", "what to play"],
  "/library": ["monsters", "bestiary", "creatures", "dm"],
  "/games": ["tables", "join", "party", "session", "play"],
  "/dm": ["tables", "campaign", "dungeon master", "run", "join code"],
  "/homebrew": ["custom", "create", "share"],
  "/characters": ["heroes", "sheets", "party"],
  "/guide": ["help", "rules", "beginner", "learn"],
  "/about": ["credits", "sources"],
  "/magic-items": ["loot", "treasure", "gear"],
  "/races": ["species", "ancestry", "lineage"],
};

export function pageEntries() {
  const navPages = NAV_GROUPS.flatMap((group) =>
    group.items.map(({ to, label, hint }) => ({ to, label, hint, keywords: PAGE_KEYWORDS[to] })),
  );
  return [...EXTRA_PAGES, ...navPages].map((page) => ({
    ...page,
    id: `page:${page.to}`,
    category: "Pages",
  }));
}

function openLink(path, params) {
  return `${path}?${new URLSearchParams(params)}`;
}

function races(list) {
  return list.map((item) => ({
    id: `race:${item.index}`,
    label: item.name,
    category: "Races",
    // The same short line the race cards show.
    hint: getRaceGuidance(item.index)?.tagline ?? item.tagline ?? item.source ?? "SRD 5.1",
    to: openLink("/races", { open: item.index }),
  }));
}

function classes(list) {
  return list.map((item) => ({
    id: `class:${item.index}`,
    label: item.name,
    category: "Classes",
    hint: getClassGuidance(item.index)?.tagline ?? item.tagline ?? item.source ?? "SRD 5.1",
    to: openLink("/classes", { open: item.index }),
  }));
}

// Every class's subclasses (SRD, Open5e, homebrew and book). The SRD
// classes' lists come from their details, which the backend keeps cached.
async function subclasses(classList) {
  const lists = await Promise.allSettled(
    classList.map(async (item) => {
      const details = findBookClass(item.index) ?? (await getClassDetails(item.index));
      return (details.subclasses ?? []).map((sub) => ({
        id: `subclass:${sub.index}`,
        label: sub.name,
        category: "Subclasses",
        hint: [`${item.name} subclass`, sub.source].filter(Boolean).join(" · "),
        to: openLink("/classes", { open: item.index, subclass: sub.index }),
      }));
    }),
  );
  return lists.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

function backgrounds(list) {
  return list.map((item) => {
    const edition = item.edition === "2024" ? "2024" : "2014";
    return {
      id: `background:${edition}:${item.index}`,
      label: item.name,
      category: "Backgrounds",
      hint: [`${edition} rules`, item.source].filter(Boolean).join(" · "),
      to: openLink("/backgrounds", { open: item.index, edition }),
    };
  });
}

function spells(list) {
  return list.map((item) => ({
    id: `spell:${item.index}`,
    label: item.name,
    category: "Spells",
    hint: describeSpellListing(item) || "Spell",
    to: openLink("/spells", { open: item.index }),
  }));
}

function magicItems(list) {
  return list.map((item) => ({
    id: `item:${item.index}`,
    label: item.name,
    category: "Magic Items",
    hint: [item.rarity, item.type, item.source].filter(Boolean).join(" · "),
    to: openLink("/magic-items", { open: item.index }),
  }));
}

let contentLists = null;
let somethingFailed = false;

// A list that fails to load is just left out; the rest still work.
async function settle(promise, toEntries) {
  try {
    return await toEntries(await promise);
  } catch {
    somethingFailed = true;
    return [];
  }
}

// Pages, races, classes, subclasses, backgrounds, spells and magic items, as
// one promise per list, so the search can show each list as soon as it
// arrives instead of waiting for the slowest.
export function loadContentLists() {
  if (!contentLists) {
    somethingFailed = false;
    const classList = getClasses();
    contentLists = [
      Promise.resolve(pageEntries()),
      settle(getRaces(), races),
      settle(classList, classes),
      settle(classList, subclasses),
      settle(Promise.all([getBackgrounds(), getBackgrounds("2024")]), (lists) => backgrounds(lists.flat())),
      settle(getSpells(), spells),
      // The book items are built in, so they show even if the catalog fails.
      settle(getMagicItemCatalog(), magicItems),
      Promise.resolve(magicItems(BOOK_MAGIC_ITEMS)),
    ];
    const loading = contentLists;
    // Try any missing lists again next time the search opens.
    Promise.all(loading).then(() => {
      if (somethingFailed && contentLists === loading) contentLists = null;
    });
  }
  return contentLists;
}

// The signed-in player's characters (none when signed out).
export function loadCharacterEntries() {
  return settle(listCharacters(), (sheets) =>
    sheets.map((sheet) => ({
      id: `character:${sheet.id}`,
      label: sheet.name || "Unnamed hero",
      category: "My Characters",
      hint: [`Level ${sheet.level ?? 1}`, sheet.race?.name, sheet.class?.name].filter(Boolean).join(" · "),
      to: `/characters/${sheet.id}`,
    })),
  );
}

// For tests: forget what was loaded.
export function resetQuickJumpIndex() {
  contentLists = null;
}
