-- Journal reactions: everyone at a table can react to other people's shared
-- journal notes with 👍 ❤️ 😂 😮 🎲. Tap again to take it back.
-- Run this once in the Supabase SQL editor, after 20261015_table_journal.sql.
--
-- Who can do what:
--   Everyone at the table  sees the reactions on the table's shared notes,
--                          adds their own, and takes their own back.
--   Nobody                 reacts to their own note, or to a "Just me" note
--                          (only its writer can see it anyway).
-- Each reaction is signed with the reactor's character name (or "DM"), like
-- the notes themselves, so "who reacted" never needs another lookup.

create table if not exists public.journal_reactions (
  entry_id     uuid not null references public.table_journal_entries (id) on delete cascade,
  -- Copied from the note, so live updates and the rules can go by table.
  table_id     uuid not null references public.game_tables (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reactor_name text not null default '',
  emoji        text not null check (emoji in ('👍', '❤️', '😂', '😮', '🎲')),
  created_at   timestamptz not null default now(),
  primary key (entry_id, user_id, emoji)
);

create index if not exists journal_reactions_table_idx on public.journal_reactions (table_id);

-- Fill in who reacted, which table and their name, and check the note can be
-- reacted to, so the browser can't fake any of it.
create or replace function public.journal_reaction_fill_in()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_entry public.table_journal_entries;
  v_name text;
begin
  new.user_id := (select auth.uid());
  new.created_at := now();

  select * into v_entry from public.table_journal_entries where id = new.entry_id;
  if not found then raise exception 'That note is gone'; end if;
  if v_entry.visibility <> 'table' then raise exception 'Only shared notes take reactions'; end if;
  if v_entry.author_id = new.user_id then raise exception 'You can''t react to your own note'; end if;
  if not public.is_table_participant(v_entry.table_id) then raise exception 'You are not at this table'; end if;
  new.table_id := v_entry.table_id;

  if public.is_table_dm(v_entry.table_id) then
    v_name := 'DM';
  else
    select c.data ->> 'name' into v_name
      from public.table_members tm
      join public.characters c on c.id = tm.character_id
      where tm.table_id = v_entry.table_id and tm.user_id = new.user_id;
  end if;
  new.reactor_name := left(coalesce(nullif(trim(v_name), ''), 'Adventurer'), 60);
  return new;
end;
$$;

drop trigger if exists journal_reaction_fill_in on public.journal_reactions;
create trigger journal_reaction_fill_in
  before insert on public.journal_reactions
  for each row execute function public.journal_reaction_fill_in();

alter table public.journal_reactions enable row level security;

drop policy if exists "See reactions at your tables" on public.journal_reactions;
create policy "See reactions at your tables"
  on public.journal_reactions for select to authenticated
  using ((select public.is_table_participant(table_id)));

drop policy if exists "React at your tables" on public.journal_reactions;
create policy "React at your tables"
  on public.journal_reactions for insert to authenticated
  with check ((select public.is_table_participant(table_id)));

drop policy if exists "Take back your own reactions" on public.journal_reactions;
create policy "Take back your own reactions"
  on public.journal_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Reactions are only ever added or taken back, never changed.
revoke update on public.journal_reactions from authenticated;

-- Live updates, so a reaction shows up on everyone's screen. Old rows keep
-- their table_id for deletes, so the table filter still matches them.
alter table public.journal_reactions replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'journal_reactions'
  ) then
    alter publication supabase_realtime add table public.journal_reactions;
  end if;
end;
$$;
