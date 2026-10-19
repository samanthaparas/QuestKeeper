import { afterLongRest } from "./conditions";
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

// The level each class picks its subclass. SRD and Open5e subclasses follow
// the same schedule: Cleric/Sorcerer/Warlock at 1 (handled at character
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

// --- Class rules ---------------------------------------------------------------
// The SRD classes' rules are looked up by their ID ("wizard"). Homebrew
// classes carry their own on the class itself, so every helper below takes
// either an ID or a class object: a sheet's class snapshot ({ id,
// spellcastingType, casterProgression... }) or a raw class from the API
// ({ index, spellcasting_type, caster_progression... }).

// How a class gets spell slots: "full" (Wizard), "half" (Paladin, from level
// 2), "half-early" (half slots from level 1, like the Artificer), "pact"
// (Warlock) or "none".
const SRD_PROGRESSION = {
  bard: "full",
  cleric: "full",
  druid: "full",
  sorcerer: "full",
  wizard: "full",
  paladin: "half",
  ranger: "half",
  warlock: "pact",
};

export const CASTER_PROGRESSIONS = ["none", "full", "half", "half-early", "pact"];

function classRules(classRef) {
  const isObject = classRef !== null && typeof classRef === "object";
  const id = isObject ? (classRef.id ?? classRef.index) : classRef;
  const pick = (camel, snake, fallback) =>
    (isObject ? (classRef[camel] ?? classRef[snake]) : undefined) ?? fallback;

  const progression = pick("casterProgression", "caster_progression", SRD_PROGRESSION[id] ?? "none");
  return {
    id,
    type: pick("spellcastingType", "spellcasting_type", SPELLCASTING_BY_CLASS[id]?.type ?? null),
    ability: pick("spellcastingAbility", "spellcasting_ability", SPELLCASTING_BY_CLASS[id]?.ability ?? null),
    progression: CASTER_PROGRESSIONS.includes(progression) ? progression : "none",
    subclassLevel: pick("subclassLevel", "subclass_level", SUBCLASS_LEVEL_BY_CLASS[id] ?? null),
  };
}

export function getSubclassLevel(classRef) {
  return classRules(classRef).subclassLevel;
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

export function getSpellcastingType(classRef) {
  return classRules(classRef).type;
}

export function getSpellcastingAbility(classRef) {
  return classRules(classRef).ability;
}

export function getStartingSpellCounts(classRef, levelOneSpellcasting) {
  const cantrips = levelOneSpellcasting?.cantrips_known ?? 0;
  const known = levelOneSpellcasting?.spells_known ?? 0;
  if (cantrips === 0 && known === 0) return { cantrips: 0, spells: 0 };

  if (classRules(classRef).id === "wizard") return { cantrips, spells: 6 };
  if (getSpellcastingType(classRef) === "prepared")
    return { cantrips, spells: 0 };

  return { cantrips, spells: known };
}

export function getFeatDescriptionLines(feat) {
  if (Array.isArray(feat.desc)) return feat.desc;
  if (typeof feat.description === "string") return feat.description.split("\n");
  return [];
}

export function buildStartingSpellcasting(
  classRef,
  chosenCantrips,
  chosenSpells,
) {
  const type = getSpellcastingType(classRef);
  if (!type) return null;

  const toEntry = (spell) => ({
    index: spell.index,
    name: spell.name,
    level: spell.level,
    notes: "",
    components: Array.isArray(spell.components) ? spell.components.join(", ") : (spell.components ?? ""),
  });

  return applySpellSlotProgression(
    {
      type,
      cantripsKnown: chosenCantrips.map(toEntry),
      spellsKnown: chosenSpells.map(toEntry),
    },
    classRef,
    1,
  );
}

// A cantrip that comes from the character's race (Tiefling's Thaumaturgy, a
// High Elf's wizard cantrip). It arrives locked, with where it came from, so
// it can't be swapped or deleted by accident on the sheet.
export function addRacialCantrip(spellcasting, cantrip, grantedBy = "") {
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
    components: cantrip.components ?? "",
    locked: true,
    grantedBy,
  };

  return { ...base, cantripsKnown: [...base.cantripsKnown, entry] };
}

// The AC the sheet shows: the base number plus any temporary bonus, like the
// +2 from the Haste spell, so the real AC never has to be overwritten.
// "From your race (Tiefling)" for a granted spell, "Locked" for one the
// player locked themselves, or "" when it isn't locked.
export function describeSpellLock(spell) {
  if (!spell?.locked) return "";
  return spell.grantedBy ? `From ${spell.grantedBy}` : "Locked";
}

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

// Death saves, made each turn at 0 HP: { successes, failures }, 0 to 3 each.
export const EMPTY_DEATH_SAVES = { successes: 0, failures: 0 };

// One death save from the d20 alone (no bonus): 10 or more is a success, a 1
// counts as two failures, and a 20 brings you back with 1 HP (and clears the
// marks). Returns the new marks and whether the character gets up.
export function applyDeathSave(deathSaves, natural) {
  const current = { ...EMPTY_DEATH_SAVES, ...deathSaves };
  if (natural === 20) return { deathSaves: { ...EMPTY_DEATH_SAVES }, regainsHp: true };

  const next =
    natural >= 10
      ? { ...current, successes: Math.min(3, current.successes + 1) }
      : { ...current, failures: Math.min(3, current.failures + (natural === 1 ? 2 : 1)) };
  return { deathSaves: next, regainsHp: false };
}

