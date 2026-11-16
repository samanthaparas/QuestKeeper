// A monster's (or ally's) concentration, tracked by the DM. The spell and a
// "damage taken" baseline live in the DM-only combatant_secrets row (see
// 20261116_monster_concentration.sql); nothing here ever reaches a player.

// Which spell it's holding, or "" when none (or it's down, which ends it).
export function concentrationOf(combatant, secret) {
  if (!secret?.concentration || combatant?.status === "down") return "";
  return secret.concentration;
}

// A Constitution save is due when it has taken damage since the spell started
// or since its last save: { damage, dc } (DC 10, or half the damage if that's
// more), or null when nothing is due. Several hits since the last save are
// added together, so the DM may want to roll once per hit.
export function concentrationCheck(combatant, secret) {
  if (!concentrationOf(combatant, secret)) return null;
  const damage = (Number(combatant.damage_taken) || 0) - (Number(secret.concentration_damage) || 0);
  if (damage <= 0) return null;
  return { damage, dc: Math.max(10, Math.floor(damage / 2)) };
}

// The monster's Constitution save bonus from its stat block (0 if not given).
export function constitutionSave(statBlock) {
  return Number(statBlock?.saves?.constitution) || 0;
}
