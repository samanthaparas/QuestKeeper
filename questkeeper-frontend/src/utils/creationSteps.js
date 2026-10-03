import {
  getSubclassLevel,
  getSubraceCantripTraitId,
  getSpellcastingType,
} from "./characterSheet";

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
  { label: "Review", steps: ["review"] },
];

// Paladin and Ranger are spellcasters but have no spells until level 2.
const NO_LEVEL_ONE_SPELLS = new Set(["paladin", "ranger"]);

// Only show the steps that apply to this character, so nobody has to click
// through a screen that says "nothing to do here".
export function getVisibleSteps({ raceRaw, subrace, characterClass } = {}) {
  const steps = ["name", "race"];

  if ((raceRaw?.subraces?.length ?? 0) > 0) steps.push("subrace");
  if (getSubraceCantripTraitId(subrace?.id)) steps.push("subraceCantrip");

  steps.push("class");
  if (getSubclassLevel(characterClass?.id) === 1) steps.push("subclass");

  steps.push("background", "classSkills");

  if (
    getSpellcastingType(characterClass?.id) &&
    !NO_LEVEL_ONE_SPELLS.has(characterClass?.id)
  ) {
    steps.push("classSpells");
  }

  steps.push("abilities", "review");
  return steps;
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
