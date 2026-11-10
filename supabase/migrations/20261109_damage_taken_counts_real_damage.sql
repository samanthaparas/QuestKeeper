-- "Damage taken" counts the damage really dealt, so it never gives away a
-- monster's max HP. Run this once in the Supabase SQL editor.
--
-- Before: damage taken was worked out as max HP - current HP, so it stopped
-- at the max. Every monster that went down showed exactly its max HP
-- ("Down · 100 damage taken"), telling the players its secret HP.
-- Now: damage adds the whole amount dealt, even past 0 (what the players
-- rolled, which they know anyway); healing takes off only the HP it really
-- gave back; back at full HP it's 0 again. Healthy / Bloodied / Down still
-- come from the secret HP, exactly as before. Monsters already down keep the
-- number they have now.

-- 1. Every hit and heal goes through this (attacks, the DM's damage box).
create or replace function public.apply_damage_internal(p_combatant_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_secret public.combatant_secrets;
  v_combatant public.combatants;
  v_hp int;
  v_status text;
  v_taken int;
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

  if v_hp = v_secret.max_hp then
    v_taken := 0;                                             -- fully healed
  elsif p_amount > 0 then
    v_taken := v_combatant.damage_taken + p_amount;           -- the whole hit, even past 0
  else
    v_taken := greatest(0, v_combatant.damage_taken - (v_hp - v_secret.current_hp)); -- HP given back
  end if;

  update public.combatant_secrets set current_hp = v_hp
    where combatant_id = p_combatant_id;
  update public.combatants
    set damage_taken = v_taken, status = v_status
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

revoke execute on function public.apply_damage_internal(uuid, int) from public, anon, authenticated;

-- 2. The DM's edit box (name, max HP, current HP, AC). Lowering current HP
--    counts as that much damage; raising it as healing; full HP is 0. Only
--    changing the max leaves the count alone.
create or replace function public.edit_combatant(
  p_combatant_id uuid, p_name text, p_max_hp int, p_current_hp int,
  p_armor_class int, p_stat_block jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old public.combatant_secrets;
  v_combatant public.combatants;
  v_max int; v_hp int; v_status text; v_taken int;
begin
  if not public.combatant_table_dm(p_combatant_id) then
    raise exception 'Only the DM can edit this';
  end if;
  if p_max_hp is null or p_max_hp < 1 then raise exception 'Max HP must be at least 1'; end if;
  if p_current_hp is null or p_current_hp < 0 then raise exception 'Current HP cannot be negative'; end if;

  select * into v_old from public.combatant_secrets
    where combatant_id = p_combatant_id for update;
  if not found then raise exception 'That combatant has no tracked HP'; end if;
  select * into v_combatant from public.combatants where id = p_combatant_id;

  v_max := p_max_hp;
  v_hp := least(p_current_hp, v_max);
  v_status := case
    when v_hp = 0 then 'down'
    when v_hp * 2 <= v_max then 'bloodied'
    else 'healthy'
  end;
  v_taken := case
    when v_hp = v_max then 0
    else greatest(0, v_combatant.damage_taken + (v_old.current_hp - v_hp))
  end;

  update public.combatant_secrets set
    max_hp = v_max, current_hp = v_hp, armor_class = p_armor_class,
    stat_block = coalesce(p_stat_block, stat_block)
    where combatant_id = p_combatant_id;

  update public.combatants set
    name = coalesce(nullif(trim(p_name), ''), name),
    damage_taken = v_taken,
    status = v_status
    where id = p_combatant_id;
end;
$$;
