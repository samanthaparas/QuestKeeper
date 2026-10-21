-- Table rules: a few plain lines the DM writes ("phones away unless it's your
-- turn", "tell us early if you can't make it") that players see on their
-- game page. It's session zero, written down where everyone can find it.
-- Run this once in the Supabase SQL editor.
--
-- Nothing else is needed: participants can already read their table's row, and
-- only the DM can update it (see 20261003_dm_tables.sql). It starts empty,
-- and an empty table shows players nothing.

alter table public.game_tables
  add column if not exists table_rules text not null default '';

-- A sensible cap, so one box can't be used to store a novel.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_tables_table_rules_length'
  ) then
    alter table public.game_tables
      add constraint game_tables_table_rules_length check (char_length(table_rules) <= 1500);
  end if;
end $$;
