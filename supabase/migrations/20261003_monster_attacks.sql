-- QuestKeeper: enemies roll to hit, the DM can see what a player rolled, and
-- initiative is locked once combat has started.
--
-- Run AFTER 20261003_attack_counter.sql in the Supabase SQL Editor.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Remember the last attack roll (visible to the table, nothing secret)
-- ---------------------------------------------------------------------------

alter table public.combatants
  add column if not exists attack_natural int check (attack_natural between 1 and 20),
  add column if not exists attack_bonus int;

-- A new turn (or a new/ended fight) wipes the attack state, roll included.
create or replace function public.reset_attack_counters()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.current_combatant_id is distinct from old.current_combatant_id
     or new.combat_active is distinct from old.combat_active then
    update public.combatants set
      attacks_this_turn = 0,
      attack_state = 'none',
      attack_target = null,
      attack_crit = false,
      attack_natural = null,
      attack_bonus = null,
      last_attack_target = null,
      last_attack_damage = 0
    where table_id = new.id;
  end if;
  return new;
end;
$$;

-- Same rules as before, now also saving the natural roll and bonus so the DM
-- can see exactly what the player rolled.
create or replace function public.attack_roll(
  p_table_id uuid, p_target_id uuid, p_attack_name text, p_natural int, p_bonus int
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_me public.combatants;
  v_target public.combatants;
  v_ac int;
  v_total int := p_natural + p_bonus;
  v_result text;
  v_count int;
  v_attack text := coalesce(nullif(trim(p_attack_name), ''), 'an attack');
begin
  if p_natural < 1 or p_natural > 20 then raise exception 'A d20 roll is 1 to 20'; end if;
  if p_bonus < -20 or p_bonus > 40 then raise exception 'That attack bonus looks wrong'; end if;

  select * into v_table from public.game_tables where id = p_table_id;
  if not found or not v_table.combat_active then raise exception 'There is no fight right now'; end if;

  select * into v_me from public.combatants
    where table_id = p_table_id and user_id = (select auth.uid()) and kind = 'player';
  if not found then raise exception 'You have not joined this table'; end if;
  if v_table.current_combatant_id is distinct from v_me.id then
    raise exception 'It is not your turn';
  end if;

  select * into v_target from public.combatants
    where id = p_target_id and table_id = p_table_id and kind = 'monster';
  if not found then raise exception 'Choose an enemy to attack'; end if;
  if v_target.status = 'down' then raise exception 'That enemy is already down'; end if;

  select armor_class into v_ac from public.combatant_secrets where combatant_id = p_target_id;

  v_result := case
    when p_natural = 1 then 'miss'
    when p_natural = 20 then 'crit'
    when v_ac is null then 'awaiting'
    when v_total >= v_ac then 'hit'
    else 'miss'
  end;

  v_count := v_me.attacks_this_turn + 1;

  update public.combatants set
    attack_state = case v_result
      when 'miss' then 'none' when 'awaiting' then 'awaiting_dm' else 'hit' end,
    attack_target = case when v_result = 'miss' then null else p_target_id end,
    attack_name = v_attack,
    attack_crit = (v_result = 'crit'),
    attack_natural = p_natural,
    attack_bonus = p_bonus,
    attacks_this_turn = v_count,
    last_attack_target = p_target_id,
    last_attack_damage = 0
    where id = v_me.id;

  perform public.log_event(p_table_id,
    v_me.name || ' attacks ' || v_target.name || ' with ' || v_attack || ' (rolled ' || v_total || ')' ||
    case when v_count > 1 then ' [attack ' || v_count || ' this turn]' else '' end || '. ' ||
    case v_result
      when 'crit' then 'Critical hit!'
      when 'hit' then 'That hits!'
      when 'awaiting' then 'Waiting for the DM to call it.'
      else 'That misses!'
    end);

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Enemies roll to hit a player
-- ---------------------------------------------------------------------------

-- The DM rolls (or types a physical d20) for an enemy. The server compares it
-- to the player's AC from their sheet and logs the result. Damage is sent
-- afterwards with post_player_damage, so the player still taps Apply.
create or replace function public.monster_attack_roll(
  p_attacker_id uuid, p_target_user_id uuid, p_attack_name text, p_natural int, p_bonus int
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_attacker public.combatants;
  v_target public.combatants;
  v_ac int;
  v_total int := p_natural + p_bonus;
  v_result text;
  v_count int;
  v_attack text := coalesce(nullif(trim(p_attack_name), ''), 'an attack');
begin
  if not public.combatant_table_dm(p_attacker_id) then
    raise exception 'Only the DM can roll for an enemy';
  end if;
  if p_natural < 1 or p_natural > 20 then raise exception 'A d20 roll is 1 to 20'; end if;
  if p_bonus < -20 or p_bonus > 40 then raise exception 'That attack bonus looks wrong'; end if;

  select * into v_attacker from public.combatants where id = p_attacker_id for update;
  if v_attacker.kind <> 'monster' then raise exception 'Only enemies attack this way'; end if;
  if v_attacker.status = 'down' then raise exception 'That enemy is down'; end if;

  select * into v_target from public.combatants
    where table_id = v_attacker.table_id and user_id = p_target_user_id and kind = 'player';
  if not found then raise exception 'That player is not at this table'; end if;

  -- The player's AC is on their own sheet; fall back to 10 if it is missing.
  select (c.data -> 'combat' ->> 'armorClass')::int into v_ac
    from public.characters c
    join public.table_members tm on tm.character_id = c.id
    where tm.table_id = v_attacker.table_id and tm.user_id = p_target_user_id;
  v_ac := coalesce(v_ac, 10);

  v_result := case
    when p_natural = 1 then 'miss'
    when p_natural = 20 then 'crit'
    when v_total >= v_ac then 'hit'
    else 'miss'
  end;

  v_count := v_attacker.attacks_this_turn + 1;
  update public.combatants set attacks_this_turn = v_count where id = p_attacker_id;

  perform public.log_event(v_attacker.table_id,
    v_attacker.name || ' attacks ' || v_target.name || ' with ' || v_attack ||
    ' (rolled ' || v_total || ' vs AC ' || v_ac || ')' ||
    case when v_count > 1 then ' [attack ' || v_count || ' this turn]' else '' end || '. ' ||
    case v_result when 'crit' then 'Critical hit!' when 'hit' then 'That hits!' else 'That misses!' end);

  return jsonb_build_object('result', v_result, 'ac', v_ac);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Initiative is locked once combat starts
--    (a player who joined mid-fight and has none yet can still set theirs)
-- ---------------------------------------------------------------------------

create or replace function public.set_my_initiative(p_table_id uuid, p_initiative int)
returns void language plpgsql security definer set search_path = '' as $$
declare v_active boolean; v_current int;
begin
  select combat_active into v_active from public.game_tables where id = p_table_id;
  select initiative into v_current from public.combatants
    where table_id = p_table_id and user_id = (select auth.uid()) and kind = 'player';

  if coalesce(v_active, false) and v_current is not null then
    raise exception 'Initiative is locked once combat has started';
  end if;

  update public.combatants set initiative = p_initiative
    where table_id = p_table_id
      and user_id = (select auth.uid())
      and kind = 'player';
  if not found then raise exception 'You have not joined this table'; end if;
end;
$$;

revoke execute on function public.monster_attack_roll(uuid, uuid, text, int, int) from public, anon;
grant execute on function public.monster_attack_roll(uuid, uuid, text, int, int) to authenticated;
revoke execute on function public.set_my_initiative(uuid, int) from public, anon;
grant execute on function public.set_my_initiative(uuid, int) to authenticated;
revoke execute on function public.attack_roll(uuid, uuid, text, int, int) from public, anon;
grant execute on function public.attack_roll(uuid, uuid, text, int, int) to authenticated;

-- Tell the API about the new function and columns right away.
notify pgrst, 'reload schema';
