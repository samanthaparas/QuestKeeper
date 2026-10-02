import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import {
  getTable,
  listMembers,
  listCombatants,
  listEnemyHp,
  listEvents,
  subscribeToTable,
} from "../utils/tableStore";

// Seconds between safety refreshes. Live updates arrive instantly when Supabase
// Realtime is on; this keeps the page correct even if it is not.
const POLL_MS = 8000;

// Loads one table (members, combatants, and, for the DM, secret enemy HP) and
// keeps it fresh while the page is open.
export function useTable(tableId) {
  const { user } = useAuth();
  const [state, setState] = useState({
    table: null,
    members: [],
    combatants: [],
    enemyHp: {},
    events: [],
    isLoading: true,
    error: "",
  });

  const refresh = useCallback(async () => {
    try {
      const table = await getTable(tableId);

      if (!table) {
        setState((previous) => ({ ...previous, table: null, isLoading: false }));
        return;
      }

      const [members, combatants, events] = await Promise.all([
        listMembers(tableId),
        listCombatants(tableId),
        listEvents(tableId, 30),
      ]);

      const enemyHp =
        table.dm_id === user?.id
          ? await listEnemyHp(
              combatants
                .filter((combatant) => combatant.kind === "monster")
                .map((combatant) => combatant.id),
            )
          : {};

      setState({
        table,
        members,
        combatants,
        enemyHp,
        events,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: error.message ?? "Could not load this table.",
      }));
    }
  }, [tableId, user?.id]);

  useEffect(() => {
    refresh();
    const stopListening = subscribeToTable(tableId, refresh);
    const timer = setInterval(refresh, POLL_MS);

    return () => {
      stopListening();
      clearInterval(timer);
    };
  }, [tableId, refresh]);

  return {
    ...state,
    refresh,
    isDm: Boolean(state.table && state.table.dm_id === user?.id),
  };
}
