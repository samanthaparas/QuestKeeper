// What this file is for
// ---------------------
// Open5e (https://open5e.com) shares extra D&D options from other publishers
// under open licenses. Its rules text is written for people to read, so the
// numbers QuestKeeper needs (like "+2 Dexterity") are buried inside sentences,
// and the wording changes from book to book ("Your Strength or Dexterity
// score increases by 1", "Two different ability scores of your choice...").
// One entry even has a typo ("Wisdon").
//
// Rather than trying to guess those numbers from the sentences, this file
// holds them in a table that was checked by hand against Open5e's text
// (October 2026). Only options listed here are shown in QuestKeeper. That way
// a half-finished or oddly worded entry can never put wrong numbers on
// someone's character sheet; it simply doesn't appear until it's added here.
//
// Abilities use the same short names as the SRD: str, dex, con, int, wis, cha.

// Which Open5e books QuestKeeper pulls from, and how each one is credited.
// The key on the left is the book's ID in Open5e. Every Open5e entry's ID
// starts with it (for example "toh_catfolk"), which is how the backend tells
// an Open5e ID apart from an SRD one ("elf").
export const OPEN5E_SOURCES = {
  toh: {
    label: "Tome of Heroes",
    publisher: "Kobold Press",
    license: "Open Game License 1.0a",
  },
  open5e: {
    label: "Open5e Originals",
    publisher: "Open5e",
    license: "Open Game License 1.0a",
  },
  tdcs: {
    label: "Tal'Dorei Campaign Setting",
    publisher: "Green Ronin Publishing",
    license: "Open Game License 1.0a",
  },
};

// Shown on races whose speed and size depend on a subrace that Open5e
// doesn't give numbers for. We start them at 30 feet and Medium instead of
// inventing rules, and say so plainly.
const SPEED_AND_SIZE_NOTE =
  "Tome of Heroes sets this race's speed and size from your subrace, but those numbers aren't in the open data QuestKeeper uses. Your sheet starts at 30 feet and Medium, so check with your DM and adjust them on your sheet.";

const ALL_ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

// Main races. For each one:
//   bonuses        - fixed ability increases, e.g. { dex: 2, wis: 1 }
//   bonusChoice    - increases the player picks: how many, how much, and from
//                    which abilities (leave out when there is no choice)
//   speed, size    - walking speed in feet, and "Small" or "Medium"
//   languages      - languages the race always knows
//   languageChoices - how many extra languages the player picks
//   note           - optional message shown with the race
export const CURATED_RACES = {
  toh_alseid: {
    bonuses: { dex: 2, wis: 1 },
    speed: 40,
    size: "Medium",
    languages: ["Common", "Elvish"],
    languageChoices: 0,
  },
  toh_catfolk: {
    bonuses: { dex: 2 },
    speed: 30,
    size: "Medium",
    languages: ["Common"],
    languageChoices: 0,
  },
  toh_darakhul: {
    bonuses: { con: 1 },
    speed: 30,
    size: "Medium",
    languages: ["Common", "Darakhul"],
    languageChoices: 1,
    note: SPEED_AND_SIZE_NOTE,
  },
  toh_derro: {
    bonuses: { dex: 2 },
    speed: 30,
    size: "Small",
    languages: ["Dwarvish"],
    languageChoices: 1,
  },
  toh_drow: {
    bonuses: { int: 2 },
    speed: 30,
    size: "Medium",
    languages: ["Elvish"],
    languageChoices: 1,
  },
  toh_erina: {
    bonuses: { dex: 2 },
    bonusChoice: { choose: 1, bonus: 1, from: ["wis", "cha"] },
    speed: 25,
    size: "Small",
    languages: ["Erina"],
    languageChoices: 1,
  },
  toh_gearforged: {
    bonuses: {},
    bonusChoice: { choose: 2, bonus: 1, from: ALL_ABILITIES },
    speed: 30,
    size: "Medium",
    languages: ["Common", "Machine Speech"],
    languageChoices: 1,
    note: SPEED_AND_SIZE_NOTE,
  },
  toh_minotaur: {
    bonuses: { str: 2, con: 1 },
    speed: 30,
    size: "Medium",
    languages: ["Common", "Minotaur"],
    languageChoices: 0,
  },
  toh_mushroomfolk: {
    bonuses: { wis: 2 },
    speed: 30,
    size: "Medium",
    languages: ["Mushroomfolk"],
    languageChoices: 1,
    note: "Tome of Heroes sets a mushroomfolk's size from its subrace, but that isn't in the open data QuestKeeper uses. Your sheet starts at Medium, so check with your DM.",
  },
  toh_satarre: {
    bonuses: { con: 2, int: 1 },
    speed: 30,
    size: "Medium",
    languages: ["Common"],
    languageChoices: 1,
  },
};

