-- "Step away (brb)": a player can mark themselves away, and back, without
-- waiting for the DM. While away, their turns are skipped (the same "away"
-- the DM already sets, see 20261021_away_players.sql). Run this once in the
-- Supabase SQL editor.
--
-- Players can't change combatant rows directly, so this function changes only
-- the caller's own player row, and only its "away" mark. If it's their turn
-- when they step away, their turn ends first so the table isn't stuck waiting.

create or replace function public.set_my_away(p_table_id uuid, p_away boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_me public.combatants;
begin
  select * into v_table from public.game_tables where id = p_table_id;
  if not found then raise exception 'That table was not found'; end if;

  select * into v_me from public.combatants
    where table_id = p_table_id and user_id = (select auth.uid()) and kind = 'player';
  if not found then raise exception 'You have not joined this table'; end if;

  -- Already as asked: nothing to do, and nothing to log twice.
  if v_me.away = p_away then return; end if;

  -- Stepping away on your own turn passes the turn on first.
  if p_away and v_table.combat_active and v_table.current_combatant_id = v_me.id then
    perform public.end_my_turn(p_table_id);
  end if;

  update public.combatants set away = p_away where id = v_me.id;

  perform public.log_event(
    p_table_id,
    case when p_away
      then v_me.name || ' stepped away (brb). Their turns are skipped until they''re back.'
      else v_me.name || ' is back.'
    end
  );
end;
$$;

revoke execute on function public.set_my_away(uuid, boolean) from public, anon;
grant execute on function public.set_my_away(uuid, boolean) to authenticated;
