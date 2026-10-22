# Plan: icons for every Activity line (not started)

**Status:** only the front-end groundwork exists. The database part is planned and not committed. Nothing here has been run against a real database.

## What works today
- The DM screen's Activity log has the code to show a small icon (attack, damage, healing, spell, turn, handout) for a line that has an explicit `kind`, and the six optimized icons are in the app.
- The screenshots show all six icons only because the sample events were given kinds by hand.
- **In real play, no log line has a kind yet, so no icon shows.** The handout notice is the only place the app sends a kind, and the database doesn't accept one until the planned change below exists. Until then the app falls back to writing the line without a kind (this fallback is covered by a test).
- A line with no kind, or an unknown kind, shows no icon and no empty box. The icon is never guessed from the words, because the DM can type any text into the log.

## The database change (planned, NOT in the repository)
A draft migration exists only on the maker's computer and was deliberately left out of the commits, because it has never been tested against a database. Do not look for it in the repository and do not run anything from this plan yet.

The draft would: add a nullable `kind` column to `table_events` (limited to the six names), add a three-argument `log_event`, and let `dm_log` take an optional kind. Old two-argument calls keep working, existing log lines keep `kind = null`, and free-text lines the DM writes stay as they are. It must be tried on a scratch database (the local throwaway Postgres used for earlier migrations) first.

## Tagging the system-generated lines
Each of these functions writes log lines with fixed templates. For each one, pass the right kind where it calls `log_event(...)`, in a new migration that re-creates only the changed functions (using their latest definitions):

| Kind | Where it is written (latest migration that defines it) |
| --- | --- |
| `attack` | player attack roll and monster/ally attack functions (`attack_roll`, `dm_attack_roll`, `dm_resolve_attack`, the hit/miss/crit lines, "vs ... That hits/misses") |
| `damage` | `post_player_damage` (a request, wording stays "request"), `apply_damage`, typed-damage lines, DM-applied damage |
| `healing` | healing branch of the enemy HP change (negative amounts), temp/heal lines |
| `spell` | only lines from an explicit cast action; none exist yet, so this stays unused until casting is logged by the server |
| `turn` | `advance_turn`, `end_my_turn` ("ends their turn"), "turn begins", start and end of combat |
| `handout` | already done on the client via `dmLog(..., "handout")` |

Rules to keep: the line's text stays the source of truth (an attack icon is not a hit, a damage request is not damage applied, the healing bottle is not a consumed potion); `dm_log` free text only ever gets a kind the client chose, never one worked out from its words.

## Steps
1. Test the draft migration (kept locally, not committed) on the scratch Postgres, then commit it once it passes: run it twice, call `log_event` with two and three arguments, call `dm_log` with and without a kind, check the constraint rejects a bad kind, and check players still cannot read other tables' events.
2. List every `log_event(` call site and the latest function that owns it; decide each kind from the table above.
3. Write the second migration (only the changed functions), and test each as a DM, a player and an outsider, as with the earlier table migrations.
4. Run both migrations in the Supabase SQL editor, then check live lines in a real game night.
5. Keep the front end as it is (it already reads `kind`), and add checklist steps to the two-account test for "icons appear on the right lines and never on the wrong ones".
