-- Campaigns: a table can run several campaigns one after another ("season 2"),
-- each with its own session numbers (1.1 to 1.43, then 2.1, 2.2, ...). The
-- Story tab shows the current campaign and keeps the older ones to read.
-- Run this once in the Supabase SQL editor, after 20261022_table_recaps.sql.
--
-- Nothing changes until a DM uses "Campaigns" on the Story tab: every
-- existing note stays in Campaign 1.

-- 1. The table's current campaign, and optional names for each ("Season 2").
alter table public.game_tables
  add column if not exists campaign_number int not null default 1
    check (campaign_number between 1 and 99),
  add column if not exists campaign_names jsonb not null default '{}'::jsonb;

-- 2. Which campaign each note belongs to (existing notes are Campaign 1).
alter table public.table_journal_entries
  add column if not exists campaign_number int not null default 1
    check (campaign_number between 1 and 99);

-- 3. A new note goes under the table's current campaign (and, if no session
--    was chosen, its current session), as before.
create or replace function public.journal_fill_in()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_table public.game_tables;
begin
  new.author_id := (select auth.uid());
  new.created_at := now();
  new.updated_at := now();

  select * into v_table from public.game_tables where id = new.table_id;
  new.campaign_number := coalesce(v_table.campaign_number, 1);
  if coalesce(new.session_number, 0) < 1 then
    new.session_number := coalesce(v_table.session_number, 1);
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

-- 4. Moving notes between campaigns must not make them look "edited", so the
--    edit stamp is skipped when a function says so (only inside its own
--    transaction).
create or replace function public.journal_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.session_number < 1 then
    raise exception 'A session number must be 1 or more.';
  end if;
  if coalesce(current_setting('app.skip_journal_touch', true), '') <> 'on' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- 5. Recaps are per campaign too (Campaign 1 and Campaign 2 can each have a
--    session 1).
alter table public.table_recaps
  add column if not exists campaign_number int not null default 1
    check (campaign_number between 1 and 99);
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = 'public.table_recaps'::regclass and i.indisprimary and a.attname = 'campaign_number'
  ) then
    alter table public.table_recaps drop constraint if exists table_recaps_pkey;
    alter table public.table_recaps add primary key (table_id, campaign_number, session_number);
  end if;
end;
$$;

drop function if exists public.save_table_recap(uuid, int, text, timestamptz);

