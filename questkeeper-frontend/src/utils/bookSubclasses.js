// Subclasses (and two whole classes) from published books. Same rule as
// bookRaces.js and bookBackgrounds.js: QuestKeeper can't include their rules
// (the books' text is copyrighted), so each entry only has facts: its name,
// its class, its book and where to read it. The summaries are our own words,
// never copied from the books, and there are no features or spell lists.
//
// Left out on purpose: the SRD's own subclass for each class (QuestKeeper
// already has it with full rules) and Unearthed Arcana playtest material.
// Blood Hunter is Matthew Mercer's class, published on D&D Beyond, not a
// Wizards of the Coast book, and is labeled that way.

import { OFFICIAL_BOOKS_GROUP } from "./bookBackgrounds";

const WIKIDOT = "https://dnd5e.wikidot.com/";

const PHB = "Player's Handbook (2014)";
const XGE = "Xanathar's Guide to Everything";
const TCE = "Tasha's Cauldron of Everything";
const SCAG = "Sword Coast Adventurer's Guide";
const DMG = "Dungeon Master's Guide (2014)";
const EGW = "Explorer's Guide to Wildemount";
const FTD = "Fizban's Treasury of Dragons";
const VRGR = "Van Richten's Guide to Ravenloft";
const BGG = "Bigby Presents: Glory of the Giants";
const DSOTDQ = "Dragonlance: Shadow of the Dragon Queen";
const PSA = "Plane Shift: Amonkhet";
const PSK = "Plane Shift: Kaladesh";
const MERCER = "Blood Hunter (Matthew Mercer, D&D Beyond)";

// Classes that aren't in the SRD. Homebrew can't build whole classes yet, so
// these are for reading about; their subclasses are listed below.
// [class, name, book, page on Wikidot, tagline, summary, what its subclasses are called]
const CLASS_ENTRIES = [
  ["artificer", "Artificer", TCE, "artificer", "Magical inventor and tinkerer", "Inventors who channel magic into gadgets, potions and enchanted gear instead of casting it raw. Good for a tinkerer who'd rather build a solution than find one.", "Artificer Specialist"],
  ["blood-hunter", "Blood Hunter", MERCER, "blood-hunter", "Blood-magic monster hunter", "Monster hunters who use risky blood magic, trading a little of their own life for power against the creatures they track. Good for a dark, driven warrior with a cause.", "Blood Hunter Order"],
];

