-- Journal portraits: lets everyone at a table see each other's character
-- portraits beside their journal notes. Run once in the Supabase SQL editor.
--
-- Returns, for each character seated at the table: the player's user id (to
-- match a note's author), the character's name and the portrait link. Only
-- people at the table (the DM and the players) can ask. Portraits are public
-- image links and the names are already shown on every note, so this hands
-- out nothing private.

create or replace function public.get_table_member_portraits(p_table_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select public.is_table_participant(p_table_id)) then
    raise exception 'You are not at this table';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'userId', tm.user_id,
        'name', c.data -> 'name',
        'portraitUrl', c.data -> 'portraitUrl'
      )
    )
    from public.table_members tm
    join public.characters c on c.id = tm.character_id
    where tm.table_id = p_table_id
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_table_member_portraits(uuid) from public, anon;
grant execute on function public.get_table_member_portraits(uuid) to authenticated;
