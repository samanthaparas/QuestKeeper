// Rules words explained on hover: the D&D terms new players trip over, each
// with a one-line meaning in our own words (not copied from any book).
// RulesText finds these words in a block of text and makes them hoverable.
//
// [key, name shown in the tip, meaning, other ways the word is written]
// The key and name are the first form; the extra forms are matched too
// ("saving throws", "saves"). Longer phrases are matched before shorter
// ones, so "spell save DC" wins over "save".
const WORDS = [
  ["advantage", "Advantage", "Roll two d20s and keep the higher one.", []],
  ["disadvantage", "Disadvantage", "Roll two d20s and keep the lower one.", []],
  ["ability check", "Ability check", "A d20 roll plus an ability modifier, to see if you pull something off.", ["ability checks"]],
  ["ability modifier", "Ability modifier", "The bonus (or penalty) an ability score gives your rolls: a 14 gives +2.", ["ability modifiers"]],
  ["saving throw", "Saving throw", "A d20 roll to resist something bad, like a spell, poison or a trap.", ["saving throws"]],
  ["proficiency bonus", "Proficiency bonus", "A bonus you add to anything you're trained in. It grows from +2 to +6 as you level.", []],
  ["proficient", "Proficient", "Trained in something, so you add your proficiency bonus to it.", ["proficiency"]],
  ["expertise", "Expertise", "Extra training: you add your proficiency bonus twice.", []],
  ["attack roll", "Attack roll", "A d20 plus your attack bonus. Meet or beat the target's AC to hit.", ["attack rolls"]],
  ["armor class", "Armor Class (AC)", "How hard you are to hit. An attack has to roll this or higher.", ["AC"]],
  ["hit points", "Hit points (HP)", "How much damage you can take. At 0 you fall unconscious.", ["hit point", "HP"]],
  ["temporary hit points", "Temporary hit points", "A buffer that soaks up damage first. It doesn't stack and can't be healed back.", ["temporary hit point", "temp HP"]],
  ["hit dice", "Hit Dice", "Dice you can spend on a short rest to heal. You get one per level.", ["hit die"]],
  ["critical hit", "Critical hit", "A natural 20 on an attack: it hits, and you roll the damage dice twice.", ["critical hits", "crit"]],
  ["initiative", "Initiative", "A Dexterity roll at the start of a fight that sets the turn order.", []],
  ["bonus action", "Bonus action", "A quick extra thing some features let you do on your turn, once per turn.", ["bonus actions"]],
  ["reaction", "Reaction", "Something you can do once per round, even on someone else's turn, when a trigger happens.", ["reactions"]],
  ["opportunity attack", "Opportunity attack", "A free swing (using your reaction) at an enemy who moves out of your reach.", ["opportunity attacks"]],
  ["difficult terrain", "Difficult terrain", "Rough ground: every foot of movement costs two.", []],
  // Only "half cover" and friends: plain "cover" is too often just a verb.
  ["half cover", "Cover", "Something between you and an attacker. Half cover gives +2 AC, three-quarters +5, and total cover can't be targeted.", ["three-quarters cover", "total cover"]],
  ["short rest", "Short rest", "About an hour of downtime. Spend Hit Dice to heal, and some features come back.", ["short rests"]],
  ["long rest", "Long rest", "A full night's sleep. You get your HP, spell slots and most features back.", ["long rests"]],
  ["inspiration", "Inspiration", "A reward from your DM. Spend it for advantage on one roll. You can only hold one.", []],
  ["darkvision", "Darkvision", "You see in the dark as if it were dim light, in shades of grey.", []],
  ["resistance", "Resistance", "You take half damage from that type.", ["resistant"]],
  ["vulnerability", "Vulnerability", "You take double damage from that type.", ["vulnerable"]],
  ["immunity", "Immunity", "You take no damage from that type, or can't be affected by that condition.", ["immune"]],
  ["cantrip", "Cantrip", "A simple spell you can cast as often as you like, without a spell slot.", ["cantrips"]],
  ["spell slot", "Spell slot", "Your fuel for spells. Casting a spell uses a slot of its level or higher.", ["spell slots"]],
  ["spell save DC", "Spell save DC", "The number your target has to roll to resist your spell.", []],
  ["spell attack", "Spell attack", "An attack roll made with a spell, using your spellcasting bonus.", ["spell attacks"]],
  ["concentration", "Concentration", "Some spells last only while you focus. Taking damage makes you roll to keep it, and you can only concentrate on one at a time.", []],
  ["ritual", "Ritual", "A spell you can cast slowly (10 extra minutes) without using a spell slot.", ["rituals"]],
  ["attunement", "Attunement", "Bonding with a magic item over a short rest so it works for you. You can be attuned to three at most.", ["attune", "attuned"]],
  ["multiclass", "Multiclassing", "Taking levels in a second class.", ["multiclassing"]],
  // No plain "condition": it's too often just "dim conditions" or "in good
  // condition". The conditions themselves (Prone, Poisoned...) are below.
  ["blinded", "Blinded", "You can't see. Attacks against you have advantage; yours have disadvantage.", []],
  ["charmed", "Charmed", "You won't attack the charmer, and they have advantage when talking you into things.", []],
  ["deafened", "Deafened", "You can't hear.", []],
  ["frightened", "Frightened", "Disadvantage on checks and attacks while you can see the source, and you can't move closer to it.", []],
  ["grappled", "Grappled", "Held in place: your speed is 0 until you break free.", []],
  ["incapacitated", "Incapacitated", "You can't take actions or reactions.", []],
  ["invisible", "Invisible", "You can't be seen. Your attacks have advantage; attacks against you have disadvantage.", ["invisibility"]],
  ["paralyzed", "Paralyzed", "You can't move or act. Attacks against you have advantage, and close hits are critical.", []],
  ["petrified", "Petrified", "Turned to stone: you can't move or act, and you resist all damage.", []],
  ["poisoned", "Poisoned", "Disadvantage on attack rolls and ability checks.", []],
  ["prone", "Prone", "Knocked down. Standing up costs half your movement; close attacks against you have advantage.", []],
  ["restrained", "Restrained", "Speed 0, and attacks against you have advantage; yours have disadvantage.", []],
  ["stunned", "Stunned", "You can't act or move, and you automatically fail Strength and Dexterity saves.", []],
  ["unconscious", "Unconscious", "You drop what you're holding and fall prone. At 0 HP you start making death saves.", []],
  ["exhaustion", "Exhaustion", "Tiredness in levels, from 1 to 6. Each level makes things harder, and a long rest removes one.", []],
  ["death saving throw", "Death saving throw", "At 0 HP, roll a d20 each turn: 10 or higher is a success. Three successes and you're stable; three failures and you die.", ["death saving throws", "death save", "death saves"]],
];