// [class, name, book, page on Wikidot, summary]
const ENTRIES = [
  // Artificer
  ["artificer", "Alchemist", TCE, "artificer:alchemist", "Brews magical potions and elixirs that heal friends and harm enemies. Good for a support player who loves experimenting."],
  ["artificer", "Armorer", TCE, "artificer:armorer", "Builds and wears a suit of magical power armor. Good for a tough, front-line inventor."],
  ["artificer", "Artillerist", TCE, "artificer:artillerist", "Makes magical cannons and blasts enemies from a distance. Good for a player who likes big explosions."],
  ["artificer", "Battle Smith", TCE, "artificer:battle-smith", "Fights alongside a loyal mechanical companion they built themselves. Good for someone who wants a robot friend."],

  // Barbarian
  ["barbarian", "Path of the Ancestral Guardian", XGE, "barbarian:ancestral-guardian", "Calls on the spirits of their ancestors to shield their allies. Good for a barbarian who protects the whole party."],
  ["barbarian", "Path of the Battlerager", SCAG, "barbarian:battlerager", "Charges into fights wearing spiked armor that hurts anyone nearby. Good for a wild, reckless brawler."],
  ["barbarian", "Path of the Beast", TCE, "barbarian:beast", "Their rage turns them partly animal, with claws, bites or a lashing tail. Good for a player who wants to go feral."],
  ["barbarian", "Path of the Giant", BGG, "barbarian:giant", "Draws on the power of giants, growing larger and hurling things when they rage. Good for a big, elemental bruiser."],
  ["barbarian", "Path of the Storm Herald", XGE, "barbarian:storm-herald", "Their rage surrounds them with a storm of desert heat, sea spray or arctic cold. Good for a barbarian with an elemental edge."],
  ["barbarian", "Path of the Totem Warrior", PHB, "barbarian:totem-warrior", "Bonds with an animal spirit, like the bear, eagle or wolf, for its strengths. Good for a nature-touched warrior."],
  ["barbarian", "Path of Wild Magic", TCE, "barbarian:wild-magic", "Their rage sets off unpredictable bursts of magic. Good for a player who enjoys chaos."],
  ["barbarian", "Path of the Zealot", XGE, "barbarian:zealot", "A holy warrior whose rage is fueled by their god, and who is very hard to keep down. Good for a fierce believer."],

  // Bard
  ["bard", "College of Creation", TCE, "bard:creation", "Uses the song that made the world to bring objects to life. Good for a creative, whimsical bard."],
  ["bard", "College of Eloquence", TCE, "bard:eloquence", "A master speaker whose words are hard to resist. Good for the party's persuasive voice."],
  ["bard", "College of Glamour", XGE, "bard:glamour", "Wields dazzling fey charm to inspire friends and enchant foes. Good for a charismatic performer."],
  ["bard", "College of Spirits", VRGR, "bard:spirits", "A storyteller who calls on spirits from beyond to tell their tales. Good for a spooky, mystical bard."],
  ["bard", "College of Swords", XGE, "bard:swords", "A blade performer who mixes flashy weapon tricks into their fighting. Good for a showy duelist."],
  ["bard", "College of Valor", PHB, "bard:valor", "Inspires heroes and fights right beside them. Good for a bard who wants to be on the front line."],
  ["bard", "College of Whispers", XGE, "bard:whispers", "Trades in secrets, fear and lies. Good for a sneaky, sinister bard."],

  // Blood Hunter
  ["blood-hunter", "Order of the Ghostslayer", MERCER, "blood-hunter:ghostslayer", "Specializes in hunting the undead and spirits. Good for a holy-feeling monster hunter."],
  ["blood-hunter", "Order of the Lycan", MERCER, "blood-hunter:lycan", "Carries a controlled werewolf curse and can turn into a hybrid beast. Good for a player who wants a monstrous form."],
  ["blood-hunter", "Order of the Mutant", MERCER, "blood-hunter:mutant", "Drinks strange brews that change their body for an edge in a fight. Good for an experimenting, alchemical hunter."],
  ["blood-hunter", "Order of the Profane Soul", MERCER, "blood-hunter:profane-soul", "Made a pact with a dark patron to fight the darkness. Good for a hunter who also wants some warlock-style magic."],

  // Cleric
  ["cleric", "Arcana Domain", SCAG, "cleric:arcana", "Worships a god of magic and learns wizard-like spells. Good for a scholarly, spell-loving cleric."],
  ["cleric", "Death Domain", DMG, "cleric:death", "Serves forces of death and wields deadly necrotic magic. Good for a dark, villain-leaning cleric."],
  ["cleric", "Forge Domain", XGE, "cleric:forge", "A divine craftsman who blesses armor and weapons. Good for a sturdy, hands-on cleric."],
  ["cleric", "Grave Domain", XGE, "cleric:grave", "Guards the line between life and death and fights the undead. Good for a calm protector of the dying."],
  ["cleric", "Knowledge Domain", PHB, "cleric:knowledge", "Values learning and can pull secrets from minds. Good for a scholar cleric."],
  ["cleric", "Light Domain", PHB, "cleric:light", "Brings radiant light and fire against the darkness. Good for a cleric who likes to blast enemies."],
  ["cleric", "Nature Domain", PHB, "cleric:nature", "Serves gods of the wild with plants and animals at their side. Good for a druid-like cleric."],
  ["cleric", "Order Domain", TCE, "cleric:order", "Believes in law and command, and gives allies extra chances to strike. Good for a disciplined leader."],
  ["cleric", "Peace Domain", TCE, "cleric:peace", "Binds allies together so they protect one another. Good for a supportive, team-focused cleric."],
  ["cleric", "Tempest Domain", PHB, "cleric:tempest", "Commands thunder, lightning and storms. Good for a loud, powerful cleric."],
  ["cleric", "Trickery Domain", PHB, "cleric:trickery", "Serves a trickster god with illusions and mischief. Good for a sneaky, playful cleric."],
  ["cleric", "Twilight Domain", TCE, "cleric:twilight", "Guards travelers through the night and soothes their fears. Good for a comforting protector of the party."],
  ["cleric", "War Domain", PHB, "cleric:war", "A holy warrior who fights at the front and strikes harder with divine help. Good for a battle-ready cleric."],
  ["cleric", "Ambition Domain", PSA, "cleric:ambition", "Serves a god of drive and success, with a talent for deception. Good for a cunning, goal-driven cleric."],
  ["cleric", "Solidarity Domain", PSA, "cleric:solidarity", "Values unity and helps allies work as one. Good for a loyal team player."],
  ["cleric", "Strength Domain", PSA, "cleric:strength", "Worships strength and grows mighty in body. Good for a physically powerful cleric."],
  ["cleric", "Zeal Domain", PSA, "cleric:zeal", "Charges into battle with burning devotion. Good for an aggressive, front-line cleric."],

  // Druid
  ["druid", "Circle of Dreams", XGE, "druid:dreams", "Tied to the dreamy Feywild, healing friends and stepping through space. Good for a gentle, magical druid."],
  ["druid", "Circle of the Moon", PHB, "druid:moon", "Turns into powerful beasts to fight. Good for a druid who wants to become a bear."],
  ["druid", "Circle of the Shepherd", XGE, "druid:shepherd", "Calls on animal spirits and strengthens summoned creatures. Good for a druid who loves animals."],
  ["druid", "Circle of Spores", TCE, "druid:spores", "Uses fungus and decay, even raising the dead as fungal helpers. Good for a creepy, earthy druid."],
  ["druid", "Circle of Stars", TCE, "druid:stars", "Reads the stars and takes on glowing star forms. Good for a mystical, cosmic druid."],
  ["druid", "Circle of Wildfire", TCE, "druid:wildfire", "Bonded to a fiery spirit that burns and renews. Good for a druid who likes fire."],

  // Fighter
  ["fighter", "Arcane Archer", XGE, "fighter:arcane-archer", "Fires arrows infused with magic tricks. Good for a magical sharpshooter."],
  ["fighter", "Banneret", SCAG, "fighter:banneret", "A battlefield leader who rallies and heals allies. Good for a fighter who leads the charge."],
  ["fighter", "Battle Master", PHB, "fighter:battle-master", "Uses clever combat maneuvers to trip, disarm and outsmart foes. Good for a tactical fighter who likes choices."],
  ["fighter", "Cavalier", XGE, "fighter:cavalier", "A mounted knight who protects allies and holds the line. Good for a protective warrior."],
  ["fighter", "Echo Knight", EGW, "fighter:echo-knight", "Fights alongside a shadowy echo of themselves. Good for a player who wants to be in two places at once."],
  ["fighter", "Eldritch Knight", PHB, "fighter:eldritch-knight", "Mixes sword skill with a little wizard magic. Good for a warrior-mage."],
  ["fighter", "Psi Warrior", TCE, "fighter:psi-warrior", "Uses the power of their mind to push, shield and strike. Good for a psychic warrior."],
  ["fighter", "Rune Knight", TCE, "fighter:rune-knight", "Carves giant runes into their gear and can grow huge. Good for a fighter who wants giant magic."],
  ["fighter", "Samurai", XGE, "fighter:samurai", "A disciplined warrior of unshakable fighting spirit. Good for a focused, honorable fighter."],

  // Monk
  ["monk", "Way of Mercy", TCE, "monk:mercy", "Heals with one hand and harms with the other. Good for a monk who's part healer."],
  ["monk", "Way of the Ascendant Dragon", FTD, "monk:ascendant-dragon", "Channels the power of dragons, even breathing their elements. Good for a dragon-inspired monk."],
  ["monk", "Way of the Astral Self", TCE, "monk:astral-self", "Summons ghostly spirit arms and a glowing astral form. Good for a monk with a flashy look."],
  ["monk", "Way of the Drunken Master", XGE, "monk:drunken-master", "Fights with a wobbly, unpredictable style. Good for a playful monk who dodges everything."],
  ["monk", "Way of the Four Elements", PHB, "monk:four-elements", "Bends fire, water, earth and air with martial arts. Good for an elemental monk."],
  ["monk", "Way of the Kensei", XGE, "monk:kensei", "Masters a few chosen weapons as an art form. Good for a monk who loves weapons."],
  ["monk", "Way of the Long Death", SCAG, "monk:long-death", "Studies death and draws strength from it. Good for a dark, grim monk."],
  ["monk", "Way of Shadow", PHB, "monk:shadow", "A ninja who moves through darkness and shadows. Good for a stealthy monk."],
  ["monk", "Way of the Sun Soul", XGE, "monk:sun-soul", "Hurls bolts of radiant energy from their own spirit. Good for a monk who wants a ranged attack."],

  // Paladin
  ["paladin", "Oath of the Ancients", PHB, "paladin:ancients", "Swears to protect light, life and the beauty of nature. Good for a nature-loving knight."],
  ["paladin", "Oath of Conquest", XGE, "paladin:conquest", "Rules through fear and strength. Good for a commanding, intimidating paladin."],
  ["paladin", "Oath of the Crown", SCAG, "paladin:crown", "Serves a ruler or nation with loyalty above all. Good for a dutiful protector."],
  ["paladin", "Oath of Glory", TCE, "paladin:glory", "Strives for heroic deeds and athletic greatness. Good for a legendary-hero type."],
  ["paladin", "Oath of Redemption", XGE, "paladin:redemption", "Believes almost anyone can be saved and prefers peace to violence. Good for a kind, patient paladin."],
  ["paladin", "Oath of Vengeance", PHB, "paladin:vengeance", "Hunts down evil at any cost. Good for a relentless avenger."],
  ["paladin", "Oath of the Watchers", TCE, "paladin:watchers", "Guards the world from threats from other planes. Good for a vigilant protector."],
  ["paladin", "Oathbreaker", DMG, "paladin:oathbreaker", "A paladin who broke their oath and serves darker powers. Good for a fallen or villainous knight."],

  // Ranger
  ["ranger", "Beast Master Conclave", PHB, "ranger:beast-master", "Fights side by side with an animal companion. Good for a ranger who wants a pet."],
  ["ranger", "Drakewarden", FTD, "ranger:drakewarden", "Raises and bonds with a small dragon that grows with them. Good for anyone who wants a dragon friend."],
  ["ranger", "Fey Wanderer", TCE, "ranger:fey-wanderer", "Touched by the Feywild, charming and beguiling. Good for a magical, social ranger."],
  ["ranger", "Gloom Stalker Conclave", XGE, "ranger:gloom-stalker", "Hunts in darkness, unseen and quick to strike. Good for a stealthy, deadly ranger."],
  ["ranger", "Horizon Walker Conclave", XGE, "ranger:horizon-walker", "Guards the borders between worlds and can teleport short distances. Good for a planar traveler."],
  ["ranger", "Monster Slayer Conclave", XGE, "ranger:monster-slayer", "Specializes in hunting dangerous magical creatures. Good for a monster hunter."],
  ["ranger", "Swarmkeeper", TCE, "ranger:swarmkeeper", "Surrounded by a swarm of nature spirits, like bees or pixies. Good for a quirky nature ranger."],

  // Rogue
  ["rogue", "Arcane Trickster", PHB, "rogue:arcane-trickster", "Adds illusions and magic tricks to their sneakiness. Good for a magical thief."],
  ["rogue", "Assassin", PHB, "rogue:assassin", "Specializes in disguise and deadly surprise attacks. Good for a stealthy killer."],
  ["rogue", "Inquisitive", XGE, "rogue:inquisitive", "A detective who spots lies and weaknesses. Good for a sharp-eyed investigator."],
  ["rogue", "Mastermind", XGE, "rogue:mastermind", "A schemer and spy who directs allies from behind the scenes. Good for a clever manipulator."],
  ["rogue", "Phantom", TCE, "rogue:phantom", "Walks close to death and draws on the souls of the fallen. Good for a haunting, spooky rogue."],
  ["rogue", "Scout", XGE, "rogue:scout", "A skilled tracker and skirmisher in the wilderness. Good for an outdoorsy rogue."],
  ["rogue", "Soulknife", TCE, "rogue:soulknife", "Creates blades from pure psychic energy. Good for a rogue with mind powers."],
  ["rogue", "Swashbuckler", XGE, "rogue:swashbuckler", "A charming, daring duelist who darts in and out of fights. Good for a dashing hero."],

  // Sorcerer
  ["sorcerer", "Aberrant Mind", TCE, "sorcerer:aberrant-mind", "Their power comes from strange, alien influences, with psychic magic. Good for an eerie sorcerer."],
  ["sorcerer", "Clockwork Soul", TCE, "sorcerer:clockwork-soul", "Their magic comes from the forces of perfect order. Good for a precise, orderly sorcerer."],
  ["sorcerer", "Divine Soul", XGE, "sorcerer:divine-soul", "Born with a spark of the divine, and can learn healing magic too. Good for a holy sorcerer."],
  ["sorcerer", "Lunar Sorcery", DSOTDQ, "sorcerer:lunar-sorcery", "Draws power from the moon's changing phases. Good for a mystical, moon-touched sorcerer."],
  ["sorcerer", "Shadow Magic", XGE, "sorcerer:shadow-magic", "Born of darkness, with a shadowy hound to call on. Good for a gloomy, mysterious sorcerer."],
  ["sorcerer", "Storm Sorcery", XGE, "sorcerer:storm-sorcery", "Their magic crackles with wind and lightning. Good for a stormy, energetic sorcerer."],
  ["sorcerer", "Wild Magic", PHB, "sorcerer:wild-magic", "Their magic is chaotic and can surge into random effects. Good for a player who enjoys surprises."],
  ["sorcerer", "Pyromancy", PSK, "sorcerer:pyromancy", "Born with an inner fire that only grows. Good for a sorcerer who loves fire."],

  // Warlock
  ["warlock", "Archfey", PHB, "warlock:archfey", "Made a pact with a powerful, whimsical fey lord. Good for a charming, trickster warlock."],
  ["warlock", "Celestial", XGE, "warlock:celestial", "Their patron is a being of heavenly light, granting healing magic. Good for a warlock who supports the party."],
  ["warlock", "Fathomless", TCE, "warlock:fathomless", "Bound to a creature of the deep ocean, with ghostly tentacles. Good for a sea-touched warlock."],
  ["warlock", "The Genie", TCE, "warlock:the-genie", "Their patron is a noble genie, and they carry a tiny magical vessel. Good for a warlock with flair."],
  ["warlock", "Great Old One", PHB, "warlock:great-old-one", "Bound to an ancient, unknowable cosmic entity. Good for a creepy, mind-bending warlock."],
  ["warlock", "Hexblade", XGE, "warlock:hexblade", "Their patron is a shadowy power tied to a magic weapon. Good for a warlock who fights up close."],
  ["warlock", "Undead", VRGR, "warlock:undead", "Their patron is a mighty undead being, letting them take a terrifying form. Good for a dark, frightening warlock."],
  ["warlock", "Undying", SCAG, "warlock:undying", "Their patron has cheated death, and so might they. Good for a warlock who wants to live forever."],

  // Wizard
  ["wizard", "School of Abjuration", PHB, "wizard:abjuration", "Masters protective magic and magical wards. Good for a defensive wizard."],
  ["wizard", "Bladesinging", TCE, "wizard:bladesinging", "An elegant spellcaster who dances with a blade. Good for a wizard who fights up close."],
  ["wizard", "School of Chronurgy", EGW, "wizard:chronurgy", "Bends time itself. Good for a wizard who likes to change fate."],
  ["wizard", "School of Conjuration", PHB, "wizard:conjuration", "Summons creatures and objects out of thin air. Good for a wizard who likes summoning."],
  ["wizard", "School of Divination", PHB, "wizard:divination", "Sees the future and can change rolls with visions. Good for a wizard who loves knowing what's coming."],
  ["wizard", "School of Enchantment", PHB, "wizard:enchantment", "Charms and controls minds. Good for a manipulative wizard."],
  ["wizard", "School of Graviturgy", EGW, "wizard:graviturgy", "Controls gravity to pull, push and crush. Good for a wizard who likes moving things around."],
  ["wizard", "School of Illusion", PHB, "wizard:illusion", "Creates convincing illusions to fool everyone. Good for a tricky, creative wizard."],
  ["wizard", "School of Necromancy", PHB, "wizard:necromancy", "Commands the power of life and death, including raising the dead. Good for a dark wizard."],
  ["wizard", "Order of Scribes", TCE, "wizard:order-of-scribes", "Their spellbook is alive and helps them cast. Good for a bookish wizard."],
  ["wizard", "School of Transmutation", PHB, "wizard:transmutation", "Changes matter and makes magical stones. Good for an alchemy-minded wizard."],
  ["wizard", "War Magic", XGE, "wizard:war-magic", "Trained in battle magic for both attack and defense. Good for a wizard built for combat."],
];

