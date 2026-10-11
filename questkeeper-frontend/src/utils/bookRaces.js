// Races from Wizards of the Coast's published books. Same rule as
// bookBackgrounds.js: QuestKeeper can't include their rules (the books' text
// is copyrighted), so each entry only has facts: its name, its book, and where
// to read it. The summaries are our own words, never copied from the books,
// and there are no traits, speeds or ability bonuses.
//
// Players can turn any of these into homebrew: the form opens with the name,
// book and link filled in, and they add the details themselves.

import { OFFICIAL_BOOKS_GROUP } from "./bookBackgrounds";

const WIKIDOT = "https://dnd5e.wikidot.com/lineage:";

const MPMM = "Mordenkainen Presents: Monsters of the Multiverse";

// [name, book, page on Wikidot, summary, extras]
// extras.openVersion: a free version QuestKeeper already has.
const ENTRIES = [
  ["Aarakocra", MPMM, "aarakocra", "Bird-folk with feathered wings who soar high above the land. Good for a free spirit who wants to fly."],
  ["Aasimar", MPMM, "aasimar", "A mortal touched by heavenly power, with a spark of the divine inside. Good for a hero with a higher calling, or one struggling against it."],
  ["Changeling", MPMM, "changeling", "A shapeshifter who can change their face and voice at will. Good for a character with many identities and a secret true self."],
  ["Deep Gnome", MPMM, "deep-gnome", "A small gnome from deep underground, quiet, careful and hard to spot. Good for a cautious, sneaky character who's used to the dark."],
  ["Duergar", MPMM, "duergar", "A gray dwarf from the depths below, tough and stubborn, with strange magic of their own. Good for a grim, hardy character with an underground past."],
  ["Eladrin", MPMM, "eladrin", "An elf from the Feywild whose mood shifts with the seasons. Good for an emotional, magical character with a fey streak."],
  ["Fairy", MPMM, "fairy", "A tiny fey creature with wings and a touch of natural magic. Good for a small, whimsical character who loves to fly."],
  ["Firbolg", MPMM, "firbolg", "A gentle giant-kin of the forests who can talk with plants and animals. Good for a kind, quiet protector of the wild."],
  ["Genasi (Air)", MPMM, "genasi-air", "Someone with the blood of an air spirit, light on their feet and never short of breath. Good for a restless, breezy character."],
  ["Genasi (Earth)", MPMM, "genasi-earth", "Someone with the blood of an earth spirit, steady as stone. Good for a patient, unshakeable character."],
  ["Genasi (Fire)", MPMM, "genasi-fire", "Someone with the blood of a fire spirit, with a temper and a flame to match. Good for a fiery, passionate character."],
  ["Genasi (Water)", MPMM, "genasi-water", "Someone with the blood of a water spirit, at home in the sea. Good for a calm, adaptable character who loves the water."],
  ["Githyanki", MPMM, "githyanki", "A fierce warrior people from the Astral Plane, raised for battle. Good for a proud, disciplined fighter from a strange world."],
  ["Githzerai", MPMM, "githzerai", "A calm, disciplined people from the chaos of Limbo, with powers of the mind. Good for a monk-like character who values self-control."],
  ["Goliath", MPMM, "goliath", "A towering mountain-dweller who thrives on challenge and fair competition. Good for a big, strong character who always wants to do their best."],
  ["Harengon", MPMM, "harengon", "Rabbit-folk from the Feywild, quick, lucky and always ready to jump. Good for a fast, cheerful character."],
  ["Kenku", MPMM, "kenku", "Bird-folk who talk by mimicking sounds and voices they've heard. Good for a clever, mysterious character with a one-of-a-kind way of speaking."],
  ["Locathah", "Locathah Rising", "locathah", "Fish-folk from the ocean who have fought hard for their place in the world. Good for a resilient character with an underwater home."],
  ["Owlin", "Strixhaven: A Curriculum of Chaos", "owlin", "Owl-folk with silent wings and sharp eyes in the dark. Good for a watchful, bookish character who likes the night."],
  ["Satyr", MPMM, "satyr", "A goat-legged fey who lives for music, fun and celebration. Good for a carefree party-lover."],
  ["Sea Elf", MPMM, "sea-elf", "An elf who lives beneath the waves, as at home in water as on land. Good for an ocean-born character."],
  ["Shadar-Kai", MPMM, "shadar-kai", "An elf from the gloomy Shadowfell, touched by death and shadow. Good for a dark, brooding character."],
  ["Tabaxi", MPMM, "tabaxi", "Cat-folk driven by curiosity, always chasing the next interesting thing. Good for a quick, inquisitive wanderer."],
  ["Tortle", MPMM, "tortle", "Turtle-folk who carry their home on their back and love to travel. Good for a calm, tough character with a wandering spirit."],
  ["Triton", MPMM, "triton", "Proud guardians of the deep ocean, sworn to protect it. Good for a noble character from under the sea."],
  ["Verdan", "Acquisitions Incorporated", "verdan", "Small green-skinned folk touched by chaos, who keep changing as they grow. Good for a curious, chatty character still figuring themselves out."],
  ["Bugbear", MPMM, "bugbear", "A big, hairy goblin-kin who is surprisingly sneaky for their size. Good for a strong character who loves an ambush."],
  ["Centaur", MPMM, "centaur", "Half person, half horse, fast and at home on the open plains. Good for a swift, nature-loving character."],
  ["Goblin", MPMM, "goblin", "A small, quick goblin-kin who survives by being clever and nimble. Good for a scrappy underdog."],
  ["Grung", "One Grung Above", "grung", "Small, brightly colored frog-folk with poisonous skin. Good for a strange and surprising jungle character."],
  ["Hobgoblin", MPMM, "hobgoblin", "A disciplined goblin-kin who values teamwork and order. Good for a tactical character who fights best alongside friends."],
  ["Kobold", MPMM, "kobold", "Small dragon-kin who are clever, crafty and devoted to dragons. Good for a resourceful little character with big ambitions."],
  ["Lizardfolk", MPMM, "lizardfolk", "Practical reptile-folk who see the world very differently from everyone else. Good for a blunt, survival-minded character."],
  ["Minotaur", MPMM, "minotaur", "Bull-headed and powerful, built to charge into battle horns first. Good for a strong, fearless fighter.", { openVersion: "Tome of Heroes has a playable Minotaur in QuestKeeper's race list." }],
  ["Orc", MPMM, "orc", "Strong and fierce, with the endurance to keep pushing on. Good for a powerful character with a fighting spirit."],
  ["Shifter", MPMM, "shifter", "Someone with a bit of beast in their blood who can bring it out in a fight. Good for a wild, instinctive character."],
  ["Yuan-Ti", MPMM, "yuan-ti", "Snake-folk with a natural resistance to magic and poison. Good for a cunning, mysterious character."],
];

