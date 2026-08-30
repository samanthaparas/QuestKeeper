const ABILITY_ABBREVIATION_TO_NAME = {
  STR: "strength",
  DEX: "dexterity",
  CON: "constitution",
  INT: "intelligence",
  WIS: "wisdom",
  CHA: "charisma",
};

const PREPARED_CASTER_CLASSES = ["cleric", "druid", "paladin", "wizard"];
const KNOWN_CASTER_CLASSES = ["bard", "ranger", "sorcerer", "warlock"];

function getSpellcastingType(classIndex) {
  if (PREPARED_CASTER_CLASSES.includes(classIndex)) return "prepared";
  if (KNOWN_CASTER_CLASSES.includes(classIndex)) return "known";
  return null;
}

export function mapRaceToSnapshot(raw) {
  const abilityScoreIncreases = raw.ability_bonuses.reduce((acc, item) => {
    const abilityName = ABILITY_ABBREVIATION_TO_NAME[item.ability_score.name];
    acc[abilityName] = item.bonus;
    return acc;
  }, {});

  return {
    id: raw.index,
    name: raw.name,
    source: "SRD 5.1",
    speed: raw.speed,
    abilityScoreIncreases,
    traits: raw.traits.map((trait) => trait.name),
  };
}

export function mapClassToSnapshot(raw) {
  return {
    id: raw.index,
    name: raw.name,
    source: "SRD 5.1",
    hitDie: raw.hit_die,
    savingThrowProficiencies: raw.saving_throws.map(
      (item) => ABILITY_ABBREVIATION_TO_NAME[item.name],
    ),
    spellcastingType: getSpellcastingType(raw.index),
  };
}

export function mapBackgroundToSnapshot(raw) {
  return {
    id: raw.index,
    name: raw.name,
    source: "SRD 5.1",
    skillProficiencies: raw.starting_proficiencies.map((item) => item.name),
    feature: raw.feature.name,
  };
}
