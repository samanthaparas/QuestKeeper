-- Cancel attack: a player can let go of an attack they rolled but haven't
-- finished (it hit and is waiting for damage, or it's waiting for the DM to
-- call it), so they can go back to their weapons. Run this once in the
-- Supabase SQL editor, after 20261019_typed_damage.sql.
--
-- Why a new function: the attack's state lives on the server (attack_state,
-- attack_target), and only deal_damage cleared it. Without this, closing the
-- panel after a hit left the attack waiting, and the next weapon opened went
-- straight to damage for the old target.
--
-- The rules:
-- - Only the player whose turn it is, during a fight, with an attack that
--   isn't finished yet.
-- - The attack still counts toward attacks this turn: it was rolled, so it
--   was made. Cancelling just means no damage. (So cancelling can't be used
--   to get extra attacks.)
-- - Nothing is undone: no damage was dealt for this attack, and damage from
--   earlier attacks stays. The log keeps the roll and says it was let go.
-- - The DM's "Deny last attack" still works on it, as on any attack.

create or replace function public.cancel_attack(p_table_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_table public.game_tables;
  v_me public.combatants;
  v_target public.combatants;
begin
  select * into v_table from public.game_tables where id = p_table_id;
  if not found or not v_table.combat_active then raise exception 'There is no fight right now'; end if;

  select * into v_me from public.combatants
    where table_id = p_table_id and user_id = (select auth.uid()) and kind = 'player'
    for update;
  if not found then raise exception 'You have not joined this table'; end if;
  if v_table.current_combatant_id is distinct from v_me.id then
    raise exception 'It is not your turn';
  end if;
  if v_me.attack_state not in ('hit', 'awaiting_dm') then
    raise exception 'You have no unfinished attack to cancel';
  end if;

  select * into v_target from public.combatants where id = v_me.attack_target;

  update public.combatants set
    attack_state = 'none',
    attack_target = null,
    attack_crit = false,
    last_attack_damage = 0
    where id = v_me.id;

  perform public.log_event(p_table_id,
    v_me.name || ' lets the attack' ||
    case when v_target.name is not null then ' on ' || v_target.name else '' end ||
    ' go (no damage).');
end;
$$;

revoke execute on function public.cancel_attack(uuid) from public, anon;
grant execute on function public.cancel_attack(uuid) to authenticated;
