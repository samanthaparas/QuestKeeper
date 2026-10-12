// "Use as a starting point": a homebrew form filled in from an open-licensed
// option (SRD 5.1 or Open5e), so a player can make their own version by
// changing a few things instead of typing it all. Unlike the published
// books, these rules are free to copy, so everything comes across, text
// included. Which entries qualify: startFromFor in homebrewMappers.js.

import {
  getBackgroundDetails,
  getFeatureDetails,
  getSubclassDetails,
  getSubclassFeatures,
  getSubraceDetails,
  getSubraceTraits,
  getTraitDetails,
} from "./api";
import { loadRaceDetails } from "./srdDetails";
import { SKILLS } from "./characterSheet";

// ["Line one", "Line two"] or "text" -> "Line one\n\nLine two"
function joinText(desc) {
  return (Array.isArray(desc) ? desc : [desc]).filter(Boolean).join("\n\n");
}

function bonusesFrom(list = []) {
  const bonuses = {};
  for (const item of list) {
    const key = item.ability_score?.index;
    if (key && item.bonus) bonuses[key] = item.bonus;
  }
  return bonuses;
}

// The SRD's "pick 2 abilities for +1" (a Half-Elf), when there is one.
function abilityChoiceFrom(options) {
  const choices = options?.from?.options ?? [];
  if (!options?.choose || choices.length === 0) return null;
  return {
    choose: options.choose,
    bonus: choices[0].bonus ?? 1,
    from: choices.map((option) => option.ability_score?.index).filter(Boolean),
  };
}

// Trait refs -> { name, description }, fetching any text that isn't loaded.
async function traitsWithText(traits = [], loaded = []) {
  if (loaded.length > 0) {
    return loaded.map((trait) => ({ name: trait.name, description: joinText(trait.desc) }));
  }
  const results = await Promise.allSettled(traits.map((trait) => getTraitDetails(trait.index)));
  return traits.map((trait, position) => ({
    name: trait.name,
    description: results[position].status === "fulfilled" ? joinText(results[position].value?.desc) : "",
  }));
}

function shared(data, category) {
  return {
    category,
    name: `${data.name} (my version)`,
    basedOn: data.source ?? "SRD 5.1",
    linkUrl: "",
    summary: "",
  };
}

async function startRace(index) {
  const race = await loadRaceDetails(index);
  return {
    ...shared(race, "race"),
    data: {
      speed: race.speed ?? 30,
      size: race.size ?? "Medium",
      abilityBonuses: bonusesFrom(race.ability_bonuses),
      abilityChoice: abilityChoiceFrom(race.ability_bonus_options),
      languages: (race.languages ?? []).map((language) => language.name).join(", "),
      languageChoices: race.language_options?.choose ?? 0,
      traits: await traitsWithText(race.traits, race.traitDetails),
    },
  };
}

async function startSubrace(index) {
  const [subrace, traitRefs] = await Promise.all([
    getSubraceDetails(index),
    getSubraceTraits(index).catch(() => []),
  ]);
  return {
    ...shared(subrace, "subrace"),
    summary: joinText(subrace.desc),
    data: {
      parentRace: subrace.race?.index ?? "",
      parentRaceName: subrace.race?.name ?? "",
      abilityBonuses: bonusesFrom(subrace.ability_bonuses),
      abilityChoice: null,
      traits: await traitsWithText(subrace.racial_traits ?? traitRefs, subrace.traitDetails),
    },
  };
}

const SKILL_BY_NAME = Object.fromEntries(SKILLS.map((skill) => [skill.name.toLowerCase(), skill.index]));

// "Skill: Insight" -> "insight"
function skillIndex(proficiency) {
  const name = String(proficiency?.name ?? "").replace(/^skill:\s*/i, "").toLowerCase();
  return SKILL_BY_NAME[name] ?? null;
}

async function startBackground(index) {
  const background = await getBackgroundDetails(index, "2014");
  const proficiencies = background.starting_proficiencies ?? [];
  const skills = proficiencies.map(skillIndex).filter(Boolean).slice(0, 4);
  const tools = proficiencies.filter((item) => !skillIndex(item)).map((item) => item.name);
  const choiceSkills = (background.skill_choice?.options ?? []).map(skillIndex).filter(Boolean);
  const gear = (background.starting_equipment ?? []).map(
    (item) => `${item.equipment.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`,
  );

  return {
    ...shared(background, "background"),
    summary: joinText(background.desc),
    data: {
      skills,
      skillChoice:
        choiceSkills.length > 0 ? { choose: background.skill_choice.choose ?? 1, from: choiceSkills } : null,
      languages: (background.languages ?? []).map((language) => language.name).join(", "),
      languageChoices: background.language_options?.choose ?? 0,
      tools: background.tool_proficiencies_description || tools.join(", "),
      equipment: background.equipment_description || gear.join(", "),
      feature: {
        name: background.feature?.name ?? "",
        description: joinText(background.feature?.desc),
      },
    },
  };
}

async function startSubclass(index) {
  const subclass = await getSubclassDetails(index);
  // Open5e subclasses include their features; the SRD's are fetched one by one.
  let features = subclass.features ?? [];
  if (features.length === 0) {
    const refs = await getSubclassFeatures(index).catch(() => []);
    const results = await Promise.allSettled(refs.map((ref) => getFeatureDetails(ref.index)));
    features = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  }

  return {
    ...shared(subclass, "subclass"),
    summary: joinText(subclass.desc),
    data: {
      parentClass: subclass.class?.index ?? "",
      features: features
        .map((feature) => ({
          name: feature.name,
          level: feature.level ?? 1,
          description: joinText(feature.desc),
        }))
        .sort((a, b) => a.level - b.level),
    },
  };
}

const STARTERS = {
  race: startRace,
  subrace: startSubrace,
  background: startBackground,
  subclass: startSubclass,
};

// { category, name, basedOn, linkUrl, summary, data }: what the homebrew
// form opens with (the same shape as "Make it as homebrew" uses).
export function loadHomebrewStart(category, index) {
  return STARTERS[category](index);
}
