-- QuestKeeper: attacks, damage, activity log, and "an enemy hits you" requests.
--
-- Run AFTER 20261003_dm_tables.sql (this builds on it and changes nothing you
-- already created except replacing add_monster/apply_damage with improved versions).
-- Run once in the Supabase SQL Editor.
--
-- The server (not the browser) decides hits and misses, so players can never
-- see an enemy's AC or HP, and nobody can deal damage on someone else's turn.

-- ---------------------------------------------------------------------------
-- 1. Secret AC for enemies, and attack progress on combatants
-- ---------------------------------------------------------------------------

alter table public.combatant_secrets
  add column armor_class int check (armor_class between 1 and 40);

-- Where a player is in their current attack. Nothing secret lives here.
alter table public.combatants
  add column attack_state text not null default 'none'
    check (attack_state in ('none', 'awaiting_dm', 'hit')),
  add column attack_target uuid references public.combatants (id) on delete set null,
  add column attack_name text,
  add column attack_crit boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Activity log and damage requests
-- ---------------------------------------------------------------------------

create table public.table_events (
  id         uuid primary key default gen_random_uuid(),
  table_id   uuid not null references public.game_tables (id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);
create index table_events_table_idx on public.table_events (table_id, created_at desc);

-- "The kobold hits you for 5." The target taps Apply on their own screen, so a
-- DM never edits a player's sheet.
create table public.damage_requests (
  id             uuid primary key default gen_random_uuid(),
  table_id       uuid not null references public.game_tables (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  amount         int not null check (amount between 1 and 999),
  source         text not null default 'An enemy' check (char_length(source) <= 80),
  status         text not null default 'pending'
                   check (status in ('pending', 'applied', 'dismissed')),
  created_at     timestamptz not null default now()
);
create index damage_requests_target_idx on public.damage_requests (target_user_id, status);

alter table public.table_events    enable row level security;
alter table public.damage_requests enable row level security;

-- Read-only for the client; every write goes through the functions below.
create policy "Participants can read the activity log"
  on public.table_events for select to authenticated
  using ((select public.is_table_participant(table_id)));

create policy "Targets and DMs can see damage requests"
  on public.damage_requests for select to authenticated
  using (target_user_id = (select auth.uid()) or (select public.is_table_dm(table_id)));

-- ---------------------------------------------------------------------------
-- 3. Internal helpers (not callable from the browser)
-- ---------------------------------------------------------------------------

create or replace function public.log_event(p_table_id uuid, p_message text)
returns void language sql security definer set search_path = '' as $$
  insert into public.table_events (table_id, message) values (p_table_id, p_message);
$$;

-- Applies damage (positive) or healing (negative) to an enemy's secret HP and
-- keeps the public damage/status in step. Logs status changes.
create or replace function public.apply_damage_internal(p_combatant_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_secret public.combatant_secrets;
  v_combatant public.combatants;
  v_hp int;
  v_status text;
begin
  select * into v_secret from public.combatant_secrets
    where combatant_id = p_combatant_id for update;
  if not found then raise exception 'That combatant has no tracked HP'; end if;
  select * into v_combatant from public.combatants where id = p_combatant_id;

  v_hp := greatest(0, least(v_secret.max_hp, v_secret.current_hp - p_amount));
  v_status := case
    when v_hp = 0 then 'down'
    when v_hp * 2 <= v_secret.max_hp then 'bloodied'
    else 'healthy'
  end;

  update public.combatant_secrets set current_hp = v_hp
    where combatant_id = p_combatant_id;
  update public.combatants
    set damage_taken = v_secret.max_hp - v_hp, status = v_status
    where id = p_combatant_id;

  if v_status <> v_combatant.status then
    perform public.log_event(
      v_combatant.table_id,
      case v_status
        when 'down' then v_combatant.name || ' is down!'
        when 'bloodied' then v_combatant.name || ' is bloodied!'
        else v_combatant.name || ' looks healthier.'
      end
    );
  end if;
end;
$$;

revoke execute on function
  public.log_event(uuid, text), public.apply_damage_internal(uuid, int)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. DM functions
-- ---------------------------------------------------------------------------

-- Replaces the earlier 4-argument version: monsters can now have a secret AC.
drop function if exists public.add_monster(uuid, text, int, int);

create or replace function public.add_monster(
  p_table_id uuid, p_name text, p_max_hp int,
  p_initiative int default null, p_armor_class int default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_table_dm(p_table_id) then
    raise exception 'Only the DM can add monsters';
  end if;
  insert into public.combatants (table_id, kind, name, initiative)
    values (p_table_id, 'monster', trim(p_name), p_initiative)
    returning id into v_id;
  insert into public.combatant_secrets (combatant_id, max_hp, current_hp, armor_class)
    values (v_id, p_max_hp, p_max_hp, p_armor_class);
  return v_id;
end;
$$;

create or replace function public.apply_damage(p_combatant_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = '' as $$
declare v_combatant public.combatants;
begin
  if not public.combatant_table_dm(p_combatant_id) then
    raise exception 'Only the DM can change enemy HP';
  end if;
  select * into v_combatant from public.combatants where id = p_combatant_id;

  perform public.apply_damage_internal(p_combatant_id, p_amount);

  if p_amount > 0 then
    perform public.log_event(v_combatant.table_id,
      v_combatant.name || ' takes ' || p_amount || ' damage.');
  elsif p_amount < 0 then
    perform public.log_event(v_combatant.table_id,
      v_combatant.name || ' recovers ' || (-p_amount) || ' HP.');
  end if;
end;
$$;

-- When an enemy has no AC on file, the DM calls the hit or miss.
create or replace function public.dm_resolve_attack(p_attacker_id uuid, p_hit boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_attacker public.combatants; v_target public.combatants;
begin
  if not public.combatant_table_dm(p_attacker_id) then
    raise exception 'Only the DM can call an attack';
  end if;
  select * into v_attacker from public.combatants where id = p_attacker_id;
  if v_attacker.attack_state <> 'awaiting_dm' then
    raise exception 'That attack is not waiting for you';
  end if;
  select * into v_target from public.combatants where id = v_attacker.attack_target;

  update public.combatants
    set attack_state = case when p_hit then 'hit' else 'none' end
    where id = p_attacker_id;

  perform public.log_event(v_attacker.table_id,
    v_attacker.name || ' vs ' || coalesce(v_target.name, 'the enemy') || ': ' ||
    case when p_hit then 'That hits!' else 'That misses!' end);
end;
$$;

-- The DM says an enemy hit a player. The player applies it on their own sheet.
create or replace function public.post_player_damage(
  p_table_id uuid, p_target_user_id uuid, p_amount int, p_source text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_target public.combatants;
begin
  if not public.is_table_dm(p_table_id) then
    raise exception 'Only the DM can do this';
  end if;
  select * into v_target from public.combatants
    where table_id = p_table_id and user_id = p_target_user_id and kind = 'player';
  if not found then raise exception 'That player is not at this table'; end if;

  insert into public.damage_requests (table_id, target_user_id, amount, source)
    values (p_table_id, p_target_user_id, p_amount, coalesce(nullif(trim(p_source), ''), 'An enemy'));

  perform public.log_event(p_table_id,
    coalesce(nullif(trim(p_source), ''), 'An enemy') || ' hits ' || v_target.name ||
    ' for ' || p_amount || '!');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Player functions (all check it is genuinely that player's turn)
-- ---------------------------------------------------------------------------

-- p_natural is the d20 as rolled (virtually or physically); p_bonus is the
-- attack's to-hit modifier from the sheet.
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

  update public.combatants set
    attack_state = case v_result
      when 'miss' then 'none' when 'awaiting' then 'awaiting_dm' else 'hit' end,
    attack_target = case when v_result = 'miss' then null else p_target_id end,
    attack_name = v_attack,
    attack_crit = (v_result = 'crit')
    where id = v_me.id;

  perform public.log_event(p_table_id,
    v_me.name || ' attacks ' || v_target.name || ' with ' || v_attack || ' (rolled ' || v_total || '). ' ||
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
    set attack_state = 'none', attack_target = null, attack_crit = false
    where id = v_me.id;
end;
$$;

-- The player applies (or dismisses) damage the DM posted for them.
create or replace function public.resolve_damage_request(p_request_id uuid, p_apply boolean)
returns int language plpgsql security definer set search_path = '' as $$
declare v_request public.damage_requests; v_me public.combatants;
begin
  select * into v_request from public.damage_requests
    where id = p_request_id and target_user_id = (select auth.uid()) and status = 'pending'
    for update;
  if not found then raise exception 'That damage was already handled'; end if;

  update public.damage_requests
    set status = case when p_apply then 'applied' else 'dismissed' end
    where id = p_request_id;

  if p_apply then
    select * into v_me from public.combatants
      where table_id = v_request.table_id and user_id = v_request.target_user_id and kind = 'player';
    perform public.log_event(v_request.table_id,
      coalesce(v_me.name, 'A player') || ' takes ' || v_request.amount || ' damage.');
  end if;

  return v_request.amount;
end;
$$;

revoke execute on function
  public.add_monster(uuid, text, int, int, int), public.apply_damage(uuid, int),
  public.dm_resolve_attack(uuid, boolean), public.post_player_damage(uuid, uuid, int, text),
  public.attack_roll(uuid, uuid, text, int, int), public.deal_damage(uuid, int),
  public.resolve_damage_request(uuid, boolean)
  from public, anon;
grant execute on function
  public.add_monster(uuid, text, int, int, int), public.apply_damage(uuid, int),
  public.dm_resolve_attack(uuid, boolean), public.post_player_damage(uuid, uuid, int, text),
  public.attack_roll(uuid, uuid, text, int, int), public.deal_damage(uuid, int),
  public.resolve_damage_request(uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Live updates
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.table_events, public.damage_requests;
