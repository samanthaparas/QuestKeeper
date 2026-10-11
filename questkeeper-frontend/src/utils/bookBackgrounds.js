// Backgrounds from Wizards of the Coast's published books. QuestKeeper can't
// include their rules (the books' text is copyrighted), so each entry only has
// facts: its name, its book, and where to read it. The summaries are our own
// words, written to give players the idea, never copied from the books.
//
// Players can turn any of these into homebrew: the form opens with the name,
// book and link filled in, and they add the details themselves.
//
// Acolyte is left out: the SRD's Acolyte (with full rules) is already listed.

export const OFFICIAL_BOOKS_GROUP = "Official books";

const WIKIDOT = "https://dnd5e.wikidot.com/background:";

const PHB = "Player's Handbook (2014)";
const SCAG = "Sword Coast Adventurer's Guide";
const TOA = "Tomb of Annihilation";
const MOOT = "Mythic Odysseys of Theros";
const BGDIA = "Baldur's Gate: Descent into Avernus";
const WBTW = "The Wild Beyond the Witchlight";
const GOS = "Ghosts of Saltmarsh";
const BGG = "Bigby Presents: Glory of the Giants";
const COS = "Curse of Strahd";
const ERLW = "Eberron: Rising from the Last War";
const VRGR = "Van Richten's Guide to Ravenloft";
const BOMT = "The Book of Many Things";

