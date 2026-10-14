-- Party strip: a row per character at the top of the table page with HP, AC
-- and conditions. The DM always sees it (they can already read every sheet).
-- Players see it only when the DM turns on "Let players see the party".
-- Run this once in the Supabase SQL editor.
--
-- Players still can't read each other's sheets. This function hands them only
-- the strip's few numbers, never backstory, inventory or anything else.

-- The DM's switch. Off by default, so nothing changes until they turn it on.
-- (The DM already has permission to update their own table row.)
alter table public.game_tables
  add column if not exists share_party boolean not null default false;

-- One small "mini sheet" per character at the table: just name, level, class,
-- HP, AC and conditions, in the same shape as a real sheet so the app can
-- read both the same way.
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
        'combat', jsonb_build_object(
          'hitPoints', c.data -> 'combat' -> 'hitPoints',
          'armorClass', c.data -> 'combat' -> 'armorClass'
        ),
        'acBonus', c.data -> 'acBonus',
        'conditions', coalesce(c.data -> 'conditions', '[]'::jsonb)
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
