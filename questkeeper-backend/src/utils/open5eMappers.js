// What this file is for
// ---------------------
// Open5e and the SRD API describe the same kinds of things (races,
// backgrounds, subclasses) in different shapes. QuestKeeper's frontend was
// built around the SRD API's shape. These functions rewrite each Open5e entry
// into that same shape, so the character creator, reference pages and
// character sheet can use Open5e options without being rewritten.
//
// Every function here only rearranges data it is given; none of them go to
// the internet. That keeps them easy to test (see open5eMappers.test.js).
//
// Three rules apply throughout:
// 1. Only options in the hand-checked tables (open5eCuratedData.js) are
//    returned. Anything else is skipped rather than shown with guessed numbers.
// 2. Every entry carries "source" (the book's name, for the badge players see)
//    and "source_key" (the book's ID).
// 3. Open5e's own wording is kept for descriptions. The licenses these books
//    use allow that, and it's credited on QuestKeeper's Attributions page.

import {
  OPEN5E_SOURCES,
  CURATED_RACES,
  CURATED_SUBRACES,
  CURATED_BACKGROUNDS,
  SUBCLASS_FLAVOR_BY_CLASS,
} from "./open5eCuratedData.js";

// Proper names for the SRD's skill IDs, so "sleight-of-hand" can be shown
// as "Sleight of Hand".
const SKILL_NAMES = {
  acrobatics: "Acrobatics",
  "animal-handling": "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  "sleight-of-hand": "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
};

// Open5e lists a race's speed, size, age, languages and ability increases as
// traits. The SRD keeps those as separate facts and only calls special
// abilities (like Darkvision) traits, so these are pulled out of the list.
const FACT_TRAIT_NAMES = new Set([
  "Ability Score Increase",
  "Age",
  "Alignment",
  "Size",
  "Speed",
  "Languages",
]);

// The book an entry comes from, e.g. "toh" for "toh_catfolk".
function getSourceKey(key) {
  return Object.keys(OPEN5E_SOURCES).find((sourceKey) =>
    key.startsWith(`${sourceKey}_`),
  );
}

function sourceFields(key) {
  const sourceKey = getSourceKey(key);
  return { source: OPEN5E_SOURCES[sourceKey]?.label, source_key: sourceKey };
}

// Open5e points to the SRD's own entries with an "srd_" prefix
// ("srd_halfling"); QuestKeeper's SRD IDs have no prefix ("halfling").
function toQuestKeeperIndex(open5eKey) {
  return open5eKey.startsWith("srd_") ? open5eKey.slice(4) : open5eKey;
}

// Open5e sometimes gives a linked entry as an object ({ key, name }) and
// sometimes as a web address. This returns the key either way.
function linkedKey(link) {
  if (!link) return null;
  if (typeof link === "object") return link.key ?? null;
  return String(link).replace(/\/$/, "").split("/").pop();
}

