-- Campaigns: choose which notes are the OLDER campaign by when they were
-- written, instead of assuming the older campaign was written first. (A group
-- may type a finished campaign's notes in long after, all in one evening.)
-- Run this once in the Supabase SQL editor, after 20261022_campaigns.sql.
--
-- The notes written between p_old_from and p_old_until (either can be left
-- out for "no limit") stay in the table's current campaign, which is renamed
-- p_first_name and becomes the older one. Every other note becomes the NEW
-- current campaign, named p_second_name. With p_restart_second, the new
-- campaign's sessions are numbered from 1 in the order they were first
-- written. Nothing is deleted, and who wrote a note, when, and what it says
-- never change. Returns how many notes ended up in each.

drop function if exists public.split_campaign(uuid, timestamptz, text, text, boolean);

create or replace function public.split_campaign(
  p_table_id uuid,
  p_old_from timestamptz,
  p_old_until timestamptz,
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

  -- Everything outside the older campaign's window becomes the new campaign.
  update public.table_journal_entries
    set campaign_number = v_new
    where table_id = p_table_id
      and campaign_number = v_old
      and not (
        created_at >= coalesce(p_old_from, '-infinity'::timestamptz)
        and created_at <= coalesce(p_old_until, 'infinity'::timestamptz)
      );
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

revoke execute on function public.split_campaign(uuid, timestamptz, timestamptz, text, text, boolean) from public, anon;
grant execute on function public.split_campaign(uuid, timestamptz, timestamptz, text, text, boolean) to authenticated;
