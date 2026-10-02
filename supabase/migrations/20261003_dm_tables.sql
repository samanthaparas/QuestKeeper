-- QuestKeeper: DM tables (groups), read-only DM view of players' characters,
-- initiative tracking, and hidden enemy HP.
--
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run.
-- Safe to read first; nothing here touches your existing tables except
-- ONE added read-only policy on public.characters (see section 5).
--
-- Who can do what:
--   DM      create/delete a table, read every joined player's character
--           (never edit it), run combat, see and change enemy HP.
--   Player  join with a code, see the turn order and enemy STATUS
--           ("Bloodied") and damage dealt, but never enemy HP numbers.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table public.game_tables (
  id                   uuid primary key default gen_random_uuid(),
  dm_id                uuid not null default auth.uid()
                         references auth.users (id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 80),
  join_code            text not null unique
                         default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  combat_active        boolean not null default false,
  round                int not null default 1 check (round >= 1),
  current_combatant_id uuid,
  created_at           timestamptz not null default now()
);

create table public.table_members (
  table_id     uuid not null references public.game_tables (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  joined_at    timestamptz not null default now(),
  primary key (table_id, user_id)
);

-- One row per participant in combat: every joined player, plus the DM's monsters.
-- Everything in this table is visible to the whole table, so it must NEVER
-- hold an enemy's real HP (that lives in combatant_secrets).
create table public.combatants (
  id           uuid primary key default gen_random_uuid(),
  table_id     uuid not null references public.game_tables (id) on delete cascade,
  kind         text not null check (kind in ('player', 'monster')),
  user_id      uuid references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  initiative   int,
  damage_taken int not null default 0 check (damage_taken >= 0),
  status       text not null default 'healthy'
                 check (status in ('healthy', 'bloodied', 'down')),
  created_at   timestamptz not null default now(),
  check ((kind = 'player') = (user_id is not null))
);

create unique index combatants_one_per_player
  on public.combatants (table_id, user_id) where kind = 'player';
create index combatants_table_idx on public.combatants (table_id);

alter table public.game_tables
  add constraint game_tables_current_combatant_fk
  foreign key (current_combatant_id) references public.combatants (id)
  on delete set null;

-- The secret part: only the DM can ever read this table.
create table public.combatant_secrets (
  combatant_id uuid primary key references public.combatants (id) on delete cascade,
  max_hp       int not null check (max_hp > 0),
  current_hp   int not null check (current_hp >= 0)
);

-- ---------------------------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER so policies can use them without
--    recursing into each other's row-level security)
-- ---------------------------------------------------------------------------

create or replace function public.is_table_dm(p_table_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_tables
    where id = p_table_id and dm_id = (select auth.uid())
  );
$$;

create or replace function public.is_table_member(p_table_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.table_members
    where table_id = p_table_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_table_participant(p_table_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_table_dm(p_table_id) or public.is_table_member(p_table_id);
$$;

-- True when the signed-in user is the DM of a table that this character has joined.
create or replace function public.is_dm_of_character(p_character_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.table_members tm
    join public.game_tables gt on gt.id = tm.table_id
    where tm.character_id = p_character_id and gt.dm_id = (select auth.uid())
  );
$$;

create or replace function public.combatant_table_dm(p_combatant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.combatants c
    join public.game_tables gt on gt.id = c.table_id
    where c.id = p_combatant_id and gt.dm_id = (select auth.uid())
  );
$$;

revoke execute on function
  public.is_table_dm(uuid), public.is_table_member(uuid),
  public.is_table_participant(uuid), public.is_dm_of_character(uuid),
  public.combatant_table_dm(uuid)
  from public, anon;
grant execute on function
  public.is_table_dm(uuid), public.is_table_member(uuid),
  public.is_table_participant(uuid), public.is_dm_of_character(uuid),
  public.combatant_table_dm(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------------------

alter table public.game_tables       enable row level security;
alter table public.table_members     enable row level security;
alter table public.combatants        enable row level security;
alter table public.combatant_secrets enable row level security;

-- game_tables: participants read; only the DM changes anything.
-- (dm_id is checked on the row itself, not via a function lookup, so a brand-new
-- table can be read back by the same INSERT ... RETURNING that created it.)
create policy "Participants can view their tables"
  on public.game_tables for select to authenticated
  using (dm_id = (select auth.uid()) or (select public.is_table_member(id)));

create policy "Anyone signed in can create a table they run"
  on public.game_tables for insert to authenticated
  with check (dm_id = (select auth.uid()));

create policy "DMs can update their tables"
  on public.game_tables for update to authenticated
  using (dm_id = (select auth.uid()))
  with check (dm_id = (select auth.uid()));

create policy "DMs can delete their tables"
  on public.game_tables for delete to authenticated
  using (dm_id = (select auth.uid()));

-- table_members: participants read. No client writes: joining/leaving goes
-- through the functions below so a player can't attach someone else's character.
create policy "Participants can view members"
  on public.table_members for select to authenticated
  using ((select public.is_table_participant(table_id)));

-- combatants: participants read; only the DM writes (players use set_my_initiative).
create policy "Participants can view combatants"
  on public.combatants for select to authenticated
  using ((select public.is_table_participant(table_id)));

create policy "DMs can add combatants"
  on public.combatants for insert to authenticated
  with check ((select public.is_table_dm(table_id)));

create policy "DMs can update combatants"
  on public.combatants for update to authenticated
  using ((select public.is_table_dm(table_id)))
  with check ((select public.is_table_dm(table_id)));

create policy "DMs can delete combatants"
  on public.combatants for delete to authenticated
  using ((select public.is_table_dm(table_id)));

-- combatant_secrets: the DM only, for everything.
create policy "DMs can read enemy HP"
  on public.combatant_secrets for select to authenticated
  using ((select public.combatant_table_dm(combatant_id)));

create policy "DMs can add enemy HP"
  on public.combatant_secrets for insert to authenticated
  with check ((select public.combatant_table_dm(combatant_id)));

create policy "DMs can change enemy HP"
  on public.combatant_secrets for update to authenticated
  using ((select public.combatant_table_dm(combatant_id)))
  with check ((select public.combatant_table_dm(combatant_id)));

create policy "DMs can delete enemy HP"
  on public.combatant_secrets for delete to authenticated
  using ((select public.combatant_table_dm(combatant_id)));

-- ---------------------------------------------------------------------------
-- 4. Functions the app calls
-- ---------------------------------------------------------------------------

-- A player joins with the DM's code and one of THEIR OWN characters.
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

create or replace function public.leave_table(p_table_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  delete from public.combatants
    where table_id = p_table_id and user_id = v_user and kind = 'player';
  delete from public.table_members
    where table_id = p_table_id and user_id = v_user;
end;
$$;

-- DM removes a player from their table.
create or replace function public.remove_member(p_table_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_dm(p_table_id) then
    raise exception 'Only the DM can remove players';
  end if;
  delete from public.combatants
    where table_id = p_table_id and user_id = p_user_id and kind = 'player';
  delete from public.table_members
    where table_id = p_table_id and user_id = p_user_id;
end;
$$;

-- A player sets only their OWN initiative (rolled in the app or entered by hand).
create or replace function public.set_my_initiative(p_table_id uuid, p_initiative int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.combatants set initiative = p_initiative
    where table_id = p_table_id
      and user_id = (select auth.uid())
      and kind = 'player';
  if not found then raise exception 'You have not joined this table'; end if;
end;
$$;

-- DM adds a monster. HP is stored in the secret table; players only ever see
-- the name, damage taken, and a status.
create or replace function public.add_monster(
  p_table_id uuid, p_name text, p_max_hp int, p_initiative int default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_table_dm(p_table_id) then
    raise exception 'Only the DM can add monsters';
  end if;
  insert into public.combatants (table_id, kind, name, initiative)
    values (p_table_id, 'monster', trim(p_name), p_initiative)
    returning id into v_id;
  insert into public.combatant_secrets (combatant_id, max_hp, current_hp)
    values (v_id, p_max_hp, p_max_hp);
  return v_id;
end;
$$;

-- DM deals damage (positive) or heals (negative). Updates the secret HP and the
-- public damage/status together so they can never disagree.
create or replace function public.apply_damage(p_combatant_id uuid, p_amount int)
returns void language plpgsql security definer set search_path = '' as $$
declare v_secret public.combatant_secrets; v_hp int;
begin
  if not public.combatant_table_dm(p_combatant_id) then
    raise exception 'Only the DM can change enemy HP';
  end if;
  select * into v_secret from public.combatant_secrets
    where combatant_id = p_combatant_id for update;
  if not found then raise exception 'That combatant has no tracked HP'; end if;

  v_hp := greatest(0, least(v_secret.max_hp, v_secret.current_hp - p_amount));

  update public.combatant_secrets set current_hp = v_hp
    where combatant_id = p_combatant_id;
  update public.combatants set
    damage_taken = v_secret.max_hp - v_hp,
    status = case
      when v_hp = 0 then 'down'
      when v_hp * 2 <= v_secret.max_hp then 'bloodied'
      else 'healthy'
    end
    where id = p_combatant_id;
end;
$$;

revoke execute on function
  public.join_table(text, uuid), public.leave_table(uuid),
  public.remove_member(uuid, uuid), public.set_my_initiative(uuid, int),
  public.add_monster(uuid, text, int, int), public.apply_damage(uuid, int)
  from public, anon;
grant execute on function
  public.join_table(text, uuid), public.leave_table(uuid),
  public.remove_member(uuid, uuid), public.set_my_initiative(uuid, int),
  public.add_monster(uuid, text, int, int), public.apply_damage(uuid, int)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5. DMs can READ (never edit) the characters of players at their table.
--    This adds a second SELECT policy; the existing "view your own" policy and
--    the insert/update/delete policies are untouched, so DMs still cannot edit.
-- ---------------------------------------------------------------------------

create policy "DMs can view characters at their table"
  on public.characters for select to authenticated
  using ((select public.is_dm_of_character(id)));

-- ---------------------------------------------------------------------------
-- 6. Live updates (so everyone's screen changes when the DM moves the turn).
--    combatant_secrets is deliberately NOT published.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.game_tables, public.combatants, public.table_members;
