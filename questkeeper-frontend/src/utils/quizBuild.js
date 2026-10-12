// "Use this build" from the character quiz: loads the build's race, subrace,
// class, subclass and background the same way the creation pickers do, and
// spreads the standard array over its abilities.

import {
  getBackgroundDetails,
  getSubclassDetails,
  getSubraceDetails,
} from "./api";
import { loadClassDetails, loadRaceDetails } from "./srdDetails";
import { BUILDS } from "./quizData";

const ABILITY_NAMES = {
  STR: "strength",
  DEX: "dexterity",
  CON: "constitution",
  INT: "intelligence",
  WIS: "wisdom",
  CHA: "charisma",
};

// After the build's two main abilities, the rest in a sensible order:
// Constitution (more HP) first, Strength last for everyone but the warriors
// (who already listed it).
const FALLBACK_ORDER = [
  "constitution",
  "dexterity",
  "wisdom",
  "charisma",
  "intelligence",
  "strength",
];
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function findQuizBuild(id) {
  return BUILDS.find((build) => build.id === id) ?? null;
}

// ["INT", "DEX"] -> { intelligence: 15, dexterity: 14, constitution: 13, ... }
export function standardArrayFor(abilities) {
  const main = abilities.map((short) => ABILITY_NAMES[short]).filter(Boolean);
  const order = [
    ...main,
    ...FALLBACK_ORDER.filter((ability) => !main.includes(ability)),
  ];
  return Object.fromEntries(
    order.map((ability, position) => [ability, STANDARD_ARRAY[position]]),
  );
}

// The raw details each creation step keeps, for one build.
export async function loadQuizBuild(build) {
  const [raceRaw, subraceRaw, classRaw, subclassRaw, backgroundRaw] =
    await Promise.all([
      loadRaceDetails(build.race.index),
      build.race.subrace ? getSubraceDetails(build.race.subrace) : null,
      loadClassDetails(build.class.index),
      build.subclass ? getSubclassDetails(build.subclass.index) : null,
      getBackgroundDetails(build.background.index, "2014"),
    ]);
  return { raceRaw, subraceRaw, classRaw, subclassRaw, backgroundRaw };
}
