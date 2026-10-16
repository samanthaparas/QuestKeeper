-- Cleanup: removes two old database functions the app no longer calls. Run
-- this once in the Supabase SQL editor.
--
-- add_monster was replaced by add_combatant (monsters, allies and stat
-- blocks in one), and monster_attack_roll by dm_attack_roll (which also
-- counts a player's temporary AC bonus). Nothing in the app or in other
-- database functions uses the old two, so dropping them only removes
-- code that could be called but shouldn't be.
drop function if exists public.add_monster(uuid, text, int, int, int);
drop function if exists public.monster_attack_roll(uuid, uuid, text, int, int);
