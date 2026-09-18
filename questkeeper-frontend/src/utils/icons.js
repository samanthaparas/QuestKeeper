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

function normalizeId(id) {
  return (id ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRaceIcon(raceId) {
  return raceIcons[`../assets/icons/races/${normalizeId(raceId)}.png`];
}

export function getClassIcon(classId) {
  return classIcons[`../assets/icons/classes/${normalizeId(classId)}.png`];
}

export function getBackgroundIcon(backgroundId) {
  return backgroundIcons[
    `../assets/icons/backgrounds/${normalizeId(backgroundId)}.png`
  ];
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

export function getUiIcon(iconId) {
  return uiIcons[`../assets/icons/ui/${normalizeId(iconId)}.png`];
}
