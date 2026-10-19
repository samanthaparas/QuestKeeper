// Spell components (V, S, M) from the SRD, for spells that were added
// without them (creation, level-up and racial cantrips used to leave them
// blank). Only empty components are ever filled; typed ones are kept.

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

// Spells with no components that the SRD can fill. byName: (name) -> SRD
// index, for spells typed in by hand whose index isn't the SRD's.
export function spellsMissingComponents(spellcasting, byName = () => null) {
  return LIST_KEYS.flatMap((key) => spellcasting?.[key] ?? [])
    .filter((spell) => !componentsText(spell.components))
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

// The same spellcasting, with empty components filled from the SRD. Spells
// the SRD doesn't know (homebrew, book spells) are left as they are.
export async function fillMissingComponents(spellcasting, byName = () => null) {
  const missing = spellsMissingComponents(spellcasting, byName);
  if (missing.length === 0) return spellcasting;

  const looked = await Promise.allSettled(missing.map(({ srdIndex }) => getSpellDetails(srdIndex)));
  const found = new Map();
  looked.forEach((result, position) => {
    const text = result.status === "fulfilled" ? componentsText(result.value?.components) : "";
    if (text) found.set(missing[position].spell, text);
  });

  const next = { ...spellcasting };
  LIST_KEYS.forEach((key) => {
    if (!spellcasting?.[key]) return;
    next[key] = spellcasting[key].map((spell) =>
      found.has(spell) ? { ...spell, components: found.get(spell) } : spell,
    );
  });
  return next;
}
