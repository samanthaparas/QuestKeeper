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

export function formatMagicItemDetails(item) {
  const lines = toLines(item.desc);
  const requiresAttunement =
    item.attunement === true ||
    lines.some((line) => /requires attunement/i.test(line));

  return {
    name: item.name,
    edition: item.edition ?? "2014",
    kind: item.equipment_category?.name.replace(/s$/, "") ?? "Magic Item",
    facts: compactFacts([
      { label: "Rarity", value: item.rarity?.name },
      { label: "Attunement", value: requiresAttunement ? "Required" : null },
    ]),
    paragraphs: lines,
  };
}

const SPECIFIC_EQUIPMENT_CATEGORIES =
  /^(light-armor|medium-armor|heavy-armor|shields|(simple|martial)-(melee|ranged)-weapons)$/;

function getEquipmentKind(item) {
  const categories = item.equipment_categories ?? [];
  const specific = categories.find((category) =>
    SPECIFIC_EQUIPMENT_CATEGORIES.test(category.index),
  );
  if (specific) return specific.name.replace(/s$/, "");
  return item.equipment_category?.name ?? categories[0]?.name ?? "Equipment";
}

function formatArmorClass(item) {
  const armorClass = item.armor_class;
  if (!armorClass) return null;

  const isShield = (item.equipment_categories ?? []).some(
    (category) => category.index === "shields",
  );
  if (isShield) return `+${armorClass.base}`;
  if (!armorClass.dex_bonus) return String(armorClass.base);

  return armorClass.max_bonus
    ? `${armorClass.base} + Dex modifier (max ${armorClass.max_bonus})`
    : `${armorClass.base} + Dex modifier`;
}

function formatDamage(item) {
  if (!item.damage?.damage_dice) return null;

  const damageType = item.damage.damage_type?.name?.toLowerCase() ?? "";
  const oneHanded = `${item.damage.damage_dice} ${damageType}`.trim();

  return item.two_handed_damage
    ? `${oneHanded} (${item.two_handed_damage.damage_dice} two-handed)`
    : oneHanded;
}

function formatRange(item) {
  const range = item.throw_range ?? item.range;
  return range?.long ? `${range.normal}/${range.long} ft.` : null;
}

function formatContents(contents) {
  return (contents ?? [])
    .map(({ item, quantity }) =>
      quantity > 1 ? `${item.name} x${quantity}` : item.name,
    )
    .join(", ");
}

export function formatEquipmentDetails(item) {
  return {
    name: item.name,
    edition: item.edition ?? "2014",
    kind: getEquipmentKind(item),
    facts: compactFacts([
      { label: "Armor Class", value: formatArmorClass(item) },
      {
        label: "Strength",
        value: item.str_minimum ? `Str ${item.str_minimum}` : null,
      },
      {
        label: "Stealth",
        value: item.stealth_disadvantage ? "Disadvantage" : null,
      },
      { label: "Damage", value: formatDamage(item) },
      { label: "Range", value: formatRange(item) },
      {
        label: "Properties",
        value: (item.properties ?? [])
          .map((property) => property.name)
          .join(", "),
      },
      { label: "Mastery", value: item.mastery?.name },
      { label: "Contents", value: formatContents(item.contents) },
      {
        label: "Cost",
        value: item.cost ? `${item.cost.quantity} ${item.cost.unit}` : null,
      },
      { label: "Weight", value: item.weight ? `${item.weight} lb.` : null },
    ]),
    paragraphs: [
      ...toLines(item.desc),
      ...toLines(item.description),
      ...toLines(item.special),
    ],
  };
}
