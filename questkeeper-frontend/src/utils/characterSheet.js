export const ABILITY_SCORES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export const SKILLS = [
  { index: "acrobatics", name: "Acrobatics", ability: "dexterity" },
  { index: "animal-handling", name: "Animal Handling", ability: "wisdom" },
  { index: "arcana", name: "Arcana", ability: "intelligence" },
  { index: "athletics", name: "Athletics", ability: "strength" },
  { index: "deception", name: "Deception", ability: "charisma" },
  { index: "history", name: "History", ability: "intelligence" },
  { index: "insight", name: "Insight", ability: "wisdom" },
  { index: "intimidation", name: "Intimidation", ability: "charisma" },
  { index: "investigation", name: "Investigation", ability: "intelligence" },
  { index: "medicine", name: "Medicine", ability: "wisdom" },
  { index: "nature", name: "Nature", ability: "intelligence" },
  { index: "perception", name: "Perception", ability: "wisdom" },
  { index: "performance", name: "Performance", ability: "charisma" },
  { index: "persuasion", name: "Persuasion", ability: "charisma" },
  { index: "religion", name: "Religion", ability: "intelligence" },
  { index: "sleight-of-hand", name: "Sleight of Hand", ability: "dexterity" },
  { index: "stealth", name: "Stealth", ability: "dexterity" },
  { index: "survival", name: "Survival", ability: "wisdom" },
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

export const SPELLCASTING_BY_CLASS = {
  bard: { type: "known", ability: "charisma" },
  cleric: { type: "prepared", ability: "wisdom" },
  druid: { type: "prepared", ability: "wisdom" },
  paladin: { type: "prepared", ability: "charisma" },
  ranger: { type: "known", ability: "wisdom" },
  sorcerer: { type: "known", ability: "charisma" },
  warlock: { type: "known", ability: "charisma" },
  wizard: { type: "prepared", ability: "intelligence" },
};

// Every SRD 2014 class has exactly one subclass, but they're granted at
// different levels: Cleric/Sorcerer/Warlock at 1 (handled at character
// creation, see CharacterCreationPage), Wizard/Druid at 2, everyone else
// at 3. Verified against each class's actual level-by-level feature data,
// not assumed.
export const SUBCLASS_LEVEL_BY_CLASS = {
  cleric: 1,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
  druid: 2,
  bard: 3,
  barbarian: 3,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
};

export function getSubclassLevel(classId) {
  return SUBCLASS_LEVEL_BY_CLASS[classId] ?? null;
}

// Only High Elf currently grants a choosable free cantrip via a racial
// trait (SRD "High Elf Cantrip") - map subrace id -> trait id so this
// stays easy to extend if another subrace ever needs the same treatment.
export const SUBRACE_CANTRIP_TRAITS = {
  "high-elf": "high-elf-cantrip",
};

export function getSubraceCantripTraitId(subraceId) {
  return SUBRACE_CANTRIP_TRAITS[subraceId] ?? null;
}

export function getSpellcastingType(classId) {
  return SPELLCASTING_BY_CLASS[classId]?.type ?? null;
}

export function getSpellcastingAbility(classId) {
  return SPELLCASTING_BY_CLASS[classId]?.ability ?? null;
}

export function getStartingSpellCounts(classId, levelOneSpellcasting) {
  const cantrips = levelOneSpellcasting?.cantrips_known ?? 0;
  if (cantrips === 0) return { cantrips: 0, spells: 0 };

  if (classId === "wizard") return { cantrips, spells: 6 };
  if (getSpellcastingType(classId) === "prepared")
    return { cantrips, spells: 0 };

  return { cantrips, spells: levelOneSpellcasting?.spells_known ?? 0 };
}

export function buildStartingSpellcasting(
  classId,
  chosenCantrips,
  chosenSpells,
) {
  const type = getSpellcastingType(classId);
  if (!type) return null;

  const toEntry = (spell) => ({
    index: spell.index,
    name: spell.name,
    level: spell.level,
    notes: "",
    components: "",
  });

  return {
    type,
    cantripsKnown: chosenCantrips.map(toEntry),
    spellsKnown: chosenSpells.map(toEntry),
  };
}

export function addRacialCantrip(spellcasting, cantrip) {
  const base = spellcasting ?? {
    type: "known",
    cantripsKnown: [],
    spellsKnown: [],
  };

  const entry = {
    index: cantrip.index,
    name: cantrip.name,
    level: 0,
    notes: "",
    components: "",
  };

  return { ...base, cantripsKnown: [...base.cantripsKnown, entry] };
}

export function getAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function getSkillModifier(score, isProficient, proficiencyBonus) {
  return getAbilityModifier(score) + (isProficient ? proficiencyBonus : 0);
}

export function getSpellSaveDC(abilityScore, proficiencyBonus) {
  return 8 + proficiencyBonus + getAbilityModifier(abilityScore);
}

export function getSpellAttackModifier(abilityScore, proficiencyBonus) {
  return proficiencyBonus + getAbilityModifier(abilityScore);
}

export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
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

export function mergeSubrace(race, subrace) {
  if (!subrace) return race;

  const abilityScoreIncreases = { ...race.abilityScoreIncreases };
  for (const [ability, bonus] of Object.entries(
    subrace.abilityScoreIncreases,
  )) {
    abilityScoreIncreases[ability] =
      (abilityScoreIncreases[ability] ?? 0) + bonus;
  }

  return {
    ...race,
    name: subrace.name,
    subrace: { id: subrace.id, name: subrace.name },
    abilityScoreIncreases,
    traits: [...(race.traits ?? []), ...(subrace.traits ?? [])],
  };
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

  if (getSubclassLevel(characterClass?.id) === targetLevel) {
    steps.push("subclass");
  }

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

  const entry = {
    index: spellChoice.spellIndex,
    name: spellChoice.spellName,
    level: spellChoice.spellLevel,
    notes: "",
    components: "",
  };

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
  const subclassStep = pendingLevelUp.steps.find((s) => s.key === "subclass");

  const conModifier = getAbilityModifier(sheet.abilityScores.constitution);
  const hpGained = Math.max(1, (hpStep?.data?.amount ?? 0) + conModifier);

  const abilityScores = abilityStep
    ? applyAbilityScoreChoice(sheet.abilityScores, abilityStep.data)
    : sheet.abilityScores;

  const spellcasting = spellStep?.data
    ? addSpellToSpellcasting(sheet.spellcasting, sheet.class, spellStep.data)
    : sheet.spellcasting;

  const feats =
    abilityStep?.data?.type === "feat"
      ? [
          ...(sheet.feats ?? []),
          {
            index: abilityStep.data.featIndex,
            name: abilityStep.data.featName,
          },
        ]
      : (sheet.feats ?? []);

  const characterClass = subclassStep?.data
    ? { ...sheet.class, subclass: subclassStep.data }
    : sheet.class;

  return {
    ...sheet,
    level: pendingLevelUp.targetLevel,
    class: characterClass,
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

export function buildLevelUpSummary(before, after) {
  const abilityChanges = ABILITY_SCORES.filter(
    (ability) => before.abilityScores[ability] !== after.abilityScores[ability],
  ).map((ability) => ({
    ability,
    from: before.abilityScores[ability],
    to: after.abilityScores[ability],
  }));

  const newFeat =
    (after.feats?.length ?? 0) > (before.feats?.length ?? 0)
      ? after.feats[after.feats.length - 1]
      : null;

  const newSubclass =
    after.class?.subclass &&
    after.class.subclass.id !== before.class?.subclass?.id
      ? after.class.subclass
      : null;

  const beforeCantripCount = before.spellcasting?.cantripsKnown?.length ?? 0;
  const afterCantripCount = after.spellcasting?.cantripsKnown?.length ?? 0;
  const beforeSpellCount = before.spellcasting?.spellsKnown?.length ?? 0;
  const afterSpellCount = after.spellcasting?.spellsKnown?.length ?? 0;

  let newSpell = null;
  if (afterCantripCount > beforeCantripCount) {
    newSpell = after.spellcasting.cantripsKnown.at(-1);
  } else if (afterSpellCount > beforeSpellCount) {
    newSpell = after.spellcasting.spellsKnown.at(-1);
  }

  return {
    fromLevel: before.level,
    toLevel: after.level,
    hpGained: after.combat.hitPoints.max - before.combat.hitPoints.max,
    fromProficiency: getProficiencyBonus(before.level),
    toProficiency: getProficiencyBonus(after.level),
    abilityChanges,
    newFeat,
    newSubclass,
    newSpell,
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
    size: "Medium",
    languages: "",
    inspiration: 0,
    gold: 0,
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
    attacks: [],
    spellcasting: null,
    feats: [],
    features: [],
    proficiencies: [],
    resources: [],
    abilityScoreImprovements: [],
    pendingLevelUp: null,
    notes: "",
    backstory: "",
    appearance: "",

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

export function createResource({ name, max, resetOn, notes }) {
  return {
    id: crypto.randomUUID(),
    name,
    max,
    current: max,
    resetOn, // "short" | "long"
    notes: notes || "",
  };
}

export function setResourceCurrent(resources, id, value) {
  return (resources ?? []).map((resource) =>
    resource.id === id
      ? { ...resource, current: Math.max(0, Math.min(value, resource.max)) }
      : resource,
  );
}

export function removeResource(resources, id) {
  return (resources ?? []).filter((resource) => resource.id !== id);
}

export function updateResource(resources, id, updates) {
  return (resources ?? []).map((resource) => {
    if (resource.id !== id) return resource;
    const updated = { ...resource, ...updates };
    if (updates.max !== undefined) {
      updated.current = Math.min(resource.current, updates.max);
    }
    return updated;
  });
}

export function setCurrentHp(hitPoints, value) {
  return {
    ...hitPoints,
    current: Math.max(0, Math.min(value, hitPoints.max)),
  };
}

export function applyRest(sheet, restType) {
  const resources = (sheet.resources ?? []).map((resource) => {
    const shouldReset = restType === "long" || resource.resetOn === "short";
    return shouldReset ? { ...resource, current: resource.max } : resource;
  });

  const hitPoints =
    restType === "long"
      ? setCurrentHp(sheet.combat.hitPoints, sheet.combat.hitPoints.max)
      : sheet.combat.hitPoints;

  const spellcasting =
    restType === "long" && sheet.spellcasting
      ? {
          ...sheet.spellcasting,
          spellSlots: getSpellSlots(sheet.spellcasting).map((slot) => ({
            ...slot,
            current: slot.max,
          })),
        }
      : sheet.spellcasting;

  return {
    ...sheet,
    resources,
    spellcasting,
    combat: {
      ...sheet.combat,
      hitPoints,
    },
  };
}

export function createEquipmentItem({ name, quantity, description }) {
  return {
    index: crypto.randomUUID(),
    name,
    quantity: quantity && quantity > 0 ? quantity : 1,
    description: description || "",
    attuned: false,
  };
}

export function removeEquipmentItem(equipment, index) {
  return (equipment ?? []).filter((item) => item.index !== index);
}

export function updateEquipmentItem(equipment, index, updates) {
  return (equipment ?? []).map((item) =>
    item.index === index ? { ...item, ...updates } : item,
  );
}

export function getAttunedCount(equipment) {
  return (equipment ?? []).filter((item) => item.attuned).length;
}

export function createAttack({ name, toHit, damage, damageType, notes }) {
  return {
    index: crypto.randomUUID(),
    name,
    toHit: Number(toHit) || 0,
    damage: damage || "",
    damageType: damageType || "",
    notes: notes || "",
  };
}

export function removeAttack(attacks, index) {
  return (attacks ?? []).filter((attack) => attack.index !== index);
}

export function updateAttack(attacks, index, updates) {
  return (attacks ?? []).map((attack) =>
    attack.index === index ? { ...attack, ...updates } : attack,
  );
}

export function createFeat({ name, description }) {
  return {
    index: crypto.randomUUID(),
    name,
    description: description || "",
  };
}

export function removeFeat(feats, index) {
  return (feats ?? []).filter((feat) => feat.index !== index);
}

export function updateFeat(feats, index, updates) {
  return (feats ?? []).map((feat) =>
    feat.index === index ? { ...feat, ...updates } : feat,
  );
}

export function addManualSpell(sheet, { name, level, notes, components }) {
  const base = sheet.spellcasting ?? {
    type: sheet.class?.spellcastingType ?? "known",
    cantripsKnown: [],
    spellsKnown: [],
  };

  const numericLevel = Number(level);
  const entry = {
    index: crypto.randomUUID(),
    name,
    level: numericLevel,
    notes: notes || "",
    components: components || "",
  };

  if (numericLevel === 0) {
    return { ...base, cantripsKnown: [...base.cantripsKnown, entry] };
  }

  return { ...base, spellsKnown: [...base.spellsKnown, entry] };
}

export function removeSpell(spellcasting, listKey, index) {
  return {
    ...spellcasting,
    [listKey]: spellcasting[listKey].filter((spell) => spell.index !== index),
  };
}

export function updateSpell(spellcasting, listKey, index, updates) {
  const current = spellcasting[listKey].find((spell) => spell.index === index);
  if (!current) return spellcasting;

  const updated = {
    ...current,
    ...updates,
    level: Number(updates.level ?? current.level),
  };
  const targetListKey = updated.level === 0 ? "cantripsKnown" : "spellsKnown";

  const withoutOld = {
    ...spellcasting,
    [listKey]: spellcasting[listKey].filter((spell) => spell.index !== index),
  };

  return {
    ...withoutOld,
    [targetListKey]: [...withoutOld[targetListKey], updated],
  };
}

function createDefaultSpellSlots() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
    level,
    max: 0,
    current: 0,
  }));
}

export function getSpellSlots(spellcasting) {
  return spellcasting?.spellSlots ?? createDefaultSpellSlots();
}

export function setSpellSlot(spellcasting, level, field, value) {
  const base = spellcasting ?? {
    type: "known",
    cantripsKnown: [],
    spellsKnown: [],
  };
  const spellSlots = getSpellSlots(base);

  const updatedSlots = spellSlots.map((slot) =>
    slot.level === level ? { ...slot, [field]: Math.max(0, value) } : slot,
  );

  return { ...base, spellSlots: updatedSlots };
}
