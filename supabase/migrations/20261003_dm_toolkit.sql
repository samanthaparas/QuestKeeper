-- QuestKeeper: the DM's combat toolkit.
--   * friendly NPCs / manually tracked party members ("allies")
--   * stat blocks with attacks on monsters and allies (DM-only)
--   * any fighter can attack any other (DM-run)
--   * players can end their own turn
--   * a lock so two quick attacks can never be miscounted
--   * a personal monster library (templates), owned by each user
--
-- Run AFTER 20261003_monster_attacks.sql in the Supabase SQL Editor.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Allies, and stat blocks kept secret from players
-- ---------------------------------------------------------------------------

alter table public.combatants drop constraint if exists combatants_kind_check;
alter table public.combatants
  add constraint combatants_kind_check check (kind in ('player', 'monster', 'ally'));

-- { "attacks": [{ "name": "Claw", "toHit": 4, "damage": "1d6+2" }], "notes": "..." }
alter table public.combatant_secrets
  add column if not exists stat_block jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. The attack-count race: lock the player's row while counting
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

  -- FOR UPDATE makes simultaneous attacks queue up, so none are lost.
  select * into v_me from public.combatants
    where table_id = p_table_id and user_id = (select auth.uid()) and kind = 'player'
    for update;
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
-- 3. Add / edit monsters and allies
-- ---------------------------------------------------------------------------

