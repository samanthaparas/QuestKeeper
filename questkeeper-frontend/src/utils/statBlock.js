// A monster's or ally's stat block lives in the database as
//   { attacks: [{ name, toHit, damage }], notes: "...", initiativeBonus: 2,
//     saves: { dexterity: 2, wisdom: -1 } }
// and is only ever visible to the DM (it's in combatant_secrets and the
// Monster Library, which players can't read). These helpers keep the form
// state and the saved shape in step. saves only holds the ones the DM typed.

// The six saving throws, in the usual order, with their short names.
export const SAVE_ABILITIES = [
  ["strength", "STR"],
  ["dexterity", "DEX"],
  ["constitution", "CON"],
  ["intelligence", "INT"],
  ["wisdom", "WIS"],
  ["charisma", "CHA"],
];

const emptySaves = () => Object.fromEntries(SAVE_ABILITIES.map(([key]) => [key, ""]));

export function emptyStatBlock() {
  return { attacks: [], notes: "", initiativeBonus: "", saves: emptySaves() };
}

// Turns whatever is saved (possibly empty or partial) into form-friendly values.
export function readStatBlock(raw) {
  const attacks = Array.isArray(raw?.attacks) ? raw.attacks : [];

  return {
    attacks: attacks.map((attack) => ({
      name: String(attack?.name ?? ""),
      toHit: attack?.toHit === undefined || attack?.toHit === null ? "" : String(attack.toHit),
      damage: String(attack?.damage ?? ""),
    })),
    notes: String(raw?.notes ?? ""),
    initiativeBonus:
      raw?.initiativeBonus === undefined || raw?.initiativeBonus === null
        ? ""
        : String(raw.initiativeBonus),
    saves: Object.fromEntries(
      SAVE_ABILITIES.map(([key]) => {
        const value = raw?.saves?.[key];
        return [key, typeof value === "number" ? String(value) : ""];
      }),
    ),
  };
}

// The creature's SRD id ("kobold") when it was added from the SRD, else "".
// It's kept apart from the editable fields, and editing a creature carries it
// along (see CombatantEditPanel).
export function creatureIdOf(raw) {
  return typeof raw?.creature === "string" ? raw.creature : "";
}

// The saves a monster has, as [{ key, short, bonus }], only the ones typed.
export function savesOf(statBlock) {
  return SAVE_ABILITIES.flatMap(([key, short]) => {
    const value = statBlock?.saves?.[key];
    return typeof value === "number" ? [{ key, short, bonus: value }] : [];
  });
}

// Cleans form values for saving: drops attacks with no name, turns to-hit into a number.
export function cleanStatBlock(form) {
  const attacks = (form?.attacks ?? [])
    .map((attack) => ({
      name: String(attack.name ?? "").trim(),
      toHit: Number(attack.toHit) || 0,
      damage: String(attack.damage ?? "").trim(),
    }))
    .filter((attack) => attack.name !== "");

  const initiativeBonus = Number(form?.initiativeBonus) || 0;

  // Only the saves typed in (a blank box isn't +0, it's "not given").
  const saves = Object.fromEntries(
    SAVE_ABILITIES.flatMap(([key]) => {
      const text = String(form?.saves?.[key] ?? "").trim();
      const number = Math.round(Number(text));
      return text !== "" && Number.isFinite(number) ? [[key, Math.max(-5, Math.min(20, number))]] : [];
    }),
  );

  return {
    attacks,
    notes: String(form?.notes ?? "").trim(),
    ...(initiativeBonus ? { initiativeBonus } : {}),
    ...(Object.keys(saves).length > 0 ? { saves } : {}),
  };
}

// "Goblin" x3 -> Goblin 1, Goblin 2, Goblin 3. A single one keeps its plain name.
export function numberedNames(name, count) {
  const base = name.trim();
  const total = Math.max(1, Math.min(Number(count) || 1, 20));

  if (total === 1) return [base];
  return Array.from({ length: total }, (_, index) => `${base} ${index + 1}`);
}

// Little icons a DM can tag a monster with, to match the resin animal (or
// whatever stands in for it) on the table.
export const PIECE_ICONS = [
  "🦆",
  "🐧",
  "🐙",
  "🦀",
  "🐢",
  "🦊",
  "🐸",
  "🦉",
  "🐝",
  "🐞",
  "🦄",
  "🐲",
  "🦈",
  "🐻",
  "🐰",
  "🦇",
];

const MAX_NAME_LENGTH = 80;

// Names for a batch of identical monsters. Each piece can have an icon and a
// short description ("red duck"). Pieces with neither keep the plain number:
//   ("Goblin", 3, [{ icon: "🦆", label: "red duck" }]) ->
//   ["🦆 Goblin (red duck)", "Goblin 2", "Goblin 3"]
export function pieceNames(name, count, pieces = []) {
  return numberedNames(name, count).map((numbered, index) => {
    const label = String(pieces[index]?.label ?? "").trim();
    const icon = String(pieces[index]?.icon ?? "");
    const core = label ? `${name.trim()} (${label})` : numbered;
    const full = icon ? `${icon} ${core}` : core;
    return Array.from(full).slice(0, MAX_NAME_LENGTH).join("");
  });
}

// A name may start with one of the icons; pull it apart for the edit form.
export function splitIcon(name) {
  const text = String(name ?? "");
  const icon = PIECE_ICONS.find((candidate) => text.startsWith(`${candidate} `));
  return icon ? { icon, text: text.slice(icon.length + 1) } : { icon: "", text };
}

export function withIcon(text, icon) {
  return icon ? `${icon} ${text}` : text;
}

// True when a saved library entry is the same monster as `entry` (same side,
// name, HP, AC and stat block), so saving it again would only add a copy.
export function isSameTemplate(template, entry) {
  const normalize = (statBlock) => JSON.stringify(cleanStatBlock(readStatBlock(statBlock)));
  const name = (value) => String(value ?? "").trim().toLowerCase();
  const armorClass = (value) => (value === undefined || value === null || value === "" ? null : Number(value));

  return (
    template.kind === entry.kind &&
    name(template.name) === name(entry.name) &&
    Number(template.max_hp) === Number(entry.maxHp) &&
    armorClass(template.armor_class) === armorClass(entry.armorClass) &&
    normalize(template.stat_block) === normalize(entry.statBlock)
  );
}

// The newest activity lines that mention this fighter by name, so a monster's
// row can show what just happened to it. A name does not match inside a longer
// one ("Goblin" does not match "Goblin 2" or "Goblins").
export function recentEventsFor(events, name, limit = 2) {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return [];

  const pattern = new RegExp(`(?<![\\w])${escaped}(?!\\w)(?!\\s\\d)`);
  return events.filter((entry) => pattern.test(entry.message)).slice(0, limit);
}
