import { getAbilityModifier, rollDie } from "./characterSheet";

// Combatants come straight from the `combatants` table:
// { id, kind: "player" | "monster", name, initiative, status, damage_taken, created_at }

export const STATUS_LABELS = {
  healthy: "Healthy",
  bloodied: "Bloodied",
  down: "Down",
};

// Highest initiative first. Ties keep a stable order (earliest added first).
// Combatants with no initiative yet are left out.
export function sortCombatants(combatants) {
  return combatants
    .filter((combatant) => combatant.initiative !== null)
    .filter((combatant) => combatant.initiative !== undefined)
    .sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return String(a.created_at).localeCompare(String(b.created_at));
    });
}

// Who actually gets a turn: defeated monsters are skipped.
function takesTurns(combatant) {
  return !(combatant.kind === "monster" && combatant.status === "down");
}

export function getTurnOrder(combatants) {
  return sortCombatants(combatants).filter(takesTurns);
}

// { now, next } for the banner. `next` is null when only one combatant is left.
export function getNowAndNext(combatants, currentId) {
  const order = getTurnOrder(combatants);
  const index = order.findIndex((combatant) => combatant.id === currentId);

  if (index === -1) return { now: null, next: null };

  return {
    now: order[index],
    next: order.length > 1 ? order[(index + 1) % order.length] : null,
  };
}

// Moves to the next combatant who takes a turn. Wrapping past the end starts a
// new round. Works even if the current combatant was just defeated.
export function getNextTurn(combatants, currentId, round) {
  const sorted = sortCombatants(combatants);
  const startIndex = sorted.findIndex((combatant) => combatant.id === currentId);

  if (sorted.every((combatant) => !takesTurns(combatant)) || sorted.length === 0) {
    return { currentId: null, round };
  }

  // Nobody's turn yet (combat just started): begin with the first in order.
  if (startIndex === -1) {
    const first = sorted.find(takesTurns);
    return { currentId: first.id, round };
  }

  for (let step = 1; step <= sorted.length; step += 1) {
    const index = (startIndex + step) % sorted.length;
    if (takesTurns(sorted[index])) {
      const wrapped = startIndex + step >= sorted.length;
      return { currentId: sorted[index].id, round: wrapped ? round + 1 : round };
    }
  }

  return { currentId: null, round };
}

export function rollInitiative(dexterityScore) {
  const roll = rollDie(20);
  const modifier = getAbilityModifier(dexterityScore ?? 10);
  return { roll, modifier, total: roll + modifier };
}
