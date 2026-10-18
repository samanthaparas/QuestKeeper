-- Personal journal: every character gets a private journal of their own, with
-- numbered sessions, whether or not they are at a table. Run once in the
-- Supabase SQL editor.
--
-- Who can do what: only the character's owner can read, write, edit or delete
-- their personal notes. Nobody else (not a DM, not another player) can see
-- them. Sharing is the owner's choice: from the sheet they can copy chosen
-- notes into a table's journal (for the whole table, or as "Just me" notes),
-- and the note remembers where it was shared so it isn't copied twice.

create table if not exists public.character_journal_entries (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references public.characters (id) on delete cascade,
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_number  int  not null default 1 check (session_number between 1 and 9999),
  body            text not null check (char_length(trim(body)) between 1 and 4000),
  -- Set when the note was brought into a table's journal.
  shared_table_id uuid references public.game_tables (id) on delete set null,
  shared_as       text check (shared_as in ('table', 'private')),
  shared_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists character_journal_entries_character_idx
  on public.character_journal_entries (character_id, created_at);

-- Fill in who wrote it, so the browser can't fake it; and note edit times.
create or replace function public.character_journal_fill_in()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.owner_id := (select auth.uid());
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists character_journal_fill_in on public.character_journal_entries;
create trigger character_journal_fill_in
  before insert on public.character_journal_entries
  for each row execute function public.character_journal_fill_in();

create or replace function public.character_journal_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists character_journal_touch on public.character_journal_entries;
create trigger character_journal_touch
  before update on public.character_journal_entries
  for each row execute function public.character_journal_touch();

-- Row-level security: the owner, and only on their own characters.
alter table public.character_journal_entries enable row level security;

drop policy if exists "Read your own personal notes" on public.character_journal_entries;
create policy "Read your own personal notes"
  on public.character_journal_entries for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Write notes for your own characters" on public.character_journal_entries;
create policy "Write notes for your own characters"
  on public.character_journal_entries for insert to authenticated
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Edit your own personal notes" on public.character_journal_entries;
create policy "Edit your own personal notes"
  on public.character_journal_entries for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Delete your own personal notes" on public.character_journal_entries;
create policy "Delete your own personal notes"
  on public.character_journal_entries for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Only the words, the session and the "shared" marks can be changed later.
revoke update on public.character_journal_entries from authenticated;
grant update (body, session_number, shared_table_id, shared_as, shared_at)
  on public.character_journal_entries to authenticated;
