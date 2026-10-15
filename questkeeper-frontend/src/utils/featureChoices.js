// Choices a feature asks the player to make, like a Ranger's Favored Enemy
// (one creature type) or Natural Explorer (one terrain). The SRD lists them
// on the feature as `feature_specific.<name>_options`. On the sheet a
// feature keeps them as:
//   choices: [{ key, label, choose, options: ["aberrations", ...], picked: [] }]
// Nothing is ever picked for the player.

import { normalizeItemName } from "./srdDetails";

// "enemy_type_options" -> "Enemy type"
function labelFromKey(key) {
  const words = key.replace(/_options$/, "").replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// "humanoids" -> "Humanoids", "grassland" -> "Grassland"
export function formatOption(value) {
  return String(value)
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// The plain "pick N from this list" choices in an SRD feature. Choices that
// point at other features (a Dragon Ancestor colour) are offered as their
// own entries instead, so they're left out here.
export function choicesFromSrd(featureSpecific) {
  if (!featureSpecific || typeof featureSpecific !== "object") return [];
  return Object.entries(featureSpecific).flatMap(([key, spec]) => {
    const options = spec?.from?.options;
    if (!key.endsWith("_options") || spec?.type !== "string" || !Array.isArray(options)) return [];
    const strings = options.filter((option) => typeof option === "string");
    if (strings.length === 0) return [];
    return [
      {
        key,
        label: labelFromKey(key),
        choose: Math.max(1, Math.min(spec.choose ?? 1, strings.length)),
        options: strings,
        picked: [],
      },
    ];
  });
}

// A feature's choices: its own, or (for features added before choices were
// saved) the matching SRD feature's, so older characters can still pick.
// entries: from loadFeatureEntries.
export function choicesFor(feature, entries = []) {
  if (Array.isArray(feature?.choices) && feature.choices.length > 0) return feature.choices;
  const match = entries.find(
    (entry) => entry.choices?.length > 0 && normalizeItemName(entry.name) === normalizeItemName(feature?.name),
  );
  return match ? match.choices.map((choice) => ({ ...choice, picked: [] })) : [];
}

// The feature's choices with one pick changed (one pick per dropdown).
export function pickChoice(choices, key, slot, value) {
  return choices.map((choice) => {
    if (choice.key !== key) return choice;
    const picked = [...(choice.picked ?? [])];
    picked[slot] = value;
    return { ...choice, picked: picked.map((pick) => pick ?? "") };
  });
}

// Picks still to make on one feature.
export function missingPicks(choices = []) {
  return choices.reduce(
    (total, choice) => total + Math.max(0, choice.choose - (choice.picked ?? []).filter(Boolean).length),
    0,
  );
}

// "Undead" or "Forest, Swamp": the picks, for showing beside the name.
export function describePicks(choices = []) {
  return choices
    .flatMap((choice) => (choice.picked ?? []).filter(Boolean))
    .map(formatOption)
    .join(", ");
}
