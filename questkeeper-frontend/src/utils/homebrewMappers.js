// Homebrew entries -> the same shapes the SRD and Open5e data use, so the
// creation pickers, detail panels and character sheet work with homebrew
// without special cases. Pure functions: nothing here talks to Supabase.
//
// A saved entry looks like { id, category, name, based_on, link_url, summary,
// data, is_shared, owner_id }. `data` holds the category's numbers and lists;
// cleanHomebrewData below says exactly what each category keeps.

import { SKILLS, getSpellSlotProgression } from "./characterSheet";

export const HOMEBREW_SOURCE = "Homebrew";

// The categories the builder supports today (the database allows more).
export const HOMEBREW_CATEGORIES = ["race", "subrace", "background", "class", "subclass"];

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export const SIZES = ["Tiny", "Small", "Medium", "Large"];
export const HIT_DICE = [6, 8, 10, 12];
// Spell slot schedules a homebrew class can follow (see characterSheet.js).
export const CASTER_PROGRESSION_LABELS = {
  none: "No spellcasting",
  full: "Full caster, like a Wizard",
  half: "Half caster from level 2, like a Paladin",
  "half-early": "Half caster from level 1, like an Artificer",
  pact: "Pact Magic, like a Warlock",
};
const SPELL_ABILITIES = ["intelligence", "wisdom", "charisma"];
export const CLASS_IDS = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
];

