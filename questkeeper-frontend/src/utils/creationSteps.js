export const CREATION_STEP_GROUPS = [
  { label: "Name & Idea", steps: ["name"] },
  { label: "Ancestry", steps: ["race", "subrace", "subraceCantrip"] },
  { label: "Class & Role", steps: ["class", "subclass"] },
  { label: "Skills", steps: ["classSkills"] },
  { label: "Magic", steps: ["classSpells"] },
  { label: "Background", steps: ["background"] },
  { label: "Abilities", steps: ["abilities"] },
  { label: "Review", steps: ["review"] },
];

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
