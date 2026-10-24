-- Gives each activity-log line an optional "kind", so the DM screen can show a
-- small icon for it (attack, damage, healing, spell, turn, handout) without
-- ever guessing from the words in the message. A line with no kind simply has
-- no icon. Nothing about who can see the log changes.
--
-- Run once in the Supabase SQL editor. It is safe to run again.

alter table public.table_events add column if not exists kind text;

alter table public.table_events drop constraint if exists table_events_kind_check;
alter table public.table_events
  add constraint table_events_kind_check
  check (kind is null or kind in ('attack', 'damage', 'healing', 'spell', 'turn', 'handout'));

-- The internal writer used by every other function: same two-argument calls
-- keep working, and a caller can now say what kind of line it is.
create or replace function public.log_event(p_table_id uuid, p_message text, p_kind text)
returns void language sql security definer set search_path = '' as $$
  insert into public.table_events (table_id, message, kind) values (p_table_id, p_message, p_kind);
$$;

revoke execute on function public.log_event(uuid, text, text) from public, anon, authenticated;

-- The DM's free-form line, with an optional kind (the handout notice uses it).
drop function if exists public.dm_log(uuid, text);
create or replace function public.dm_log(p_table_id uuid, p_message text, p_kind text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_dm(p_table_id) then raise exception 'Only the DM can write to the log'; end if;
  perform public.log_event(p_table_id, left(trim(p_message), 300), p_kind);
end;
$$;

revoke execute on function public.dm_log(uuid, text, text) from public, anon;
grant execute on function public.dm_log(uuid, text, text) to authenticated;