// Same wording the SRD uses for each class's subclass ("Divine Domain").
const SUBCLASS_FLAVOR_BY_CLASS = {
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

const SKILL_NAMES = Object.fromEntries(
  SKILLS.map((skill) => [skill.index, skill.name]),
);

// --- Starting points -------------------------------------------------------------

// Whether an option can be copied into a homebrew form ("Use as a starting
// point"): only open-licensed SRD and Open5e entries, since book text isn't
// ours to copy and homebrew can simply be edited. Backgrounds only for the
// 2014 rules, and subclasses only for the 12 SRD classes, as homebrew allows.
// Returns { category, index } for the detail panel, or undefined.
export function startFromFor(category, data) {
  const index = String(data?.index ?? "");
  if (!index || index.startsWith("book_") || isHomebrewId(index) || data.is_book_entry) return undefined;
  if (category === "background" && data.edition === "2024") return undefined;
  if (category === "subclass" && data.class?.index && !CLASS_IDS.includes(data.class.index)) return undefined;
  return { category, index };
}

// --- IDs ----------------------------------------------------------------------

// Homebrew IDs start with "hb_" so they never clash with SRD ("elf") or
// Open5e ("toh_catfolk") IDs. Traits and features add ".piece" on the end.
export function toHomebrewIndex(id) {
  return `hb_${id}`;
}

export function isHomebrewId(index) {
  return String(index ?? "").startsWith("hb_");
}

function splitChildIndex(index) {
  const dot = String(index).indexOf(".");
  return dot === -1
    ? { parentIndex: index, childKey: null }
    : { parentIndex: index.slice(0, dot), childKey: index.slice(dot + 1) };
}

// "Cat's Claws" -> "cats-claws"
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- Cleaning -------------------------------------------------------------------
// Runs before saving, so bad or missing form values never reach the database
// or a character sheet. Every field gets a safe default.

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function wholeNumber(value, min, max, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function uniqueFrom(values, allowed) {
  return [...new Set((values ?? []).filter((value) => allowed.includes(value)))];
}

// { dex: 2, wis: 1 }; zeroes and unknown abilities are dropped.
function cleanAbilityBonuses(bonuses) {
  const result = {};
  for (const key of ABILITY_KEYS) {
    const bonus = wholeNumber(bonuses?.[key], -2, 3, 0);
    if (bonus !== 0) result[key] = bonus;
  }
  return result;
}

// "Pick 2 abilities to raise by 1", or null when there's no pick.
function cleanAbilityChoice(choice) {
  if (!choice) return null;
  const from = uniqueFrom(choice.from, ABILITY_KEYS);
  const choose = wholeNumber(choice.choose, 0, from.length, 0);
  if (choose === 0) return null;
  return { choose, bonus: wholeNumber(choice.bonus, 1, 3, 1), from };
}

function cleanSkillChoice(choice) {
  if (!choice) return null;
  const from = uniqueFrom(choice.from, Object.keys(SKILL_NAMES));
  const choose = wholeNumber(choice.choose, 0, Math.min(4, from.length), 0);
  return choose === 0 ? null : { choose, from };
}

function cleanLanguages(languages) {
  const names = (languages ?? []).map((name) => text(name, 40)).filter(Boolean);
  return [...new Set(names)].slice(0, 10);
}

function cleanNamedList(items, { max, withLevel = false }) {
  return (items ?? [])
    .map((item) => ({
      name: text(item?.name, 80),
      description: text(item?.description, 2000),
      ...(withLevel ? { level: wholeNumber(item?.level, 1, 20, 1) } : {}),
    }))
    .filter((item) => item.name)
    .slice(0, max);
}

export function cleanHomebrewData(category, data = {}) {
  if (category === "race") {
    return {
      speed: wholeNumber(data.speed, 0, 120, 30),
      size: SIZES.includes(data.size) ? data.size : "Medium",
      abilityBonuses: cleanAbilityBonuses(data.abilityBonuses),
      abilityChoice: cleanAbilityChoice(data.abilityChoice),
      languages: cleanLanguages(data.languages),
      languageChoices: wholeNumber(data.languageChoices, 0, 5, 0),
      traits: cleanNamedList(data.traits, { max: 20 }),
      // Skills the race always gives, and an optional "choose N" (like a
      // Half-Elf's Skill Versatility). Same shape as backgrounds.
      skills: uniqueFrom(data.skills, Object.keys(SKILL_NAMES)).slice(0, 4),
      skillChoice: cleanSkillChoice(data.skillChoice),
    };
  }

  if (category === "subrace") {
    return {
      // Which race this belongs to: an SRD, Open5e or homebrew race ID.
      parentRace: text(data.parentRace, 80),
      parentRaceName: text(data.parentRaceName, 80),
      abilityBonuses: cleanAbilityBonuses(data.abilityBonuses),
      abilityChoice: cleanAbilityChoice(data.abilityChoice),
      traits: cleanNamedList(data.traits, { max: 20 }),
      skills: uniqueFrom(data.skills, Object.keys(SKILL_NAMES)).slice(0, 4),
      skillChoice: cleanSkillChoice(data.skillChoice),
    };
  }

  if (category === "background") {
    return {
      skills: uniqueFrom(data.skills, Object.keys(SKILL_NAMES)).slice(0, 4),
      skillChoice: cleanSkillChoice(data.skillChoice),
      languages: cleanLanguages(data.languages),
      languageChoices: wholeNumber(data.languageChoices, 0, 5, 0),
      tools: text(data.tools, 500),
      equipment: text(data.equipment, 1000),
      feature: {
        name: text(data.feature?.name, 80),
        description: text(data.feature?.description, 2000),
      },
    };
  }

  if (category === "class") {
    const progression = Object.keys(CASTER_PROGRESSION_LABELS).includes(data.progression)
      ? data.progression
      : "none";
    return {
      hitDie: HIT_DICE.includes(Number(data.hitDie)) ? Number(data.hitDie) : 8,
      savingThrows: uniqueFrom(data.savingThrows, ABILITY_KEYS).slice(0, 2),
      skillChoice: cleanSkillChoice(data.skillChoice),
      armor: text(data.armor, 200),
      weapons: text(data.weapons, 200),
      tools: text(data.tools, 200),
      equipment: text(data.equipment, 1000),
      progression,
      spellcastingAbility: SPELL_ABILITIES.includes(data.spellcastingAbility)
        ? data.spellcastingAbility
        : "intelligence",
      spellcastingType: data.spellcastingType === "known" ? "known" : "prepared",
      // Which SRD class's spell list it uses (the Artificer has its own, so
      // players pick the closest).
      spellList: CLASS_IDS.includes(data.spellList) ? data.spellList : "wizard",
      cantripsAtFirst: wholeNumber(data.cantripsAtFirst, 0, 6, 0),
      spellsKnownAtFirst: wholeNumber(data.spellsKnownAtFirst, 0, 10, 0),
      subclassLevel: wholeNumber(data.subclassLevel, 1, 20, 3),
      subclassFlavor: text(data.subclassFlavor, 40),
      features: cleanNamedList(data.features, { max: 40, withLevel: true }).sort(
        (a, b) => a.level - b.level,
      ),
      // The published-book class this rebuilds (e.g. "artificer"), so its
      // book subclasses can be listed too.
      bookClass: text(data.bookClass, 40),
    };
  }

  if (category === "subclass") {
    return {
      // An SRD class ("wizard") or a homebrew class ("hb_...").
      parentClass:
        CLASS_IDS.includes(data.parentClass) || isHomebrewId(data.parentClass)
          ? data.parentClass
          : "",
      parentClassName: text(data.parentClassName, 80),
      features: cleanNamedList(data.features, { max: 30, withLevel: true }).sort(
        (a, b) => a.level - b.level,
      ),
    };
  }

  return {};
}

// --- Shared pieces ------------------------------------------------------------

function toParagraphs(value) {
  return String(value ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// Fields every homebrew entry carries, whatever its category.
function commonFields(entry) {
  return {
    index: toHomebrewIndex(entry.id),
    name: entry.name,
    source: HOMEBREW_SOURCE,
    based_on: entry.based_on || null,
    link_url: entry.link_url || null,
    summary: entry.summary || "",
    owner_id: entry.owner_id,
    is_shared: Boolean(entry.is_shared),
  };
}

function toAbilityBonuses(bonuses = {}) {
  return Object.entries(bonuses).map(([ability, bonus]) => ({
    ability_score: { index: ability, name: ability.toUpperCase() },
    bonus,
  }));
}

function toAbilityBonusOptions(choice) {
  if (!choice) return null;
  return {
    choose: choice.choose,
    type: "ability_bonuses",
    from: {
      option_set_type: "options_array",
      options: choice.from.map((ability) => ({
        option_type: "ability_bonus",
        ability_score: { index: ability, name: ability.toUpperCase() },
        bonus: choice.bonus,
      })),
    },
  };
}

// Traits as the short list ({ index, name }) plus full text ("traitDetails").
function toTraits(index, traits = []) {
  const withIds = traits.map((trait) => ({
    index: `${index}.${slugify(trait.name)}`,
    name: trait.name,
    desc: toParagraphs(trait.description),
  }));
  return {
    refs: withIds.map(({ index: id, name }) => ({ index: id, name })),
    details: withIds,
  };
}

function byCategory(entries, category) {
  return (entries ?? []).filter((entry) => entry.category === category);
}

export function toListItem({ index, name, source }) {
  return { index, name, source };
}

// --- Races and subraces --------------------------------------------------------

function subraceRefsFor(entries, raceIndex) {
  return byCategory(entries, "subrace")
    .filter((entry) => entry.data?.parentRace === raceIndex)
    .map((entry) => toListItem(commonFields(entry)));
}

// Skills in the shape the SRD uses: starting_proficiencies and skill_choice.
function toSkillFields(data) {
  return {
    starting_proficiencies: (data.skills ?? []).map((skill) => ({
      index: `skill-${skill}`,
      name: `Skill: ${SKILL_NAMES[skill]}`,
    })),
    skill_choice: data.skillChoice
      ? {
          choose: data.skillChoice.choose,
          options: data.skillChoice.from.map((skill) => ({ index: skill, name: SKILL_NAMES[skill] })),
        }
      : null,
  };
}

export function toHomebrewRace(entry, allEntries = []) {
  const data = cleanHomebrewData("race", entry.data);
  const common = commonFields(entry);
  const traits = toTraits(common.index, data.traits);

  return {
    ...common,
    speed: data.speed,
    size: data.size,
    ability_bonuses: toAbilityBonuses(data.abilityBonuses),
    ability_bonus_options: toAbilityBonusOptions(data.abilityChoice),
    languages: data.languages.map((name) => ({ name })),
    language_options:
      data.languageChoices > 0 ? { choose: data.languageChoices } : null,
    traits: traits.refs,
    traitDetails: traits.details,
    subraces: subraceRefsFor(allEntries, common.index),
    ...toSkillFields(data),
  };
}

export function toHomebrewSubrace(entry) {
  const data = cleanHomebrewData("subrace", entry.data);
  const common = commonFields(entry);
  const traits = toTraits(common.index, data.traits);

  return {
    ...common,
    race: { index: data.parentRace, name: data.parentRaceName || null },
    desc: common.summary,
    ability_bonuses: toAbilityBonuses(data.abilityBonuses),
    ability_bonus_options: toAbilityBonusOptions(data.abilityChoice),
    ...toSkillFields(data),
    languages: [],
    racial_traits: traits.refs,
    traitDetails: traits.details,
  };
}

// Homebrew subraces for any race (SRD, Open5e or homebrew), for adding to
// that race's subrace list.
export function getHomebrewSubraceRefs(entries, raceIndex) {
  return subraceRefsFor(entries, raceIndex);
}

// --- Backgrounds -----------------------------------------------------------------

export function toHomebrewBackground(entry) {
  const data = cleanHomebrewData("background", entry.data);
  const common = commonFields(entry);

  return {
    ...common,
    edition: "2014",
    desc: toParagraphs(common.summary),
    starting_proficiencies: data.skills.map((skill) => ({
      index: `skill-${skill}`,
      name: `Skill: ${SKILL_NAMES[skill]}`,
    })),
    skill_choice: data.skillChoice
      ? {
          choose: data.skillChoice.choose,
          options: data.skillChoice.from.map((skill) => ({
            index: skill,
            name: SKILL_NAMES[skill],
          })),
        }
      : null,
    languages: data.languages.map((name) => ({ name })),
    language_options: { choose: data.languageChoices },
    starting_equipment: [],
    starting_equipment_options: [],
    equipment_description: data.equipment,
    tool_proficiencies_description: data.tools,
    feature: data.feature.name
      ? { name: data.feature.name, desc: toParagraphs(data.feature.description) }
      : null,
  };
}

// --- Subclasses --------------------------------------------------------------------

export function toHomebrewSubclass(entry, allEntries = []) {
  const data = cleanHomebrewData("subclass", entry.data);
  const common = commonFields(entry);
  // A homebrew class's own name and subclass word ("Specialist").
  const parent = isHomebrewId(data.parentClass)
    ? (allEntries ?? []).find((item) => toHomebrewIndex(item.id) === data.parentClass)
    : null;
  const className =
    parent?.name ||
    data.parentClassName ||
    data.parentClass.charAt(0).toUpperCase() + data.parentClass.slice(1);
  const classRef = { index: data.parentClass, name: className };
  const subclassRef = { index: common.index, name: common.name };

  return {
    ...common,
    class: classRef,
    subclass_flavor:
      SUBCLASS_FLAVOR_BY_CLASS[data.parentClass] ?? (parent?.data?.subclassFlavor || "Subclass"),
    desc: toParagraphs(common.summary),
    spells: [],
    features: data.features.map((feature) => ({
      index: `${common.index}.${slugify(feature.name)}-${feature.level}`,
      name: feature.name,
      level: feature.level,
      class: classRef,
      subclass: subclassRef,
      desc: toParagraphs(feature.description),
    })),
  };
}

export function getHomebrewSubclassRefs(entries, classIndex) {
  return byCategory(entries, "subclass")
    .filter((entry) => entry.data?.parentClass === classIndex)
    .map((entry) => toListItem(commonFields(entry)));
}

// --- Classes -------------------------------------------------------------------------

const ABILITY_SHORT = Object.fromEntries(ABILITY_KEYS.map((key) => [key, key.toUpperCase()]));

// "Light armor, medium armor, shields" -> one proficiency per item.
function splitList(value) {
  return String(value ?? "")
    .split(/,|;|\band\b/)
    .map((item) => item.trim())
    .filter((item) => item && !/^none$/i.test(item));
}

// A homebrew class in the SRD's class shape, plus its own rules
// (spellcasting, subclass level), which characterSheet.js reads from the
// class instead of its built-in SRD tables.
export function toHomebrewClass(entry, allEntries = []) {
  const data = cleanHomebrewData("class", entry.data);
  const common = commonFields(entry);
  const classRef = { index: common.index, name: common.name };
  const casts = data.progression !== "none";

  const features = data.features.map((feature) => ({
    index: `${common.index}.${slugify(feature.name)}-${feature.level}`,
    name: feature.name,
    level: feature.level,
    class: classRef,
    desc: toParagraphs(feature.description),
  }));

  return {
    ...common,
    desc: toParagraphs(common.summary),
    hit_die: data.hitDie,
    saving_throws: data.savingThrows.map((key) => ({ index: key, name: ABILITY_SHORT[key] })),
    proficiencies: [
      ...[data.armor, data.weapons, data.tools].flatMap(splitList),
      ...data.savingThrows.map((key) => `Saving Throw: ${ABILITY_SHORT[key]}`),
    ].map((name) => ({ index: slugify(name), name })),
    proficiency_choices: data.skillChoice
      ? [
          {
            desc: `Choose ${data.skillChoice.choose} from ${data.skillChoice.from
              .map((skill) => SKILL_NAMES[skill])
              .join(", ")}`,
            choose: data.skillChoice.choose,
            type: "proficiencies",
            from: {
              option_set_type: "options_array",
              options: data.skillChoice.from.map((skill) => ({
                option_type: "reference",
                item: { index: `skill-${skill}`, name: `Skill: ${SKILL_NAMES[skill]}` },
              })),
            },
          },
        ]
      : [],
    starting_equipment: [],
    starting_equipment_options: [],
    equipment_description: data.equipment,
    spellcasting_type: casts ? data.spellcastingType : null,
    spellcasting_ability: casts ? data.spellcastingAbility : null,
    caster_progression: data.progression,
    spell_list: casts ? data.spellList : null,
    cantrips_at_first: casts ? data.cantripsAtFirst : 0,
    spells_known_at_first: casts ? data.spellsKnownAtFirst : 0,
    // Level 1 numbers, in the shape the SRD's level data uses.
    levelOneSpellcasting: casts
      ? {
          cantrips_known: data.cantripsAtFirst,
          spells_known: data.spellcastingType === "known" ? data.spellsKnownAtFirst : 0,
          spell_slots_level_1: getSpellSlotProgression({ casterProgression: data.progression }, 1)[0].max,
        }
      : null,
    subclass_level: data.subclassLevel,
    subclass_flavor: data.subclassFlavor || "Subclass",
    book_class: data.bookClass || null,
    features,
    // Already known, so the class panel can show them without more lookups.
    levelOneFeatures: features.filter((feature) => feature.level === 1),
    laterFeatureNames: features.filter((feature) => feature.level > 1).map((feature) => feature.name),
    subclasses: getHomebrewSubclassRefs(allEntries, common.index),
  };
}

// --- Lookups by ID -----------------------------------------------------------------

const CONVERTERS = {
  race: toHomebrewRace,
  subrace: toHomebrewSubrace,
  background: toHomebrewBackground,
  class: toHomebrewClass,
  subclass: toHomebrewSubclass,
};

// Any homebrew entry by its "hb_..." ID, already converted; null if unknown.
export function findHomebrew(entries, index) {
  const entry = (entries ?? []).find(
    (item) => toHomebrewIndex(item.id) === index,
  );
  const convert = CONVERTERS[entry?.category];
  return convert ? convert(entry, entries) : null;
}

// One trait of a homebrew race or subrace, in the SRD's trait shape.
export function findHomebrewTrait(entries, traitIndex) {
  const { parentIndex } = splitChildIndex(traitIndex);
  const owner = findHomebrew(entries, parentIndex);
  const trait = owner?.traitDetails?.find((item) => item.index === traitIndex);
  if (!trait) return null;

  const ownerRef = { index: owner.index, name: owner.name };
  return {
    ...trait,
    source: HOMEBREW_SOURCE,
    races: owner.race ? [] : [ownerRef],
    subraces: owner.race ? [ownerRef] : [],
  };
}

// One feature of a homebrew class or subclass, in the SRD's feature shape.
export function findHomebrewFeature(entries, featureIndex) {
  const { parentIndex } = splitChildIndex(featureIndex);
  const subclass = findHomebrew(entries, parentIndex);
  const feature = subclass?.features?.find((item) => item.index === featureIndex);
  return feature ? { ...feature, source: HOMEBREW_SOURCE } : null;
}

// Short list items for one category ("race", "background"...). Other
// people's drafts never arrive here; the database filters them out.
export function listHomebrew(entries, category) {
  return byCategory(entries, category).map((entry) => ({
    ...toListItem(commonFields(entry)),
    // The author's summary, shown when hovering the card.
    preview: entry.summary || null,
  }));
}
