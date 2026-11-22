-- Giving items to another player at the same table. Run this once in the
-- Supabase SQL editor.
--
-- Players can't change each other's character sheets, so a gift waits in a
-- small "gift box" until the receiver takes it on their own sheet:
--   give_item     the giver sends an item (a copy of its details) to someone
--                 seated at the same table; their sheet then takes it out
--   take_gift     the receiver takes it; their sheet adds it to Inventory
--   return_gift   the receiver sends it back to the giver instead
--   cancel_gift   the giver takes back a gift that hasn't been taken yet
-- Only the giver and the receiver can see a gift. Nothing here changes a
-- character sheet itself.

create table if not exists public.item_gifts (
  id                 uuid primary key default gen_random_uuid(),
  table_id           uuid not null references public.game_tables (id) on delete cascade,
  from_user          uuid not null references auth.users (id) on delete cascade,
  from_character_id  uuid references public.characters (id) on delete set null,
  from_name          text not null default '',
  to_user            uuid not null references auth.users (id) on delete cascade,
  to_character_id    uuid not null references public.characters (id) on delete cascade,
  to_name            text not null default '',
  item               jsonb not null check (
                       jsonb_typeof(item) = 'object'
                       and char_length(trim(coalesce(item ->> 'name', ''))) between 1 and 200
                       and char_length(item::text) <= 20000
                     ),
  created_at         timestamptz not null default now()
);

create index if not exists item_gifts_to_character_idx on public.item_gifts (to_character_id);
create index if not exists item_gifts_from_character_idx on public.item_gifts (from_character_id);

alter table public.item_gifts enable row level security;

-- Only the two people involved can see a gift. There are no insert, update
-- or delete rules: gifts change only through the functions below.
drop policy if exists "Giver and receiver can see a gift" on public.item_gifts;
create policy "Giver and receiver can see a gift"
  on public.item_gifts for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

revoke insert, update, delete on public.item_gifts from anon, authenticated;
grant select on public.item_gifts to authenticated;

-- The character a person has seated at a table, and its name.
create or replace function public.seated_character(p_table_id uuid, p_user uuid)
returns table (character_id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select c.id, left(coalesce(nullif(trim(c.data ->> 'name'), ''), 'Adventurer'), 60)
  from public.table_members tm
  join public.characters c on c.id = tm.character_id
  where tm.table_id = p_table_id and tm.user_id = p_user
  limit 1
$$;
revoke execute on function public.seated_character(uuid, uuid) from public, anon, authenticated;

create or replace function public.give_item(p_table_id uuid, p_to_user uuid, p_item jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_from record;
  v_to record;
  v_id uuid;
begin
  if v_me is null then raise exception 'Sign in to give items'; end if;
  select * into v_from from public.seated_character(p_table_id, v_me);
  if v_from.character_id is null then raise exception 'You are not seated at this table'; end if;
  if p_to_user = v_me then raise exception 'Pick someone else to give it to'; end if;
  select * into v_to from public.seated_character(p_table_id, p_to_user);
  if v_to.character_id is null then raise exception 'They are not seated at this table'; end if;
  if (select count(*) from public.item_gifts where to_character_id = v_to.character_id) >= 50 then
    raise exception 'They have a lot of gifts waiting already';
  end if;

  insert into public.item_gifts (table_id, from_user, from_character_id, from_name, to_user, to_character_id, to_name, item)
  values (p_table_id, v_me, v_from.character_id, v_from.name, p_to_user, v_to.character_id, v_to.name, p_item)
  returning id into v_id;
  return v_id;
end;
$$;

-- The receiver takes a gift: it's removed from the gift box and its details
-- are returned for their sheet to add.
create or replace function public.take_gift(p_gift_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_item jsonb;
begin
  delete from public.item_gifts
    where id = p_gift_id and to_user = (select auth.uid())
    returning item into v_item;
  if v_item is null then raise exception 'That gift is no longer waiting for you'; end if;
  return v_item;
end;
$$;

-- The receiver sends a gift back to the giver's character at the same table.
create or replace function public.return_gift(p_gift_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_gift public.item_gifts;
  v_back record;
begin
  select * into v_gift from public.item_gifts
    where id = p_gift_id and to_user = (select auth.uid()) for update;
  if not found then raise exception 'That gift is no longer waiting for you'; end if;
  select * into v_back from public.seated_character(v_gift.table_id, v_gift.from_user);
  if v_back.character_id is null then raise exception 'They are not at the table any more, so it can''t go back'; end if;
  update public.item_gifts
    set from_user = v_gift.to_user, from_character_id = v_gift.to_character_id, from_name = v_gift.to_name,
        to_user = v_gift.from_user, to_character_id = v_back.character_id, to_name = v_back.name,
        created_at = now()
    where id = p_gift_id;
end;
$$;

-- The giver takes back a gift nobody has taken yet; its details are
-- returned for their sheet to add back.
create or replace function public.cancel_gift(p_gift_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_item jsonb;
begin
  delete from public.item_gifts
    where id = p_gift_id and from_user = (select auth.uid())
    returning item into v_item;
  if v_item is null then raise exception 'That gift has already been taken'; end if;
  return v_item;
end;
$$;

revoke execute on function public.give_item(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.take_gift(uuid) from public, anon;
revoke execute on function public.return_gift(uuid) from public, anon;
revoke execute on function public.cancel_gift(uuid) from public, anon;
grant execute on function public.give_item(uuid, uuid, jsonb) to authenticated;
grant execute on function public.take_gift(uuid) to authenticated;
grant execute on function public.return_gift(uuid) to authenticated;
grant execute on function public.cancel_gift(uuid) to authenticated;
