import {
  getBackgroundIcon,
  getClassIcon,
  getRaceIcon,
  getSpellEffectIcon,
  getSpellSchoolIcon,
  getUiIcon,
} from "../../../utils/icons";
import bookIcon from "../../../assets/brand/questkeeper-book-logo-64.png";

// The header's three menus and the pages in each. Home isn't listed: the
// logo goes there. Hints are short on purpose (no counts, which go stale).
// tag: a small label beside the name, e.g. who the page is mainly for.
export const NAV_GROUPS = [
  {
    id: "explore",
    label: "Explore",
    blurb: "Look up the options for your hero",
    items: [
      { to: "/races", label: "Races", hint: "Ancestries and their traits", icon: getRaceIcon("elf") },
      { to: "/classes", label: "Classes", hint: "What your hero does best", icon: getClassIcon("fighter") },
      { to: "/backgrounds", label: "Backgrounds", hint: "Your life before adventuring", icon: getBackgroundIcon("sage") },
      { to: "/spells", label: "Spells", hint: "Search and filter every spell", icon: getSpellSchoolIcon("evocation") },
      { to: "/magic-items", label: "Magic Items", hint: "Gear, potions and treasures", icon: getUiIcon("inventory") },
    ],
  },
  {
    id: "adventures",
    label: "My Adventures",
    blurb: "Your heroes, your games, your creations",
    items: [
      { to: "/characters", label: "My Characters", hint: "Build and track your heroes", icon: getUiIcon("character") },
      { to: "/homebrew", label: "Homebrew", hint: "Make and share your own options", icon: getUiIcon("notes") },
      { to: "/tables", label: "Tables", hint: "Run or join a game night", icon: getUiIcon("dice") },
      { to: "/library", label: "Monster Library", hint: "Creatures for your encounters", icon: getRaceIcon("bugbear"), tag: "For DMs" },
    ],
  },
  {
    id: "help",
    label: "Help",
    blurb: "Getting started and credits",
    items: [
      { to: "/guide", label: "Guide", hint: "New to D&D? Start here", icon: getUiIcon("search-reference") },
      { to: "/quiz", label: "Character Quiz", hint: "Not sure what to play? Find a hero", icon: getSpellEffectIcon("divination") },
      { to: "/about", label: "About", hint: "Sources and credits", icon: bookIcon },
    ],
  },
];

// Whether a page belongs to a link ("/tables/abc" is under Tables).
export function isUnder(pathname, to) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

// Which menu holds the current page, or -1 (Home, Log In, etc.).
export function activeGroupIndex(pathname) {
  return NAV_GROUPS.findIndex((group) =>
    group.items.some((item) => isUnder(pathname, item.to)),
  );
}
