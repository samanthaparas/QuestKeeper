// The magic items catalog: every open-licensed magic item (SRD 5.1, SRD 5.2,
// Kobold Press's Vault of Magic) from Open5e, with the facts players and DMs
// filter by worked out ahead of time: type and weapon/armor kind, shield,
// where it's worn, consumable, rarity, attunement and who can attune, and
// what it's useful for.
//
// Some facts come from reading each item's (openly licensed) description, so
// a few tags can be off; the full text is always one click away.
//
// Pure functions only; open5eClient.js does the fetching.

// Which Open5e books the catalog uses, and how each is labeled.
export const MAGIC_ITEM_SOURCES = {
  "srd-2014": { label: "SRD 5.1", edition: "2014" },
  "srd-2024": { label: "SRD 5.2", edition: "2024" },
  vom: { label: "Vault of Magic", edition: "2014" },
};

export const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];

const CLASSES = [
  "artificer", "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
];
const RACES = ["dwarf", "elf", "gnome", "halfling", "human", "dragonborn", "tiefling", "orc", "half-elf", "half-orc", "giant"];
const ALIGNMENTS = ["good", "evil", "lawful", "chaotic", "neutral"];

// --- Small helpers -------------------------------------------------------------

function sourceKeyOf(item) {
  return item.document?.key ?? String(item.key).split("_")[0];
}

function lower(text) {
  return String(text ?? "").toLowerCase();
}

// "Battleaxe (+1)" -> { base: "Battleaxe", version: "+1" }
export function splitVersion(name) {
  const match = String(name).match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return match ? { base: match[1], version: match[2] } : { base: name, version: null };
}

// --- Facts worked out from each item -------------------------------------------

// Where an item is worn (or null for things you hold or carry).
const SLOTS = [
  ["Head", /\b(hat|helm|helmet|circlet|crown|cap|headband|diadem|tiara|hood)\b/],
  ["Eyes", /\b(goggles|lenses|spectacles|eyes of|monocle)\b/],
  ["Neck", /\b(amulet|necklace|periapt|medallion|scarab|torc|pendant|choker|locket)\b/],
  ["Shoulders", /\b(cloak|cape|mantle)\b/],
  ["Body", /\b(robe|vestments|shirt|coat|tunic|jacket|dress|gown)\b/],
  ["Hands", /\b(gloves|gauntlets?|mittens)\b/],
  ["Wrists", /\b(bracers|bracelets?|armbands?)\b/],
  ["Waist", /\b(belt|girdle|sash)\b/],
  ["Feet", /\b(boots|slippers|sandals|shoes)\b/],
];

export function wornSlot(item) {
  const category = item.category?.name;
  if (category === "Shield") return "Shield";
  if (category === "Ring") return "Ring";
  if (category === "Armor") return /\bshield\b/i.test(item.name) ? "Shield" : "Armor";
  if (category !== "Wondrous Item") return null;
  const name = lower(item.name);
  return SLOTS.find(([, pattern]) => pattern.test(name))?.[0] ?? null;
}

export function isShield(item) {
  return wornSlot(item) === "Shield";
}

// Used up when used: potions, scrolls and ammunition, plus one-use items.
const ONE_USE_NAMES = /\b(dust|oil|elixir|philter|ointment|salve|tincture|bomb|grenade|feather token|incense|candle of|bead of|pill|draught|potion|scroll)\b/;
const ONE_USE_TEXT = /\b(is used up|is consumed|single use|one use|then (?:it )?(?:crumbles|vanishes|turns to dust|disintegrates)|is destroyed when|loses its magic when you use)\b/;

export function isConsumable(item) {
  const category = item.category?.name;
  if (["Potion", "Scroll", "Ammunition"].includes(category)) return true;
  return ONE_USE_NAMES.test(lower(item.name)) || ONE_USE_TEXT.test(lower(item.desc));
}

// "Requires Attunement by a Cleric, Druid, or Paladin" ->
// { classes: ["cleric", "druid", "paladin"], races: [], alignments: [], other: [] }
export function attunementLimits(item) {
  const detail = lower(item.attunement_detail).replace(/^requires attunement\s*/, "");
  const limits = { classes: [], races: [], alignments: [], spellcaster: false, text: item.attunement_detail || null };
  if (!detail) return limits;

  for (const name of CLASSES) if (new RegExp(`\\b${name}s?\\b`).test(detail)) limits.classes.push(name);
  for (const name of RACES) if (new RegExp(`\\b${name}s?\\b`).test(detail)) limits.races.push(name);
  for (const name of ALIGNMENTS) if (new RegExp(`\\b${name}\\b`).test(detail)) limits.alignments.push(name);
  limits.spellcaster = /\bspellcaster\b/.test(detail);
  return limits;
}

