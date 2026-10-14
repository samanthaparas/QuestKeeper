// The party strip: one short row per character (HP, AC, conditions and, for
// the DM, passive scores). Works on a full sheet or on the "mini sheet"
// players get from get_party_strip, which has the same shape minus the rest.

import {
  SKILLS,
  getEffectiveArmorClass,
  getProficiencyBonus,
  getSkillModifier,
} from "./characterSheet";

// The passive scores a DM checks quietly ("does anyone notice the trapdoor?").
export const PASSIVE_SKILLS = ["perception", "insight", "investigation"];

// 10 + the skill's bonus, the same bonus the sheet shows.
export function getPassiveScore(sheet, skillIndex) {
  const skill = SKILLS.find((entry) => entry.index === skillIndex);
  const isProficient = Boolean(sheet.skills?.[skillIndex]);
  return (
    10 +
    getSkillModifier(
      sheet.abilityScores?.[skill.ability] ?? 10,
      isProficient,
      getProficiencyBonus(sheet.level ?? 1),
      {
        expertise: isProficient && Boolean(sheet.skillExpertise?.[skillIndex]),
        bonus: sheet.skillBonuses?.[skillIndex] ?? 0,
      },
    )
  );
}

// "healthy", "bloodied" (half HP or less) or "down" (0 HP), like monsters.
export function getHealthState(current, max) {
  if (max <= 0) return "healthy"; // HP not filled in yet
  if (current <= 0) return "down";
  if (current * 2 <= max) return "bloodied";
  return "healthy";
}

export function toPartyRow(sheet, { withPassives = false } = {}) {
  const hp = sheet.combat?.hitPoints ?? {};
  const max = Math.max(0, hp.max ?? 0);
  const current = Math.max(0, hp.current ?? 0);

  return {
    id: sheet.id,
    name: sheet.name ?? "Adventurer",
    summary: [sheet.level ? `Level ${sheet.level}` : "", sheet.class?.name ?? ""]
      .filter(Boolean)
      .join(" "),
    hp: { current, max, temporary: Math.max(0, hp.temporary ?? 0) },
    // How full the bar is, 0 to 100.
    hpPercent: max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0,
    health: getHealthState(current, max),
    armorClass: getEffectiveArmorClass(sheet),
    conditions: sheet.conditions ?? [],
    passives: withPassives
      ? PASSIVE_SKILLS.map((skill) => ({ skill, score: getPassiveScore(sheet, skill) }))
      : [],
  };
}

// Senses worth knowing in the dark, read from race traits and features
// ("Darkvision", "Superior Darkvision", "Blindsight"...).
const SENSE_PATTERN = /darkvision|blindsight|tremorsense|truesight/i;

export function getSenses(sheet) {
  const names = [
    ...(sheet.race?.traits ?? []),
    ...(sheet.features ?? []).map((feature) => feature?.name ?? feature),
  ].filter((name) => typeof name === "string" && SENSE_PATTERN.test(name));
  return [...new Set(names)];
}

// What a DM wants between fights: who notices things, who can read the
// old script, who sees in the dark, and the hooks in each backstory.
export function toStoryCard(sheet) {
  return {
    id: sheet.id,
    name: sheet.name ?? "Adventurer",
    summary: [sheet.race?.name, sheet.class?.name, sheet.background?.name].filter(Boolean).join(" · "),
    passives: PASSIVE_SKILLS.map((skill) => ({ skill, score: getPassiveScore(sheet, skill) })),
    languages: (sheet.languages ?? "").trim(),
    senses: getSenses(sheet),
    speed: sheet.combat?.speed ?? 30,
    backstory: (sheet.backstory ?? "").trim(),
    appearance: (sheet.appearance ?? "").trim(),
  };
}
