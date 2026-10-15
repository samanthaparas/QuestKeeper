// Where a character's features came from, and safe clean-up when they don't
// belong. Features added from the SRD carry `source`: { type: "race" |
// "subrace" | "class" | "subclass", id, key, level }. Features a player typed
// themselves, and features saved before sources existed, have none.

import { normalizeItemName } from "./srdDetails";

// What to save on a feature picked from loadFeatureEntries.
export function sourceFromEntry(entry) {
  return entry?.owner ? { ...entry.owner } : null;
}

// Features on the sheet that belong to a subclass the character doesn't have.
//   - With a saved source: exact (its subclass id isn't the current one).
//   - Without one (older characters): only an exact name match with another
//     SRD subclass's feature, and never a name the character's own race,
//     class or subclass also uses. Typed-in features with other names are
//     never touched.
// entries: from loadFeatureEntries (includes other subclasses' features).
export function findStraySubclassFeatures(features = [], entries = [], subclassId = null) {
  const ownNames = new Set(
    entries.filter((entry) => !entry.otherSubclass).map((entry) => normalizeItemName(entry.name)),
  );
  const otherByName = new Map(
    entries
      .filter((entry) => entry.otherSubclass)
      .map((entry) => [normalizeItemName(entry.name), entry]),
  );

  return features.flatMap((feature) => {
    if (feature.source) {
      return feature.source.type === "subclass" && feature.source.id !== subclassId
        ? [{ feature, from: feature.source.id }]
        : [];
    }
    const name = normalizeItemName(feature.name);
    const match = otherByName.get(name);
    return match && !ownNames.has(name) ? [{ feature, from: match.owner.id, guessed: true }] : [];
  });
}

// Changing subclass: drop the features the old subclass gave (by saved
// source only), keep everything else, and add the new subclass's features
// the character has reached that aren't on the sheet yet.
// newEntries: the new subclass's entries from loadFeatureEntries.
export function swapSubclassFeatures(features = [], { fromSubclassId, newEntries = [], level, makeFeature }) {
  const kept = features.filter(
    (feature) => !(feature.source?.type === "subclass" && feature.source.id === fromSubclassId),
  );
  const have = new Set(kept.map((feature) => normalizeItemName(feature.name)));
  const added = newEntries
    .filter(
      (entry) =>
        entry.owner?.type === "subclass" &&
        !entry.otherSubclass &&
        !entry.optionOf &&
        (entry.level ?? 0) <= level &&
        !have.has(normalizeItemName(entry.name)),
    )
    .map((entry) =>
      makeFeature({ name: entry.name, description: entry.description, source: sourceFromEntry(entry) }),
    );
  return [...kept, ...added];
}

// The subclass id to look up features with. If the player has retyped the
// subclass name (Edit details) so it no longer matches the subclass they
// picked, the old id would offer the wrong subclass's features, so there's
// none. Nothing on the sheet is deleted either way.
export function getFeatureSubclassId(characterClass) {
  const subclass = characterClass?.subclass;
  if (!subclass?.id) return null;
  if (!subclass.originalName) return subclass.id;
  return normalizeItemName(subclass.name) === normalizeItemName(subclass.originalName)
    ? subclass.id
    : null;
}
