// A monster's or ally's stat block lives in the database as
//   { attacks: [{ name, toHit, damage }], notes: "..." }
// and is only ever visible to the DM. These helpers keep the form state and the
// saved shape in step.

export function emptyStatBlock() {
  return { attacks: [], notes: "" };
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

  return { attacks, notes: String(form?.notes ?? "").trim() };
}

// "Goblin" x3 -> Goblin 1, Goblin 2, Goblin 3. A single one keeps its plain name.
export function numberedNames(name, count) {
  const base = name.trim();
  const total = Math.max(1, Math.min(Number(count) || 1, 20));

  if (total === 1) return [base];
  return Array.from({ length: total }, (_, index) => `${base} ${index + 1}`);
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
