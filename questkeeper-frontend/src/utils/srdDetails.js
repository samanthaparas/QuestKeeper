import {
  getFeatDescriptionLines,
  getSpellcastingAbility,
  getSpellcastingType,
  ABILITY_LABELS,
} from "./characterSheet";
import { getRaceGuidance, getClassGuidance } from "./beginnerGuidance";
import {
  getClassFeatures,
  getSubclassFeatures,
  getRaceTraits,
  getSubraceTraits,
  getFeatureDetails,
  getTraitDetails,
  getEquipmentDetails,
  getRaceDetails,
  getClassDetails,
  getClassLevel,
} from "./api";

const SPELL_LEVEL_LABELS = [
  "",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
];

export function normalizeItemName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ x\d+$/, "");
}

export function findSrdMatches(name, entries) {
  const target = normalizeItemName(name);
  if (!target) return [];
  return entries.filter((entry) => normalizeItemName(entry.name) === target);
}

function toLines(text) {
  const lines = Array.isArray(text) ? text : String(text ?? "").split("\n");
  return lines.map((line) => line.replace(/\*\*/g, "").trim()).filter(Boolean);
}

const TABLE_DIVIDER = /^\|[\s:|-]+\|?$/;
const RUN_ON_SENTENCE = /[a-z)]\.[A-Z][a-z]/;