// What it's good for, from the description (a few may be off).
// Patterns start on a word boundary but may end mid-word ("invisib" matches
// "invisible" and "invisibility").
const USES = [
  ["Healing", /\b(regains? [^.]{0,40}hit points|heal|cure|restores? [^.]{0,20}hit points)/],
  ["Damage", /\b(\d+d\d+ [a-z]+ damage|extra damage|bonus to attack and damage|bonus to attack rolls and damage)/],
  ["Defense", /\b(bonus to ac\b|armor class|resistance to|immunity to|advantage on saving throws|bonus to saving throws)/],
  ["Movement", /\b(flying speed|you can fly|teleport|swimming speed|climbing speed|walk on|levitat|speed increases|walking speed|speed is doubled|double your speed|jump)/],
  ["Stealth", /\b(invisib|stealth|unseen|disguise|hide yourself|can't be seen)/],
  ["Senses", /\b(darkvision|see invisible|truesight|blindsight|detect|scry|tremorsense|locate)/],
  ["Communication", /\b(telepath|languages?\b|understand any|send a message|speak with)/],
  ["Storage", /\b(extradimensional|holds up to|can hold up to|stores?\b|stash)/],
  ["Control", /\b(charmed|frightened|paralyzed|restrained|stunned|incapacitated|banish|knocked prone)/],
  ["Summoning", /\b(summon|conjure|creature appears|you can call)/],
  ["Ability boost", /\b((strength|dexterity|constitution|intelligence|wisdom|charisma) (score )?(is|becomes|increases|changes)|increase your (strength|dexterity|constitution|intelligence|wisdom|charisma))/],
];

export function usefulFor(item) {
  const text = lower(item.desc);
  const tags = USES.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
  return tags.length > 0 ? tags : ["Utility"];
}

// "Longsword", "Breastplate"... or null when any kind works.
function kindOf(item) {
  return item.weapon?.name ?? item.armor?.name ?? null;
}

// --- Grouping versions ------------------------------------------------------------

// Plain "+1/+2/+3" weapons, armor and shields fold into one entry per book,
// the way the SRD itself lists "Weapon, +1, +2, or +3".
function plusBucket(item) {
  const { version } = splitVersion(item.name);
  if (!version || !/^\+\d$/.test(version)) return null;
  const category = item.category?.name;
  if (category === "Weapon") return "Weapon";
  if (category === "Shield" || isShield(item)) return "Shield";
  if (category === "Armor") return "Armor";
  return null;
}

function groupKey(item) {
  const bucket = plusBucket(item);
  const base = bucket ? `${bucket}, +1, +2, or +3` : splitVersion(item.name).base;
  return { key: `${sourceKeyOf(item)}::${base}`, name: base };
}

function rarityRange(rarities) {
  const sorted = [...new Set(rarities)].sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b));
  return sorted.length > 1 ? `${sorted[0]} to ${sorted.at(-1)}` : sorted[0] ?? "Unknown";
}

function slugify(text) {
  return lower(text).replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Every catalog entry, versions grouped, with its filterable facts. `desc` is
// left out of the list (it's large); getCatalogItem returns it.
export function buildCatalog(items = []) {
  const groups = new Map();
  for (const item of items) {
    const sourceKey = sourceKeyOf(item);
    if (!MAGIC_ITEM_SOURCES[sourceKey]) continue;
    const { key, name } = groupKey(item);
    const group = groups.get(key) ?? { name, sourceKey, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ name, sourceKey, items: versions }) => {
      const first = versions[0];
      const source = MAGIC_ITEM_SOURCES[sourceKey];
      const rarities = versions.map((v) => v.rarity?.name).filter(Boolean);
      const limits = attunementLimits(versions.find((v) => v.attunement_detail) ?? first);
      const kinds = [...new Set(versions.map(kindOf).filter(Boolean))];

      return {
        index: `mi_${sourceKey}_${slugify(name)}`,
        name,
        source: source.label,
        edition: source.edition,
        // Shields are armor in the data, but players look for them separately.
        type: isShield(first) ? "Shield" : (first.category?.name ?? "Wondrous Item"),
        kinds,
        rarities: [...new Set(rarities)],
        rarity: rarityRange(rarities),
        rarityRank: Math.min(...rarities.map((r) => RARITY_ORDER.indexOf(r)).filter((n) => n >= 0), 99),
        attunement: versions.some((v) => v.requires_attunement),
        attunementLimits: limits,
        wornSlot: wornSlot(first),
        shield: isShield(first),
        consumable: versions.some(isConsumable),
        usefulFor: [...new Set(versions.flatMap(usefulFor))],
        versions: versions.length > 1 ? versions.map((v) => splitVersion(v.name).version ?? v.name) : [],
        openKeys: versions.map((v) => v.key),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
}

// One entry with its full description (and each version's, when they differ).
export function getCatalogItem(items, index) {
  const entry = buildCatalog(items).find((item) => item.index === index);
  if (!entry) return null;
  const versions = items.filter((item) => entry.openKeys.includes(item.key));
  const descriptions = [...new Set(versions.map((v) => v.desc).filter(Boolean))];
  return {
    ...entry,
    desc: descriptions.length === 1 ? descriptions[0] : null,
    versionDetails:
      descriptions.length > 1
        ? versions.map((v) => ({ name: v.name, rarity: v.rarity?.name ?? null, desc: v.desc }))
        : [],
  };
}
