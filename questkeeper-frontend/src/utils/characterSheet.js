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

// One-line plain-language examples so new players know what each skill is for.
export const SKILL_DESCRIPTIONS = {
  acrobatics: "Balance, tumble, and stay on your feet on tricky ground.",
  "animal-handling": "Calm, train, or read the mood of animals.",
  arcana: "Know about magic, spells, and magical creatures.",
  athletics: "Climb, jump, swim, and shove or grapple things.",
  deception: "Lie convincingly or disguise the truth.",
  history: "Recall past events, kingdoms, and legends.",
  insight: "Tell when someone is lying or what they really want.",
  intimidation: "Frighten or pressure someone into doing what you want.",
  investigation: "Search for clues and work out how things fit together.",
  medicine: "Stabilize a dying friend or diagnose an illness.",
  nature: "Know about plants, animals, weather, and the wilds.",
  perception: "Notice hidden things, sounds, and danger. Comes up the most.",
  performance: "Sing, act, play music, or tell a story to an audience.",
  persuasion: "Convince people kindly and honestly, or bargain with them.",
  religion: "Know about gods, rites, and holy symbols.",
  "sleight-of-hand": "Pick pockets, palm objects, and do quick tricks.",
  stealth: "Sneak past guards and hide from enemies.",
  survival: "Track, hunt, forage, and find your way outdoors.",
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function rollAbilityScore() {
  const rolls = [1, 2, 3, 4].map(() => Math.floor(Math.random() * 6) + 1);
  const droppedIndex = rolls.reduce(
    (lowest, roll, index) => (roll < rolls[lowest] ? index : lowest),
    0,
  );
  const total = rolls.reduce(
    (sum, roll, index) => (index === droppedIndex ? sum : sum + roll),
    0,
  );
  return { rolls, droppedIndex, total };
}

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

export const ABILITY_DESCRIPTIONS = {
  strength:
    "Physical power. Governs melee attacks, carrying capacity, and forcing your way through things.",
  dexterity:
    "Agility and reflexes. Governs ranged attacks, Armor Class, initiative, and stealth.",
  constitution:
    "Health and stamina. Determines hit points and resistance to poison, disease, and exhaustion.",
  intelligence:
    "Reasoning and memory. Powers Wizard spellcasting and skills like Arcana, History, and Investigation.",
  wisdom:
    "Awareness and intuition. Powers Cleric and Druid spellcasting and skills like Perception and Insight.",
  charisma:
    "Force of personality. Powers Bard, Sorcerer, Warlock, and Paladin spellcasting and skills like Persuasion and Deception.",
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

// Races whose trait always grants one specific cantrip, so there is nothing
// to choose (Tiefling's Infernal Legacy gives Thaumaturgy).
export const RACE_FIXED_CANTRIPS = {
  tiefling: { index: "thaumaturgy", name: "Thaumaturgy", level: 0 },
};

export function getRaceFixedCantrip(raceId) {
  return RACE_FIXED_CANTRIPS[raceId] ?? null;
}

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

export function getFeatDescriptionLines(feat) {
  if (Array.isArray(feat.desc)) return feat.desc;
  if (typeof feat.description === "string") return feat.description.split("\n");
  return [];
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

  return applySpellSlotProgression(
    {
      type,
      cantripsKnown: chosenCantrips.map(toEntry),
      spellsKnown: chosenSpells.map(toEntry),
    },
    classId,
    1,
  );
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

// The AC the sheet shows: the base number plus any temporary bonus, like the
// +2 from the Haste spell, so the real AC never has to be overwritten.
export function getEffectiveArmorClass(sheet) {
  return (sheet?.combat?.armorClass ?? 10) + (sheet?.acBonus ?? 0);
}

export function getAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

// `expertise` doubles the proficiency bonus (Rogue, Bard); `bonus` is any flat
// extra, like Jack of All Trades or a magic item.
export function getSkillModifier(
  score,
  isProficient,
  proficiencyBonus,
  { expertise = false, bonus = 0 } = {},
) {
  const proficiency = isProficient ? proficiencyBonus * (expertise ? 2 : 1) : 0;
  return getAbilityModifier(score) + proficiency + bonus;
}

// A saving throw: ability modifier, plus proficiency, plus any flat extra that
// applies to every save (Paladin's Aura of Protection, Cloak of Protection).
export function getSaveModifier(
  score,
  isProficient,
  proficiencyBonus,
  extraBonus = 0,
) {
  return (
    getAbilityModifier(score) +
    (isProficient ? proficiencyBonus : 0) +
    extraBonus
  );
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

// --- Starting gear: what a new character's equipment does for them ----------

// AC from the armor and shield a character starts with. Body armor replaces
// 10 + Dex; a shield adds its bonus; Barbarians and Monks use their own
// unarmored formulas when they wear nothing.
export function computeStartingArmorClass({ gear = [], scores, classId }) {
  const mod = (ability) => getAbilityModifier(scores?.[ability] ?? 10);
  const dex = mod("dexterity");

  const bodyArmor = gear.filter((item) =>
    ["Light", "Medium", "Heavy"].includes(item.armor_category),
  );
  const shield = gear.some((item) => item.armor_category === "Shield")
    ? (gear.find((item) => item.armor_category === "Shield").armor_class
        ?.base ?? 2)
    : 0;

  const armorValues = bodyArmor.map((item) => {
    const armorClass = item.armor_class ?? {};
    if (!armorClass.dex_bonus) return armorClass.base ?? 10;
    const cap = armorClass.max_bonus ?? Infinity;
    return (armorClass.base ?? 10) + Math.min(dex, cap);
  });

  if (armorValues.length > 0) return Math.max(...armorValues) + shield;

  let unarmored = 10 + dex;
  if (classId === "barbarian") unarmored += mod("constitution");
  if (classId === "monk" && shield === 0) unarmored += mod("wisdom");
  return unarmored + shield;
}

function wordsOf(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/s$/, ""))
    .sort()
    .join(" ");
}

// Is the class proficient with this weapon? Matches "Simple Weapons",
// "Martial Weapons", or a named weapon ("Longswords", "Hand crossbows").
export function isProficientWithWeapon(weapon, proficiencyNames = []) {
  const names = proficiencyNames.map((name) => String(name).toLowerCase());
  if (weapon.weapon_category === "Simple" && names.includes("simple weapons"))
    return true;
  if (weapon.weapon_category === "Martial" && names.includes("martial weapons"))
    return true;
  const target = wordsOf(weapon.name);
  return proficiencyNames.some((name) => wordsOf(name) === target);
}

function describeWeaponNotes(weapon, quantity) {
  const parts = [];
  if (quantity > 1) parts.push(`Quantity: ${quantity}`);
  const properties = (weapon.properties ?? [])
    .filter((property) => property.index !== "monk")
    .map((property) => property.name);
  if (properties.length > 0) parts.push(properties.join(", "));
  const range =
    weapon.throw_range ??
    (weapon.weapon_range === "Ranged" ? weapon.range : null);
  if (range?.long) parts.push(`Range ${range.normal}/${range.long} ft`);
  return parts.join(" - ");
}

// Turns the weapons a character starts with into rows for the Actions tab,
// with the to-hit and damage worked out from their ability scores.
export function buildStartingAttacks({
  gear = [],
  scores,
  proficiencyNames = [],
  proficiencyBonus = 2,
}) {
  const mod = (ability) => getAbilityModifier(scores?.[ability] ?? 10);
  const strength = mod("strength");
  const dexterity = mod("dexterity");

  return gear
    .filter((item) => item.damage?.damage_dice && item.weapon_category)
    .map((weapon) => {
      const isFinesse = (weapon.properties ?? []).some(
        (property) => property.index === "finesse",
      );
      const abilityMod =
        weapon.weapon_range === "Ranged"
          ? dexterity
          : isFinesse
            ? Math.max(strength, dexterity)
            : strength;
      const toHit =
        abilityMod +
        (isProficientWithWeapon(weapon, proficiencyNames)
          ? proficiencyBonus
          : 0);
      const bonus =
        abilityMod === 0
          ? ""
          : abilityMod > 0
            ? `+${abilityMod}`
            : String(abilityMod);

      return createAttack({
        name: weapon.name,
        toHit,
        damage: `${weapon.damage.damage_dice}${bonus}`,
        damageType: weapon.damage.damage_type?.name ?? "",
        notes: describeWeaponNotes(weapon, weapon.quantity ?? 1),
      });
    });
}

// "Common, Draconic" plus a reminder for any languages the player still has
// to pick (Half-Elf, Acolyte, and so on).
export function buildStartingLanguages({
  raceLanguages = [],
  raceChoices = 0,
  backgroundChoices = 0,
  backgroundName,
}) {
  const known = raceLanguages.map((language) => language.name ?? language);
  const lines = [known.join(", ")].filter(Boolean);
  if (raceChoices > 0) lines.push(`Choose ${raceChoices} more (your race)`);
  if (backgroundChoices > 0) {
    lines.push(
      `Choose ${backgroundChoices} more (${backgroundName ?? "your background"})`,
    );
  }
  return lines.join("\n");
}

// Armor, weapon and tool proficiencies the class grants, as sheet entries.
// Saving throws and skills are shown elsewhere, so they are left out.
export function buildStartingProficiencies(classProficiencies = []) {
  return classProficiencies
    .map((proficiency) => proficiency.name ?? proficiency)
    .filter((name) => !/^saving throw|^skill:/i.test(name))
    .map((name) => ({ index: crypto.randomUUID(), name, description: "" }));
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

export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollD20(mode = "normal") {
  if (mode === "normal") {
    const roll = rollDie(20);
    return { rolls: [roll], result: roll };
  }

  const rolls = [rollDie(20), rollDie(20)];
  const result = mode === "advantage" ? Math.max(...rolls) : Math.min(...rolls);
  return { rolls, result };
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

  const characterClass = subclassStep?.data
    ? { ...sheet.class, subclass: subclassStep.data }
    : sheet.class;

  const spellcastingAfterSpellStep = spellStep?.data
    ? addSpellToSpellcasting(sheet.spellcasting, sheet.class, spellStep.data)
    : sheet.spellcasting;

  const spellcasting = getSpellcastingType(characterClass?.id)
    ? applySpellSlotProgression(
        spellcastingAfterSpellStep,
        characterClass.id,
        pendingLevelUp.targetLevel,
      )
    : spellcastingAfterSpellStep;

  const feats =
    abilityStep?.data?.type === "feat"
      ? [
          ...(sheet.feats ?? []),
          {
            index: crypto.randomUUID(),
            name: abilityStep.data.featName,
            edition: abilityStep.data.featEdition,
          },
        ]
      : (sheet.feats ?? []);

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
    skillExpertise: {},
    skillBonuses: {},
    saveBonus: 0,
    acBonus: 0,

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
    showBackstory: true,
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

export function createCompanionCreature() {
  return {
    name: "",
    armorClass: 10,
    speed: 30,
    hitPoints: { current: 0, max: 0 },
    notes: "",
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

export function setTemporaryHp(hitPoints, value) {
  return { ...hitPoints, temporary: Math.max(0, value) };
}

export function applyRest(sheet, restType) {
  const resources = (sheet.resources ?? []).map((resource) => {
    const shouldReset = restType === "long" || resource.resetOn === "short";
    return shouldReset ? { ...resource, current: resource.max } : resource;
  });

  const hitPoints =
    restType === "long"
      ? setTemporaryHp(
          setCurrentHp(sheet.combat.hitPoints, sheet.combat.hitPoints.max),
          0,
        )
      : sheet.combat.hitPoints;

  const isWarlock = sheet.class?.id === "warlock";
  const shouldResetSpellSlots =
    restType === "long" || (restType === "short" && isWarlock);

  const spellcasting =
    shouldResetSpellSlots && sheet.spellcasting
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

// Clicking a skill's badge steps through: not proficient -> proficient ->
// expertise -> not proficient.
export function cycleSkillProficiency(skills, expertise, skillIndex) {
  const isProficient = Boolean(skills?.[skillIndex]);
  const hasExpertise = Boolean(expertise?.[skillIndex]);
  const nextExpertise = { ...(expertise ?? {}) };

  if (!isProficient) {
    return {
      skills: { ...(skills ?? {}), [skillIndex]: true },
      skillExpertise: nextExpertise,
    };
  }

  if (!hasExpertise) {
    nextExpertise[skillIndex] = true;
    return { skills: { ...skills }, skillExpertise: nextExpertise };
  }

  delete nextExpertise[skillIndex];
  return {
    skills: { ...skills, [skillIndex]: false },
    skillExpertise: nextExpertise,
  };
}

export function toggleSkillProficiency(skills, skillIndex) {
  return { ...(skills ?? {}), [skillIndex]: !skills?.[skillIndex] };
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

// Full-caster spell slot table (Bard, Cleric, Druid, Sorcerer, Wizard), by
// character level 1-20. Each row is slot counts for spell levels 1-9 in
// order. Half-casters reuse this same table (see getSpellSlotProgression)
// rather than needing their own - a half-caster's slots at level L exactly
// match this table's row at level ceil(L/2), verified against all 20 levels.
const FULL_CASTER_SLOT_TABLE = {
  1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const HALF_CASTER_CLASSES = new Set(["paladin", "ranger"]);
const FULL_CASTER_CLASSES = new Set([
  "bard",
  "cleric",
  "druid",
  "sorcerer",
  "wizard",
]);

// Warlock Pact Magic: a handful of slots that are all the same spell level,
// which itself scales with character level - a completely different system
// from every other caster, but it still fits the existing 9-row
// {level, max} shape (only one row is ever nonzero).
const WARLOCK_PACT_MAGIC_TABLE = {
  1: { slots: 1, slotLevel: 1 },
  2: { slots: 2, slotLevel: 1 },
  3: { slots: 2, slotLevel: 2 },
  4: { slots: 2, slotLevel: 2 },
  5: { slots: 2, slotLevel: 3 },
  6: { slots: 2, slotLevel: 3 },
  7: { slots: 2, slotLevel: 4 },
  8: { slots: 2, slotLevel: 4 },
  9: { slots: 2, slotLevel: 5 },
  10: { slots: 2, slotLevel: 5 },
  11: { slots: 3, slotLevel: 5 },
  12: { slots: 3, slotLevel: 5 },
  13: { slots: 3, slotLevel: 5 },
  14: { slots: 3, slotLevel: 5 },
  15: { slots: 3, slotLevel: 5 },
  16: { slots: 3, slotLevel: 5 },
  17: { slots: 4, slotLevel: 5 },
  18: { slots: 4, slotLevel: 5 },
  19: { slots: 4, slotLevel: 5 },
  20: { slots: 4, slotLevel: 5 },
};

export function getSpellSlotProgression(classId, level) {
  const clampedLevel = Math.max(1, Math.min(20, level));
  const emptyRows = () =>
    Array.from({ length: 9 }, (_, i) => ({ level: i + 1, max: 0 }));

  if (classId === "warlock") {
    const { slots, slotLevel } = WARLOCK_PACT_MAGIC_TABLE[clampedLevel];
    return emptyRows().map((row) =>
      row.level === slotLevel ? { ...row, max: slots } : row,
    );
  }

  if (HALF_CASTER_CLASSES.has(classId)) {
    if (clampedLevel < 2) return emptyRows();
    const row = FULL_CASTER_SLOT_TABLE[Math.ceil(clampedLevel / 2)];
    return row.map((max, i) => ({ level: i + 1, max }));
  }

  if (FULL_CASTER_CLASSES.has(classId)) {
    const row = FULL_CASTER_SLOT_TABLE[clampedLevel];
    return row.map((max, i) => ({ level: i + 1, max }));
  }

  return emptyRows();
}

export function applySpellSlotProgression(spellcasting, classId, level) {
  const progression = getSpellSlotProgression(classId, level);
  const base = spellcasting ?? {
    type: getSpellcastingType(classId) ?? "known",
    cantripsKnown: [],
    spellsKnown: [],
  };

  return {
    ...base,
    spellSlots: progression.map(({ level: slotLevel, max }) => ({
      level: slotLevel,
      max,
      current: max,
    })),
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

export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
