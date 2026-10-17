// Feats from Wizards of the Coast's published books. Same rule as
// bookRaces.js: QuestKeeper can't include their rules (the books' text is
// copyrighted), so each entry only has facts: its name, its book, and where
// to read it. The summaries are our own words, never copied from the books,
// and there are no numbers, prerequisites or rules.
//
// Players can turn any of these into homebrew ("Make it as homebrew"): the
// form opens with the name, book and link filled in, and they write what it
// does in their own words.
//
// Grappler is left out: the SRD's Grappler (with full rules) is already listed.
// Dwarven Fortitude (Xanathar's) is left out for now: its Wikidot page wasn't
// found at the usual address, and an entry needs a working link.

import { OFFICIAL_BOOKS_GROUP } from "./bookBackgrounds";

const WIKIDOT = "https://dnd5e.wikidot.com/feat:";

const PHB = "Player's Handbook (2014)";
const XGE = "Xanathar's Guide to Everything";
const TCE = "Tasha's Cauldron of Everything";
const FTD = "Fizban's Treasury of Dragons";
const SCC = "Strixhaven: A Curriculum of Chaos";

const FREE_2024 = { openVersion: "SRD 5.2 has a free 2024-rules version of this feat in the feat list." };

// [name, book, page on Wikidot, summary, extras]
// extras.openVersion: a free version QuestKeeper already has.
const ENTRIES = [
  ["Actor", PHB, "actor", "You're a gifted performer who can pass for someone else, voice and all. Good for a character who talks their way in by playing a part."],
  ["Alert", PHB, "alert", "You're always on guard and hard to catch off guard. Good for a character who wants to act first when trouble starts.", FREE_2024],
  ["Athlete", PHB, "athlete", "You've trained your body to climb, leap and recover fast. Good for a physical character who moves well in a scramble."],
  ["Charger", PHB, "charger", "You hit hardest when you run straight at your target. Good for a fighter who likes to open a fight with a rush."],
  ["Crossbow Expert", PHB, "crossbow-expert", "You handle crossbows with a speed and ease most people can't match. Good for a ranged fighter who stays dangerous up close."],
  ["Defensive Duelist", PHB, "defensive-duelist", "You turn aside blows with a quick, clever blade. Good for a nimble fighter who prefers to dodge and parry."],
  ["Dual Wielder", PHB, "dual-wielder", "You fight with a weapon in each hand and make both count. Good for a character who loves a flurry of strikes."],
  ["Dungeon Delver", PHB, "dungeon-delver", "You've spent enough time underground to spot traps and secret doors. Good for a careful explorer of ruins and tunnels."],
  ["Durable", PHB, "durable", "You bounce back from wounds faster than most. Good for a tough character who wants to stay on their feet."],
  ["Elemental Adept", PHB, "elemental-adept", "You've mastered one kind of elemental magic, and your spells of that type are hard to resist. Good for a caster with a favorite element."],
  ["Great Weapon Master", PHB, "great-weapon-master", "You swing heavy weapons with brutal, all-in force. Good for a fighter who wants big hits and big risks."],
  ["Healer", PHB, "healer", "You're skilled at patching up allies with simple supplies. Good for a party medic who isn't a spellcaster."],
  ["Heavily Armored", PHB, "heavily-armored", "You've trained to fight in the heaviest armor. Good for a character who wants to wear plate and stand firm."],
  ["Heavy Armor Master", PHB, "heavy-armor-master", "Your heavy armor lets you shrug off ordinary blows. Good for a front-line fighter who wants to take hits."],
  ["Inspiring Leader", PHB, "inspiring-leader", "Your words steady and encourage your friends before a fight. Good for a charismatic character who looks after the party."],
  ["Keen Mind", PHB, "keen-mind", "Your memory and sense of direction are remarkable. Good for a scholar or scout who never forgets a detail."],
  ["Lightly Armored", PHB, "lightly-armored", "You've learned to move well in light armor. Good for a character who wants a bit more protection without much bulk."],
  ["Linguist", PHB, "linguist", "You pick up languages easily and can even invent secret codes. Good for a diplomat, spy or traveler."],
  ["Lucky", PHB, "lucky", "Fortune seems to follow you, and you can nudge the dice in your favor. Good for anyone who likes a safety net."],
  ["Mage Slayer", PHB, "mage-slayer", "You're trained to fight spellcasters and break their concentration. Good for a warrior who hunts wizards."],
  ["Magic Initiate", PHB, "magic-initiate", "You learn a little magic from another tradition, enough for a few spells. Good for any character who wants a taste of spellcasting.", FREE_2024],
  ["Martial Adept", PHB, "martial-adept", "You've learned a few special combat tricks from a fighting school. Good for a character who wants some tactical options."],
  ["Medium Armor Master", PHB, "medium-armor-master", "You move easily in medium armor and get more out of it. Good for a nimble fighter in a breastplate."],
  ["Mobile", PHB, "mobile", "You're fast on your feet and hard to pin down. Good for a character who strikes and slips away."],
  ["Moderately Armored", PHB, "moderately-armored", "You've trained to wear medium armor and use a shield. Good for a character who wants sturdier protection."],
  ["Mounted Combatant", PHB, "mounted-combatant", "You fight best from the back of a mount and protect it as well. Good for a cavalry fighter."],
  ["Observant", PHB, "observant", "You notice small details and can read lips. Good for a watchful character who rarely misses a clue."],
  ["Polearm Master", PHB, "polearm-master", "You control the space around you with a long reach weapon. Good for a fighter who likes to keep enemies at the end of a spear."],
  ["Resilient", PHB, "resilient", "You toughen up in one weak spot and shake off more danger. Good for a character who wants to fix a shaky saving throw."],
  ["Ritual Caster", PHB, "ritual-caster", "You learn to cast certain spells as slow, careful rituals. Good for a clever character who prepares ahead."],
  ["Savage Attacker", PHB, "savage-attacker", "You hit your foes with extra force, making your best blows count. Good for a warrior who wants more punch from each attack.", FREE_2024],
  ["Sentinel", PHB, "sentinel", "You guard a spot and punish enemies who try to slip past. Good for a defender who protects the party's flank."],
  ["Sharpshooter", PHB, "sharpshooter", "You shoot at long range with deadly precision. Good for an archer who wants to hit hard from afar."],
  ["Shield Master", PHB, "shield-master", "You use your shield as both a weapon and a defense. Good for a fighter who loves a shield."],
  ["Skilled", PHB, "skilled", "You pick up a few extra skills or tools. Good for a character who wants to be good at more things.", FREE_2024],
  ["Skulker", PHB, "skulker", "You're at your best in the shadows, hard to spot and harder to catch. Good for a sneaky character."],
  ["Spell Sniper", PHB, "spell-sniper", "Your spells that need to hit reach farther and slip past cover. Good for a caster who fights from a distance."],
  ["Tavern Brawler", PHB, "tavern-brawler", "You fight dirty with fists, bottles and anything nearby. Good for a rough-and-tumble character."],
  ["Tough", PHB, "tough", "You're hardier than your build suggests, with more hit points as you grow. Good for any character who wants a sturdier frame."],
  ["War Caster", PHB, "war-caster", "You can keep your concentration and cast spells even in the thick of a fight. Good for a caster who fights close to the action."],
  ["Weapon Master", PHB, "weapon-master", "You train with several new weapons and boost your fighting style. Good for a character who likes variety in their arsenal."],
  ["Bountiful Luck", XGE, "bountiful-luck", "Halfling luck rubs off on your friends, helping them when fortune turns against them. Good for a halfling who looks after the group."],
  ["Dragon Fear", XGE, "dragon-fear", "You can let out a frightening roar like your dragon ancestors. Good for a dragonborn who wants to rattle enemies."],
  ["Dragon Hide", XGE, "dragon-hide", "Your dragon heritage shows as scales and claws. Good for a dragonborn who wants a tougher, more natural form."],
  ["Drow High Magic", XGE, "drow-high-magic", "You tap a little more of the magic your drow ancestors carried. Good for a drow who wants extra spells."],
  ["Elven Accuracy", XGE, "elven-accuracy", "Elven grace and sharp senses make your best attacks even more likely to land. Good for a precise elf archer or rogue."],
  ["Fade Away", XGE, "fade-away", "When hurt, you can vanish for a moment. Good for a gnome who survives by slipping out of sight."],
  ["Fey Teleportation", XGE, "fey-teleportation", "You learn a little more fey magic, including a short leap through space. Good for a high elf with a fey streak."],
  ["Flames of Phlegethos", XGE, "flames-of-phlegethos", "Your infernal fire spells burn hotter, and flames flare around you when you cast. Good for a tiefling fire caster."],
  ["Infernal Constitution", XGE, "infernal-constitution", "Your fiendish blood makes you tougher against certain dangers. Good for a tiefling who wants to shrug off harm."],
  ["Orcish Fury", XGE, "orcish-fury", "Your orc rage lets you hit back harder when you strike. Good for a half-orc who lives for a big fight."],
  ["Prodigy", XGE, "prodigy", "You have a knack for picking up skills, tools and languages. Good for a half-elf, half-orc or human who wants to be good at a lot."],
  ["Second Chance", XGE, "second-chance", "Halfling nerve lets you turn aside an attack that would have hit you. Good for a halfling who dodges trouble."],
  ["Squat Nimbleness", XGE, "squat-nimbleness", "You're smaller than most but surprisingly quick and slippery. Good for a dwarf or small race who is hard to catch or hold."],
  ["Wood Elf Magic", XGE, "wood-elf-magic", "You pick up a handful of nature magic from your forest heritage. Good for a wood elf who loves the wild."],
  ["Artificer Initiate", TCE, "artificer-initiate", "You learn a bit of artificer magic and gain skill with tools. Good for a tinkerer who wants a touch of spellcasting."],
  ["Chef", TCE, "chef", "You cook meals that heal and refresh your friends. Good for a camp cook who keeps the party going."],
  ["Crusher", TCE, "crusher", "Your heavy blows shove enemies around and hit extra hard. Good for a fighter with a club, mace or hammer."],
  ["Eldritch Adept", TCE, "eldritch-adept", "You learn a bit of warlock magic and gain a small supernatural gift. Good for a spellcaster who wants something strange."],
  ["Fey Touched", TCE, "fey-touched", "A brush with the Feywild gave you a few tricks of fey magic. Good for a character who wants charm or teleporting."],
  ["Fighting Initiate", TCE, "fighting-initiate", "You learn a combat style, even if your class doesn't offer one. Good for a character who wants to fight a particular way."],
  ["Gunner", TCE, "gunner", "You handle firearms with confidence. Good for a ranged fighter in a campaign with gunpowder weapons."],
  ["Metamagic Adept", TCE, "metamagic-adept", "You learn to bend your spells in new ways. Good for a caster who likes to change how their magic works."],
  ["Piercer", TCE, "piercer", "You're skilled with piercing weapons and make the most of each strike. Good for a fighter with a spear, dagger or rapier."],
  ["Poisoner", TCE, "poisoner", "You know how to make and use poisons that work better than most. Good for a sneaky character with a dark streak."],
  ["Shadow Touched", TCE, "shadow-touched", "A brush with the Shadowfell gave you a few tricks of shadow magic. Good for a character who wants stealth or fear spells."],
  ["Skill Expert", TCE, "skill-expert", "You become truly outstanding at one skill. Good for a character who wants to be the party's best at something."],
  ["Slasher", TCE, "slasher", "You make cutting weapons slow your enemies and hurt them more. Good for a fighter with a sword or axe."],
  ["Telekinetic", TCE, "telekinetic", "You can move things with your mind and shove nearby creatures. Good for a character with a touch of psionic power."],
  ["Telepathic", TCE, "telepathic", "You can speak into minds and detect thoughts. Good for a quiet character with a gift for secret messages."],
  ["Gift of the Chromatic Dragon", FTD, "gift-of-the-chromatic-dragon", "A chromatic dragon's power flows through you as bursts of elemental force. Good for a character who wants dragon magic."],
  ["Gift of the Gem Dragon", FTD, "gift-of-the-gem-dragon", "A gem dragon's psionic power helps you push back at attackers. Good for a character with a touch of mind magic."],
  ["Gift of the Metallic Dragon", FTD, "gift-of-the-metallic-dragon", "A metallic dragon's kindness lets you heal and protect your friends. Good for a defender with a dragon's heart."],
  ["Strixhaven Initiate", SCC, "strixhaven-initiate", "You studied at one of Strixhaven's colleges and picked up a bit of its magic. Good for a student character with a school identity."],
];

function toIndex(name) {
  return `book_feat_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

// Full entries, in the shape getFeatDetails returns.
export const BOOK_FEATS = ENTRIES.map(([name, book, page, summary, extras = {}]) => ({
  index: toIndex(name),
  name,
  category: "feat",
  edition: "2014",
  source: book,
  sourceGroup: OFFICIAL_BOOKS_GROUP,
  is_book_entry: true,
  book,
  summary,
  link_url: `${WIKIDOT}${page}`,
  open_version: extras.openVersion ?? null,
}));

// Short list items for the feats page, with the summary as a hover preview.
export function listBookFeats() {
  return BOOK_FEATS.map(({ index, name, edition, source, sourceGroup, summary }) => ({
    index,
    name,
    edition,
    source,
    sourceGroup,
    preview: summary,
  }));
}

export function findBookFeat(index) {
  return BOOK_FEATS.find((entry) => entry.index === index) ?? null;
}
