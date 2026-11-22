-- Starting a new campaign at any session number, not only session 1 (for a
-- group that moves an ongoing game into QuestKeeper partway through, say at
-- session 12). Run this once in the Supabase SQL editor.
--
-- Same as before (see 20261022_campaigns.sql): anyone at the table can start
-- the next campaign, and everything so far stays as the earlier campaign.
-- The only change is p_first_session, which defaults to 1, so nothing
-- changes for anyone who leaves it out.

-- The old two-argument version goes first, so there's only ever one
-- start_campaign (two versions that differ by a default confuse the API).
drop function if exists public.start_campaign(uuid, text);

create or replace function public.start_campaign(p_table_id uuid, p_name text, p_first_session int default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_new int;
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'You are not at this table';
  end if;
  if p_first_session is null or p_first_session < 1 or p_first_session > 9999 then
    raise exception 'The first session must be a number from 1 to 9999';
  end if;
  select * into v_table from public.game_tables where id = p_table_id for update;
  if v_table.campaign_number >= 99 then raise exception 'That is the most campaigns a table can have'; end if;
  v_new := v_table.campaign_number + 1;
  update public.game_tables
    set campaign_number = v_new,
        session_number = p_first_session,
        campaign_names = campaign_names || jsonb_build_object(v_new::text, left(trim(coalesce(p_name, '')), 60))
    where id = p_table_id;
  return jsonb_build_object('campaign', v_new);
end;
$$;

revoke execute on function public.start_campaign(uuid, text, int) from public, anon;
grant execute on function public.start_campaign(uuid, text, int) to authenticated;
