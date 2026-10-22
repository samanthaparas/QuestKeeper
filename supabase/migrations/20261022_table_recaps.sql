-- "Previously on...": one short recap per session at a table, written and
-- edited by the whole group (players and DM alike). Run this once in the
-- Supabase SQL editor.
--
-- Everyone at the table can read it and change it. To stop two people
-- overwriting each other silently, saving says which version it started from,
-- and a save from an out-of-date version is turned away so the person can see
-- what changed first.

create table if not exists public.table_recaps (
  table_id        uuid not null references public.game_tables (id) on delete cascade,
  session_number  int  not null check (session_number between 1 and 9999),
  body            text not null check (char_length(trim(body)) between 1 and 3000),
  -- Who saved it last, signed like a journal note: the character's name, or "DM".
  updated_by      uuid references auth.users (id) on delete set null,
  updated_by_name text not null default '',
  updated_at      timestamptz not null default now(),
  primary key (table_id, session_number)
);

alter table public.table_recaps enable row level security;

drop policy if exists "Read recaps at your tables" on public.table_recaps;
create policy "Read recaps at your tables"
  on public.table_recaps for select to authenticated
  using ((select public.is_table_participant(table_id)));

-- No one writes to the table directly: saving goes through the function below,
-- which checks the table and the version.
revoke insert, update, delete on public.table_recaps from authenticated, anon;

-- Saves a session's recap. p_expected_at is the updated_at of the version the
-- person was looking at (null when there was none yet). An empty body removes
-- the recap. Returns the saved row, or null when it was removed.
create or replace function public.save_table_recap(
  p_table_id uuid,
  p_session int,
  p_body text,
  p_expected_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.table_recaps;
  v_name text;
  v_body text := trim(coalesce(p_body, ''));
  v_user uuid := (select auth.uid());
  v_row public.table_recaps;
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'You are not at this table';
  end if;
  if p_session is null or p_session < 1 or p_session > 9999 then
    raise exception 'Pick a session number from 1 to 9999';
  end if;
  if char_length(v_body) > 3000 then
    raise exception 'That recap is too long (3000 characters at most)';
  end if;

  select * into v_existing from public.table_recaps
    where table_id = p_table_id and session_number = p_session
    for update;

  -- Someone saved (or removed) it since this person started editing.
  if (found and p_expected_at is distinct from v_existing.updated_at)
     or (not found and p_expected_at is not null) then
    raise exception 'RECAP_CHANGED: Someone else changed this recap just now';
  end if;

  if v_body = '' then
    delete from public.table_recaps where table_id = p_table_id and session_number = p_session;
    return null;
  end if;

  if public.is_table_dm(p_table_id) then
    v_name := 'DM';
  else
    select c.data ->> 'name' into v_name
      from public.table_members tm
      join public.characters c on c.id = tm.character_id
      where tm.table_id = p_table_id and tm.user_id = v_user;
  end if;
  v_name := left(coalesce(nullif(trim(v_name), ''), 'Adventurer'), 60);

  insert into public.table_recaps (table_id, session_number, body, updated_by, updated_by_name, updated_at)
    values (p_table_id, p_session, v_body, v_user, v_name, now())
    on conflict (table_id, session_number) do update
      set body = excluded.body,
          updated_by = excluded.updated_by,
          updated_by_name = excluded.updated_by_name,
          updated_at = excluded.updated_at
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke execute on function public.save_table_recap(uuid, int, text, timestamptz) from public, anon;
grant execute on function public.save_table_recap(uuid, int, text, timestamptz) to authenticated;

-- Live updates, so an edit shows up on everyone's screen.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'table_recaps'
  ) then
    alter publication supabase_realtime add table public.table_recaps;
  end if;
end;
$$;
