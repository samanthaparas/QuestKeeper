export const ABILITY_SCORES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const ABILITY_ABBREVIATIONS = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

export const ABILITY_LABELS = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export function getAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

export function applyRaceBonuses(baseScores, race, chosenAbilities = []) {
  const result = { ...baseScores };

  if (race?.abilityScoreIncreases) {
    for (const [ability, bonus] of Object.entries(race.abilityScoreIncreases)) {
      result[ability] = (result[ability] ?? 0) + bonus;
    }
  }

  if (race?.abilityScoreChoice) {
    chosenAbilities.forEach((ability) => {
      const option = race.abilityScoreChoice.options.find(
        (opt) => opt.ability === ability,
      );
      if (option) {
        result[ability] = (result[ability] ?? 0) + option.bonus;
      }
    });
  }

  return result;
}

export function getStartingHitPoints(hitDie, conModifier) {
  return Math.max(1, hitDie + conModifier);
}

export function getStartingArmorClass(dexModifier) {
  return 10 + dexModifier;
}

export const ABILITY_SCORE_IMPROVEMENT_LEVELS = [4, 8, 12, 16, 19];

export function getLevelUpStepKeys(targetLevel, characterClass) {
  const steps = ["hitPoints"];

  if (ABILITY_SCORE_IMPROVEMENT_LEVELS.includes(targetLevel)) {
    steps.push("abilityOrFeat");
  }

  if (characterClass?.spellcastingType) {
    steps.push("spells");
  }

  return steps;
}

export function rollHitDie(die) {
  return Math.floor(Math.random() * die) + 1;
}

export function getAverageHitDieValue(die) {
  return Math.floor(die / 2) + 1;
}

export function applyAbilityScoreChoice(abilityScores, choice) {
  if (!choice) return { ...abilityScores };

  const result = { ...abilityScores };

  if (choice.type === "asi-one") {
    result[choice.ability] = (result[choice.ability] ?? 0) + 2;
  }

  if (choice.type === "asi-two") {
    choice.abilities.forEach((ability) => {
      result[ability] = (result[ability] ?? 0) + 1;
    });
  }

  return result;
}

function addSpellToSpellcasting(spellcasting, characterClass, spellChoice) {
  const base = spellcasting ?? {
    type: characterClass?.spellcastingType ?? "known",
    cantripsKnown: [],
    spellsKnown: [],
  };

  const entry = { index: spellChoice.spellIndex, name: spellChoice.spellName };

  if (spellChoice.spellLevel === 0) {
    return { ...base, cantripsKnown: [...base.cantripsKnown, entry] };
  }

  return { ...base, spellsKnown: [...base.spellsKnown, entry] };
}

export function finalizeLevelUp(sheet) {
  const { pendingLevelUp } = sheet;
  if (!pendingLevelUp) return sheet;

  const hpStep = pendingLevelUp.steps.find((s) => s.key === "hitPoints");
  const abilityStep = pendingLevelUp.steps.find(
    (s) => s.key === "abilityOrFeat",
  );

  const spellStep = pendingLevelUp.steps.find((s) => s.key === "spells");

  const conModifier = getAbilityModifier(sheet.abilityScores.constitution);
  const hpGained = Math.max(1, (hpStep?.data?.amount ?? 0) + conModifier);

  const abilityScores = abilityStep
    ? applyAbilityScoreChoice(sheet.abilityScores, abilityStep.data)
    : sheet.abilityScores;

  const spellcasting = spellStep
    ? addSpellToSpellcasting(sheet.spellcasting, sheet.class, spellStep.data)
    : sheet.spellcasting;

  const feats =
    abilityStep?.data?.type === "feat"
      ? [
          ...ABILITY_ABBREVIATIONS(sheet.feats ?? []),
          {
            index: abilityStep.data.featIndex,
            name: abilityStep.data.featName,
          },
        ]
      : (sheet.feats ?? []);

  return {
    ...sheet,
    level: pendingLevelUp.targetLevel,
    abilityScores,
    spellcasting,
    feats,
    combat: {
      ...sheet.combat,
      hitPoints: {
        ...sheet.combat.hitPoints,
        max: sheet.combat.hitPoints.max + hpGained,
        current: sheet.combat.hitPoints.current + hpGained,
      },
      hitDice: {
        ...sheet.combat.hitDice,
        total: sheet.combat.hitDice.total + 1,
        remaining: sheet.combat.hitDice.remaining + 1,
      },
      hpHistory: [
        ...sheet.combat.hpHistory,
        {
          level: pendingLevelUp.targetLevel,
          gained: hpGained,
          at: new Date().toISOString(),
        },
      ],
    },
    pendingLevelUp: null,
  };
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
    feats: [],
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
