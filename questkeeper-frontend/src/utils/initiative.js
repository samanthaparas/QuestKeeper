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

// How many people the banner lists after whoever is going now.
export const UPCOMING_COUNT = 2;

// { now, next, upcoming } for the banner. `upcoming` is the next few in turn
// order (wrapping into the next round) without repeating whoever is going
// now, so a two-person fight lists just one. `next` is upcoming[0], or null.
export function getNowAndNext(combatants, currentId) {
  const order = getTurnOrder(combatants);
  const index = order.findIndex((combatant) => combatant.id === currentId);

  if (index === -1) return { now: null, next: null, upcoming: [] };

  const upcoming = [];
  for (let step = 1; step <= UPCOMING_COUNT && step < order.length; step += 1) {
    upcoming.push(order[(index + step) % order.length]);
  }

  return { now: order[index], next: upcoming[0] ?? null, upcoming };
}

// "Next: Kobold, then Thorn", saying "you" for the viewer's own character:
// "You're up next, then Kobold" or "Next: Kobold, then you".
export function describeUpcoming(upcoming, myCombatantId) {
  if (!upcoming || upcoming.length === 0) return "";

  const names = upcoming.map((combatant) =>
    combatant.id === myCombatantId ? "you" : combatant.name,
  );
  const [first, ...rest] = names;
  const then = rest.map((name) => `, then ${name}`).join("");

  return first === "you" ? `You're up next${then}` : `Next: ${first}${then}`;
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

// A monster's initiative: a d20 plus the bonus on its stat block (its Dexterity
// modifier, usually).
export function rollMonsterInitiative(bonus = 0) {
  const roll = rollDie(20);
  const modifier = Number(bonus) || 0;
  return { roll, modifier, total: roll + modifier };
}

export function rollInitiative(dexterityScore) {
  const roll = rollDie(20);
  const modifier = getAbilityModifier(dexterityScore ?? 10);
  return { roll, modifier, total: roll + modifier };
}