-- Saves a session's recap (see 20261022_table_recaps.sql). p_campaign is the
-- campaign it belongs to; leave it out for the table's current one.
create or replace function public.save_table_recap(
  p_table_id uuid,
  p_session int,
  p_body text,
  p_expected_at timestamptz default null,
  p_campaign int default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.table_recaps;
  v_name text;
  v_body text := trim(coalesce(p_body, ''));
  v_user uuid := (select auth.uid());
  v_row public.table_recaps;
  v_campaign int;
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

  select coalesce(p_campaign, campaign_number, 1) into v_campaign
    from public.game_tables where id = p_table_id;

  select * into v_existing from public.table_recaps
    where table_id = p_table_id and campaign_number = v_campaign and session_number = p_session
    for update;

  if (found and p_expected_at is distinct from v_existing.updated_at)
     or (not found and p_expected_at is not null) then
    raise exception 'RECAP_CHANGED: Someone else changed this recap just now';
  end if;

  if v_body = '' then
    delete from public.table_recaps
      where table_id = p_table_id and campaign_number = v_campaign and session_number = p_session;
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

  insert into public.table_recaps (table_id, campaign_number, session_number, body, updated_by, updated_by_name, updated_at)
    values (p_table_id, v_campaign, p_session, v_body, v_user, v_name, now())
    on conflict (table_id, campaign_number, session_number) do update
      set body = excluded.body,
          updated_by = excluded.updated_by,
          updated_by_name = excluded.updated_by_name,
          updated_at = excluded.updated_at
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke execute on function public.save_table_recap(uuid, int, text, timestamptz, int) from public, anon;
grant execute on function public.save_table_recap(uuid, int, text, timestamptz, int) to authenticated;

-- 6. Campaign tools. Anyone at the table (players and DM) can use them. None
--    of them show anyone's private notes: they only change which campaign a note
--    belongs to, never who wrote it, when, or what it says.

-- Splits the table's current campaign in two at a moment in time: notes
-- written before p_cutoff stay in it (now named p_first_name), and notes
-- written from then on become the NEW current campaign (named p_second_name).
-- With p_restart_second, the new campaign's sessions are numbered from 1 in the
-- order they were first written. Returns how many notes ended up in each.
create or replace function public.split_campaign(
  p_table_id uuid,
  p_cutoff timestamptz,
  p_first_name text,
  p_second_name text,
  p_restart_second boolean default true
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_old int;
  v_new int;
  v_kept int;
  v_moved int;
  v_session int;
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'You are not at this table';
  end if;

  select * into v_table from public.game_tables where id = p_table_id for update;
  v_old := v_table.campaign_number;
  if v_old >= 99 then raise exception 'That is the most campaigns a table can have'; end if;
  v_new := v_old + 1;

  perform set_config('app.skip_journal_touch', 'on', true);

  update public.table_journal_entries
    set campaign_number = v_new
    where table_id = p_table_id and campaign_number = v_old and created_at >= p_cutoff;
  get diagnostics v_moved = row_count;

  select count(*) into v_kept from public.table_journal_entries
    where table_id = p_table_id and campaign_number = v_old;

  if p_restart_second then
    with firsts as (
      select session_number, min(created_at) as first_at
        from public.table_journal_entries
        where table_id = p_table_id and campaign_number = v_new
        group by session_number
    ), ranked as (
      select session_number, row_number() over (order by first_at, session_number) as number
        from firsts
    )
    update public.table_journal_entries e
      set session_number = r.number
      from ranked r
      where e.table_id = p_table_id and e.campaign_number = v_new
        and e.session_number = r.session_number;
  end if;

  select coalesce(max(session_number), 1) into v_session
    from public.table_journal_entries
    where table_id = p_table_id and campaign_number = v_new;

  update public.game_tables
    set campaign_number = v_new,
        session_number = case when p_restart_second then v_session else session_number end,
        campaign_names = campaign_names
          || jsonb_build_object(v_old::text, left(trim(coalesce(p_first_name, '')), 60))
          || jsonb_build_object(v_new::text, left(trim(coalesce(p_second_name, '')), 60))
    where id = p_table_id;

  return jsonb_build_object('campaign', v_new, 'kept', v_kept, 'moved', v_moved);
end;
$$;

-- Starts the next campaign from scratch (session 1), for a table that is done
-- with the current one.
create or replace function public.start_campaign(p_table_id uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_new int;
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'You are not at this table';
  end if;
  select * into v_table from public.game_tables where id = p_table_id for update;
  if v_table.campaign_number >= 99 then raise exception 'That is the most campaigns a table can have'; end if;
  v_new := v_table.campaign_number + 1;
  update public.game_tables
    set campaign_number = v_new,
        session_number = 1,
        campaign_names = campaign_names || jsonb_build_object(v_new::text, left(trim(coalesce(p_name, '')), 60))
    where id = p_table_id;
  return jsonb_build_object('campaign', v_new);
end;
$$;

-- Renames a campaign. A blank name goes back to "Campaign N".
create or replace function public.name_campaign(p_table_id uuid, p_campaign int, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'You are not at this table';
  end if;
  update public.game_tables
    set campaign_names = campaign_names || jsonb_build_object(p_campaign::text, left(trim(coalesce(p_name, '')), 60))
    where id = p_table_id and p_campaign between 1 and campaign_number;
end;
$$;

-- Moves notes to another campaign (to fix one that landed on the wrong side
-- of a split). Never touches who wrote it or when.
create or replace function public.move_journal_entries(p_table_id uuid, p_entry_ids uuid[], p_campaign int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_current int;
  v_moved int;
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'You are not at this table';
  end if;
  select campaign_number into v_current from public.game_tables where id = p_table_id;
  if p_campaign is null or p_campaign < 1 or p_campaign > v_current then
    raise exception 'That campaign does not exist';
  end if;
  perform set_config('app.skip_journal_touch', 'on', true);
  update public.table_journal_entries
    set campaign_number = p_campaign
    where table_id = p_table_id and id = any (p_entry_ids);
  get diagnostics v_moved = row_count;
  return v_moved;
end;
$$;

revoke execute on function public.split_campaign(uuid, timestamptz, text, text, boolean) from public, anon;
revoke execute on function public.start_campaign(uuid, text) from public, anon;
revoke execute on function public.name_campaign(uuid, int, text) from public, anon;
revoke execute on function public.move_journal_entries(uuid, uuid[], int) from public, anon;
grant execute on function public.split_campaign(uuid, timestamptz, text, text, boolean) to authenticated;
grant execute on function public.start_campaign(uuid, text) to authenticated;
grant execute on function public.name_campaign(uuid, int, text) to authenticated;
grant execute on function public.move_journal_entries(uuid, uuid[], int) to authenticated;