function splitTableRow(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function groupMarkdownTables(lines) {
  const blocks = [];
  let tableLines = [];

  function finishTable() {
    if (tableLines.length === 0) return;

    const hasHeader = TABLE_DIVIDER.test(tableLines[1] ?? "");
    const rows = tableLines.map(splitTableRow);
    blocks.push(
      hasHeader
        ? { header: rows[0], rows: rows.slice(2) }
        : { header: [], rows },
    );
    tableLines = [];
  }

  for (const line of lines) {
    if (line.startsWith("|")) {
      tableLines.push(line);
    } else {
      finishTable();
      blocks.push(line);
    }
  }
  finishTable();

  return blocks;
}

function compactFacts(facts) {
  return facts.filter((fact) => fact.value);
}

function toTitleCase(text) {
  return text
    .split(/[-\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatSpellDetails(spell) {
  const school = spell.school?.name ?? "";
  const kind =
    spell.level === 0
      ? `${school} cantrip`
      : `${SPELL_LEVEL_LABELS[spell.level]}-level ${school}`;
  const components = (spell.components ?? []).join(", ");

  return {
    name: spell.name,
    edition: spell.edition ?? "2014",
    kind: kind.trim(),
    facts: compactFacts([
      { label: "Casting Time", value: spell.casting_time },
      { label: "Range", value: spell.range },
      {
        label: "Components",
        value: spell.material
          ? `${components} (${spell.material})`
          : components,
      },
      {
        label: "Duration",
        value: spell.concentration
          ? `Concentration, ${spell.duration?.toLowerCase()}`
          : spell.duration,
      },
      { label: "Ritual", value: spell.ritual ? "Yes" : null },
    ]),
    blocks: groupMarkdownTables([
      ...toLines(spell.desc),
      ...toLines(spell.higher_level).map((line) => `At Higher Levels. ${line}`),
    ]),
  };
}

function formatFeatPrerequisite(feat) {
  if (Array.isArray(feat.prerequisites)) {
    return feat.prerequisites
      .filter((prerequisite) => prerequisite.ability_score)
      .map(
        (prerequisite) =>
          `${prerequisite.ability_score.name} ${prerequisite.minimum_score}`,
      )
      .join(", ");
  }

  const parts = [];
  if (feat.prerequisites?.minimum_level) {
    parts.push(`Level ${feat.prerequisites.minimum_level}+`);
  }
  if (feat.prerequisite_options?.desc) {
    parts.push(feat.prerequisite_options.desc);
  }
  return parts.join(", ");
}

export function formatFeatDetails(feat) {
  return {
    name: feat.name,
    edition: feat.edition ?? "2014",
    kind: feat.type ? `${toTitleCase(feat.type)} Feat` : "Feat",
    facts: compactFacts([
      { label: "Prerequisite", value: formatFeatPrerequisite(feat) },
    ]),
    blocks: groupMarkdownTables(toLines(getFeatDescriptionLines(feat))),
  };
}

export function formatMagicItemDetails(item) {
  const lines = toLines(item.desc);
  const requiresAttunement =
    item.attunement === true ||
    lines.some((line) => /requires attunement/i.test(line));

  return {
    name: item.name,
    edition: item.edition ?? "2014",
    kind: item.equipment_category?.name.replace(/s$/, "") ?? "Magic Item",
    facts: compactFacts([
      { label: "Rarity", value: item.rarity?.name },
      { label: "Attunement", value: requiresAttunement ? "Required" : null },
    ]),
    blocks: groupMarkdownTables(lines),
    hasGarbledText: lines.some((line) => RUN_ON_SENTENCE.test(line)),
  };
}

const SPECIFIC_EQUIPMENT_CATEGORIES =
  /^(light-armor|medium-armor|heavy-armor|shields|(simple|martial)-(melee|ranged)-weapons)$/;

function getEquipmentKind(item) {
  const categories = item.equipment_categories ?? [];
  const specific = categories.find((category) =>
    SPECIFIC_EQUIPMENT_CATEGORIES.test(category.index),
  );
  if (specific) return specific.name.replace(/s$/, "");
  return item.equipment_category?.name ?? categories[0]?.name ?? "Equipment";
}

function formatArmorClass(item) {
  const armorClass = item.armor_class;
  if (!armorClass) return null;

  const isShield = (item.equipment_categories ?? []).some(
    (category) => category.index === "shields",
  );
  if (isShield) return `+${armorClass.base}`;
  if (!armorClass.dex_bonus) return String(armorClass.base);

  return armorClass.max_bonus
    ? `${armorClass.base} + Dex modifier (max ${armorClass.max_bonus})`
    : `${armorClass.base} + Dex modifier`;
}

function formatDamage(item) {
  if (!item.damage?.damage_dice) return null;

  const damageType = item.damage.damage_type?.name?.toLowerCase() ?? "";
  const oneHanded = `${item.damage.damage_dice} ${damageType}`.trim();

  return item.two_handed_damage
    ? `${oneHanded} (${item.two_handed_damage.damage_dice} two-handed)`
    : oneHanded;
}

function formatRange(item) {
  const range = item.throw_range ?? item.range;
  return range?.long ? `${range.normal}/${range.long} ft.` : null;
}

function formatContents(contents) {
  return (contents ?? [])
    .map(({ item, quantity }) =>
      quantity > 1 ? `${item.name} x${quantity}` : item.name,
    )
    .join(", ");
}

export function formatEquipmentDetails(item) {
  return {
    name: item.name,
    edition: item.edition ?? "2014",
    kind: getEquipmentKind(item),
    facts: compactFacts([
      { label: "Armor Class", value: formatArmorClass(item) },
      {
        label: "Strength",
        value: item.str_minimum ? `Str ${item.str_minimum}` : null,
      },
      {
        label: "Stealth",
        value: item.stealth_disadvantage ? "Disadvantage" : null,
      },
      { label: "Damage", value: formatDamage(item) },
      { label: "Range", value: formatRange(item) },
      {
        label: "Properties",
        value: (item.properties ?? [])
          .map((property) => property.name)
          .join(", "),
      },
      { label: "Mastery", value: item.mastery?.name },
      { label: "Contents", value: formatContents(item.contents) },
      {
        label: "Cost",
        value: item.cost ? `${item.cost.quantity} ${item.cost.unit}` : null,
      },
      { label: "Weight", value: item.weight ? `${item.weight} lb.` : null },
    ]),
    blocks: groupMarkdownTables([
      ...toLines(item.desc),
      ...toLines(item.description),
      ...toLines(item.special),
    ]),
  };
}

// --- Race, class and spell detail panels --------------------------------------
// One set of formatters shared by the Races, Classes, Spells and Search pages
// and by character creation, so a race looks the same wherever it is shown.

function listNames(items) {
  return (items ?? []).map((item) => item.name).join(", ");
}

// "DEX +2, plus +1 to 1 other abilities of your choice (WIS or CHA)". Names
// the options only when there are just a few (Erina, Delver).
function formatAbilityBonuses(data) {
  const parts = (data.ability_bonuses ?? []).map(
    (ability) => `${ability.ability_score.name} +${ability.bonus}`,
  );

  const choice = data.ability_bonus_options;
  if (choice) {
    const options = choice.from?.options ?? [];
    const bonus = options[0]?.bonus ?? 1;
    const names = options
      .map((option) => option.ability_score?.name)
      .filter(Boolean);
    const limited =
      names.length > 0 && names.length <= 3 ? ` (${names.join(" or ")})` : "";
    const other = parts.length > 0 ? "other " : "";
    parts.push(
      `${parts.length > 0 ? "plus " : ""}+${bonus} to ${choice.choose} ${other}abilities of your choice${limited}`,
    );
  }

  return parts.join(", ");
}

// A race, plus the full text of each of its racial traits.
export async function loadRaceDetails(raceId) {
  const race = await getRaceDetails(raceId);

  // Open5e races arrive with their trait text already included.
  if (race.traitDetails?.length > 0) return race;

  const results = await Promise.allSettled(
    (race.traits ?? []).map((trait) => getTraitDetails(trait.index)),
  );

  return {
    ...race,
    traitDetails: results.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : [],
    ),
  };
}

export function mapRaceToPanel(data) {
  const abilityBonuses = formatAbilityBonuses(data);

  const languageNames = listNames(data.languages);
  const extraLanguages = data.language_options?.choose;
  const languages = extraLanguages
    ? `${languageNames}, plus ${extraLanguages} of your choice`
    : languageNames;

  // Full trait text when it has been loaded, otherwise just the names.
  const traits =
    (data.traitDetails ?? []).length > 0
      ? data.traitDetails.map((trait) => ({
          name: trait.name,
          description: descriptionFromSrd(trait.desc),
        }))
      : (data.traits ?? []).map((trait) => ({
          name: trait.name,
          description: "",
        }));

  return {
    name: data.name,
    category: "Race",
    source: data.source,
    dmNote: data.dm_note,
    speed: data.speed,
    size: data.size,
    sizeDescription: data.size_description,
    age: data.age,
    alignment: data.alignment,
    abilityBonuses,
    languages,
    traits,
    subraces: listNames(data.subraces),
    guidance: getRaceGuidance(data.index),
  };
}

export function mapSubraceToPanel(data) {
  return {
    name: data.name,
    category: "Subrace",
    source: data.source,
    description: descriptionFromSrd(data.desc),
    abilityBonuses: formatAbilityBonuses(data),
    traits: (data.racial_traits ?? []).map((trait) => trait.name),
  };
}

export function mapSubclassToPanel(data) {
  return {
    name: data.name,
    category: "Subclass",
    source: data.source,
    description: toLines(data.desc).join(" "),
    flavor: data.subclass_flavor,
  };
}

// Works for SRD 2014 and Open5e backgrounds. Open5e ones have no gold or
// personality tables, and describe gear and tools in sentences, so every
// field here is optional.
export function mapBackgroundToPanel(data) {
  const fixedLanguages = listNames(data.languages);
  const languageChoices = data.language_options?.choose ?? 0;
  // "Thieves' Cant", "2 of your choice", or both joined with "plus".
  const languages = [
    fixedLanguages,
    languageChoices > 0 ? `${languageChoices} of your choice` : "",
  ]
    .filter(Boolean)
    .join(", plus ");

  const skillChoice = data.skill_choice
    ? `Choose ${data.skill_choice.choose}: ${data.skill_choice.options
        .map((option) => option.name)
        .join(" or ")}`
    : null;

  const choose = (table) => (table ? `Choose ${table.choose}` : null);

  return {
    name: data.name,
    category: "Background",
    edition: "2014",
    source: data.source,
    startingProficiencies: (data.starting_proficiencies ?? []).map(
      (item) => item.name,
    ),
    skillChoice,
    tools: data.tool_proficiencies_description || null,
    languages: languages || null,
    startingEquipment: (data.starting_equipment ?? []).map(
      (item) => `${item.equipment.name} x${item.quantity}`,
    ),
    equipmentText: data.equipment_description || null,
    startingGold: data.starting_gold
      ? `${data.starting_gold.quantity} ${data.starting_gold.unit}`
      : null,
    featureName: data.feature?.name ?? null,
    featureDescription: toLines(data.feature?.desc).join(" "),
    personalityTraits: choose(data.personality_traits),
    ideals: choose(data.ideals),
    bonds: choose(data.bonds),
    flaws: choose(data.flaws),
  };
}

// A class, plus what you get at level 1 (with full text), the names of what
// comes later, and the level 1 spellcasting numbers.
export async function loadClassDetails(classId) {
  const [data, levelOne, featureList] = await Promise.all([
    getClassDetails(classId),
    getClassLevel(classId, 1).catch(() => null),
    getClassFeatures(classId).catch(() => []),
  ]);

  const levelOneRefs = levelOne?.features ?? [];
  const results = await Promise.allSettled(
    levelOneRefs.map((feature) => getFeatureDetails(feature.index)),
  );
  const levelOneNames = new Set(levelOneRefs.map((feature) => feature.name));

  return {
    ...data,
    levelOneFeatures: results.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : [],
    ),
    laterFeatureNames: featureList
      .map((feature) => feature.name)
      .filter((name) => !levelOneNames.has(name)),
    levelOneSpellcasting: levelOne?.spellcasting ?? null,
  };
}

// A plain sentence about how this class casts spells at level 1.
export function describeClassSpellcasting(data) {
  const ability = getSpellcastingAbility(data.index);
  if (!ability) return "";

  const label = ABILITY_LABELS[ability];
  const numbers = data.levelOneSpellcasting;
  if (!numbers?.cantrips_known && !numbers?.spell_slots_level_1) {
    return `Casts with ${label}. Spellcasting starts at level 2.`;
  }

  const parts = [];
  if (numbers.cantrips_known) {
    parts.push(
      `${numbers.cantrips_known} cantrip${numbers.cantrips_known === 1 ? "" : "s"}`,
    );
  }
  if (numbers.spells_known) {
    parts.push(
      `${numbers.spells_known} spell${numbers.spells_known === 1 ? "" : "s"} known`,
    );
  }
  const slots = numbers.spell_slots_level_1;
  if (slots) {
    parts.push(`${slots} first-level spell slot${slots === 1 ? "" : "s"}`);
  }

  const summary =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
      : parts[0];
  const prepared =
    getSpellcastingType(data.index) === "prepared"
      ? " You choose which spells to ready each day."
      : "";

  return `Casts with ${label}. At level 1: ${summary}.${prepared}`;
}

export function mapClassToPanel(data) {
  return {
    name: data.name,
    category: "Class",
    hitDie: `d${data.hit_die}`,
    savingThrows: listNames(data.saving_throws),
    // Saving throws already have their own line, so they are left out here.
    proficiencies: (data.proficiencies ?? [])
      .map((item) => item.name)
      .filter((name) => !/^saving throw/i.test(name)),
    // One line per choice, so "choose three skills" and "three instruments"
    // are not glued into one sentence.
    skillChoiceLines: (data.proficiency_choices ?? []).map(
      (choice) => choice.desc,
    ),
    startingEquipment: (data.starting_equipment ?? [])
      .map((item) => `${item.equipment.name} x${item.quantity}`)
      .join(", "),
    subclasses: listNames(data.subclasses),
    levelOneFeatures: (data.levelOneFeatures ?? []).map((feature) => ({
      name: feature.name,
      description: descriptionFromSrd(feature.desc),
    })),
    laterFeatures: (data.laterFeatureNames ?? []).join(", "),
    spellcasting: describeClassSpellcasting(data),
    guidance: getClassGuidance(data.index),
  };
}

export function mapSpellToPanel(data) {
  const details = formatSpellDetails(data);

  return {
    name: data.name,
    category: "Spell",
    kind: details.kind,
    facts: details.facts,
    classes: listNames(data.classes),
    blocks: details.blocks,
  };
}

// Looks up the full SRD details (armor class, damage, properties) for each
// piece of starting equipment, keeping its quantity. Items that can't be
// looked up (a custom name, a network hiccup) are skipped.
export async function loadStartingGear(equipment = []) {
  const results = await Promise.allSettled(
    equipment.map((item) => getEquipmentDetails(item.index)),
  );

  return results.flatMap((result, position) =>
    result.status === "fulfilled" && result.value
      ? [{ ...result.value, quantity: equipment[position].quantity ?? 1 }]
      : [],
  );
}

// The plain text a feature carries onto a character sheet (one paragraph per
// line; the sheet shows each line as a bullet).
export function descriptionFromSrd(desc) {
  return toLines(desc)
    .filter((line) => !line.startsWith("|"))
    .join("\n");
}

// Everything the SRD says a character gets from their race, subrace, class and
// subclass, with each entry's level (null for racial traits) and description.
// A failed lookup is skipped so one bad request never blocks the rest.
export async function loadFeatureEntries({
  classId,
  subclassId,
  raceId,
  subraceId,
}) {
  const lists = await Promise.allSettled([
    raceId && getRaceTraits(raceId).then(tagWithSource("trait")),
    subraceId && getSubraceTraits(subraceId).then(tagWithSource("trait")),
    classId && getClassFeatures(classId).then(tagWithSource("feature")),
    subclassId &&
      getSubclassFeatures(subclassId).then(tagWithSource("feature")),
  ]);

  const refs = lists.flatMap((result, order) =>
    result.status === "fulfilled" && Array.isArray(result.value)
      ? result.value.map((ref) => ({ ...ref, order }))
      : [],
  );

  const details = await Promise.allSettled(
    refs.map((ref) =>
      ref.source === "trait"
        ? getTraitDetails(ref.index)
        : getFeatureDetails(ref.index),
    ),
  );

  return details.flatMap((result, position) => {
    if (result.status !== "fulfilled") return [];
    const ref = refs[position];
    const data = result.value;

    return [
      {
        key: `${ref.source}:${ref.index}`,
        name: data.name ?? ref.name,
        level: ref.source === "trait" ? null : (data.level ?? null),
        description: descriptionFromSrd(data.desc),
        order: ref.order,
        sourceLabel:
          ref.source === "trait"
            ? "Racial trait"
            : (data.subclass?.name ?? data.class?.name ?? "Class feature"),
      },
    ];
  });
}

// Orders the entries (race first, then class, then subclass; lower levels
// first) and works out what to tick by default: everything the character has
// reached and does not already have.
export function buildFeatureChoices(
  entries,
  characterLevel,
  existingNames = [],
) {
  const have = new Set(existingNames.map(normalizeItemName));

  return entries
    .map((entry) => {
      const alreadyAdded = have.has(normalizeItemName(entry.name));
      const reached = entry.level === null || entry.level <= characterLevel;
      return {
        ...entry,
        alreadyAdded,
        defaultSelected: !alreadyAdded && reached,
      };
    })
    .sort(
      (a, b) =>
        a.order - b.order ||
        (a.level ?? 0) - (b.level ?? 0) ||
        a.name.localeCompare(b.name),
    );
}

export function preferEdition(matches, edition) {
  const sameEdition = matches.filter((match) => match.edition === edition);
  return sameEdition.length > 0 ? sameEdition : matches;
}

export function createSrdNameLookup(entries) {
  const entriesByName = new Map();

  for (const entry of entries) {
    const key = normalizeItemName(entry.name);
    entriesByName.set(key, [...(entriesByName.get(key) ?? []), entry]);
  }

  return (name) => entriesByName.get(normalizeItemName(name)) ?? [];
}

export function getEditionTabLabels(details) {
  const countByEdition = {};

  return details.map(({ edition }) => {
    countByEdition[edition] = (countByEdition[edition] ?? 0) + 1;
    return countByEdition[edition] === 1
      ? `${edition} SRD`
      : `${edition} SRD (${countByEdition[edition]})`;
  });
}

export function tagWithSource(source) {
  return (entries) => entries.map((entry) => ({ ...entry, source }));
}

function formatFeatureOptions(feature) {
  return (feature.feature_specific?.subfeature_options?.from?.options ?? [])
    .map((option) => option.item?.name)
    .filter(Boolean)
    .join(", ");
}

export function formatClassFeatureDetails(feature) {
  const source = feature.subclass?.name ?? feature.class?.name;

  return {
    name: feature.name,
    edition: feature.edition ?? "2014",
    kind: source ? `${source} Feature` : "Class Feature",
    facts: compactFacts([
      { label: "Level", value: feature.level ? String(feature.level) : null },
      { label: "Options", value: formatFeatureOptions(feature) },
    ]),
    blocks: groupMarkdownTables(toLines(feature.desc)),
  };
}

export function formatTraitDetails(trait) {
  const sources = [...(trait.subraces ?? []), ...(trait.races ?? [])];

  return {
    name: trait.name,
    edition: trait.edition ?? "2014",
    kind: sources.length === 1 ? `${sources[0].name} Trait` : "Racial Trait",
    facts: compactFacts([
      {
        label: "Proficiencies",
        value: (trait.proficiencies ?? [])
          .map((proficiency) => proficiency.name)
          .join(", "),
      },
    ]),
    blocks: groupMarkdownTables(toLines(trait.desc)),
  };
}
