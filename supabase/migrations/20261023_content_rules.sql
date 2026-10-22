-- Allowed content: the DM can mark races, classes, backgrounds, feats and
-- spells as not allowed at their table ("no Tiefling, no Wish"). Players see
-- what isn't allowed, and the DM's Players tab flags any character that uses
-- one. Run this once in the Supabase SQL editor.
--
-- Nothing else is needed: players can already read their table's row, and
-- only the DM can change it (see 20261003_dm_tables.sql). It starts empty,
-- so nothing is restricted until the DM adds something.
--
-- Shape: { "race": ["Tiefling"], "spell": ["Wish"], ... } (names, by kind).

alter table public.game_tables
  add column if not exists banned_content jsonb not null default '{}'::jsonb;

-- A sensible cap, so this can't be used to store a novel.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_tables_banned_content_size'
  ) then
    alter table public.game_tables
      add constraint game_tables_banned_content_size check (char_length(banned_content::text) <= 20000);
  end if;
end $$;
