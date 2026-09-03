export const ABILITY_SCORES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function getAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

export function applyRaceBonuses(baseScores, race) {
  if (!race?.abilityScoreIncreases) return { ...baseScores };

  const result = { ...baseScores };

  for (const [ability, bonus] of Object.entries(race.abilityScoreIncreases)) {
    result[ability] = (result[ability] ?? 0) + bonus;
  }

  return result;
}

export function getStartingHitPoints(hitDie, conModifier) {
  return Math.max(1, hitDie + conModifier);
}

export function getStartingArmorClass(dexModifier) {
  return 10 + dexModifier;
}

function createDefaultAbilityScores() {
  return ABILITY_SCORES.reduce((scores, ability) => {
    scores[ability] = 10;
    return scores;
  }, {});
}

function createDefaultSavingThrows() {
  return ABILITY_SCORES.reduce((throws, ability) => {
    throws[ability] = false;
    return throws;
  }, {});
}

export function createCharacterSheet(overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,

    name: "Unnamed Character",
    level: 1,
    experienceMode: "guided", // "guided" | "freeForAll"

    race: null,
    class: null,
    background: null,

    abilityScores: createDefaultAbilityScores(),
    savingThrows: createDefaultSavingThrows(),
    skills: {},

    combat: {
      armorClass: 10,
      initiative: 0,
      speed: 30,
      hitPoints: { max: 0, current: 0, temporary: 0 },
      hitDice: { total: 1, remaining: 1, die: null },
      hpHistory: [],
    },

    equipment: [],
    spellcasting: null,
    abilityScoreImprovements: [],
    pendingLevelUp: null,
    notes: "",

    ...overrides,
  };
}

export function createPendingLevelUp(targetLevel, stepKeys) {
  return {
    targetLevel,
    startedAt: new Date().toISOString(),
    status: "in_progress", // "in_progress" | "complete"
    steps: stepKeys.map((key) => ({ key, status: "pending", data: null })),
  };
}
