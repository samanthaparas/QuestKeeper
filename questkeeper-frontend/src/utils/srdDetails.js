import { getFeatDescriptionLines } from "./characterSheet";

const SPELL_LEVEL_LABELS = [
  "",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
];

export function normalizeItemName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ x\d+$/, "");
}

export function findSrdMatches(name, entries) {
  const target = normalizeItemName(name);
  if (!target) return [];
  return entries.filter((entry) => normalizeItemName(entry.name) === target);
}

function toLines(text) {
  const lines = Array.isArray(text) ? text : String(text ?? "").split("\n");
  return lines.map((line) => line.replace(/\*\*/g, "").trim()).filter(Boolean);
}

function compactFacts(facts) {
  return facts.filter((fact) => fact.value);
}

function toTitleCase(text) {
  return text
    .split(/[-\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatSpellDetails(spell) {
  const school = spell.school?.name ?? "";
  const kind =
    spell.level === 0
      ? `${school} cantrip`
      : `${SPELL_LEVEL_LABELS[spell.level]}-level ${school}`;
  const components = (spell.components ?? []).join(", ");

  return {
    name: spell.name,
    edition: spell.edition ?? "2014",
    kind: kind.trim(),
    facts: compactFacts([
      { label: "Casting Time", value: spell.casting_time },
      { label: "Range", value: spell.range },
      {
        label: "Components",
        value: spell.material
          ? `${components} (${spell.material})`
          : components,
      },
      {
        label: "Duration",
        value: spell.concentration
          ? `Concentration, ${spell.duration?.toLowerCase()}`
          : spell.duration,
      },
      { label: "Ritual", value: spell.ritual ? "Yes" : null },
    ]),
    paragraphs: [
      ...toLines(spell.desc),
      ...toLines(spell.higher_level).map((line) => `At Higher Levels. ${line}`),
    ],
  };
}

function formatFeatPrerequisite(feat) {
  if (Array.isArray(feat.prerequisites)) {
    return feat.prerequisites
      .filter((prerequisite) => prerequisite.ability_score)
      .map(
        (prerequisite) =>
          `${prerequisite.ability_score.name} ${prerequisite.minimum_score}`,
      )
      .join(", ");
  }

  const parts = [];
  if (feat.prerequisites?.minimum_level) {
    parts.push(`Level ${feat.prerequisites.minimum_level}+`);
  }
  if (feat.prerequisite_options?.desc) {
    parts.push(feat.prerequisite_options.desc);
  }
  return parts.join(", ");
}

export function formatFeatDetails(feat) {
  return {
    name: feat.name,
    edition: feat.edition ?? "2014",
    kind: feat.type ? `${toTitleCase(feat.type)} Feat` : "Feat",
    facts: compactFacts([
      { label: "Prerequisite", value: formatFeatPrerequisite(feat) },
    ]),
    paragraphs: toLines(getFeatDescriptionLines(feat)),
  };
}