export const RULES_WORDS = WORDS.map(([key, name, meaning, forms]) => ({ key, name, meaning, forms: [key, ...forms] }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_FORM = new Map();
for (const word of RULES_WORDS) {
  for (const form of word.forms) BY_FORM.set(form.toLowerCase(), word);
}

export function findRulesWord(text) {
  return BY_FORM.get(String(text ?? "").toLowerCase()) ?? null;
}

// Short all-caps forms (AC, HP) only match in capitals, so "ac" inside
// another word or sentence never does.
const CASE_SENSITIVE = new Set(["AC", "HP", "temp HP"]);

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const forms = [...BY_FORM.keys()].sort((a, b) => b.length - a.length);
const insensitive = forms.filter((form) => ![...CASE_SENSITIVE].some((exact) => exact.toLowerCase() === form));
const PATTERN = new RegExp(
  `\\b(?:(${insensitive.map(escape).join("|")})|(${[...CASE_SENSITIVE].map(escape).join("|")}))\\b`,
  "gi",
);

// Splits text into plain strings and rules words: ["You have ", { word,
// text: "advantage" }, " on it."]. Each word is marked once per text (the
// first time), so a paragraph doesn't fill up with underlines.
export function splitRulesWords(text, alreadyMarked = new Set()) {
  const source = String(text ?? "");
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(PATTERN)) {
    const [found, loose, exact] = match;
    // The capitals-only forms: "AC" yes, "ac" no.
    if (exact && !CASE_SENSITIVE.has(exact)) continue;
    const word = findRulesWord(loose ?? exact);
    if (!word || alreadyMarked.has(word.key)) continue;
    alreadyMarked.add(word.key);
    if (match.index > last) parts.push(source.slice(last, match.index));
    parts.push({ word, text: found });
    last = match.index + found.length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return parts;
}
