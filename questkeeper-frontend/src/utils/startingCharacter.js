// Small helpers for what a brand-new character starts with: languages to
// choose, starting gold, tool proficiencies as separate entries, and the
// background's feature. Used once, when the character is created.

import { descriptionFromSrd } from "./srdDetails";

// The SRD's languages, for "choose any" picks.
export const STANDARD_LANGUAGES = [
  "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc",
  "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon",
];

// One "choose N languages" from a race, subrace or background's
// language_options. A list of options (Half-Elf: 14 to pick from) is used
// as it is; "any" (Acolyte, homebrew) offers the standard languages.
function choiceFrom(raw, id, from) {
  const choose = raw?.language_options?.choose ?? 0;
  if (choose <= 0) return null;
  const listed = (raw.language_options.from?.options ?? [])
    .map((option) => option?.item?.name ?? option?.name)
    .filter(Boolean);
  return { id, from, choose, options: listed.length > 0 ? listed : STANDARD_LANGUAGES };
}

export function languageChoicesFor({ raceRaw, subraceRaw, backgroundRaw }) {
  return [
    raceRaw && choiceFrom(raceRaw, "race", raceRaw.name),
    subraceRaw && choiceFrom(subraceRaw, "subrace", subraceRaw.name),
    backgroundRaw && choiceFrom(backgroundRaw, "background", backgroundRaw.name),
  ].filter(Boolean);
}

// The Languages box on the sheet: what they know, then a reminder for any
// pick not made yet ("Choose 1 more (Half-Elf)"), so nothing is chosen for
// them. picks: { [choiceId]: ["Dwarvish"] }.
export function buildLanguagesText({ fixed = [], choices = [], picks = {} }) {
  const known = [];
  [...fixed, ...choices.flatMap((choice) => picks[choice.id] ?? [])].forEach((name) => {
    const clean = (name?.name ?? name ?? "").trim();
    if (clean && !known.some((have) => have.toLowerCase() === clean.toLowerCase())) known.push(clean);
  });
  const reminders = choices
    .map((choice) => ({ choice, missing: choice.choose - (picks[choice.id] ?? []).filter(Boolean).length }))
    .filter(({ missing }) => missing > 0)
    .map(({ choice, missing }) => `Choose ${missing} more (${choice.from})`);
  return [known.join(", "), ...reminders].filter(Boolean).join("\n");
}

// The SRD lists starting gear without the coins, so its one background's
// purse is noted here (Acolyte: "a belt pouch containing 15 gp").
const SRD_BACKGROUND_GOLD = { acolyte: 15 };

// Gold from the starting gear: a sentence like "...and a pouch containing
// 15gp" (Open5e and homebrew backgrounds), or the SRD Acolyte's purse.
export function startingGold({ background, characterClass }) {
  const fromText = [background?.equipmentDescription, characterClass?.equipmentDescription]
    .filter(Boolean)
    .reduce((total, text) => {
      const amounts = [...String(text).matchAll(/(\d+)\s*gp\b/gi)].map((match) => Number(match[1]));
      return total + amounts.reduce((sum, amount) => sum + amount, 0);
    }, 0);
  return fromText + (SRD_BACKGROUND_GOLD[background?.id] ?? 0);
}

// "Disguise kit, forgery kit" -> two entries. A sentence with a choice in it
// ("one type of gaming set or a musical instrument") stays as one, so the
// player can see what's theirs to pick.
export function splitTools(text) {
  const clean = String(text ?? "").trim().replace(/\.$/, "");
  if (!clean || /^no additional/i.test(clean)) return [];
  if (/\bor\b|\bchoice\b|\bone type\b|\bany\b/i.test(clean)) return [clean];
  return clean
    .split(/,|;|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

// The background's feature (Charlatan: False Identity) as a sheet feature.
export function backgroundFeatureFrom(backgroundRaw, background) {
  const feature = backgroundRaw?.feature;
  if (!feature?.name || !background?.id) return null;
  return {
    name: feature.name,
    description: descriptionFromSrd(feature.desc),
    source: { type: "background", id: background.id, key: `background:${background.id}`, level: null },
  };
}