// The short line under each race's name in lists, like the SRD races have
// ("Tough and steady"). Our own words.
const TAGLINES = {
  Aarakocra: "Winged bird-folk of the skies",
  Aasimar: "Touched by heavenly light",
  Changeling: "Shapeshifter with many faces",
  "Deep Gnome": "Quiet gnome of the deep dark",
  Duergar: "Stern gray dwarf from below",
  Eladrin: "Fey elf of the changing seasons",
  Fairy: "Tiny winged fey",
  Firbolg: "Gentle giant of the forest",
  "Genasi (Air)": "Light as the wind",
  "Genasi (Earth)": "Steady as stone",
  "Genasi (Fire)": "Fiery temper, fiery blood",
  "Genasi (Water)": "Calm as the tide",
  Githyanki: "Fierce astral warrior",
  Githzerai: "Calm, disciplined mind",
  Goliath: "Towering mountain competitor",
  Harengon: "Quick, lucky rabbit-folk",
  Kenku: "Bird-folk who mimic voices",
  Locathah: "Hardy fish-folk of the sea",
  Owlin: "Silent, sharp-eyed owl-folk",
  Satyr: "Fun-loving, goat-legged fey",
  "Sea Elf": "Elf of the ocean depths",
  "Shadar-Kai": "Elf touched by shadow",
  Tabaxi: "Curious, wandering cat-folk",
  Tortle: "Turtle-folk who carry their home",
  Triton: "Proud guardian of the deep",
  Verdan: "Chatty, ever-changing green folk",
  Bugbear: "Big, sneaky goblin-kin",
  Centaur: "Swift, horse-bodied wanderer",
  Goblin: "Small, quick and scrappy",
  Grung: "Poisonous little frog-folk",
  Hobgoblin: "Disciplined goblin-kin tactician",
  Kobold: "Crafty little dragon-kin",
  Lizardfolk: "Blunt, practical reptile-folk",
  Minotaur: "Bull-headed, horns-first fighter",
  Orc: "Strong, fierce and tireless",
  Shifter: "A beast within",
  "Yuan-Ti": "Cunning snake-folk",
};

function toIndex(name) {
  return `book_${name.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

// Full entries, in the shape getRaceDetails returns.
export const BOOK_RACES = ENTRIES.map(([name, book, page, summary, extras = {}]) => ({
  index: toIndex(name),
  name,
  category: "race",
  source: book,
  sourceGroup: OFFICIAL_BOOKS_GROUP,
  is_book_entry: true,
  book,
  summary,
  tagline: TAGLINES[name] ?? null,
  link_url: `${WIKIDOT}${page}`,
  open_version: extras.openVersion ?? null,
  // No traits or subraces: the book's rules aren't included.
  traits: [],
  subraces: [],
}));

// Short list items for the races list, with the summary as a hover preview.
export function listBookRaces() {
  return BOOK_RACES.map(({ index, name, source, sourceGroup, summary, tagline }) => ({
    index,
    name,
    source,
    sourceGroup,
    tagline,
    preview: summary,
  }));
}

export function findBookRace(index) {
  return BOOK_RACES.find((entry) => entry.index === index) ?? null;
}
