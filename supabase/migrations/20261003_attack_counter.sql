-- QuestKeeper: count attacks per turn, and let the DM deny the latest attack.
--
-- Run AFTER 20261003_combat_actions.sql. Run once in the Supabase SQL Editor.
--
-- There is deliberately NO limit on attacks (Extra Attack, bonus actions, and
-- so on all exist). The counter is just visible to everyone, and the DM can
-- deny an attack if a player was not paying attention.

-- ---------------------------------------------------------------------------
-- 1. Counter and "last attack" tracking (so a denial can be undone cleanly)
-- ---------------------------------------------------------------------------

alter table public.combatants
  add column attacks_this_turn int not null default 0 check (attacks_this_turn >= 0),
  add column last_attack_target uuid references public.combatants (id) on delete set null,
  add column last_attack_damage int not null default 0 check (last_attack_damage >= 0);

-- A new turn (or a new/ended fight) starts everyone's counter and attack state fresh.
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
      last_attack_target = null,
      last_attack_damage = 0
    where table_id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.reset_attack_counters() from public, anon, authenticated;

create trigger game_tables_reset_attack_counters
  after update on public.game_tables
  for each row execute function public.reset_attack_counters();

-- ---------------------------------------------------------------------------
-- 2. attack_roll and deal_damage, now keeping the counter
--    (same signatures as before, so the app keeps working)
-- ---------------------------------------------------------------------------

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

create or replace function public.deal_damage(p_table_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_me public.combatants;
  v_target public.combatants;
begin
  if p_amount < 0 or p_amount > 999 then raise exception 'That damage looks wrong'; end if;

  select * into v_table from public.game_tables where id = p_table_id;
  if not found or not v_table.combat_active then raise exception 'There is no fight right now'; end if;

  select * into v_me from public.combatants
    where table_id = p_table_id and user_id = (select auth.uid()) and kind = 'player';
  if not found then raise exception 'You have not joined this table'; end if;
  if v_table.current_combatant_id is distinct from v_me.id then
    raise exception 'It is not your turn';
  end if;
  if v_me.attack_state <> 'hit' or v_me.attack_target is null then
    raise exception 'You have no hit to deal damage for';
  end if;

  select * into v_target from public.combatants where id = v_me.attack_target;

  perform public.log_event(p_table_id,
    v_me.name || ' deals ' || p_amount || ' damage to ' || v_target.name ||
    case when v_me.attack_crit then ' (critical hit)' else '' end || '.');
  perform public.apply_damage_internal(v_target.id, p_amount);

  update public.combatants
    set attack_state = 'none', attack_target = null, attack_crit = false,
        last_attack_target = v_target.id, last_attack_damage = p_amount
    where id = v_me.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. The DM denies a player's latest attack
-- ---------------------------------------------------------------------------

-- Cancels the attack (even one still waiting for a call) and, if damage was
-- already dealt, puts that HP back. Only the most recent attack can be denied,
-- and only once.
create or replace function public.dm_deny_attack(p_attacker_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_attacker public.combatants;
  v_target public.combatants;
  v_undone int;
begin
  if not public.combatant_table_dm(p_attacker_id) then
    raise exception 'Only the DM can deny an attack';
  end if;

  select * into v_attacker from public.combatants where id = p_attacker_id for update;
  if v_attacker.attacks_this_turn < 1 or v_attacker.last_attack_target is null then
    raise exception 'There is no attack to deny';
  end if;

  v_undone := v_attacker.last_attack_damage;
  select * into v_target from public.combatants where id = v_attacker.last_attack_target;

  if v_undone > 0 and found then
    perform public.apply_damage_internal(v_target.id, -v_undone);
  end if;

  update public.combatants set
    attack_state = 'none',
    attack_target = null,
    attack_crit = false,
    attacks_this_turn = attacks_this_turn - 1,
    last_attack_target = null,
    last_attack_damage = 0
    where id = p_attacker_id;

  perform public.log_event(v_attacker.table_id,
    'The DM denied ' || v_attacker.name || '''s attack' ||
    case when v_undone > 0 then ' (' || v_undone || ' damage undone)' else '' end || '.');
end;
$$;

revoke execute on function public.dm_deny_attack(uuid) from public, anon;
grant execute on function public.dm_deny_attack(uuid) to authenticated;
