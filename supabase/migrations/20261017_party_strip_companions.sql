-- Party strip: companions. Adds each character's companion (a mount, a
-- familiar) to the party strip players see when the DM shares it: just its
-- name, picture, HP and AC, never its notes or attacks. Run this once in the
-- Supabase SQL editor, after 20261016_party_strip_death_saves.sql.
--
-- Same function, same rules (the DM always, players only when the DM shares
-- the party). The DM's own strip already reads full sheets, so it works
-- without this.

create or replace function public.get_party_strip(p_table_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_share boolean;
begin
  select share_party into v_share from public.game_tables where id = p_table_id;
  if not found then raise exception 'No such table'; end if;

  if not (public.is_table_dm(p_table_id)
          or (v_share and public.is_table_member(p_table_id))) then
    raise exception 'The DM has not shared the party with players';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'userId', tm.user_id,
        'name', c.data -> 'name',
        'level', c.data -> 'level',
        'class', jsonb_build_object('name', c.data -> 'class' -> 'name'),
        'portraitUrl', c.data -> 'portraitUrl',
        'combat', jsonb_build_object(
          'hitPoints', c.data -> 'combat' -> 'hitPoints',
          'armorClass', c.data -> 'combat' -> 'armorClass'
        ),
        'acBonus', c.data -> 'acBonus',
        'conditions', coalesce(c.data -> 'conditions', '[]'::jsonb),
        'concentration', c.data -> 'concentration',
        'deathSaves', c.data -> 'deathSaves',
        'companionMode', c.data -> 'companionMode',
        'companionCreature', case when c.data ? 'companionCreature' then jsonb_build_object(
          'name', c.data -> 'companionCreature' -> 'name',
          'portraitUrl', c.data -> 'companionCreature' -> 'portraitUrl',
          'hitPoints', c.data -> 'companionCreature' -> 'hitPoints',
          'armorClass', c.data -> 'companionCreature' -> 'armorClass'
        ) end
      )
      order by tm.joined_at
    )
    from public.table_members tm
    join public.characters c on c.id = tm.character_id
    where tm.table_id = p_table_id
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_party_strip(uuid) from public, anon;
grant execute on function public.get_party_strip(uuid) to authenticated;
