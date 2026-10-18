-- Table journal: let people file a note under any session number, and move a
-- note to another session later. Run once in the Supabase SQL editor, after
-- 20261015_table_journal.sql.
--
-- Before: every note went under the table's current session and the browser
-- could not change that. Now the author picks the session (1 to 9999), so a
-- group continuing a long campaign can write about session 41, catch up on an
-- earlier session, or start a new one. If no session is sent, the note still
-- goes under the table's current session, so nothing about older code breaks.

-- 1. "0" means "no choice made": the trigger fills in the table's current session.
alter table public.table_journal_entries
  alter column session_number set default 0;

alter table public.table_journal_entries
  drop constraint if exists table_journal_session_range;
alter table public.table_journal_entries
  add constraint table_journal_session_range check (session_number between 0 and 9999);

-- 2. On a new note: keep the chosen session, or use the table's current one.
create or replace function public.journal_fill_in()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  new.author_id := (select auth.uid());
  new.created_at := now();
  new.updated_at := now();

  if coalesce(new.session_number, 0) < 1 then
    select session_number into new.session_number
      from public.game_tables where id = new.table_id;
  end if;

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

-- 3. On an edit: the session can change too, but never to 0 or below.
create or replace function public.journal_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.session_number < 1 then
    raise exception 'A session number must be 1 or more.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 4. The words, who can see it, and the session can be changed after writing.
revoke update on public.table_journal_entries from authenticated;
grant update (body, visibility, session_number) on public.table_journal_entries to authenticated;

-- 5. The DM can set the table's current session to any number (for example 41
--    when a campaign continues), not just the next one.
alter table public.game_tables
  drop constraint if exists game_tables_session_number_check;
alter table public.game_tables
  add constraint game_tables_session_number_check check (session_number between 1 and 9999);
