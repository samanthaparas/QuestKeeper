import {
  getSubclassLevel,
  getSubraceCantripTraitId,
  getSpellcastingType,
} from "./characterSheet";

// Optional pictures for the Tips card on each step. To add one, put an image
// in questkeeper-frontend/public/creation-art/ and list it here, for example:
//   abilities: "/creation-art/abilities.png",
// Steps without an entry just show their tips.
export const CREATION_STEP_ART = {};

// Background comes before skills so the skills step can grey out any skill
// the background already grants.
export const CREATION_STEP_GROUPS = [
  { label: "Name & Idea", steps: ["name"] },
  { label: "Ancestry", steps: ["race", "subrace", "subraceCantrip"] },
  { label: "Class & Role", steps: ["class", "subclass"] },
  { label: "Background", steps: ["background"] },
  { label: "Skills", steps: ["classSkills"] },
  { label: "Magic", steps: ["classSpells"] },
  { label: "Abilities", steps: ["abilities"] },
  { label: "Gear", steps: ["equipment"] },
  { label: "Review", steps: ["review"] },
];

// Paladin and Ranger are spellcasters but have no spells until level 2.
const NO_LEVEL_ONE_SPELLS = new Set(["paladin", "ranger"]);

// Only show the steps that apply to this character, so nobody has to click
// through a screen that says "nothing to do here".
export function getVisibleSteps({
  raceRaw,
  subrace,
  characterClass,
  hasEquipmentChoices = false,
} = {}) {
  const steps = ["name", "race"];

  if ((raceRaw?.subraces?.length ?? 0) > 0) steps.push("subrace");
  if (getSubraceCantripTraitId(subrace?.id)) steps.push("subraceCantrip");

  steps.push("class");
  if (getSubclassLevel(characterClass) === 1) steps.push("subclass");

  steps.push("background", "classSkills");

  if (
    getSpellcastingType(characterClass) &&
    !NO_LEVEL_ONE_SPELLS.has(characterClass?.id)
  ) {
    steps.push("classSpells");
  }

  steps.push("abilities");
  // Most classes offer either/or starting gear ("chain mail or leather armor").
  if (hasEquipmentChoices) steps.push("equipment");
  steps.push("review");
  return steps;
}

// A step's address (?step=subrace) can outlive the choices behind it: cancel a
// character, press Back, and the old address comes back with nothing chosen.
// This keeps the page on the earliest step whose answer is still missing
// (the name, race, class or background) when the address asks for one later,
// or for a step this character doesn't have at all.
export function reachableStep(requested, { steps, name, race, characterClass, background }) {
  const needed = [
    ["name", Boolean(name?.trim())],
    ["race", Boolean(race)],
    ["class", Boolean(characterClass)],
    ["background", Boolean(background)],
  ];
  const firstMissing = needed.find(([, done]) => !done)?.[0];
  const askedFor = steps.indexOf(requested);
  if (askedFor === -1) return firstMissing ?? "review";
  if (firstMissing && askedFor > steps.indexOf(firstMissing)) return firstMissing;
  return requested;
}

// What is still missing before a character can be created, so the Review page
// can point at each gap instead of letting an incomplete sheet through. Each
// issue names the step that fixes it.
export function getReviewIssues({
  steps,
  race,
  subrace,
  subraceCantrip,
  characterClass,
  subclass,
  background,
  classSkills = [],
  backgroundSkills = [],
  // Racial skill choices still to make: [{ grant: { from }, missing }].
  raceSkillGaps = [],
  spellChoices,
  abilityScores,
  equipmentChosen = false,
}) {
  const issues = [];
  const add = (step, message) => issues.push({ step, message });

  if (!race) add("race", "Choose a race");
  if (steps.includes("subrace") && !subrace) add("subrace", "Choose a subrace");
  if (steps.includes("subraceCantrip") && !subraceCantrip) {
    add("subraceCantrip", "Choose your free cantrip");
  }
  if (!characterClass) add("class", "Choose a class");
  if (steps.includes("subclass") && !subclass) add("subclass", "Choose a subclass");
  if (!background) add("background", "Choose a background");

  const skillsNeeded = characterClass?.skillChoice?.choose ?? 0;
  if (characterClass && classSkills.length < skillsNeeded) {
    const missing = skillsNeeded - classSkills.length;
    add("classSkills", `Choose ${missing} more skill${missing === 1 ? "" : "s"}`);
  }

  // Backgrounds like Innkeeper add their own skill pick on the Skills step.
  const backgroundNeeded = background?.skillChoice?.choose ?? 0;
  if (background && backgroundSkills.length < backgroundNeeded) {
    add("classSkills", `Choose your ${background.name} skill`);
  }

  // A Half-Elf's Skill Versatility and the like, also picked on the Skills step.
  raceSkillGaps.forEach(({ grant, missing }) => {
    add("classSkills", `Choose ${missing} more ${grant.from} skill${missing === 1 ? "" : "s"}`);
  });

  if (steps.includes("classSpells") && !spellChoices) {
    add("classSpells", "Choose your starting spells");
  }
  if (!abilityScores) add("abilities", "Assign your ability scores");
  if (steps.includes("equipment") && !equipmentChosen) {
    add("equipment", "Choose your starting gear");
  }

  return issues;
}

export function getGroupStatus(group, allSteps, currentIndex) {
  const groupIndices = group.steps
    .map((key) => allSteps.indexOf(key))
    .filter((i) => i !== -1);

  if (groupIndices.length === 0) return "upcoming";

  const minIndex = Math.min(...groupIndices);
  const maxIndex = Math.max(...groupIndices);

  if (currentIndex > maxIndex) return "complete";
  if (currentIndex >= minIndex && currentIndex <= maxIndex) return "current";
  return "upcoming";
}
