-- Shared dice rolls: players and the DM can post a roll to their table's
-- activity log ("Billie rolled Stealth: 17 (d20 15 + 2)"), so everyone at the
-- table sees it live. Run this once in the Supabase SQL editor.
--
-- The log stays read-only for the browser (see 20261003_combat_actions.sql);
-- this function is the one way in for rolls, and only for people at the table.

create or replace function public.log_roll(
  p_table_id uuid,
  p_who      text,   -- the character's name
  p_label    text,   -- what was rolled: "Stealth", "Longsword attack"
  p_detail   text,   -- the dice: "d20 15 + 2"
  p_total    int
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'Only people at this table can share rolls';
  end if;

  perform public.log_event(
    p_table_id,
    left(
      format(
        '%s rolled %s: %s (%s)',
        coalesce(nullif(left(trim(p_who), 40), ''), 'Someone'),
        left(trim(p_label), 60),
        p_total,
        left(trim(p_detail), 120)
      ),
      300
    )
  );
end;
$$;

revoke execute on function public.log_roll(uuid, text, text, text, int) from public, anon;
grant execute on function public.log_roll(uuid, text, text, text, int) to authenticated;
