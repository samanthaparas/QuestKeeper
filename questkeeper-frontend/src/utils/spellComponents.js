// Spell components (V, S, M) and the other details the Spells tab sorts and
// filters by (school, casting time, duration, concentration, ritual), from
// the SRD, for spells that were added without them (creation, level-up and
// racial cantrips used to leave them blank, and the other details are new).
// Only empty ones are ever filled; anything typed is kept.

import { getSpellDetails } from "./api";

// ["V", "S", "M"] (or "V, S") -> "V, S, M"
export function componentsText(components) {
  if (Array.isArray(components)) return components.join(", ");
  return String(components ?? "").trim();
}

const LIST_KEYS = ["cantripsKnown", "spellsKnown"];

// A spell's own index can be the SRD's ("hunters-mark"); spells typed in or
// added by a feature get a made-up one (a long random id), which the SRD
// will never know.
const isMadeUpIndex = (index) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(index ?? "")) || String(index ?? "").startsWith("hb_");

export const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

// The details kept on a spell, from the SRD's own shape (school.name,
// casting_time) or one already in ours. Only the ones it has are returned,
// so nothing blank overwrites anything.
export function spellFactsFrom(source) {
  if (!source) return {};
  const school = source.school?.name ?? (typeof source.school === "string" ? source.school : "");
  const castingTime = source.casting_time ?? source.castingTime ?? "";
  const duration = source.duration ?? "";
  return {
    ...(school ? { school } : {}),
    ...(castingTime ? { castingTime } : {}),
    ...(duration ? { duration } : {}),
    ...(typeof source.concentration === "boolean" ? { concentration: source.concentration } : {}),
    ...(typeof source.ritual === "boolean" ? { ritual: source.ritual } : {}),
  };
}

// Has the spell got its details yet? (School, casting time or duration
// typed or filled; a spell with none of them is missing them.)
export const hasSpellFacts = (spell) => Boolean(spell.school || spell.castingTime || spell.duration);
const isMissingDetails = (spell) => !componentsText(spell.components) || !hasSpellFacts(spell);

// Spells with no components that the SRD can fill. byName: (name) -> SRD
// index, for spells typed in by hand whose index isn't the SRD's.
export function spellsMissingComponents(spellcasting, byName = () => null) {
  return fillableAmong(spellcasting, byName, (spell) => !componentsText(spell.components));
}

// Spells missing components or the other details, that the SRD can fill.
export function spellsMissingDetails(spellcasting, byName = () => null) {
  return fillableAmong(spellcasting, byName, isMissingDetails);
}

function fillableAmong(spellcasting, byName, isMissing) {
  return LIST_KEYS.flatMap((key) => spellcasting?.[key] ?? [])
    .filter(isMissing)
    .map((spell) => ({
      spell,
      srdIndex: byName(spell.name) ?? (isMadeUpIndex(spell.index) ? null : spell.index),
    }))
    .filter(({ srdIndex }) => Boolean(srdIndex));
}

// Spells with no components the SRD doesn't have (book spells like Beast
// Sense): these need typing in, so the sheet says which ones.
export function spellsNeedingTypedComponents(spellcasting, byName = () => null) {
  const fillable = new Set(spellsMissingComponents(spellcasting, byName).map(({ spell }) => spell));
  return LIST_KEYS.flatMap((key) => spellcasting?.[key] ?? []).filter(
    (spell) => !componentsText(spell.components) && !fillable.has(spell),
  );
}

// The same spellcasting, with empty components and details filled from the SRD. Spells
// the SRD doesn't know (homebrew, book spells) are left as they are.
export async function fillMissingComponents(spellcasting, byName = () => null) {
  const missing = spellsMissingDetails(spellcasting, byName);
  if (missing.length === 0) return spellcasting;

  const looked = await Promise.allSettled(missing.map(({ srdIndex }) => getSpellDetails(srdIndex)));
  const found = new Map();
  looked.forEach((result, position) => {
    if (result.status !== "fulfilled" || !result.value) return;
    const spell = missing[position].spell;
    const text = componentsText(result.value.components);
    const filled = {
      ...(!componentsText(spell.components) && text ? { components: text } : {}),
      // The details only when the spell has none, so typed ones stay.
      ...(hasSpellFacts(spell) ? {} : spellFactsFrom(result.value)),
    };
    if (Object.keys(filled).length > 0) found.set(spell, filled);
  });
  if (found.size === 0) return spellcasting;

  const next = { ...spellcasting };
  LIST_KEYS.forEach((key) => {
    if (!spellcasting?.[key]) return;
    next[key] = spellcasting[key].map((spell) =>
      found.has(spell) ? { ...spell, ...found.get(spell) } : spell,
    );
  });
  return next;
}

// --- Sorting the Spells tab ------------------------------------------------

// "1 bonus action" -> "Bonus action"; anything longer than an action
// (a minute, 10 minutes, 1 hour) is "Longer", so rituals sit together.
const CASTING_GROUPS = ["Reaction", "Bonus action", "Action", "Longer", "Not filled in"];
export function castingTimeGroup(spell) {
  const text = String(spell.castingTime ?? "").toLowerCase();
  if (!text) return "Not filled in";
  if (text.includes("reaction")) return "Reaction";
  if (text.includes("bonus")) return "Bonus action";
  if (/\baction\b/.test(text)) return "Action";
  return "Longer";
}
export const castingTimeOrder = (spell) => CASTING_GROUPS.indexOf(castingTimeGroup(spell));

// A duration in rounds, roughly, so "1 round" comes before "1 minute"
// before "8 hours"; "Until dispelled" and "Special" go last.
const UNIT_ROUNDS = { round: 1, minute: 10, hour: 600, day: 14400 };
export function durationRounds(spell) {
  const text = String(spell.duration ?? "").toLowerCase().replace(/^up to\s+/, "");
  if (!text) return Number.MAX_SAFE_INTEGER;
  if (text.startsWith("instant")) return 0;
  const match = text.match(/(\d+)\s*(round|minute|hour|day)/);
  if (match) return Number(match[1]) * UNIT_ROUNDS[match[2]];
  if (text.includes("dispel")) return 10_000_000;
  return 20_000_000; // "Special" and anything else.
}

// The duration as a short group heading ("Up to 1 hour" -> "1 hour").
export function durationGroup(spell) {
  const text = String(spell.duration ?? "").replace(/^up to\s+/i, "").trim();
  if (!text) return "Not filled in";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// The details typed in the Add/Edit spell form, cleaned up. Blank boxes are
// left off a new spell; on an edit they clear what was there.
export function spellFactsFromForm(values, { keepBlank = false } = {}) {
  const facts = {
    school: SPELL_SCHOOLS.includes(values.school) ? values.school : "",
    castingTime: String(values.castingTime ?? "").trim().slice(0, 60),
    duration: String(values.duration ?? "").trim().slice(0, 60),
    concentration: Boolean(values.concentration),
    ritual: Boolean(values.ritual),
  };
  if (keepBlank) return facts;
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value));
}
