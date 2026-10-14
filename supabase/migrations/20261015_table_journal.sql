-- Table journal: everyone at a table (DM and players) writes short notes and
-- session recaps into one shared feed. Each entry is signed with the
-- character's name (or "DM") and a time, and is either for the whole table
-- or "Just me". Run this once in the Supabase SQL editor.
--
-- Who can do what:
--   Everyone at the table  read shared entries, write their own.
--   The author only        read their private entries, edit or delete theirs.
--   The DM                 starts a new session (the feed groups by session).
--                          The DM can NOT read players' private entries.

-- 1. Sessions: the table's current session number. The DM bumps it with
--    "Start session N" (the DM can already update their own table row).
alter table public.game_tables
  add column if not exists session_number int not null default 1 check (session_number >= 1);

-- 2. The entries.
create table if not exists public.table_journal_entries (
  id             uuid primary key default gen_random_uuid(),
  table_id       uuid not null references public.game_tables (id) on delete cascade,
  author_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Stamped when written: the character's name, or "DM". Kept even if the
  -- character is renamed later, like a signature.
  author_name    text not null default '',
  session_number int not null default 1,
  body           text not null check (char_length(trim(body)) between 1 and 4000),
  visibility     text not null default 'table' check (visibility in ('table', 'private')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists table_journal_entries_table_idx
  on public.table_journal_entries (table_id, created_at);

-- 3. Fill in who wrote it and which session, so the browser can't fake them.
create or replace function public.journal_fill_in()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  new.author_id := (select auth.uid());
  new.created_at := now();
  new.updated_at := now();

  select session_number into new.session_number
    from public.game_tables where id = new.table_id;

  if public.is_table_dm(new.table_id) then
    v_name := 'DM';
  else
    select c.data ->> 'name' into v_name
      from public.table_members tm
      join public.characters c on c.id = tm.character_id
      where tm.table_id = new.table_id and tm.user_id = new.author_id;
  end if;
  new.author_name := left(coalesce(nullif(trim(v_name), ''), 'Adventurer'), 60);
  return new;
end;
$$;

drop trigger if exists journal_fill_in on public.table_journal_entries;
create trigger journal_fill_in
  before insert on public.table_journal_entries
  for each row execute function public.journal_fill_in();

-- Edits only touch the words and who can see them, and note the time.
create or replace function public.journal_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists journal_touch on public.table_journal_entries;
create trigger journal_touch
  before update on public.table_journal_entries
  for each row execute function public.journal_touch();

-- 4. Row-level security.
alter table public.table_journal_entries enable row level security;

drop policy if exists "Read shared entries and your own" on public.table_journal_entries;
create policy "Read shared entries and your own"
  on public.table_journal_entries for select to authenticated
  using (
    author_id = (select auth.uid())
    or (visibility = 'table' and (select public.is_table_participant(table_id)))
  );

drop policy if exists "Write entries at your tables" on public.table_journal_entries;
create policy "Write entries at your tables"
  on public.table_journal_entries for insert to authenticated
  with check ((select public.is_table_participant(table_id)));

drop policy if exists "Edit your own entries" on public.table_journal_entries;
create policy "Edit your own entries"
  on public.table_journal_entries for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Delete your own entries" on public.table_journal_entries;
create policy "Delete your own entries"
  on public.table_journal_entries for delete to authenticated
  using (author_id = (select auth.uid()));

-- Only the words and the visibility can ever be changed after writing.
revoke update on public.table_journal_entries from authenticated;
grant update (body, visibility) on public.table_journal_entries to authenticated;

-- 5. Live updates, so a new note shows up on everyone's screen.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'table_journal_entries'
  ) then
    alter publication supabase_realtime add table public.table_journal_entries;
  end if;
end;
$$;