// "stable" after three successes, "dead" after three failures, else null.
export function getDeathSaveOutcome(deathSaves) {
  if ((deathSaves?.failures ?? 0) >= 3) return "dead";
  if ((deathSaves?.successes ?? 0) >= 3) return "stable";
  return null;
}

// The Constitution save to keep concentrating after taking damage: DC 10,
// or half the damage if that's higher.
export function getConcentrationDc(damage) {
  return Math.max(10, Math.floor(damage / 2));
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

// A race's ability bonuses as a list of amounts, largest first: a Hill Dwarf
// is [2, 1], a Half-Elf [2, 1, 1] (its +2 plus two +1s of its choice), a
// Human [1, 1, 1, 1, 1, 1].
export function getRaceBonusPattern(race) {
  const fixed = Object.values(race?.abilityScoreIncreases ?? {}).filter(
    (bonus) => bonus > 0,
  );
  const choice = race?.abilityScoreChoice;
  const chosen = choice
    ? Array.from(
        { length: choice.choose },
        () => choice.options[0]?.bonus ?? 1,
      )
    : [];
  return [...fixed, ...chosen].sort((a, b) => b - a);
}

// Players may put their race's bonuses on any abilities (newer rules do this
// by default, and many tables allow it). Pointless for a race that already
// gives +1 to all six, so it isn't offered there.
export function canCustomizeRaceBonuses(race) {
  const pattern = getRaceBonusPattern(race);
  return pattern.length > 0 && pattern.length < ABILITY_SCORES.length;
}

// True once every bonus has its own, different ability.
export function isCustomRaceBonusComplete(pattern, picks = []) {
  const chosen = pattern.map((_, index) => picks[index]).filter(Boolean);
  return (
    chosen.length === pattern.length && new Set(chosen).size === chosen.length
  );
}

// Adds the race's bonus amounts to the abilities the player picked:
// picks[i] receives pattern[i].
export function applyCustomRaceBonuses(baseScores, pattern, picks = []) {
  const result = { ...baseScores };
  pattern.forEach((bonus, index) => {
    const ability = picks[index];
    if (ability) result[ability] = (result[ability] ?? 0) + bonus;
  });
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
    abilityScoreChoice: mergeAbilityScoreChoices(
      race.abilityScoreChoice,
      subrace.abilityScoreChoice,
    ),
    traits: [...(race.traits ?? []), ...(subrace.traits ?? [])],
  };
}

