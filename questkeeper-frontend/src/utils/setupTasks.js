// "Character setup: 3 choices left". The choices a character still needs to
// make, worked out from what's saved, so a new player can see their
// character isn't finished. Nothing here changes the sheet; optional rules
// are never listed.

import { getSubclassLevel } from "./characterSheet";
import { choicesFor, missingPicks } from "./featureChoices";
import { normalizeItemName } from "./srdDetails";
import { needsDetails, toHomebrewIndex } from "./homebrewMappers";

// entries: from loadFeatureEntries (lets older characters' features show
// their choices too). homebrew: the player's homebrew list, used to remind
// them about drafts they picked in creation but haven't filled in yet.
export function getSetupTasks(sheet, entries = [], homebrew = []) {
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
  // Says what to pick and, when known, the level it came with, so a level 1
  // pick still open at level 6 isn't mistaken for the new one.
  (sheet.features ?? []).forEach((feature) => {
    const choices = choicesFor(feature, entries);
    if (missingPicks(choices) > 0) {
      const what = choices.find((choice) => (choice.picked ?? []).filter(Boolean).length < choice.choose);
      const fromLevel = feature.source?.level ? ` (from level ${feature.source.level})` : "";
      tasks.push({
        key: `feature:${feature.index}`,
        label: `Choose ${what ? `the ${what.label.toLowerCase()}` : "a pick"} for ${feature.name}${fromLevel}`,
      });
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

  // Race, background or subclass picked with "Pick it now, add details later".
  const picked = [
    ["race", sheet.race],
    ["subrace", sheet.subrace],
    ["background", sheet.background],
    ["subclass", sheet.class?.subclass],
  ];
  const seen = new Set();
  for (const [kind, pick] of picked) {
    const id = pick?.id ?? pick?.index;
    if (!id || seen.has(id)) continue;
    const draft = homebrew.find((entry) => toHomebrewIndex(entry.id) === id);
    if (draft && needsDetails(draft)) {
      seen.add(id);
      tasks.push({
        key: `details:${id}`,
        label: `Add the details for ${draft.name} (your ${kind})`,
        to: "/homebrew",
        linkLabel: "Open My Homebrew",
      });
    }
  }

  return tasks;
}
