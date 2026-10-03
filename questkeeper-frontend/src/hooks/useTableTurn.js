import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import {
  endMyTurn,
  getActiveCombatForCharacter,
  subscribeToTable,
} from "../utils/tableStore";
import { getNowAndNext } from "../utils/initiative";

const POLL_MS = 5000;

// Which table a player is following is remembered per character, so a
// character at several tables keeps showing the one they chose.
function readChoice(characterId) {
  try {
    return window.localStorage.getItem(`qk-active-table-${characterId}`);
  } catch {
    return null;
  }
}

function writeChoice(characterId, tableId) {
  try {
    window.localStorage.setItem(`qk-active-table-${characterId}`, tableId);
  } catch {
    // Remembering is a convenience; the choice still works for this visit.
  }
}

// For a player's character sheet: if this character's table is in combat,
// returns whose turn it is, the latest log message, the player's own combatant
// (for attacks), and any damage the DM has posted for them. Returns null when
// there is no fight.
export function useTableTurn(characterId) {
  const { user } = useAuth();
  const userId = user?.id;
  const [combat, setCombat] = useState(null);
  const [tick, setTick] = useState(0);
  const [choice, setChoice] = useState({ characterId: null, tableId: null });

  const preferredTableId =
    choice.characterId === characterId ? choice.tableId : readChoice(characterId);

  const switchTable = useCallback(
    (tableId) => {
      writeChoice(characterId, tableId);
      setChoice({ characterId, tableId });
    },
    [characterId],
  );

  // Lets the page ask for an immediate refresh after the player acts.
  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!characterId) return undefined;

    let cancelled = false;
    let subscribedTableId = null;
    let stopListening = () => {};

    async function load() {
      try {
        const result = await getActiveCombatForCharacter(
          characterId,
          userId,
          preferredTableId,
        );
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
  }, [characterId, userId, preferredTableId, tick]);

  // Pass the turn on. Not every turn is an attack: moving, drinking a potion, or
  // casting a support spell all end the same way.
  async function endTurn() {
    await endMyTurn(combat.table.id);
    refresh();
  }

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
    tableName: combat.table.name,
    activeTables: combat.activeTables ?? [],
    switchTable,
    endTurn,
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
