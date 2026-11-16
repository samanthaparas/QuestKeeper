-- The DM tracks a monster's (or ally's) concentration: which spell it's
-- holding, and a reminder to roll the Constitution save when it takes damage.
-- Run this once in the Supabase SQL editor.
--
-- Kept in combatant_secrets, the DM-only table, so players never learn which
-- spell a monster is holding unless the DM tells them. The existing DM-only
-- read and update rules for that table cover the new columns.
--
--   concentration         the spell's name, or empty when it isn't holding one
--   concentration_damage  its "damage taken" when the spell started or the
--                         last save was made; more damage than that means a
--                         save is due

alter table public.combatant_secrets
  add column if not exists concentration text
    check (concentration is null or char_length(concentration) between 1 and 80);

alter table public.combatant_secrets
  add column if not exists concentration_damage int not null default 0;
