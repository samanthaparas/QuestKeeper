-- Removing a player for good. Run this once in the Supabase SQL editor.
--
-- "Remove" already takes a player off a table, but they could join again
-- with the code. A DM can now remove someone *for good*: they're taken off
-- the table and can't rejoin with the code until the DM lets them back.
-- (For a character who died, the plain Remove is enough.)

-- Who may not rejoin which table. Only the DM sees their table's list, and
-- it's only changed through the two functions below.
create table if not exists public.table_bans (
  table_id  uuid not null references public.game_tables (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  -- The character's name when they were removed, so the DM knows who it was.
  name      text,
  banned_at timestamptz not null default now(),
  primary key (table_id, user_id)
);

alter table public.table_bans enable row level security;

drop policy if exists "DM reads their table's removed players" on public.table_bans;
create policy "DM reads their table's removed players" on public.table_bans
  for select to authenticated
  using (public.is_table_dm(table_id));

-- DM only: take a player off the table and keep them from rejoining.
create or replace function public.ban_member(p_table_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  if not public.is_table_dm(p_table_id) then
    raise exception 'Only the DM can remove players';
  end if;

  select name into v_name from public.combatants
    where table_id = p_table_id and user_id = p_user_id and kind = 'player';

  insert into public.table_bans (table_id, user_id, name)
    values (p_table_id, p_user_id, v_name)
    on conflict (table_id, user_id) do nothing;

  delete from public.combatants
    where table_id = p_table_id and user_id = p_user_id and kind = 'player';
  delete from public.table_members
    where table_id = p_table_id and user_id = p_user_id;
end;
$$;

-- DM only: let a removed player join again with the code.
create or replace function public.unban_member(p_table_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_dm(p_table_id) then
    raise exception 'Only the DM can let players back';
  end if;
  delete from public.table_bans
    where table_id = p_table_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.ban_member(uuid, uuid), public.unban_member(uuid, uuid)
  from public, anon;
grant execute on function public.ban_member(uuid, uuid), public.unban_member(uuid, uuid)
  to authenticated;

-- Joining, as before, plus one check: someone the DM removed for good can't
-- come back with the code.
create or replace function public.join_table(p_code text, p_character_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_table public.game_tables;
  v_name text;
begin
  if v_user is null then raise exception 'Not signed in'; end if;

  select * into v_table from public.game_tables
    where join_code = upper(trim(p_code));
  if not found then raise exception 'No table with that code'; end if;
  if v_table.dm_id = v_user then
    raise exception 'You run this table, so you cannot join it as a player';
  end if;

  if exists (
    select 1 from public.table_bans where table_id = v_table.id and user_id = v_user
  ) then
    raise exception 'The DM has removed you from this table';
  end if;

  select data ->> 'name' into v_name from public.characters
    where id = p_character_id and user_id = v_user;
  if not found then raise exception 'That character is not yours'; end if;

  insert into public.table_members (table_id, user_id, character_id)
    values (v_table.id, v_user, p_character_id)
    on conflict (table_id, user_id) do update set character_id = excluded.character_id;

  insert into public.combatants (table_id, kind, user_id, name)
    values (v_table.id, 'player', v_user, coalesce(v_name, 'Adventurer'))
    on conflict (table_id, user_id) where kind = 'player'
    do update set name = excluded.name;

  return v_table.id;
end;
$$;
