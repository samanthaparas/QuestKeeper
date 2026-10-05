// A monster's or ally's stat block lives in the database as
//   { attacks: [{ name, toHit, damage }], notes: "...", initiativeBonus: 2 }
// and is only ever visible to the DM. These helpers keep the form state and the
// saved shape in step.

export function emptyStatBlock() {
  return { attacks: [], notes: "", initiativeBonus: "" };
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
  };
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

  return {
    attacks,
    notes: String(form?.notes ?? "").trim(),
    ...(initiativeBonus ? { initiativeBonus } : {}),
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