// [name, book, page on Wikidot, summary, extras]
// extras.variantOf: an official variant written on its parent's page.
// extras.openVersion: a free version QuestKeeper already has.
const ENTRIES = [
  ["Anthropologist", TOA, "anthropologist", "You studied other peoples and cultures, living among them to learn their ways. Good for a curious, open-minded character who loves learning from strangers."],
  ["Archaeologist", TOA, "archaeologist", "You dig up lost places and forgotten things, and ruins feel like home. Good for an explorer who wants every dungeon to have a story."],
  ["Athlete", MOOT, "athlete", "You trained your body for competition and the roar of the crowd. Good for a confident, physical character who loves a challenge."],
  ["Charlatan", PHB, "charlatan", "You made your living with lies, disguises and clever schemes. Good for a smooth talker who's always working an angle."],
  ["City Watch", SCAG, "city-watch", "You kept the peace on a city's streets, and you still notice when something's off. Good for a practical character who knows how cities work."],
  ["Clan Crafter", SCAG, "clan-crafter", "You learned a craft from a proud clan of makers, and your work carries their name. Good for a skilled artisan with deep family roots."],
  ["Cloistered Scholar", SCAG, "cloistered-scholar", "You spent years in a great library, surrounded by books and learned teachers. Good for a bookish character who knows where to find any answer."],
  ["Courtier", SCAG, "courtier", "You know your way around palaces, politics and polite conversation. Good for a socially sharp character who thrives among nobles and officials."],
  ["Criminal", PHB, "criminal", "You broke the law for a living and still know people in the underworld. Good for a streetwise character with useful contacts.", { openVersion: "SRD 5.2 has a free 2024-rules Criminal on the Backgrounds page." }],
  ["Entertainer", PHB, "entertainer", "You lived for the stage, the song and the applause. Good for a showy character who loves an audience."],
  ["Faceless", BGDIA, "faceless", "You hide behind a second identity, a mask the world sees instead of the real you. Good for a hero with a secret life."],
  ["Faction Agent", SCAG, "faction-agent", "You serve a powerful organization and carry out its work, in secret or in the open. Good for a character with a cause bigger than themselves."],
  ["Far Traveler", SCAG, "far-traveler", "You come from a distant land, and everything here feels a little strange. Good for an outsider who sees the world with fresh eyes."],
  ["Feylost", WBTW, "feylost", "You spent your childhood lost in the strange realm of the fey, and it left its mark on you. Good for a dreamy, otherworldly character."],
  ["Fisher", GOS, "fisher", "You made your living on the water, hauling nets and reading the weather. Good for a patient, practical character from a coastal town."],
  ["Folk Hero", PHB, "folk-hero", "An ordinary person who did something brave, and now the whole village tells the story. Good for a humble hero with simple roots."],
  ["Giant Foundling", BGG, "giant-foundling", "You were raised by giants or among them, and you're used to a world built big. Good for a hardy character with an unusual upbringing."],
  ["Gladiator", PHB, "entertainer", "You fought in the arena, and the crowd's cheers were your pay. Good for a showy fighter who loves the spotlight.", { variantOf: "Entertainer" }],
  ["Guild Artisan", PHB, "guild-artisan", "You learned a trade and belong to a guild of fellow crafters. Good for a skilled maker with a network of colleagues."],
  ["Guild Merchant", PHB, "guild-artisan", "Instead of making goods, you bought and sold them as part of a merchant guild. Good for a deal-maker who knows what everything is worth.", { variantOf: "Guild Artisan" }],
  ["Haunted One", COS, "haunted-one", "Something terrible happened to you, and it hasn't let go. Good for a darker story, and a natural fit for horror campaigns."],
  ["Hermit", PHB, "hermit", "You lived alone, away from the world, for a long time, and you found something out there. Good for a quiet, thoughtful character with a secret."],
  ["House Agent", ERLW, "house-agent", "You work for one of Eberron's great dragonmarked houses, handling its business. Good for a professional with powerful employers."],
  ["Inheritor", SCAG, "inheritor", "You inherited something important: an heirloom, a title or a duty. Good for a character whose story starts with a legacy."],
  ["Investigator (SCAG)", SCAG, "city-watch", "Rather than walking a beat, you solved crimes and followed the clues. Good for a sharp-eyed detective.", { variantOf: "City Watch" }],
  ["Investigator (VRGR)", VRGR, "investigator", "You've looked into strange and terrible mysteries, and you keep going. Good for a monster-hunting detective, especially in horror campaigns."],
  ["Knight", PHB, "noble", "You're a noble who serves as a knight, with loyal retainers at your side. Good for an honorable warrior with status.", { variantOf: "Noble" }],
  ["Knight of the Order", SCAG, "knight-of-the-order", "You belong to a knightly order bound by a code and a cause. Good for a devoted character who lives by their vows."],
  ["Marine", GOS, "marine", "You fought aboard ships and stormed enemy shores. Good for a tough soldier who's at home on the water."],
  ["Mercenary Veteran", SCAG, "mercenary-veteran", "You fought for pay in a mercenary company and have the scars to show for it. Good for a hardened, practical fighter."],
  ["Noble", PHB, "noble", "You were born into wealth, power and privilege. Good for a character used to giving orders, with a family name to live up to."],
  ["Outlander", PHB, "outlander", "You grew up far from towns and roads, out in the wild. Good for a rugged survivor who's more comfortable outdoors."],
  ["Pirate", PHB, "sailor", "You sailed under a pirate flag, and your reputation travels ahead of you. Good for a bold rogue of the seas.", { variantOf: "Sailor" }],
  ["Rewarded", BOMT, "rewarded", "A stroke of fate changed your life for the better, almost overnight. Good for a lucky character still figuring out what to do with their gift."],
  ["Ruined", BOMT, "ruined", "Fate turned on you, and you lost almost everything. Good for a character with something to rebuild and something to prove."],
  ["Rune Carver", BGG, "rune-carver", "You study and carve runes, an old magic tied to the giants. Good for a crafty character drawn to ancient mysteries."],
  ["Sage", PHB, "sage", "You spent years studying lore, history and the mysteries of the world. Good for a scholar who loves research.", { openVersion: "SRD 5.2 has a free 2024-rules Sage on the Backgrounds page." }],
  ["Sailor", PHB, "sailor", "You crewed a ship for years, through storms and calm seas. Good for a hardy, practical character who loves the open water."],
  ["Shipwright", GOS, "shipwright", "You build and repair ships, and you know every plank and rope. Good for a hands-on maker who loves the sea."],
  ["Smuggler", GOS, "smuggler", "You moved goods past the law, often by boat and after dark. Good for a sly character who knows the hidden ways."],
  ["Soldier", PHB, "soldier", "You served in an army and know what war is really like. Good for a disciplined fighter with comrades and a rank.", { openVersion: "SRD 5.2 has a free 2024-rules Soldier on the Backgrounds page." }],
  ["Spy", PHB, "criminal", "Your crimes were done for someone else: you gathered secrets as a spy. Good for a careful character with hidden loyalties.", { variantOf: "Criminal" }],
  ["Urban Bounty Hunter", SCAG, "urban-bounty-hunter", "You track people down in a city's crowded streets, for pay. Good for a relentless hunter who knows the city's shadows."],
  ["Urchin", PHB, "urchin", "You grew up poor and alone on city streets and learned how to survive. Good for a scrappy underdog."],
  ["Uthgardt Tribe Member", SCAG, "uthgardt-tribe-member", "You come from one of the proud Uthgardt tribes of the far North. Good for a fierce character with strong traditions."],
  ["Waterdhavian Noble", SCAG, "waterdhavian-noble", "You're from one of the noble families of the great city of Waterdeep. Good for a well-connected character with city-born privilege."],
  ["Witchlight Hand", WBTW, "witchlight-hand", "You worked at the Witchlight Carnival, a travelling fey circus. Good for a cheerful, whimsical character with a show-business past."],
];

function toIndex(name) {
  return `book_${name.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

// Book entry IDs start with "book_" so they never clash with SRD, Open5e or
// homebrew IDs.
export function isBookEntryId(index) {
  return String(index ?? "").startsWith("book_");
}

// Full entries, in the shape getBackgroundDetails returns.
export const BOOK_BACKGROUNDS = ENTRIES.map(([name, book, page, summary, extras = {}]) => ({
  index: toIndex(name),
  name,
  category: "background",
  source: book,
  sourceGroup: OFFICIAL_BOOKS_GROUP,
  edition: "2014",
  is_book_entry: true,
  book,
  summary,
  link_url: `${WIKIDOT}${page}`,
  variant_of: extras.variantOf ?? null,
  open_version: extras.openVersion ?? null,
}));

// Short list items for the backgrounds list.
export function listBookBackgrounds() {
  return BOOK_BACKGROUNDS.map(({ index, name, source, sourceGroup, edition, summary }) => ({
    index,
    name,
    source,
    sourceGroup,
    edition,
    // Shown on hover in lists, so players get the idea without opening it.
    preview: summary,
  }));
}

export function findBookBackground(index) {
  return BOOK_BACKGROUNDS.find((entry) => entry.index === index) ?? null;
}
