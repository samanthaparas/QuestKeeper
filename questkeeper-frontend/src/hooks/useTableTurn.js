import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import {
  getActiveCombatForCharacter,
  subscribeToTable,
} from "../utils/tableStore";
import { getNowAndNext } from "../utils/initiative";

const POLL_MS = 5000;

// For a player's character sheet: if this character's table is in combat,
// returns whose turn it is, the latest log message, the player's own combatant
// (for attacks), and any damage the DM has posted for them. Returns null when
// there is no fight.
export function useTableTurn(characterId) {
  const { user } = useAuth();
  const userId = user?.id;
  const [combat, setCombat] = useState(null);
  const [tick, setTick] = useState(0);

  // Lets the page ask for an immediate refresh after the player acts.
  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!characterId) return undefined;

    let cancelled = false;
    let subscribedTableId = null;
    let stopListening = () => {};

    async function load() {
      try {
        const result = await getActiveCombatForCharacter(characterId, userId);
        if (cancelled) return;

        setCombat(result);

        if (result && subscribedTableId !== result.table.id) {
          stopListening();
          subscribedTableId = result.table.id;
          stopListening = subscribeToTable(result.table.id, load);
        }
      } catch {
        if (!cancelled) setCombat(null);
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      stopListening();
    };
  }, [characterId, userId, tick]);

  if (!combat) return null;

  const { now, next } = getNowAndNext(
    combat.combatants,
    combat.table.current_combatant_id,
  );
  const myCombatant =
    combat.combatants.find(
      (combatant) => combatant.kind === "player" && combatant.user_id === userId,
    ) ?? null;

  return {
    table: combat.table,
    round: combat.table.round,
    combatants: combat.combatants,
    now,
    next,
    myCombatant,
    isMyTurn: Boolean(myCombatant && now && now.id === myCombatant.id),
    latestEvent: combat.events[0] ?? null,
    damageRequests: combat.damageRequests,
    refresh,
  };
}