// Subraces only need their ability increases; everything else they add is
// written in their traits. Stoor Halfling belongs to the SRD Halfling, so it
// shows up next to Lightfoot.
export const CURATED_SUBRACES = {
  "open5e_stoor-halfling": { bonuses: { con: 1 } },
  "toh_acid-cap": { bonuses: { str: 1 } },
  "toh_bhain-kwai": { bonuses: { con: 2, str: 1 } },
  toh_boghaid: { bonuses: { wis: 2, con: 1 } },
  toh_delver: {
    bonuses: {},
    bonusChoice: { choose: 1, bonus: 1, from: ["str", "dex"] },
  },
  "toh_derro-heritage": { bonuses: { cha: 2 } },
  "toh_dragonborn-heritage": { bonuses: { str: 2 } },
  "toh_drow-heritage": { bonuses: { int: 2 } },
  "toh_dwarf-chassis": { bonuses: { con: 1 } },
  // Open5e spells this "Wisdon"; it means Wisdom.
  "toh_dwarf-heritage": { bonuses: { wis: 2 } },
  "toh_elfshadow-fey-heritage": { bonuses: { dex: 2 } },
  "toh_far-touched": { bonuses: { cha: 1 } },
  toh_favored: { bonuses: { cha: 1 } },
  "toh_fever-bit": { bonuses: { con: 1 } },
  "toh_gnome-chassis": { bonuses: { int: 1 } },
  "toh_gnome-heritage": { bonuses: { int: 2 } },
  "toh_halfling-heritage": { bonuses: { dex: 2 } },
  "toh_human-chassis": {
    bonuses: {},
    bonusChoice: { choose: 1, bonus: 1, from: ALL_ABILITIES },
  },
  "toh_humanhalf-elf-heritage": {
    bonuses: {},
    bonusChoice: {
      choose: 1,
      bonus: 2,
      from: ["str", "dex", "int", "wis", "cha"],
    },
  },
  "toh_kobold-chassis": { bonuses: { dex: 1 } },
  "toh_kobold-heritage": { bonuses: { int: 2 } },
  toh_malkin: { bonuses: { int: 1 } },
  toh_morel: { bonuses: { dex: 1 } },
  toh_mutated: { bonuses: { str: 1 } },
  toh_pantheran: { bonuses: { wis: 1 } },
  toh_purified: { bonuses: { cha: 1 } },
  toh_ravenfolk: { bonuses: { dex: 2 } },
  "toh_tiefling-heritage": { bonuses: { cha: 1 } },
  "toh_trollkin-heritage": { bonuses: { str: 2 } },
  toh_uncorrupted: { bonuses: { wis: 1 } },
};

// Backgrounds. For each one:
//   skills          - skills the background always grants (SRD skill IDs)
//   skillChoice     - skills the player picks: how many, and from which list
//   languages       - specific languages it grants
//   languageChoices - how many languages the player picks
//
// Left out on purpose: Open5e Originals' "Scoundrel" is a word-for-word copy
// of Tome of Heroes' Scoundrel, and Tal'Dorei's "Fate-Touched" has no skills
// or gear in the open data (it's an add-on to another background).
export const CURATED_BACKGROUNDS = {
  "open5e_con-artist": {
    skills: ["deception", "sleight-of-hand"],
    languageChoices: 0,
  },
  "tdcs_crime-syndicate-member": {
    skills: ["deception"],
    skillChoice: { choose: 1, from: ["sleight-of-hand", "stealth"] },
    languages: ["Thieves' Cant"],
    languageChoices: 0,
  },
  "tdcs_elemental-warden": {
    skills: ["nature"],
    skillChoice: { choose: 1, from: ["arcana", "survival"] },
    languageChoices: 1,
  },
  "tdcs_lyceum-student": {
    skills: [],
    skillChoice: { choose: 2, from: ["arcana", "history", "persuasion"] },
    languageChoices: 2,
  },
  "tdcs_recovered-cultist": {
    skills: ["religion", "deception"],
    languageChoices: 1,
  },
  "toh_court-servant": { skills: ["history", "insight"], languageChoices: 1 },
  "toh_desert-runner": {
    skills: ["perception", "survival"],
    languageChoices: 1,
  },
  toh_destined: { skills: ["history", "insight"], languageChoices: 1 },
  toh_diplomat: { skills: ["insight", "persuasion"], languageChoices: 2 },
  "toh_forest-dweller": {
    skills: ["nature", "survival"],
    languages: ["Sylvan"],
    languageChoices: 0,
  },
  "toh_former-adventurer": {
    skills: ["perception", "survival"],
    languageChoices: 1,
  },
  toh_freebooter: { skills: ["athletics", "survival"], languageChoices: 0 },
  toh_gamekeeper: {
    skills: ["animal-handling", "persuasion"],
    languageChoices: 1,
  },
  toh_innkeeper: {
    skills: ["insight"],
    skillChoice: { choose: 1, from: ["intimidation", "persuasion"] },
    languageChoices: 2,
  },
  "toh_mercenary-company-scion": {
    skills: ["athletics", "history"],
    languageChoices: 1,
  },
  "toh_mercenary-recruit": {
    skills: ["athletics", "persuasion"],
    languageChoices: 0,
  },
  "toh_monstrous-adoptee": {
    skills: ["intimidation", "survival"],
    languageChoices: 1,
  },
  "toh_mysterious-origins": {
    skills: ["deception", "survival"],
    languageChoices: 1,
  },
  "toh_northern-minstrel": {
    skills: ["perception"],
    skillChoice: { choose: 1, from: ["history", "performance"] },
    languageChoices: 1,
  },
  toh_occultist: { skills: ["arcana", "religion"], languageChoices: 2 },
  toh_parfumier: { skills: ["nature", "investigation"], languageChoices: 0 },
  toh_scoundrel: {
    skills: ["athletics", "sleight-of-hand"],
    languageChoices: 0,
  },
  toh_sentry: { skills: ["insight", "perception"], languageChoices: 1 },
  "toh_trophy-hunter": { skills: ["nature", "survival"], languageChoices: 0 },
};

// What each class calls its subclass, matching the wording the SRD uses
// (a Cleric picks a "Divine Domain", a Rogue a "Roguish Archetype").
export const SUBCLASS_FLAVOR_BY_CLASS = {
  barbarian: "Primal Path",
  bard: "Bard College",
  cleric: "Divine Domain",
  druid: "Druid Circle",
  fighter: "Martial Archetype",
  monk: "Monastic Tradition",
  paladin: "Sacred Oath",
  ranger: "Ranger Archetype",
  rogue: "Roguish Archetype",
  sorcerer: "Sorcerous Origin",
  warlock: "Otherworldly Patron",
  wizard: "Arcane Tradition",
};