// Turns a name into an ID-friendly form: "Cat's Claws" -> "cats-claws".
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The SRD stores descriptions as a list of paragraphs, while Open5e uses one
// long piece of text with blank lines between paragraphs. This splits it up.
export function toParagraphs(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// IDs for things that live inside another entry, such as a race's trait:
// "toh_catfolk.cats-claws". The part before the dot says which entry to
// open; the part after says which piece of it.
export function makeChildIndex(parentKey, childKey) {
  return `${parentKey}.${childKey}`;
}

export function splitChildIndex(index) {
  const dot = String(index).indexOf(".");
  if (dot === -1) return { parentKey: index, childKey: null };
  return { parentKey: index.slice(0, dot), childKey: index.slice(dot + 1) };
}

// { dex: 2 } -> the SRD's [{ ability_score: { index: "dex", name: "DEX" }, bonus: 2 }]
function toAbilityBonuses(bonuses = {}) {
  return Object.entries(bonuses).map(([ability, bonus]) => ({
    ability_score: { index: ability, name: ability.toUpperCase() },
    bonus,
  }));
}

// A "pick N abilities" choice, written the way the SRD writes Half-Elf's.
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

function findTraitText(traits, name) {
  return traits.find((trait) => trait.name === name)?.desc ?? "";
}

// A race's or subrace's special traits, both as the short list the SRD uses
// ({ index, name }) and with their full text ("traitDetails"), so the
// frontend doesn't need a second request for each one.
function mapTraits(entry) {
  const traits = (entry.traits ?? []).filter(
    (trait) => !FACT_TRAIT_NAMES.has(trait.name),
  );

  return {
    refs: traits.map((trait) => ({
      index: makeChildIndex(entry.key, slugify(trait.name)),
      name: trait.name,
    })),
    details: traits.map((trait) => ({
      index: makeChildIndex(entry.key, slugify(trait.name)),
      name: trait.name,
      desc: toParagraphs(trait.desc),
    })),
  };
}

// Subraces, grouped by the race they belong to.
function subraceRefsByParent(speciesList) {
  const byParent = new Map();

  for (const entry of speciesList) {
    if (!entry.is_subspecies || !CURATED_SUBRACES[entry.key]) continue;
    const parent = toQuestKeeperIndex(linkedKey(entry.subspecies_of) ?? "");
    const refs = byParent.get(parent) ?? [];
    refs.push({ index: entry.key, name: entry.name, ...sourceFields(entry.key) });
    byParent.set(parent, refs);
  }

  return byParent;
}

// --- Races ------------------------------------------------------------------

// Every main race QuestKeeper can offer from Open5e, in the SRD's race shape.
export function mapOpen5eRaces(speciesList = []) {
  const subracesByParent = subraceRefsByParent(speciesList);

  return speciesList
    .filter((entry) => !entry.is_subspecies && CURATED_RACES[entry.key])
    .map((entry) => {
      const curated = CURATED_RACES[entry.key];
      const traits = mapTraits(entry);

      return {
        index: entry.key,
        name: entry.name,
        ...sourceFields(entry.key),
        speed: curated.speed,
        size: curated.size,
        size_description: findTraitText(entry.traits ?? [], "Size"),
        age: findTraitText(entry.traits ?? [], "Age"),
        alignment: findTraitText(entry.traits ?? [], "Alignment"),
        ability_bonuses: toAbilityBonuses(curated.bonuses),
        ability_bonus_options: toAbilityBonusOptions(curated.bonusChoice),
        languages: curated.languages.map((name) => ({ name })),
        language_options:
          curated.languageChoices > 0
            ? { choose: curated.languageChoices }
            : null,
        language_desc: findTraitText(entry.traits ?? [], "Languages"),
        traits: traits.refs,
        traitDetails: traits.details,
        subraces: subracesByParent.get(entry.key) ?? [],
        dm_note: curated.note ?? null,
      };
    });
}

// Open5e subraces that belong to an SRD race (Stoor Halfling belongs to the
// SRD Halfling), so they can be added to that race's subrace list.
export function getOpen5eSubraceRefsForSrdRace(speciesList = [], raceIndex) {
  return subraceRefsByParent(speciesList).get(raceIndex) ?? [];
}

// --- Subraces ---------------------------------------------------------------

export function mapOpen5eSubraces(speciesList = []) {
  const racesByKey = new Map(speciesList.map((entry) => [entry.key, entry]));

  return speciesList
    .filter((entry) => entry.is_subspecies && CURATED_SUBRACES[entry.key])
    .map((entry) => {
      const curated = CURATED_SUBRACES[entry.key];
      const parentKey = linkedKey(entry.subspecies_of) ?? "";
      const traits = mapTraits(entry);

      return {
        index: entry.key,
        name: entry.name,
        ...sourceFields(entry.key),
        race: {
          index: toQuestKeeperIndex(parentKey),
          name: racesByKey.get(parentKey)?.name ?? null,
        },
        desc: toParagraphs(entry.desc).join("\n\n"),
        ability_bonuses: toAbilityBonuses(curated.bonuses),
        ability_bonus_options: toAbilityBonusOptions(curated.bonusChoice),
        starting_proficiencies: [],
        languages: [],
        racial_traits: traits.refs,
        traitDetails: traits.details,
      };
    });
}

// --- Traits -----------------------------------------------------------------

// One race or subrace trait, found by its "parent.trait" ID, in the shape of
// the SRD's trait details.
export function findOpen5eTrait(speciesList = [], traitIndex) {
  const { parentKey } = splitChildIndex(traitIndex);
  const owner = [
    ...mapOpen5eRaces(speciesList),
    ...mapOpen5eSubraces(speciesList),
  ].find((entry) => entry.index === parentKey);
  const trait = owner?.traitDetails.find((item) => item.index === traitIndex);
  if (!trait) return null;

  const ownerRef = { index: owner.index, name: owner.name };
  return {
    ...trait,
    ...sourceFields(owner.index),
    races: owner.race ? [] : [ownerRef],
    subraces: owner.race ? [ownerRef] : [],
  };
}

// --- Backgrounds --------------------------------------------------------------

function findBenefit(entry, type) {
  return (entry.benefits ?? []).find((benefit) => benefit.type === type);
}

function toSkillProficiency(skill) {
  return { index: `skill-${skill}`, name: `Skill: ${SKILL_NAMES[skill]}` };
}

export function mapOpen5eBackgrounds(backgroundList = []) {
  return backgroundList
    .filter((entry) => CURATED_BACKGROUNDS[entry.key])
    .map((entry) => {
      const curated = CURATED_BACKGROUNDS[entry.key];
      const feature = findBenefit(entry, "feature");

      return {
        index: entry.key,
        name: entry.name,
        ...sourceFields(entry.key),
        desc: toParagraphs(entry.desc),
        starting_proficiencies: curated.skills.map(toSkillProficiency),
        // A skill the player picks, e.g. Innkeeper's "Intimidation or
        // Persuasion". The SRD has no background like this, so it is a new
        // field the frontend can look for.
        skill_choice: curated.skillChoice
          ? {
              choose: curated.skillChoice.choose,
              options: curated.skillChoice.from.map((skill) => ({
                index: skill,
                name: SKILL_NAMES[skill],
              })),
            }
          : null,
        languages: (curated.languages ?? []).map((name) => ({ name })),
        language_options: { choose: curated.languageChoices },
        // Open5e describes gear and tools in plain sentences ("a dagger or
        // light hammer, traveler's clothes..."), not as item lists, so they
        // are passed along as text for the sheet's notes.
        starting_equipment: [],
        starting_equipment_options: [],
        equipment_description: findBenefit(entry, "equipment")?.desc ?? "",
        tool_proficiencies_description:
          findBenefit(entry, "tool_proficiency")?.desc ?? "",
        feature: feature
          ? { name: feature.name, desc: toParagraphs(feature.desc) }
          : null,
        suggested_characteristics:
          findBenefit(entry, "suggested_characteristics")?.desc ?? "",
      };
    });
}

// --- Subclasses ---------------------------------------------------------------

function getFeatureLevel(feature) {
  return feature.gained_at?.[0]?.level ?? null;
}

// Every subclass from the allowed books that belongs to one of the 12 SRD
// classes and actually lists its features. (One Tome of Heroes subclass has
// no features in the data, and one Open5e entry is built for the 2024 Wizard,
// which uses different rules; both are skipped.)
export function mapOpen5eSubclasses(classList = []) {
  return classList
    .filter((entry) => {
      const parentKey = linkedKey(entry.subclass_of);
      return (
        parentKey?.startsWith("srd_") &&
        getSourceKey(entry.key) &&
        (entry.features ?? []).length > 0
      );
    })
    .map((entry) => {
      const classIndex = toQuestKeeperIndex(linkedKey(entry.subclass_of));
      const classRef = {
        index: classIndex,
        name: entry.subclass_of?.name ?? classIndex,
      };
      const subclassRef = { index: entry.key, name: entry.name };

      const features = entry.features
        .map((feature) => ({
          index: makeChildIndex(entry.key, feature.key),
          name: feature.name,
          level: getFeatureLevel(feature),
          class: classRef,
          subclass: subclassRef,
          desc: toParagraphs(feature.desc),
        }))
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

      return {
        index: entry.key,
        name: entry.name,
        ...sourceFields(entry.key),
        class: classRef,
        subclass_flavor: SUBCLASS_FLAVOR_BY_CLASS[classIndex] ?? "Subclass",
        desc: toParagraphs(entry.desc),
        spells: [],
        features,
      };
    });
}

// The short list of Open5e subclasses for one SRD class, used to fill in the
// class's subclass choices.
export function getOpen5eSubclassRefsForClass(classList = [], classIndex) {
  return mapOpen5eSubclasses(classList)
    .filter((subclass) => subclass.class.index === classIndex)
    .map(({ index, name, source, source_key }) => ({
      index,
      name,
      source,
      source_key,
    }));
}

// One subclass feature, found by its "subclass.feature" ID.
export function findOpen5eFeature(classList = [], featureIndex) {
  const { parentKey } = splitChildIndex(featureIndex);
  const subclass = mapOpen5eSubclasses(classList).find(
    (entry) => entry.index === parentKey,
  );
  const feature = subclass?.features.find((item) => item.index === featureIndex);
  return feature ? { ...feature, ...sourceFields(subclass.index) } : null;
}

// --- Lists ------------------------------------------------------------------

// The short form used in lists: just enough to show a name and its badge.
export function toListItem({ index, name, source, source_key }) {
  return { index, name, source, source_key };
}

// Puts SRD and Open5e entries into one alphabetical list, so players browse
// every option together and tell them apart by the source badge.
export function mergeByName(...lists) {
  return lists
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name) || a.index.localeCompare(b.index));
}
