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

export function mapRaceToSnapshot(raw) {
  const abilityScoreIncreases = raw.ability_bonuses.reduce((acc, item) => {
    const abilityName = ABILITY_ABBREVIATION_TO_NAME[item.ability_score.name];
    acc[abilityName] = item.bonus;
    return acc;
  }, {});

  const abilityScoreChoice = raw.ability_bonus_options
    ? {
        choose: raw.ability_bonus_options.choose,
        options: raw.ability_bonus_options.from.options.map((option) => ({
          ability: ABILITY_ABBREVIATION_TO_NAME[option.ability_score.name],
          bonus: option.bonus,
        })),
      }
    : null;

  return {
    id: raw.index,
    name: raw.name,
    source: "SRD 5.1",
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
    source: "SRD 5.1",
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
    source: "SRD 5.1",
    skillProficiencies: raw.starting_proficiencies.map((item) => ({
      index: item.index.replace(/^skill-/, ""),
      name: item.name.replace(/^Skill: /, ""),
    })),
    feature: raw.feature.name,
    startingEquipment: mapStartingEquipment(raw),
  };
}

export function mapSubraceToSnapshot(raw) {
  const abilityScoreIncreases = raw.ability_bonuses.reduce((acc, item) => {
    const abilityName = ABILITY_ABBREVIATION_TO_NAME[item.ability_score.name];
    acc[abilityName] = item.bonus;
    return acc;
  }, {});

  return {
    id: raw.index,
    name: raw.name,
    abilityScoreIncreases,
    traits: raw.racial_traits.map((trait) => trait.name),
  };
}

export function mapSubclassToSnapshot(raw) {
  return {
    id: raw.index,
    name: raw.name,
    flavor: raw.subclass_flavor,
  };
}
