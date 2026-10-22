const magicItemIcons = import.meta.glob("../assets/icons/magic-items/*.png", {
  eager: true,
  import: "default",
});
const raceIcons = import.meta.glob("../assets/icons/races/*.png", {
  eager: true,
  import: "default",
});
const classIcons = import.meta.glob("../assets/icons/classes/*.png", {
  eager: true,
  import: "default",
});
const backgroundIcons = import.meta.glob("../assets/icons/backgrounds/*.png", {
  eager: true,
  import: "default",
});
const spellSchoolIcons = import.meta.glob(
  "../assets/icons/spell-schools/*.png",
  { eager: true, import: "default" },
);
const spellEffectIcons = import.meta.glob(
  "../assets/icons/spell-effects/*.png",
  { eager: true, import: "default" },
);
const uiIcons = import.meta.glob("../assets/icons/ui/*.png", {
  eager: true,
  import: "default",
});
// Small (160px) copies of the creature portraits, named by the creature's
// own SRD id, so a portrait is only ever chosen by an exact id (never by
// guessing from a name). The full-size originals stay out of the app.
const creaturePortraits = import.meta.glob("../assets/icons/creature-portraits/*.png", {
  eager: true,
  import: "default",
});

function normalizeId(id) {
  return (id ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRaceIcon(raceId) {
  const id = normalizeId(raceId);
  // Published-book and Tome of Heroes entries share the canonical race art.
  const canonicalId = id.replace(/^(book|toh)-/, "");
  return (
    raceIcons[`../assets/icons/races/${id}.png`] ??
    raceIcons[`../assets/icons/races/${canonicalId}.png`]
  );
}

export function getClassIcon(classId) {
  const id = normalizeId(classId);
  const canonicalId = id.replace(/^book-/, "");
  return (
    classIcons[`../assets/icons/classes/${id}.png`] ??
    classIcons[`../assets/icons/classes/${canonicalId}.png`]
  );
}

export function getBackgroundIcon(backgroundId) {
  const id = normalizeId(backgroundId);
  // Source-specific entries share the canonical background artwork.
  const canonicalId = id.replace(/^(book|toh|tdcs|open5e)-/, "");
  return (
    backgroundIcons[`../assets/icons/backgrounds/${id}.png`] ??
    backgroundIcons[`../assets/icons/backgrounds/${canonicalId}.png`]
  );
}

export function getSpellSchoolIcon(schoolId) {
  return spellSchoolIcons[
    `../assets/icons/spell-schools/${normalizeId(schoolId)}.png`
  ];
}

export function getSpellEffectIcon(effectId) {
  return spellEffectIcons[
    `../assets/icons/spell-effects/${normalizeId(effectId)}.png`
  ];
}

// A creature's portrait from its exact SRD id ("kobold"), or undefined when
// it has none (the DM screen then shows a neutral badge instead).
export function getCreaturePortrait(srdId) {
  if (typeof srdId !== "string") return undefined;
  return creaturePortraits[`../assets/icons/creature-portraits/${srdId}.png`];
}

// Small (72px) Activity-log icons, by the log line's explicit kind. Only these
// six kinds exist; anything else (or no kind) has no icon at all.
const activityIcons = import.meta.glob("../assets/icons/activity-app/*.png", {
  eager: true,
  import: "default",
});
export const ACTIVITY_KINDS = ["attack", "damage", "healing", "spell", "turn", "handout"];
export function getActivityIcon(kind) {
  if (!ACTIVITY_KINDS.includes(kind)) return undefined;
  return activityIcons[`../assets/icons/activity-app/${kind}.png`];
}

export function getUiIcon(iconId) {
  return uiIcons[`../assets/icons/ui/${normalizeId(iconId)}.png`];
}

export function getMagicItemIcon(type) {
  return (
    magicItemIcons[`../assets/icons/magic-items/${normalizeId(type)}.png`] ??
    magicItemIcons["../assets/icons/magic-items/wondrous-item.png"]
  );
}
