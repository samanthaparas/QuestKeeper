// Allowed content: the DM can mark races, classes, backgrounds, feats and
// spells as not allowed at their table. The list lives on the table
// (banned_content, see 20261023_content_rules.sql) as names grouped by kind:
//   { race: ["Tiefling"], spell: ["Wish"] }
// Players see it, and the DM's Players tab flags characters that use one.
// It's a conversation starter, not a lock: nothing stops a character from
// existing, and the DM decides what to do.

import { normalizeItemName } from "./srdDetails";

export const CONTENT_KINDS = [
  { key: "race", label: "Races", singular: "race" },
  { key: "class", label: "Classes", singular: "class" },
  { key: "background", label: "Backgrounds", singular: "background" },
  { key: "feat", label: "Feats", singular: "feat" },
  { key: "spell", label: "Spells", singular: "spell" },
];

const KIND_KEYS = CONTENT_KINDS.map((kind) => kind.key);
const MAX_PER_KIND = 200;
const MAX_NAME_LENGTH = 80;

const labelOf = (key) => CONTENT_KINDS.find((kind) => kind.key === key)?.singular ?? key;

// Whatever was saved, tidied: only known kinds, trimmed names, no repeats.
export function cleanBanned(raw) {
  const cleaned = {};
  for (const key of KIND_KEYS) {
    const list = Array.isArray(raw?.[key]) ? raw[key] : [];
    const seen = new Set();
    const names = [];
    for (const item of list) {
      const name = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
      const id = normalizeItemName(name);
      if (!name || seen.has(id)) continue;
      seen.add(id);
      names.push(name);
    }
    if (names.length > 0) cleaned[key] = names.slice(0, MAX_PER_KIND);
  }
  return cleaned;
}

export function countBanned(banned) {
  return KIND_KEYS.reduce((sum, key) => sum + (banned?.[key]?.length ?? 0), 0);
}

export function isBanned(banned, kind, name) {
  const id = normalizeItemName(name);
  return Boolean(id) && (banned?.[kind] ?? []).some((entry) => normalizeItemName(entry) === id);
}

export function addBan(banned, kind, name) {
  return cleanBanned({ ...banned, [kind]: [...(banned?.[kind] ?? []), name] });
}

export function removeBan(banned, kind, name) {
  const id = normalizeItemName(name);
  return cleanBanned({ ...banned, [kind]: (banned?.[kind] ?? []).filter((entry) => normalizeItemName(entry) !== id) });
}

// What a character uses that the table doesn't allow:
// [{ kind: "race", label: "race", name: "Tiefling" }].
// A race is matched by its name, its subrace's name, or its base race's id
// ("elf" for a High Elf), since a chosen subrace takes over the race's name.
export function bannedChoicesOf(sheet, banned) {
  if (!sheet || countBanned(banned) === 0) return [];
  const found = [];
  // Shown with the DM's own spelling ("Elf"), however the character stores it.
  const flag = (kind, name) => {
    if (!name || !isBanned(banned, kind, name)) return;
    const id = normalizeItemName(name);
    const entry = banned[kind].find((item) => normalizeItemName(item) === id);
    if (!found.some((item) => item.kind === kind && normalizeItemName(item.name) === id)) {
      found.push({ kind, label: labelOf(kind), name: entry });
    }
  };

  const race = sheet.race;
  if (race) {
    flag("race", race.name);
    flag("race", race.subrace?.name);
    flag("race", String(race.id ?? "").replace(/[-_]+/g, " "));
  }
  flag("class", sheet.class?.name);
  flag("background", sheet.background?.name);
  (sheet.feats ?? []).forEach((feat) => flag("feat", typeof feat === "string" ? feat : feat?.name));
  const spellcasting = sheet.spellcasting;
  [...(spellcasting?.cantripsKnown ?? []), ...(spellcasting?.spellsKnown ?? [])].forEach((spell) =>
    flag("spell", typeof spell === "string" ? spell : spell?.name),
  );
  return found;
}

// "Races: Tiefling · Spells: Wish, Simulacrum" as [{ label, names }].
export function groupBanned(banned) {
  return CONTENT_KINDS.filter((kind) => (banned?.[kind.key] ?? []).length > 0).map((kind) => ({
    key: kind.key,
    label: kind.label,
    names: banned[kind.key],
  }));
}
