// Ending a fight, the same way from every place the DM can do it (the table's
// End combat button, the "every enemy is down" prompt, and the "Still in
// combat?" reminder on the table screen or the DM Screen list).
//
// The summary is made from the activity log first, while the fight's creatures
// and round are still known; then combat ends and the log notes it. Returns
// the summary text ("" when nothing worth summing up happened) for the DM to
// post or skip. Nothing is posted here.

import { FIGHT_END_MESSAGE, buildFightSummary } from "./fightSummary";
import { dmLog, endCombat, listCombatants, listEvents } from "./tableStore";

// table: { id, round }. combatants: the fight's list; left out, it's loaded.
export async function endFightWithSummary(table, combatants = null) {
  const [log, fighters] = await Promise.all([
    listEvents(table.id, 200),
    combatants ? Promise.resolve(combatants) : listCombatants(table.id),
  ]);
  const summary = buildFightSummary({ events: log, combatants: fighters, rounds: table.round });
  await endCombat(table.id);
  await dmLog(table.id, FIGHT_END_MESSAGE);
  return summary;
}
