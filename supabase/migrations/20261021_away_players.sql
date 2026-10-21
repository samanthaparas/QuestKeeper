-- Away players: the DM can mark a player "away" (stepped out, phone call,
-- connection trouble) so their turns are skipped in the turn order until the
-- DM brings them back. They stay at the table with their place in the order.
-- Run this once in the Supabase SQL editor.
--
-- Only the DM sets it (they already can update combatants). It starts false,
-- so nothing changes for anyone until it's used.

alter table public.combatants
  add column if not exists away boolean not null default false;

-- A player passing the turn on: the same as before, but away players are
-- skipped. (The player whose turn it is always counts, so someone marked away
-- mid-turn can still end it.)
create or replace function public.end_my_turn(p_table_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_me public.combatants;
  v_order uuid[];
  v_index int;
  v_next_index int;
  v_round int;
begin
  select * into v_table from public.game_tables where id = p_table_id for update;
  if not found or not v_table.combat_active then raise exception 'There is no fight right now'; end if;

  select * into v_me from public.combatants
    where table_id = p_table_id and user_id = (select auth.uid()) and kind = 'player';
  if not found then raise exception 'You have not joined this table'; end if;
  if v_table.current_combatant_id is distinct from v_me.id then
    raise exception 'It is not your turn';
  end if;

  select array_agg(id order by initiative desc, created_at asc, id asc) into v_order
    from public.combatants
    where table_id = p_table_id
      and initiative is not null
      and not (kind = 'monster' and status = 'down')
      and (not away or id = v_me.id);

  v_index := array_position(v_order, v_me.id);
  if v_index is null then raise exception 'You are not in the turn order yet'; end if;

  v_round := v_table.round;
  v_next_index := v_index + 1;
  if v_next_index > array_length(v_order, 1) then
    v_next_index := 1;
    v_round := v_round + 1;
  end if;

  update public.game_tables
    set current_combatant_id = v_order[v_next_index], round = v_round
    where id = p_table_id;

  perform public.log_event(p_table_id, v_me.name || ' ends their turn.');
end;
$$;
