// "Character setup: 3 choices left". The choices a character still needs to
// make, worked out from what's saved, so a new player can see their
// character isn't finished. Nothing here changes the sheet; optional rules
// are never listed.

import { getSubclassLevel } from "./characterSheet";
import { choicesFor, missingPicks } from "./featureChoices";
import { normalizeItemName } from "./srdDetails";

// entries: from loadFeatureEntries (lets older characters' features show
// their choices too).
export function getSetupTasks(sheet, entries = []) {
  if (!sheet) return [];
  const tasks = [];

  // Language reminders written at creation: "Choose 1 more (Half-Elf)".
  String(sheet.languages ?? "")
    .split("\n")
    .forEach((line) => {
      const match = line.trim().match(/^Choose (\d+) more \((.+)\)$/i);
      if (match) {
        const count = Number(match[1]);
        tasks.push({
          key: `language:${match[2]}`,
          label: `Choose ${count} more language${count === 1 ? "" : "s"} (${match[2]})`,
        });
      }
    });

  // Features with a pick still to make (Favored Enemy, Natural Explorer).
  (sheet.features ?? []).forEach((feature) => {
    if (missingPicks(choicesFor(feature, entries)) > 0) {
      tasks.push({ key: `feature:${feature.index}`, label: `Choose for ${feature.name}` });
    }
  });

  // A subclass, once the class has reached the level it's chosen at.
  const subclassLevel = getSubclassLevel(sheet.class);
  if (subclassLevel && (sheet.level ?? 1) >= subclassLevel && !sheet.class?.subclass?.name) {
    tasks.push({ key: "subclass", label: "Choose your subclass (Edit details)" });
  }

  // The background's feature, for characters made before it was added.
  const backgroundFeature = sheet.background?.feature;
  if (
    backgroundFeature &&
    !(sheet.features ?? []).some(
      (feature) => normalizeItemName(feature.name) === normalizeItemName(backgroundFeature),
    )
  ) {
    tasks.push({ key: "background-feature", label: `Add ${backgroundFeature} (your background)` });
  }

  return tasks;
}
