// "Database check" in Settings: has each recent SQL file been run in
// Supabase? Each check asks the database something harmless, and reads the
// answer:
// - the function or column is there: the file has run,
// - "not found": it hasn't (or didn't finish, like when the SQL editor timed
//   out),
// - anything else (no signal, signed out): we can't tell right now.
//
// Nothing here changes anything. The function checks use an id no table has,
// so they stop at "not found" or "not at this table" before doing anything.
// Two files can't be checked this way and aren't listed:
// 20261109_damage_taken_counts_real_damage.sql (it changes how a sum is
// worked out) and 20261115_drop_old_recap_save.sql (it removes something).

import { supabase } from "./supabaseClient";

const NO_TABLE = "00000000-0000-0000-0000-000000000000";

// Errors that mean "this function, table or column isn't in the database".
const MISSING_CODES = new Set(["PGRST202", "PGRST204", "PGRST205", "42703", "42P01", "42883"]);

// What a check's answer means: "ok", "missing" or "unknown".
export function readCheck(error) {
  if (!error) return "ok";
  // A function that ran and refused (raise exception), or said no: it's there.
  if (error.code === "P0001" || error.code === "42501") return "ok";
  if (MISSING_CODES.has(error.code)) return "missing";
  return "unknown";
}

const column = (table, name) => () => supabase.from(table).select(name).limit(0);

// Newest first: the files most likely not to have been run yet.
export const DB_CHECKS = [
  {
    file: "20261122_campaign_start_session.sql",
    what: "Start a new campaign at any session",
    run: () => supabase.rpc("start_campaign", { p_table_id: NO_TABLE, p_name: "", p_first_session: 1 }),
  },
  {
    file: "20261116_player_brb.sql",
    what: "Players can step away (brb)",
    run: () => supabase.rpc("set_my_away", { p_table_id: NO_TABLE, p_away: false }),
  },
  {
    file: "20261116_monster_concentration.sql",
    what: "The DM tracks a monster's concentration",
    run: column("combatant_secrets", "concentration, concentration_damage"),
  },
  { file: "20261109_journal_reactions.sql", what: "Reactions on journal notes", run: column("journal_reactions", "emoji") },
  { file: "20261024_activity_kinds.sql", what: "Icons on the activity log", run: column("table_events", "kind") },
  { file: "20261023_content_rules.sql", what: "Allowed content at a table", run: column("game_tables", "banned_content") },
  { file: "20261022_campaigns.sql", what: "Campaigns in the journal", run: column("game_tables", "campaign_number, campaign_names") },
];

// Runs every check: [{ file, what, status }], in the order above.
export async function runDbChecks(checks = DB_CHECKS) {
  return Promise.all(
    checks.map(async ({ file, what, run }) => {
      try {
        const { error } = await run();
        return { file, what, status: readCheck(error) };
      } catch {
        return { file, what, status: "unknown" };
      }
    }),
  );
}
