-- Typed damage: a player's damage can be sent in parts, one per damage type
-- ("6 piercing, 3 fire" from a dagger with Elemental Weapon), so the table
-- log shows the types and they're never merged into one number. Run this
-- once in the Supabase SQL editor, after 20261003_attack_counter.sql.
--
-- Same function, same rules: only the player whose turn it is, only after a
-- hit, damage from 0 to 999. The parts are optional. Without them (a total
-- typed by hand, or an older page) it works exactly as before. With them,
-- they must add up to the total and each type must be a real damage type
-- (or blank, for extra damage the player didn't give a type).
--
-- Nothing secret is added or shown: monsters' resistances aren't tracked
-- yet, so the damage is applied as sent, as it was before.

-- The old two-number version is replaced (two versions side by side would
-- make a call with two numbers ambiguous). Calls without parts still match
-- the new one, because p_parts has a default.
drop function if exists public.deal_damage(uuid, int);

create or replace function public.deal_damage(p_table_id uuid, p_amount int, p_parts jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_me public.combatants;
  v_target public.combatants;
  v_part jsonb;
  v_sum int := 0;
  v_breakdown text := '';
  v_type text;
  v_part_amount int;
begin
  if p_amount < 0 or p_amount > 999 then raise exception 'That damage looks wrong'; end if;

  -- The parts, checked: a short list of whole numbers with known types,
  -- adding up to the total. They become "(6 piercing, 3 fire)" in the log.
  if p_parts is not null then
    if jsonb_typeof(p_parts) <> 'array' or jsonb_array_length(p_parts) > 8 then
      raise exception 'That damage breakdown looks wrong';
    end if;
    for v_part in select value from jsonb_array_elements(p_parts) loop
      if jsonb_typeof(v_part -> 'amount') <> 'number' then
        raise exception 'That damage breakdown looks wrong';
      end if;
      v_part_amount := (v_part ->> 'amount')::int;
      v_type := lower(coalesce(v_part ->> 'type', ''));
      if v_part_amount < 0 or v_part_amount > 999 or v_type not in (
        '', 'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
        'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
      ) then
        raise exception 'That damage breakdown looks wrong';
      end if;
      v_sum := v_sum + v_part_amount;
      v_breakdown := v_breakdown
        || case when v_breakdown = '' then '' else ', ' end
        || v_part_amount || ' ' || case when v_type = '' then 'extra' else v_type end;
    end loop;
    if v_sum <> p_amount then raise exception 'The damage parts do not add up to the total'; end if;
  end if;

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
    v_me.name || ' deals ' || p_amount || ' damage'
    -- Only worth listing when there's more than one type.
    || case when p_parts is not null and jsonb_array_length(p_parts) > 1 then ' (' || v_breakdown || ')' else '' end
    || ' to ' || v_target.name ||
    case when v_me.attack_crit then ' (critical hit)' else '' end || '.');
  perform public.apply_damage_internal(v_target.id, p_amount);

  update public.combatants
    set attack_state = 'none', attack_target = null, attack_crit = false,
        last_attack_target = v_target.id, last_attack_damage = p_amount
    where id = v_me.id;
end;
$$;

revoke execute on function public.deal_damage(uuid, int, jsonb) from public, anon;
grant execute on function public.deal_damage(uuid, int, jsonb) to authenticated;
