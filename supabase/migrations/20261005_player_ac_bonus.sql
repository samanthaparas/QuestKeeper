-- Monster attacks on players count the player's temporary AC bonus.
--
-- dm_attack_roll compared the DM's roll against the player's base AC only
-- (data.combat.armorClass). The sheet also has a temporary AC bonus
-- (data.acBonus, e.g. +2 from Haste or Shield of Faith) that the player and
-- the DM's read-only view already add on top, so a hasted player was being
-- hit as if they were 2 AC lower. This adds the bonus, ignoring anything that
-- isn't a whole number so an odd value can never break an attack.
--
-- Only the player-AC lookup changes; everything else is the same as in
-- 20261003_dm_toolkit.sql. Apply by hand in the Supabase SQL editor.

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
    -- The player's AC is on their own sheet (fall back to 10 if it is
    -- missing), plus any temporary bonus like Haste.
    select
      coalesce(
        case when (c.data -> 'combat' ->> 'armorClass') ~ '^-?\d+$'
          then (c.data -> 'combat' ->> 'armorClass')::int end,
        10
      )
      + coalesce(
        case when (c.data ->> 'acBonus') ~ '^-?\d+$'
          then (c.data ->> 'acBonus')::int end,
        0
      )
      into v_ac
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