create or replace function public.add_combatant(
  p_table_id uuid, p_name text, p_max_hp int,
  p_kind text default 'monster', p_initiative int default null,
  p_armor_class int default null, p_stat_block jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_table_dm(p_table_id) then
    raise exception 'Only the DM can add combatants';
  end if;
  if p_kind not in ('monster', 'ally') then raise exception 'Kind must be monster or ally'; end if;
  if p_max_hp is null or p_max_hp < 1 then raise exception 'HP must be at least 1'; end if;

  insert into public.combatants (table_id, kind, name, initiative)
    values (p_table_id, p_kind, trim(p_name), p_initiative)
    returning id into v_id;
  insert into public.combatant_secrets (combatant_id, max_hp, current_hp, armor_class, stat_block)
    values (v_id, p_max_hp, p_max_hp, p_armor_class, coalesce(p_stat_block, '{}'::jsonb));
  return v_id;
end;
$$;

-- Change a monster's or ally's name, HP (max and current), AC, or stat block.
-- The public damage and status are recalculated so they always agree.
create or replace function public.edit_combatant(
  p_combatant_id uuid, p_name text, p_max_hp int, p_current_hp int,
  p_armor_class int, p_stat_block jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_max int; v_hp int; v_status text;
begin
  if not public.combatant_table_dm(p_combatant_id) then
    raise exception 'Only the DM can edit this';
  end if;
  if p_max_hp is null or p_max_hp < 1 then raise exception 'Max HP must be at least 1'; end if;
  if p_current_hp is null or p_current_hp < 0 then raise exception 'Current HP cannot be negative'; end if;

  v_max := p_max_hp;
  v_hp := least(p_current_hp, v_max);
  v_status := case
    when v_hp = 0 then 'down'
    when v_hp * 2 <= v_max then 'bloodied'
    else 'healthy'
  end;

  update public.combatant_secrets set
    max_hp = v_max, current_hp = v_hp, armor_class = p_armor_class,
    stat_block = coalesce(p_stat_block, stat_block)
    where combatant_id = p_combatant_id;
  if not found then raise exception 'That combatant has no tracked HP'; end if;

  update public.combatants set
    name = coalesce(nullif(trim(p_name), ''), name),
    damage_taken = v_max - v_hp,
    status = v_status
    where id = p_combatant_id;
end;
$$;

-- A free-form line in the activity log from the DM ("The goblin shrieks!").
create or replace function public.dm_log(p_table_id uuid, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_dm(p_table_id) then raise exception 'Only the DM can write to the log'; end if;
  perform public.log_event(p_table_id, left(trim(p_message), 300));
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Any fighter attacks any other (the DM rolls for monsters and allies)
-- ---------------------------------------------------------------------------

-- Returns { result: hit | crit | miss | unknown, ac: number | null }.
-- "unknown" means the target has no AC on file; the DM calls it.
create or replace function public.dm_attack_roll(
  p_attacker_id uuid, p_target_id uuid, p_attack_name text, p_natural int, p_bonus int
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
    raise exception 'Only the DM can roll for an enemy or ally';
  end if;
  if p_natural < 1 or p_natural > 20 then raise exception 'A d20 roll is 1 to 20'; end if;
  if p_bonus < -20 or p_bonus > 40 then raise exception 'That attack bonus looks wrong'; end if;

  select * into v_attacker from public.combatants where id = p_attacker_id for update;
  if v_attacker.kind not in ('monster', 'ally') then
    raise exception 'Players roll their own attacks';
  end if;
  if v_attacker.status = 'down' then raise exception 'That fighter is down'; end if;

  select * into v_target from public.combatants
    where id = p_target_id and table_id = v_attacker.table_id;
  if not found then raise exception 'That target is not in this fight'; end if;
  if v_target.id = v_attacker.id then raise exception 'A fighter cannot attack itself'; end if;

  if v_target.kind = 'player' then
    -- The player's AC is on their own sheet; fall back to 10 if it is missing.
    select (c.data -> 'combat' ->> 'armorClass')::int into v_ac
      from public.characters c
      join public.table_members tm on tm.character_id = c.id
      where tm.table_id = v_attacker.table_id and tm.user_id = v_target.user_id;
    v_ac := coalesce(v_ac, 10);
  else
    select armor_class into v_ac from public.combatant_secrets where combatant_id = v_target.id;
  end if;

  v_result := case
    when p_natural = 1 then 'miss'
    when p_natural = 20 then 'crit'
    when v_ac is null then 'unknown'
    when v_total >= v_ac then 'hit'
    else 'miss'
  end;

  v_count := v_attacker.attacks_this_turn + 1;
  update public.combatants set attacks_this_turn = v_count where id = v_attacker.id;

  perform public.log_event(v_attacker.table_id,
    v_attacker.name || ' attacks ' || v_target.name || ' with ' || v_attack ||
    ' (rolled ' || v_total ||
    case when v_target.kind = 'player' and v_ac is not null then ' vs AC ' || v_ac else '' end || ')' ||
    case when v_count > 1 then ' [attack ' || v_count || ' this turn]' else '' end || '. ' ||
    case v_result
      when 'crit' then 'Critical hit!'
      when 'hit' then 'That hits!'
      when 'unknown' then 'The DM calls it.'
      else 'That misses!'
    end);

  return jsonb_build_object('result', v_result, 'ac', case when v_target.kind = 'player' then v_ac else null end);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Players can end their own turn
-- ---------------------------------------------------------------------------

-- Passes the turn to the next fighter in initiative order (highest first,
-- ties broken by who was added first). Defeated monsters are skipped. After
-- the last fighter the round counter goes up.
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
      and not (kind = 'monster' and status = 'down');

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

-- ---------------------------------------------------------------------------
-- 6. Each user's personal monster library
-- ---------------------------------------------------------------------------

create table if not exists public.monster_templates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  kind        text not null default 'monster' check (kind in ('monster', 'ally')),
  max_hp      int not null check (max_hp >= 1),
  armor_class int check (armor_class between 1 and 40),
  stat_block  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists monster_templates_owner_idx on public.monster_templates (owner_id);

alter table public.monster_templates enable row level security;

drop policy if exists "Owners can view their monster library" on public.monster_templates;
create policy "Owners can view their monster library"
  on public.monster_templates for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners can add to their monster library" on public.monster_templates;
create policy "Owners can add to their monster library"
  on public.monster_templates for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can edit their monster library" on public.monster_templates;
create policy "Owners can edit their monster library"
  on public.monster_templates for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete from their monster library" on public.monster_templates;
create policy "Owners can delete from their monster library"
  on public.monster_templates for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. Permissions, then refresh the API
-- ---------------------------------------------------------------------------

revoke execute on function
  public.add_combatant(uuid, text, int, text, int, int, jsonb),
  public.edit_combatant(uuid, text, int, int, int, jsonb),
  public.dm_log(uuid, text),
  public.dm_attack_roll(uuid, uuid, text, int, int),
  public.end_my_turn(uuid),
  public.attack_roll(uuid, uuid, text, int, int)
  from public, anon;
grant execute on function
  public.add_combatant(uuid, text, int, text, int, int, jsonb),
  public.edit_combatant(uuid, text, int, int, int, jsonb),
  public.dm_log(uuid, text),
  public.dm_attack_roll(uuid, uuid, text, int, int),
  public.end_my_turn(uuid),
  public.attack_roll(uuid, uuid, text, int, int)
  to authenticated;

notify pgrst, 'reload schema';
