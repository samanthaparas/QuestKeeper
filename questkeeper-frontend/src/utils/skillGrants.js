// Skills a race or subrace grants: fixed ones (an Elf's Keen Senses gives
// Perception) and choices (a Half-Elf's Skill Versatility: any 2 skills).
// In the SRD these live on the race's traits; homebrew races and subraces
// carry them directly. One "grant" per source:
//   { id, from, fixed: [{ index, name }], choose, options: [{ index, name }] }

import { getTraitDetails } from "./api";
import { SKILLS } from "./characterSheet";

const SKILL_NAMES = Object.fromEntries(SKILLS.map((skill) => [skill.index, skill.name]));

// "skill-perception" (or { index: "skill-perception" }) -> { index, name }
function toSkill(ref) {
  const raw = typeof ref === "string" ? ref : ref?.index ?? ref?.item?.index;
  const index = raw?.replace(/^skill-/, "");
  return index && SKILL_NAMES[index] ? { index, name: SKILL_NAMES[index] } : null;
}

function cleanSkills(refs = []) {
  const seen = new Set();
  return refs.map(toSkill).filter((skill) => skill && !seen.has(skill.index) && seen.add(skill.index));
}

// From an SRD trait: { proficiencies, proficiency_choices }.
export function grantFromTrait(trait, owner) {
  const fixed = cleanSkills(trait?.proficiencies);
  const choice = trait?.proficiency_choices;
  const options = cleanSkills(choice?.from?.options ?? []);
  const choose = options.length > 0 ? Math.min(choice?.choose ?? 0, options.length) : 0;
  if (fixed.length === 0 && choose === 0) return null;
  return { id: `trait:${trait.index}`, from: `${owner} (${trait.name})`, fixed, choose, options };
}

// From a homebrew race or subrace: starting_proficiencies and skill_choice
// (the same shape homebrew backgrounds use).
export function grantFromHomebrew(raw, owner) {
  const fixed = cleanSkills(raw?.starting_proficiencies);
  const options = cleanSkills(raw?.skill_choice?.options ?? []);
  const choose = options.length > 0 ? Math.min(raw?.skill_choice?.choose ?? 0, options.length) : 0;
  if (fixed.length === 0 && choose === 0) return null;
  return { id: `homebrew:${raw.index}`, from: owner, fixed, choose, options };
}

// Every skill grant from the chosen race and subrace. Traits that can't be
// looked up are skipped (the rest still count).
export async function loadRaceSkillGrants({ raceRaw, subraceRaw }) {
  const sources = [
    [raceRaw, raceRaw?.traits],
    [subraceRaw, subraceRaw?.racial_traits],
  ].filter(([raw]) => raw);

  const grants = await Promise.all(
    sources.map(async ([raw, traitRefs]) => {
      const own = grantFromHomebrew(raw, raw.name);
      const looked = await Promise.allSettled((traitRefs ?? []).map((ref) => getTraitDetails(ref.index)));
      const fromTraits = looked
        .filter((result) => result.status === "fulfilled")
        .map((result) => grantFromTrait(result.value, raw.name));
      return [own, ...fromTraits];
    }),
  );
  return grants.flat().filter(Boolean);
}

// Every skill the new character will have, with where each came from, and
// no skill counted twice. picks: { [grantId]: [{ index, name }] }.
export function collectSkills({ background, backgroundSkills = [], classSkills = [], raceGrants = [], racePicks = {}, className }) {
  const skills = new Map();
  const add = (skill, from) => {
    if (skill && !skills.has(skill.index)) skills.set(skill.index, { ...skill, from });
  };
  (background?.skillProficiencies ?? []).forEach((skill) => add(skill, background.name));
  backgroundSkills.forEach((skill) => add(skill, background?.name));
  raceGrants.forEach((grant) => {
    grant.fixed.forEach((skill) => add(skill, grant.from));
    (racePicks[grant.id] ?? []).forEach((skill) => add(skill, grant.from));
  });
  classSkills.forEach((skill) => add(skill, className));
  return [...skills.values()];
}

// How many racial skill picks are still missing, per grant.
export function missingRacePicks(raceGrants = [], racePicks = {}) {
  return raceGrants
    .filter((grant) => grant.choose > 0)
    .map((grant) => ({ grant, missing: grant.choose - (racePicks[grant.id]?.length ?? 0) }))
    .filter(({ missing }) => missing > 0);
}
