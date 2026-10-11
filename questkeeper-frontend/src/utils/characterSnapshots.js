import { getSpellcastingType, getSpellcastingAbility } from "./characterSheet";

const ABILITY_ABBREVIATION_TO_NAME = {
  STR: "strength",
  DEX: "dexterity",
  CON: "constitution",
  INT: "intelligence",
  WIS: "wisdom",
  CHA: "charisma",
};

// const PREPARED_CASTER_CLASSES = ["cleric", "druid", "paladin", "wizard"];
// const KNOWN_CASTER_CLASSES = ["bard", "ranger", "sorcerer", "warlock"];

// function getSpellcastingType(classIndex) {
//   if (PREPARED_CASTER_CLASSES.includes(classIndex)) return "prepared";
//   if (KNOWN_CASTER_CLASSES.includes(classIndex)) return "known";
//   return null;
// }

function mapStartingEquipment(raw) {
  return (raw.starting_equipment ?? []).map((item) => ({
    index: item.equipment.index,
    name: item.equipment.name,
    quantity: item.quantity,
  }));
}

// { strength: 2 } from the API's [{ ability_score: { name: "STR" }, bonus: 2 }]
function mapAbilityScoreIncreases(raw) {
  return (raw.ability_bonuses ?? []).reduce((acc, item) => {
    const abilityName = ABILITY_ABBREVIATION_TO_NAME[item.ability_score.name];
    acc[abilityName] = item.bonus;
    return acc;
  }, {});
}

// "Pick N abilities to raise" (Half-Elf, Gearforged, Erina...), or null.
function mapAbilityScoreChoice(raw) {
  const options = raw.ability_bonus_options;
  if (!options) return null;

  return {
    choose: options.choose,
    options: options.from.options.map((option) => ({
      ability: ABILITY_ABBREVIATION_TO_NAME[option.ability_score.name],
      bonus: option.bonus,
    })),
  };
}

export function mapRaceToSnapshot(raw) {
  const abilityScoreIncreases = mapAbilityScoreIncreases(raw);
  const abilityScoreChoice = mapAbilityScoreChoice(raw);

  return {
    id: raw.index,
    name: raw.name,
    // Which book this came from, shown on the sheet ("Tome of Heroes").
    source: raw.source ?? "SRD 5.1",
    speed: raw.speed,
    abilityScoreIncreases,
    abilityScoreChoice,
    traits: raw.traits.map((trait) => trait.name),
  };
}

export function mapClassToSnapshot(raw) {
  const skillChoice = raw.proficiency_choices?.[0]
    ? {
        choose: raw.proficiency_choices[0].choose,
        options: raw.proficiency_choices[0].from.options.map((option) => ({
          index: option.item.index.replace(/^skill-/, ""),
          name: option.item.name.replace(/^Skill: /, ""),
        })),
      }
    : null;

  return {
    id: raw.index,
    name: raw.name,
    source: raw.source ?? "SRD 5.1",
    hitDie: raw.hit_die,
    savingThrowProficiencies: raw.saving_throws.map(
      (item) => ABILITY_ABBREVIATION_TO_NAME[item.name],
    ),
    spellcastingType: getSpellcastingType(raw.index),
    skillChoice,
    startingEquipment: mapStartingEquipment(raw),
    spellcastingAbility: getSpellcastingAbility(raw.index),
  };
}

export function mapBackgroundToSnapshot(raw) {
  return {
    id: raw.index,
    name: raw.name,
    source: raw.source ?? "SRD 5.1",
    skillProficiencies: (raw.starting_proficiencies ?? [])
      .filter((item) => item.index.startsWith("skill-"))
      .map((item) => ({
        index: item.index.replace(/^skill-/, ""),
        name: item.name.replace(/^Skill: /, ""),
      })),
    // Some Open5e backgrounds let you pick a skill (Innkeeper: Intimidation
    // or Persuasion). Picked on the Skills step.
    skillChoice: raw.skill_choice ?? null,
    // Languages it always grants, like Thieves' Cant.
    languages: (raw.languages ?? []).map((language) => language.name),
    feature: raw.feature?.name ?? null,
    startingEquipment: mapStartingEquipment(raw),
    // Open5e describes gear and tools in a sentence instead of an item list.
    equipmentDescription: raw.equipment_description || null,
    toolProficiencies: raw.tool_proficiencies_description || null,
  };
}

export function mapSubraceToSnapshot(raw) {
  return {
    id: raw.index,
    name: raw.name,
    source: raw.source ?? "SRD 5.1",
    abilityScoreIncreases: mapAbilityScoreIncreases(raw),
    abilityScoreChoice: mapAbilityScoreChoice(raw),
    traits: (raw.racial_traits ?? []).map((trait) => trait.name),
  };
}

export function mapSubclassToSnapshot(raw) {
  return {
    id: raw.index,
    name: raw.name,
    source: raw.source ?? "SRD 5.1",
    flavor: raw.subclass_flavor,
  };
}
