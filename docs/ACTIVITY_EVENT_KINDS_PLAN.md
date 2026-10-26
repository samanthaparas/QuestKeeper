# Plan: icons for every Activity line (first half done)

**Status (October 26, 2026):** the front end and the first database change are done. `supabase/migrations/20261024_activity_kinds.sql` is in the repository and has been run in Supabase (#239). What's left is tagging the system-written lines (the table below), which needs a second migration that is **not written yet**.

## What works today
- The DM screen's Activity log shows a small icon (attack, damage, healing, spell, turn, handout) for a line that has an explicit `kind`, and the six optimized icons are in the app.
- The database now accepts a `kind` (the first migration, below). The handout notice is the only line that sends one, so **in real play only handout notices show an icon yet**. Every other line is written without a kind and shows no icon.
- If a database ever lacks the kinds update, the app falls back to writing the line without a kind (covered by a test).
- A line with no kind, or an unknown kind, shows no icon and no empty box. The icon is never guessed from the words, because the DM can type any text into the log.

## The database change (done)
`20261024_activity_kinds.sql` adds a nullable `kind` column to `table_events` (limited to the six names), a three-argument `log_event`, and lets `dm_log` take an optional kind. Old two-argument calls keep working, existing log lines keep `kind = null`, and free-text lines the DM writes stay as they are. It is safe to run again.

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
1. ~~First migration~~ Done: committed and run in Supabase.
2. List every `log_event(` call site and the latest function that owns it; decide each kind from the table above.
3. Write the second migration (only the changed functions), and test each as a DM, a player and an outsider on a scratch Postgres first, as with the earlier table migrations.
4. Run it in the Supabase SQL editor, then check live lines in a real game night.
5. Keep the front end as it is (it already reads `kind`), and add checklist steps to the two-account test for "icons appear on the right lines and never on the wrong ones".