// Subclass IDs include the class ("book_monk-way-of-shadow"), so names shared
// across classes (or with races and backgrounds) never clash.
function slug(text) {
  return text.toLowerCase().replace(/[()']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const CLASS_NAMES = Object.fromEntries(CLASS_ENTRIES.map(([index, name]) => [index, name]));
// The 12 SRD classes, the only ones homebrew subclasses can belong to today.
const SRD_CLASS_IDS = [
  "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
];
const className = (index) => CLASS_NAMES[index] ?? index.charAt(0).toUpperCase() + index.slice(1);

export const BOOK_SUBCLASSES = ENTRIES.map(([classIndex, name, book, page, summary]) => ({
  index: `book_${classIndex}-${slug(name)}`,
  name,
  category: "subclass",
  class: { index: classIndex, name: className(classIndex) },
  source: book,
  sourceGroup: OFFICIAL_BOOKS_GROUP,
  is_book_entry: true,
  book,
  summary,
  link_url: `${WIKIDOT}${page}`,
  // Only subclasses of SRD classes can be rebuilt as homebrew for now.
  can_make_homebrew: SRD_CLASS_IDS.includes(classIndex),
  // No features: the book's rules aren't included.
  features: [],
}));

function toRef({ index, name, source, sourceGroup, summary }) {
  return { index, name, source, sourceGroup, preview: summary };
}

// Book subclasses for one class (an SRD class or a book class).
export function getBookSubclassRefs(classIndex) {
  return BOOK_SUBCLASSES.filter((entry) => entry.class.index === classIndex).map(toRef);
}

export function findBookSubclass(index) {
  return BOOK_SUBCLASSES.find((entry) => entry.index === index) ?? null;
}

// Artificer and Blood Hunter, in the shape getClassDetails returns.
export const BOOK_CLASSES = CLASS_ENTRIES.map(([classIndex, name, book, page, tagline, summary, flavor]) => ({
  index: `book_${classIndex}`,
  name,
  tagline,
  category: "class",
  source: book,
  sourceGroup: OFFICIAL_BOOKS_GROUP,
  is_book_entry: true,
  book,
  summary,
  subclass_flavor: flavor,
  link_url: `${WIKIDOT}${page}`,
  subclasses: getBookSubclassRefs(classIndex),
}));

export function listBookClasses() {
  return BOOK_CLASSES.map(({ index, name, source, sourceGroup, summary, tagline }) => ({
    index,
    name,
    source,
    sourceGroup,
    tagline,
    preview: summary,
  }));
}

export function findBookClass(index) {
  return BOOK_CLASSES.find((entry) => entry.index === index) ?? null;
}
