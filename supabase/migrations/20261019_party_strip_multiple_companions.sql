-- Party strip: every companion. A character can now have several companions
-- (a mount, a familiar, two Summon Feys), saved as a list in the sheet's
-- "companions". Run this once in the Supabase SQL editor, after
-- 20261019_party_strip_summons.sql.
--
-- Why: the party strip is built on the server (players only get these few
-- safe fields, never full sheets), and it only read the single old
-- "companionCreature". The app still saves the first companion there too, so
-- before this is run the strip just shows the first one; nothing breaks.
--
-- Same function, same rules (the DM always, players only when the DM shares
-- the party). For each companion only: name, picture, HP, AC and its summon
-- state (which spell, whether it's up, slot level, concentration or rounds
-- left, and the summon's HP). Never its notes, attacks or mood.

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
        -- The older single companion, kept for sheets saved before the list.
        'companionCreature', case when c.data ? 'companionCreature' then jsonb_build_object(
          'id', c.data -> 'companionCreature' -> 'id',
          'name', c.data -> 'companionCreature' -> 'name',
          'portraitUrl', c.data -> 'companionCreature' -> 'portraitUrl',
          'hitPoints', c.data -> 'companionCreature' -> 'hitPoints',
          'armorClass', c.data -> 'companionCreature' -> 'armorClass',
          'summon', case when (c.data -> 'companionCreature') ? 'summon' then jsonb_build_object(
            'template', c.data -> 'companionCreature' -> 'summon' -> 'template',
            'active', c.data -> 'companionCreature' -> 'summon' -> 'active',
            'slotLevel', c.data -> 'companionCreature' -> 'summon' -> 'slotLevel',
            'concentration', c.data -> 'companionCreature' -> 'summon' -> 'concentration',
            'rounds', c.data -> 'companionCreature' -> 'summon' -> 'rounds',
            'hitPoints', c.data -> 'companionCreature' -> 'summon' -> 'hitPoints'
          ) end
        ) end,
        -- Every companion, with the same few fields each.
        'companions', case when jsonb_typeof(c.data -> 'companions') = 'array' then (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', companion -> 'id',
              'name', companion -> 'name',
              'portraitUrl', companion -> 'portraitUrl',
              'hitPoints', companion -> 'hitPoints',
              'armorClass', companion -> 'armorClass',
              'summon', case when companion ? 'summon' then jsonb_build_object(
                'template', companion -> 'summon' -> 'template',
                'active', companion -> 'summon' -> 'active',
                'slotLevel', companion -> 'summon' -> 'slotLevel',
                'concentration', companion -> 'summon' -> 'concentration',
                'rounds', companion -> 'summon' -> 'rounds',
                'hitPoints', companion -> 'summon' -> 'hitPoints'
              ) end
            )
            order by position
          ), '[]'::jsonb)
          from jsonb_array_elements(c.data -> 'companions') with ordinality as list(companion, position)
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