// Some Open5e subraces add their own "pick an ability" (Delver: STR or DEX).
// When race and subrace offer the same kind of pick (Gearforged's two +1s
// plus Human Chassis's one), they add up to one bigger pick.
function mergeAbilityScoreChoices(raceChoice, subraceChoice) {
  if (!subraceChoice) return raceChoice ?? null;
  if (!raceChoice) return subraceChoice;

  const sameOptions = (choice) =>
    choice.options.map((option) => `${option.ability}+${option.bonus}`).join();
  if (sameOptions(raceChoice) === sameOptions(subraceChoice)) {
    return {
      ...raceChoice,
      choose: raceChoice.choose + subraceChoice.choose,
    };
  }

  // No current race/subrace pair hits this; the subrace's pick wins.
  return subraceChoice;
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

function formatBonus(value) {
  return value === 0 ? "" : value > 0 ? `+${value}` : String(value);
}

// The numbers behind a weapon attack, so the sheet can both fill them in and
// explain them: to hit = ability modifier + proficiency bonus (if trained)
// + any magic bonus, and damage = the weapon's dice + the same modifier
// + the magic bonus. Melee weapons use STR, ranged use DEX, and finesse
// weapons use whichever is higher.
//
// When the character has no proficiencies listed at all (sheets made before
// creation filled them in), we can't tell whether they're trained, so the
// bonus is left out and proficiencyKnown is false so the hint can say so.
export function getWeaponAttackMath({
  weapon,
  scores,
  proficiencyNames = [],
  proficiencyBonus = 2,
  magicBonus = 0,
}) {
  const strengthScore = scores?.strength ?? 10;
  const dexterityScore = scores?.dexterity ?? 10;
  const strength = getAbilityModifier(strengthScore);
  const dexterity = getAbilityModifier(dexterityScore);
  const isFinesse = (weapon.properties ?? []).some(
    (property) => property.index === "finesse",
  );
  const reason =
    weapon.weapon_range === "Ranged"
      ? "ranged"
      : isFinesse
        ? "finesse"
        : "melee";
  const ability =
    reason === "ranged" || (reason === "finesse" && dexterity > strength)
      ? "dexterity"
      : "strength";
  const abilityMod = ability === "dexterity" ? dexterity : strength;
  const proficiencyKnown = proficiencyNames.length > 0;
  const proficient = isProficientWithWeapon(weapon, proficiencyNames);
  const bonus = Number(magicBonus || 0);
  const toHit = abilityMod + (proficient ? proficiencyBonus : 0) + bonus;
  const dice = weapon.damage?.damage_dice ?? "";

  return {
    weaponName: weapon.name,
    weaponCategory: weapon.weapon_category,
    reason,
    ability,
    abilityScore: ability === "dexterity" ? dexterityScore : strengthScore,
    abilityMod,
    proficiencyKnown,
    proficient,
    proficiencyBonus,
    magicBonus: bonus,
    toHit,
    damage: dice ? `${dice}${formatBonus(abilityMod + bonus)}` : "",
  };
}

function describeRoll(total) {
  return total >= 0
    ? `When you attack, roll a d20 and add ${total}.`
    : `When you attack, roll a d20 and subtract ${-total}.`;
}

// A plain-language breakdown of a weapon's to-hit number, one short line per
// part, pointing at the numbers already on the sheet so a beginner can see
// where each one comes from. Lines are separated by newlines.
export function describeToHitMath(math) {
  const abilityName = ABILITY_LABELS[math.ability];
  const abbreviation = ABILITY_ABBREVIATIONS[math.ability];
  const why =
    math.reason === "ranged"
      ? `${math.weaponName} is a ranged weapon, so it uses ${abilityName}.`
      : math.reason === "finesse"
        ? `${math.weaponName} can use Strength or Dexterity, so it uses your better one.`
        : `${math.weaponName} uses ${abilityName}.`;

  const lines = [
    describeRoll(math.toHit),
    `• ${formatModifier(math.abilityMod)} from your ${abilityName} (the ${formatModifier(math.abilityMod)} under ${abbreviation} ${math.abilityScore} on your sheet). ${why}`,
  ];

  if (math.proficient) {
    lines.push(
      `• ${formatModifier(math.proficiencyBonus)} proficiency bonus, because you're trained with this weapon.`,
    );
  } else if (math.proficiencyKnown) {
    lines.push(
      `• No proficiency bonus: your Proficiencies (Features tab) don't include this weapon.`,
    );
  } else {
    const category = math.weaponCategory
      ? `"${math.weaponCategory} Weapons"`
      : "your weapon proficiencies";
    lines.push(
      `• Not counted yet: your ${formatModifier(math.proficiencyBonus)} proficiency bonus. If your class is trained with this weapon, make it ${formatModifier(math.toHit + math.proficiencyBonus)}. Add ${category} to Proficiencies on the Features tab and the sheet will count it for you.`,
    );
  }

  if (math.magicBonus) {
    lines.push(`• ${formatModifier(math.magicBonus)} because it's magic.`);
  }

  lines.push(
    "If the total beats the target's Armor Class (AC), you hit. Change the number if your DM says otherwise.",
  );

  return lines.join("\n");
}

// Shown under To Hit before a known weapon is picked, with this character's
// own numbers.
export function describeToHitBasics({ scores, proficiencyBonus = 2 }) {
  const strength = formatModifier(getAbilityModifier(scores?.strength ?? 10));
  const dexterity = formatModifier(getAbilityModifier(scores?.dexterity ?? 10));

  return [
    "To Hit is what you add to a d20 when you attack. If the total beats the target's Armor Class (AC), you hit.",
    `• Melee weapons add your Strength (${strength}). Ranged weapons add your Dexterity (${dexterity}). Finesse weapons can use either.`,
    `• Add your proficiency bonus (${formatModifier(proficiencyBonus)}) if you're trained with the weapon.`,
    "Pick a weapon from the list and the sheet works this out for you.",
  ].join("\n");
}

// Reads a magic bonus out of a weapon name: "+1 Longsword" or
// "Longsword +2" gives the plain weapon name and the bonus.
export function splitMagicWeaponName(name) {
  const text = String(name ?? "").trim();
  const match = text.match(/(^|\s)\+([1-3])(\s|$)/);
  if (!match) return { baseName: text, magicBonus: 0 };
  return {
    baseName: text.replace(match[0], " ").replace(/\s+/g, " ").trim(),
    magicBonus: Number(match[2]),
  };
}

// Weapon attacks are saved as plain numbers (to hit +5, damage 1d8+3), so
// they don't follow the character on their own. When Strength, Dexterity or
// the proficiency bonus changes (an Ability Score Improvement, a new level),
// an attack whose numbers still match what QuestKeeper worked out from the
// old scores is worked out again. One the player typed or changed doesn't
// match, so it's left as it is. weaponDetailsFor(name): the weapon's SRD
// details, or null when it isn't known (then the attack is left alone too).
export function refreshWeaponAttacks(before, after, weaponDetailsFor) {
  if (!before || !after?.attacks?.length) return after;
  const modsOf = (sheet) => [
    getAbilityModifier(sheet.abilityScores?.strength ?? 10),
    getAbilityModifier(sheet.abilityScores?.dexterity ?? 10),
    getProficiencyBonus(sheet.level),
  ].join();
  if (modsOf(before) === modsOf(after)) return after;

  const proficiencyNames = (after.proficiencies ?? []).map((proficiency) => proficiency.name);
  let changed = false;
  const attacks = after.attacks.map((attack) => {
    const { baseName, magicBonus } = splitMagicWeaponName(attack.name);
    const weapon = weaponDetailsFor(baseName);
    if (!weapon?.damage?.damage_dice || !weapon.weapon_category) return attack;

    // Tried both ways, because an inventory weapon can be marked proficient
    // on its own without being in the Proficiencies list.
    for (const names of [proficiencyNames, [...proficiencyNames, weapon.name]]) {
      const math = (sheet) =>
        getWeaponAttackMath({
          weapon,
          scores: sheet.abilityScores,
          proficiencyNames: names,
          proficiencyBonus: getProficiencyBonus(sheet.level),
          magicBonus,
        });
      const old = math(before);
      if (Number(attack.toHit) !== old.toHit || attack.damage !== old.damage) continue;
      const fresh = math(after);
      if (fresh.toHit === old.toHit && fresh.damage === old.damage) return attack;
      changed = true;
      return { ...attack, toHit: fresh.toHit, damage: fresh.damage };
    }
    return attack;
  });
  return changed ? { ...after, attacks } : after;
}

// Turns the weapons a character starts with into rows for the Actions tab,
// with the to-hit and damage worked out from their ability scores.
export function buildStartingAttacks({
  gear = [],
  scores,
  proficiencyNames = [],
  proficiencyBonus = 2,
}) {
  return gear
    .filter((item) => item.damage?.damage_dice && item.weapon_category)
    .map((weapon) => {
      const math = getWeaponAttackMath({
        weapon,
        scores,
        proficiencyNames,
        proficiencyBonus,
      });

      return createAttack({
        name: weapon.name,
        toHit: math.toHit,
        damage: math.damage,
        damageType: weapon.damage.damage_type?.name ?? "",
        notes: describeWeaponNotes(weapon, weapon.quantity ?? 1),
      });
    });
}

// Inventory items that are SRD weapons but aren't on the Actions tab yet, so
// the sheet can offer to turn them into attacks. An attack counts as covering
// a weapon when its name contains the weapon's name, so "Night Terror
// Longsword" covers a plain "Longsword" in the inventory.
export function findInventoryWeapons(
  equipment = [],
  weapons = [],
  attacks = [],
) {
  const weaponsByName = new Map(
    weapons.map((weapon) => [weapon.name.toLowerCase(), weapon]),
  );
  const attackNames = attacks.map((attack) =>
    String(attack.name ?? "").toLowerCase(),
  );
  const seen = new Set();

  return equipment.flatMap((item) => {
    const name = String(item.name ?? "")
      .trim()
      .toLowerCase();
    const weapon = weaponsByName.get(name);
    if (!weapon || seen.has(name)) return [];
    seen.add(name);
    if (attackNames.some((attackName) => attackName.includes(name))) return [];
    return [{ item, weapon }];
  });
}

// "Common, Draconic" plus a reminder for any languages the player still has
// to pick (Half-Elf, Acolyte, and so on).
export function buildStartingLanguages({
  raceLanguages = [],
  raceChoices = 0,
  backgroundLanguages = [],
  backgroundChoices = 0,
  backgroundName,
}) {
  // Fixed languages from both race and background (e.g. Thieves' Cant).
  const known = [...raceLanguages, ...backgroundLanguages].map(
    (language) => language.name ?? language,
  );
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

// --- How many spells each level brings ------------------------------------------
// The "Spells Known" and "Cantrips Known" columns of the 2014 SRD class tables,
// for levels 1 to 20 (the first number is level 1). These are the same numbers
// the SRD's class level data carries; they're kept here so the level-up can
// work out its steps straight away, without waiting on a lookup.
// Classes that "know" a set number of spells:
const SPELLS_KNOWN_BY_LEVEL = {
  bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
};

// Every class with cantrips. Paladins and Rangers have none.
const CANTRIPS_KNOWN_BY_LEVEL = {
  bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
};

// A Wizard copies two new spells into their spellbook every level.
const WIZARD_SPELLBOOK_SPELLS_PER_LEVEL = 2;

// Whether a spell on the sheet counts toward the class's spells (or cantrips)
// known. Spells from a race (Tiefling's Thaumaturgy), and ones the player
// ticked "Doesn't count toward spells known" (a Fey Wanderer's Misty Step, a
// Ranger's Primal Awareness spells), are extras on top of the class's number.
export function countsTowardSpellsKnown(spell) {
  return !spell?.bonusSpell && !spell?.grantedBy;
}

// What the spell step of a level-up offers, for any class:
//   cantrips   - how many new cantrips to pick
//   spells     - how many new leveled spells to pick (spellbook spells for a Wizard)
//   canSwap    - whether they may swap one spell they know for another
//   isSpellbook - true for a Wizard (the picks go in the spellbook)
//   isEstimate - true for a homebrew class, which has no spells-known table
//                here, so the one spell offered is a guess the player can skip
// Picks are "the class's number at the new level minus what the sheet already
// counts", so a sheet that is short catches up and one that is over (from an
// older version of the app) isn't pushed further over.
export function getLevelUpSpellPlan(characterClass, spellcasting, targetLevel) {
  const none = { cantrips: 0, spells: 0, canSwap: false, isSpellbook: false, isEstimate: false };
  const { id, type } = classRules(characterClass);
  if (!type) return none;

  const maxSpellLevel = getMaxSpellLevel(characterClass, targetLevel);
  const counted = (list) => (list ?? []).filter(countsTowardSpellsKnown).length;
  const countedCantrips = counted(spellcasting?.cantripsKnown);
  const countedSpells = counted(spellcasting?.spellsKnown);
  const fromTable = (table, have) =>
    table ? Math.max(0, table[Math.min(20, targetLevel) - 1] - have) : 0;

  const cantrips = fromTable(CANTRIPS_KNOWN_BY_LEVEL[id], countedCantrips);

  if (id === "wizard") {
    return {
      ...none,
      cantrips,
      spells: maxSpellLevel > 0 ? WIZARD_SPELLBOOK_SPELLS_PER_LEVEL : 0,
      isSpellbook: true,
    };
  }

  // Clerics, Druids and Paladins prepare from their whole list each day, so
  // there is nothing to "learn" beyond new cantrips.
  if (type !== "known") return { ...none, cantrips };

  const knownTable = SPELLS_KNOWN_BY_LEVEL[id];
  // Homebrew "known" casters: one new spell per level once they have slots.
  const spells = knownTable
    ? fromTable(knownTable, countedSpells)
    : maxSpellLevel > 0
      ? 1
      : 0;

  return {
    ...none,
    cantrips,
    spells,
    // Each level, a known caster may trade one spell they know for another.
    canSwap: maxSpellLevel > 0 && countedSpells > 0,
    isEstimate: !knownTable,
  };
}

// The levels (2 and up) where an SRD class picks a feature option: Fighting
// Style, Expertise, Metamagic, Pact Boon, Eldritch Invocations, or a Ranger's
// extra Favored Enemy and terrain. Kept as a table, like the spells-known
// tables, so the wizard knows how many steps there are before anything loads.
// Level 1 picks are made at creation. Homebrew classes aren't listed, since
// their features don't say what they ask for.
const CLASS_FEATURE_CHOICE_LEVELS = {
  bard: [3, 10],
  paladin: [2],
  ranger: [2, 6, 10, 14],
  rogue: [6],
  sorcerer: [3, 10, 17],
  warlock: [2, 3, 5, 7, 9, 12, 15, 18],
};
// Subclass picks: the Champion's Additional Fighting Style.
const SUBCLASS_FEATURE_CHOICE_LEVELS = {
  champion: [10],
};

export function hasLevelUpFeatureChoices(characterClass, level) {
  const classLevels = CLASS_FEATURE_CHOICE_LEVELS[characterClass?.id] ?? [];
  const subclassLevels = SUBCLASS_FEATURE_CHOICE_LEVELS[characterClass?.subclass?.id] ?? [];
  return classLevels.includes(level) || subclassLevels.includes(level);
}

export function getLevelUpStepKeys(targetLevel, characterClass, spellcasting = null) {
  const steps = ["hitPoints"];

  if (getSubclassLevel(characterClass) === targetLevel) {
    steps.push("subclass");
  }

  if (ABILITY_SCORE_IMPROVEMENT_LEVELS.includes(targetLevel)) {
    steps.push("abilityOrFeat");
  }

  // Fighting Style, Expertise and the like come before spells, so a Pact of
  // the Tome or a new Invocation is known when spells are picked.
  if (hasLevelUpFeatureChoices(characterClass, targetLevel)) {
    steps.push("features");
  }

  // Only when this level brings a spell choice: a Ranger at 4 has no new
  // spells but may still swap one; a Paladin never learns spells.
  const plan = getLevelUpSpellPlan(characterClass, spellcasting, targetLevel);
  if (plan.cantrips > 0 || plan.spells > 0 || plan.canSwap) {
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

// An Ability Score Improvement can't raise a score above 20.
export const MAX_ABILITY_SCORE = 20;

// Whether an ability can take this much of an increase without passing 20.
export function canIncreaseAbility(score, amount) {
  return (score ?? 0) + amount <= MAX_ABILITY_SCORE;
}

export function applyAbilityScoreChoice(abilityScores, choice) {
  if (!choice) return { ...abilityScores };

  const result = { ...abilityScores };
  const raise = (ability, amount) => {
    result[ability] = Math.min(
      MAX_ABILITY_SCORE,
      (result[ability] ?? 0) + amount,
    );
  };

  if (choice.type === "asi-one") {
    raise(choice.ability, 2);
  }

  if (choice.type === "asi-two") {
    choice.abilities.forEach((ability) => raise(ability, 1));
  }

  return result;
}

// One spell picked on level-up, in the shape the sheet stores. A book spell
// has no SRD index, so it gets a made-up one (like Add Spell on the Spells
// tab), and keeps its book link if it has a safe one.
function toSpellEntry(choice) {
  const link = getSafeSpellLink(choice.link);
  return {
    index: choice.index ?? crypto.randomUUID(),
    name: choice.name,
    level: choice.level,
    notes: "",
    components: choice.components ?? "",
    ...(link ? { link } : {}),
  };
}

// Turns a "Book spell instead" pick from the level-up wizard into a spell
// choice, or null if it isn't finished yet. Only the name, level, components
// and a link are kept: the book's own text never goes on the sheet. Cantrip
// slots are always level 0; spell slots must be 1 up to the highest level the
// class can cast at the new level. A link must be a web link so it can't run
// code; a blank link is fine.
export function getBookSpellChoice(draft, { isCantrip = false, maxSpellLevel = 0 } = {}) {
  const name = String(draft?.name ?? "").trim();
  if (!name) return null;

  const level = isCantrip ? 0 : Number(draft?.level);
  if (!isCantrip && (!Number.isInteger(level) || level < 1 || level > maxSpellLevel)) {
    return null;
  }

  const typedLink = String(draft?.link ?? "").trim();
  const link = getSafeSpellLink(typedLink);
  if (typedLink && !link) return null;

  return {
    name,
    level,
    components: String(draft?.components ?? "").trim(),
    ...(link ? { link } : {}),
  };
}

// Applies the spell step's choices: new cantrips, new spells, and an optional
// swap ({ removeIndex, add }) that trades one known spell for another.
// Older saved level-ups held a single { spellIndex, spellName, spellLevel }.
export function applyLevelUpSpellChoices(spellcasting, characterClass, choices) {
  const base = spellcasting ?? {
    type: getSpellcastingType(characterClass) ?? "known",
    cantripsKnown: [],
    spellsKnown: [],
  };
  if (!choices) return base;

  const picks = choices.spellIndex
    ? [{
        index: choices.spellIndex,
        name: choices.spellName,
        level: choices.spellLevel,
        components: choices.components,
      }]
    : [...(choices.cantrips ?? []), ...(choices.spells ?? [])];

  let cantripsKnown = [...(base.cantripsKnown ?? [])];
  let spellsKnown = [...(base.spellsKnown ?? [])];

  const swap = choices.swap;
  if (swap?.removeIndex && swap.add) {
    spellsKnown = spellsKnown.filter((spell) => spell.index !== swap.removeIndex);
    picks.push(swap.add);
  }

  picks.forEach((choice) => {
    if (choice.level === 0) cantripsKnown = [...cantripsKnown, toSpellEntry(choice)];
    else spellsKnown = [...spellsKnown, toSpellEntry(choice)];
  });

  return { ...base, cantripsKnown, spellsKnown };
}

// Hit points from a level-up: the roll (or average) plus the Constitution
// modifier, at least 1. If this level's Ability Score Improvement raises the
// CON modifier, the new modifier counts for this level, and the rules say it
// counts for every earlier level too: +1 HP per earlier level for each +1.
export function getLevelUpHitPointGain(sheet, steps = []) {
  const hpStep = steps.find((step) => step.key === "hitPoints");
  const abilityStep = steps.find((step) => step.key === "abilityOrFeat");
  const oldModifier = getAbilityModifier(sheet.abilityScores.constitution);
  const newScores = abilityStep?.data
    ? applyAbilityScoreChoice(sheet.abilityScores, abilityStep.data)
    : sheet.abilityScores;
  const conModifier = getAbilityModifier(newScores.constitution);
  const thisLevel = Math.max(1, (hpStep?.data?.amount ?? 0) + conModifier);
  const earlierLevels = (conModifier - oldModifier) * (sheet.level ?? 0);
  return { total: thisLevel + earlierLevels, thisLevel, earlierLevels, conModifier };
}

export function finalizeLevelUp(sheet) {
  const { pendingLevelUp } = sheet;
  if (!pendingLevelUp) return sheet;

  const abilityStep = pendingLevelUp.steps.find(
    (s) => s.key === "abilityOrFeat",
  );

  const spellStep = pendingLevelUp.steps.find((s) => s.key === "spells");
  const subclassStep = pendingLevelUp.steps.find((s) => s.key === "subclass");
  const featureStep = pendingLevelUp.steps.find((s) => s.key === "features");

  const hpGained = getLevelUpHitPointGain(sheet, pendingLevelUp.steps).total;

  const abilityScores = abilityStep
    ? applyAbilityScoreChoice(sheet.abilityScores, abilityStep.data)
    : sheet.abilityScores;

  const characterClass = subclassStep?.data
    ? { ...sheet.class, subclass: subclassStep.data }
    : sheet.class;

  const spellcastingAfterSpellStep = spellStep?.data
    ? applyLevelUpSpellChoices(sheet.spellcasting, sheet.class, spellStep.data)
    : sheet.spellcasting;

  const spellcasting = getSpellcastingType(characterClass)
    ? applySpellSlotProgression(
        spellcastingAfterSpellStep,
        characterClass,
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

  // The feature step's picks: the chosen Fighting Style, Invocations and so
  // on go on as features, and Expertise doubles those skills' bonus.
  const features = featureStep?.data?.features?.length
    ? [...(sheet.features ?? []), ...featureStep.data.features.map(createFeat)]
    : sheet.features;
  const expertisePicks = featureStep?.data?.expertise ?? [];
  const skillExpertise = expertisePicks.length
    ? {
        ...(sheet.skillExpertise ?? {}),
        ...Object.fromEntries(expertisePicks.map((skill) => [skill, true])),
      }
    : sheet.skillExpertise;

  return {
    ...sheet,
    level: pendingLevelUp.targetLevel,
    class: characterClass,
    abilityScores,
    spellcasting,
    feats,
    ...(features ? { features } : {}),
    ...(skillExpertise ? { skillExpertise } : {}),
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

  // Spells that are new after the level-up, and any swapped out, matched by
  // their index so a swap shows as one out and one in.
  const allSpells = (sheet) => [
    ...(sheet.spellcasting?.cantripsKnown ?? []),
    ...(sheet.spellcasting?.spellsKnown ?? []),
  ];
  const beforeIndexes = new Set(allSpells(before).map((spell) => spell.index));
  const afterIndexes = new Set(allSpells(after).map((spell) => spell.index));
  const newSpells = allSpells(after).filter((spell) => !beforeIndexes.has(spell.index));
  const removedSpells = allSpells(before).filter((spell) => !afterIndexes.has(spell.index));

  // Features that are new (picked in the wizard or added for the new level),
  // and skills that gained Expertise.
  const beforeFeatures = new Set((before.features ?? []).map((feature) => feature.index));
  const newFeatures = (after.features ?? []).filter((feature) => !beforeFeatures.has(feature.index));
  const newExpertise = SKILLS.filter(
    (skill) => after.skillExpertise?.[skill.index] && !before.skillExpertise?.[skill.index],
  ).map((skill) => skill.name);

  return {
    fromLevel: before.level,
    toLevel: after.level,
    hpGained: after.combat.hitPoints.max - before.combat.hitPoints.max,
    fromProficiency: getProficiencyBonus(before.level),
    toProficiency: getProficiencyBonus(after.level),
    abilityChanges,
    newFeat,
    newSubclass,
    newSpells,
    removedSpells,
    newFeatures,
    newExpertise,
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
    abilityScores: createCompanionAbilityScores(),
    notes: "",
    // [{ id, name, toHit, damage, damageType, notes }], rolled on Actions.
    attacks: [],
  };
}

// The companion's notes as a bulleted list: [{ id, text }]. Companions saved
// before the list existed have one block of text instead (`notes`, and for
// freeform companions the sheet's `companion` text); each of its lines
// becomes a bullet, with any "-", "*" or "•" at the start dropped.
export function getCompanionNotes(creature, freeformText = "") {
  if (Array.isArray(creature?.noteList)) return creature.noteList;

  return [creature?.notes, freeformText]
    .filter(Boolean)
    .join("\n")
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((text, index) => ({ id: `note-${index}`, text }));
}

// A companion's saving throw bonus for one ability. Stat blocks list only
// the saves that are better than the plain modifier ("Saving Throws Dex +5"),
// so that's all a player types; every other save is just the modifier.
export function getCompanionSave(creature, ability) {
  const saved = creature?.savingThrows?.[ability];
  if (typeof saved === "number") return saved;
  return getAbilityModifier(createCompanionAbilityScores(creature?.abilityScores)[ability]);
}

// A companion's STR through CHA. Every score starts at 10 (a +0 modifier).
// Companions made before scores existed have none saved, so this also fills
// in 10 for any that are missing.
export function createCompanionAbilityScores(saved = {}) {
  return Object.fromEntries(ABILITY_SCORES.map((ability) => [ability, saved?.[ability] ?? 10]));
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

  // A long rest also gives back half your Hit Dice (at least one).
  const hitDice =
    restType === "long" && sheet.combat.hitDice
      ? {
          ...sheet.combat.hitDice,
          remaining: Math.min(
            Number(sheet.combat.hitDice.total) || 0,
            getHitDiceRemaining(sheet.combat.hitDice) +
              getLongRestHitDice(sheet.combat.hitDice),
          ),
        }
      : sheet.combat.hitDice;

  // A long rest heals the companion (a mount, a familiar) to full too; it
  // rests along with its character.
  const companionCreature =
    restType === "long" && sheet.companionCreature?.hitPoints
      ? {
          ...sheet.companionCreature,
          hitPoints: {
            ...sheet.companionCreature.hitPoints,
            current: sheet.companionCreature.hitPoints.max ?? sheet.companionCreature.hitPoints.current,
          },
        }
      : sheet.companionCreature;

  return {
    ...sheet,
    resources,
    spellcasting,
    ...(companionCreature ? { companionCreature } : {}),
    // A long rest also takes away one level of exhaustion.
    ...(restType === "long" && sheet.conditions
      ? { conditions: afterLongRest(sheet.conditions) }
      : {}),
    combat: {
      ...sheet.combat,
      hitPoints,
      hitDice,
    },
  };
}

// How many Hit Dice are left to spend. Older sheets never tracked this, so
// a missing value means all of them.
export function getHitDiceRemaining(hitDice) {
  const total = Number(hitDice?.total) || 0;
  const remaining =
    hitDice?.remaining === undefined || hitDice?.remaining === null
      ? total
      : Number(hitDice.remaining) || 0;
  return Math.max(0, Math.min(total, remaining));
}

// A long rest gives back half your total Hit Dice, rounded down, minimum 1.
export function getLongRestHitDice(hitDice) {
  const total = Number(hitDice?.total) || 0;
  return total > 0 ? Math.max(1, Math.floor(total / 2)) : 0;
}

// A short rest: spend Hit Dice to heal (each die roll + CON modifier, never
// less than 0), then refill short-rest resources (and a Warlock's slots).
// `rolls` are the results of the dice spent. Returns the new sheet and a
// summary the page can show.
export function takeShortRest(sheet, rolls = []) {
  const hitDice = sheet.combat.hitDice ?? { total: 0, remaining: 0 };
  const remaining = getHitDiceRemaining(hitDice);
  const used = rolls.slice(0, remaining);
  const con = getAbilityModifier(sheet.abilityScores?.constitution ?? 10);
  const healing = used.reduce((sum, roll) => sum + Math.max(0, roll + con), 0);
  const before = sheet.combat.hitPoints.current;
  const hitPoints = setCurrentHp(sheet.combat.hitPoints, before + healing);

  const rested = applyRest(
    {
      ...sheet,
      combat: {
        ...sheet.combat,
        hitPoints,
        hitDice: { ...hitDice, remaining: remaining - used.length },
      },
    },
    "short",
  );

  return {
    sheet: rested,
    summary: {
      rolls: used,
      con,
      healed: hitPoints.current - before,
      hpBefore: before,
      hpAfter: hitPoints.current,
      hitDiceLeft: remaining - used.length,
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

// source: where it came from when it was added from the SRD or homebrew
// ({ type: "race" | "subrace" | "class" | "subclass", id, key, level }).
// Typed-in features have none.
// choices: picks it asks for (see featureChoices.js), saved with it.
// A feature or feat for the sheet. A book option typed in on level-up keeps
// a link to where it's written up (web links only), never the book's text.
export function createFeat({ name, description, source = null, choices = null, link = "" }) {
  const safeLink = getSafeSpellLink(link);
  return {
    index: crypto.randomUUID(),
    name,
    description: description || "",
    ...(source ? { source } : {}),
    ...(choices?.length ? { choices } : {}),
    ...(safeLink ? { link: safeLink } : {}),
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

// A spell added by hand on the Spells tab. It can be an SRD spell or any typed
// name, with an optional link to where the book's text lives (never the text
// itself). "bonusSpell" marks one that doesn't count toward spells known,
// like a subclass's always-known spells.
export function addManualSpell(sheet, { name, level, notes, components, bonusSpell, link }) {
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
    ...(bonusSpell ? { bonusSpell: true } : {}),
    ...(link ? { link } : {}),
  };

  if (numericLevel === 0) {
    return { ...base, cantripsKnown: [...base.cantripsKnown, entry] };
  }

  return { ...base, spellsKnown: [...base.spellsKnown, entry] };
}

// Only web links can be opened from a spell, so a typed "javascript:" can't run.
export function getSafeSpellLink(link) {
  const trimmed = String(link ?? "").trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
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

export function getSpellSlotProgression(classRef, level) {
  const clampedLevel = Math.max(1, Math.min(20, level));
  const emptyRows = () =>
    Array.from({ length: 9 }, (_, i) => ({ level: i + 1, max: 0 }));
  const { progression } = classRules(classRef);

  if (progression === "pact") {
    const { slots, slotLevel } = WARLOCK_PACT_MAGIC_TABLE[clampedLevel];
    return emptyRows().map((row) =>
      row.level === slotLevel ? { ...row, max: slots } : row,
    );
  }

  // Half casters: Paladins and Rangers from level 2; "half-early" (like the
  // Artificer) the same table but starting at level 1.
  if (progression === "half" || progression === "half-early") {
    if (progression === "half" && clampedLevel < 2) return emptyRows();
    const row = FULL_CASTER_SLOT_TABLE[Math.ceil(clampedLevel / 2)];
    return row.map((max, i) => ({ level: i + 1, max }));
  }

  if (progression === "full") {
    const row = FULL_CASTER_SLOT_TABLE[clampedLevel];
    return row.map((max, i) => ({ level: i + 1, max }));
  }

  return emptyRows();
}

// The highest spell level a class can cast at a character level, read from its
// slot table: a level 5 Wizard gets 3, a level 5 Paladin 2. 0 = cantrips only.
export function getMaxSpellLevel(classRef, level) {
  const withSlots = getSpellSlotProgression(classRef, level).filter((row) => row.max > 0);
  return withSlots.length ? withSlots[withSlots.length - 1].level : 0;
}

// When a class's own spellcasting hasn't started at this level (Paladins and
// Rangers get theirs at 2): { className, level }. Null when it already has,
// or when the class has no spell slots at all.
export function getSpellsStartAt(classRef, level) {
  if (getMaxSpellLevel(classRef, level) > 0) return null;
  for (let next = (level ?? 1) + 1; next <= 20; next += 1) {
    if (getMaxSpellLevel(classRef, next) > 0) {
      return { className: classRef?.name ?? "Your class", level: next };
    }
  }
  return null;
}

export function applySpellSlotProgression(spellcasting, classRef, level) {
  const progression = getSpellSlotProgression(classRef, level);
  const base = spellcasting ?? {
    type: getSpellcastingType(classRef) ?? "known",
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
